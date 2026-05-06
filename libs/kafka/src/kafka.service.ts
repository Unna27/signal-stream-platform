import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  Kafka,
  Consumer,
  Producer,
  EachMessagePayload,
  Admin,
  Partitioners,
} from 'kafkajs';
import { KafkaConfigService } from 'my-shared/shared';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private admin: Admin;
  private readonly logger = new Logger(KafkaService.name);
  private readonly numPartitions = 2; // Configure for 2 partitions
  private readonly replicationFactor = 1;

  constructor(
    private readonly groupId: string = 'signal-processor-group',
    private readonly kafkaConfig: KafkaConfigService,
  ) {
    this.kafka = new Kafka({
      clientId: 'signal-stream-platform',
      brokers: [this.kafkaConfig.broker],
    });
  }

  async onModuleInit() {
    this.admin = this.kafka.admin();
    this.consumer = this.kafka.consumer({ groupId: this.groupId });
    // Use the legacy partitioner to keep previous partitioning behaviour
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });

    await this.admin.connect();

    // Ensure topics exist before the producer connects so metadata is accurate
    await this.createTopicsIfNotExists();

    // Log topic metadata (partitions/leaders) to help debug "does not host this topic-partition"
    await this.logTopicMetadata();

    await this.producer.connect();
    await this.consumer.connect();

    this.logger.log(
      `✓ KafkaService initialized with groupId: ${this.groupId} (${this.numPartitions} partitions per topic)`,
    );
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    await this.admin.disconnect();
  }

  /**
   * Create Kafka topics with 2 partitions if they don't already exist
   * This enables parallel stream processing
   */
  private async createTopicsIfNotExists(): Promise<void> {
    const topics = [
      this.kafkaConfig.inputTopic, // 'raw-signals',
      this.kafkaConfig.outputTopic, // 'processed-signals',
      this.kafkaConfig.failedTopic, // 'storage-signals-failed',
    ];

    try {
      const existingTopics = await this.admin.fetchTopicMetadata({
        topics,
      });

      const existingTopicNames = existingTopics.topics.map((t) => t.name);
      const topicsToCreate = topics.filter(
        (topic) => !existingTopicNames.includes(topic),
      );

      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate.map((topic) => ({
            topic,
            numPartitions: this.numPartitions,
            replicationFactor: this.replicationFactor,
            configEntries: [
              {
                name: 'retention.ms',
                value: '86400000', // 24 hours
              },
            ],
          })),
        });

        this.logger.log(
          `✓ Created topics with ${this.numPartitions} partitions: ${topicsToCreate.join(', ')}`,
        );
      } else {
        this.logger.log(
          `✓ All topics already exist with proper partition configuration`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Topic creation warning (may already exist): ${error.message}`,
      );
    }
  }

  /**
   * Fetch and log partition/leader info for configured topics to aid debugging
   */
  private async logTopicMetadata(): Promise<void> {
    try {
      const topics = [
        this.kafkaConfig.inputTopic, // 'raw-signals',
        this.kafkaConfig.outputTopic, // 'processed-signals',
        this.kafkaConfig.failedTopic, // 'storage-signals-failed',
      ];
      const metadata = await this.admin.fetchTopicMetadata({ topics });

      metadata.topics.forEach((t) => {
        this.logger.log(`Topic metadata: ${t.name}`);
        t.partitions.forEach((p) => {
          this.logger.log(
            ` - partition ${p.partitionId} leader: ${p.leader} replicas: ${p.replicas.join(',')}`,
          );
        });
      });
    } catch (err) {
      this.logger.warn(`Failed to fetch topic metadata: ${err.message}`);
    }
  }

  getConsumer(): Consumer {
    return this.consumer;
  }

  getProducer(): Producer {
    return this.producer;
  }

  /**
   * Subscribe to a topic with callbacks from multiple partitions in parallel
   * Messages with the same key will always go to the same partition (ordered)
   * Messages without keys are distributed across partitions for parallelism
   */
  async subscribe(
    topic: string,
    callback: (payload: EachMessagePayload) => Promise<void>,
  ) {
    await this.consumer.subscribe({ topic, fromBeginning: true });
    await this.consumer.run({
      eachMessage: callback,
      partitionsConsumedConcurrently: this.numPartitions, // Process partitions in parallel
    });

    this.logger.log(
      `✓ Subscribed to topic: ${topic} with ${this.numPartitions} parallel partitions`,
    );
  }

  /**
   * Produce messages to Kafka
   * If a key is provided, messages with the same key go to the same partition (ordered)
   * If no key, messages are distributed across partitions for load balancing
   */
  async produce(
    topic: string,
    messages: Array<{ key?: string; value: string }>,
  ) {
    await this.producer.send({
      topic,
      messages,
      // Compression for better throughput
      compression: 1, // Gzip compression
    });

    this.logger.debug(
      `Produced ${messages.length} message(s) to topic: ${topic}`,
    );
  }
}
