import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaService } from 'my-kafka/kafka';
import { DatabaseService } from 'my-db/database';
import { EachMessagePayload } from 'kafkajs';

interface ProcessedSignal {
  id: string;
  value: number;
  timestamp: number;
  processedValue: number;
  strength: 'weak' | 'medium' | 'strong';
  processedAt: number;
}

@Injectable()
export class StorageServiceService implements OnModuleInit {
  private readonly logger = new Logger(StorageServiceService.name);
  private readonly outputTopic =
    process.env.SIGNAL_OUTPUT_TOPIC || 'processed-signals';
  private readonly failedSignalsTopic =
    process.env.SIGNAL_FAILED_TOPIC || 'storage-signals-failed';
  private storedCount = 0;
  private errorCount = 0;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly databaseService: DatabaseService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting storage service consumer...');
    await this.startConsuming();
  }

  private async startConsuming() {
    try {
      await this.kafkaService.subscribe(
        this.outputTopic,
        this.handleProcessedSignal.bind(this),
      );
      this.logger.log(
        `✓ Successfully subscribed to topic: ${this.outputTopic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start consuming from ${this.outputTopic}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handleProcessedSignal(payload: EachMessagePayload) {
    try {
      if (!payload.message.value) {
        this.logger.warn('Received empty message, skipping...');
        return;
      }

      // Parse the processed signal from Kafka message
      const signalData = JSON.parse(
        payload.message.value?.toString(),
      ) as ProcessedSignal;

      this.logger.log(
        `[${payload.topic}] Received processed signal: ID=${signalData.id}, Strength=${signalData.strength}`,
      );

      // Validate and store in database
      await this.databaseService.insertProcessedSignal(signalData);

      this.storedCount++;
      this.logger.log(
        `✓ Successfully stored signal to database (Total: ${this.storedCount})`,
      );
    } catch (error) {
      this.errorCount++;
      this.logger.error(
        `Failed to process and store signal: ${error.message}`,
        error.stack,
      );

      // Produce failed signal to failed topic
      await this.produceFailedSignal(payload, error);
    }
  }

  private async produceFailedSignal(
    payload: EachMessagePayload,
    error: Error,
  ): Promise<void> {
    try {
      const failedSignalMessage = {
        originalTopic: payload.topic,
        partition: payload.partition,
        failedAt: Date.now(),
        errorMessage: error.message,
        errorStack: error.stack,
        originalMessage: payload.message.value?.toString(),
      };

      await this.kafkaService.produce(this.failedSignalsTopic, [
        {
          key: payload.message.key?.toString() || 'unknown',
          value: JSON.stringify(failedSignalMessage),
        },
      ]);

      this.logger.log(
        `✓ Produced failed signal to topic: ${this.failedSignalsTopic}`,
      );
    } catch (produceError) {
      this.logger.error(
        `Failed to produce error signal to ${this.failedSignalsTopic}: ${produceError.message}`,
        produceError.stack,
      );
    }
  }

  /**
   * Get statistics about processed signals
   */
  getStats() {
    return {
      storedCount: this.storedCount,
      errorCount: this.errorCount,
      successRate:
        this.storedCount + this.errorCount > 0
          ? (
              (this.storedCount / (this.storedCount + this.errorCount)) *
              100
            ).toFixed(2) + '%'
          : 'N/A',
    };
  }

  /**
   * Retrieve a stored processed signal by ID
   */
  async getStoredSignal(signalId: string): Promise<ProcessedSignal | null> {
    try {
      const signal = await this.databaseService.getProcessedSignal(signalId);
      if (!signal) {
        this.logger.warn(`Signal with ID ${signalId} not found`);
        return null;
      }
      return signal;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve signal ${signalId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieve processed signals by date range
   */
  async getSignalsByDateRange(
    startTime: number,
    endTime: number,
  ): Promise<ProcessedSignal[]> {
    try {
      const signals = await this.databaseService.getProcessedSignalsByDateRange(
        startTime,
        endTime,
      );
      this.logger.log(
        `Retrieved ${signals.length} signals from database for time range ${startTime}-${endTime}`,
      );
      return signals;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve signals by date range: ${error.message}`,
      );
      throw error;
    }
  }
}
