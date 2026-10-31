import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaService } from 'my-kafka/kafka';
import { DatabaseService } from 'my-db/database';
import { KafkaConfigService } from 'my-shared/shared';
import { EachMessagePayload } from 'kafkajs';

interface ProcessedSignal {
  id: string;
  deviceId: string;
  value: number;
  status: 'NORMAL' | 'ANOMALY' | 'INSUFFICIENT_DATA';
  anomalyType: 'SPIKE' | 'DROP' | 'FLAT' | null;
  timestamp: number;
  processedValue: number;
  processedAt: number;
}

@Injectable()
export class StorageServiceService implements OnModuleInit {
  private readonly logger = new Logger(StorageServiceService.name);
  private readonly outputTopic: string;
  private readonly failedSignalsTopic: string;
  private storedCount = 0;
  private errorCount = 0;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly databaseService: DatabaseService,
    private readonly kafkaConfig: KafkaConfigService,
  ) {
    this.outputTopic = this.kafkaConfig.outputTopic;
    this.failedSignalsTopic = this.kafkaConfig.failedTopic;
  }

  async onModuleInit() {
    this.logger.log('Starting storage service consumer...');
    await this.startConsuming();
  }

  private async startConsuming() {
    try {
      await this.kafkaService.subscribe(
        this.outputTopic,
        (messagePayload: EachMessagePayload) =>
          this.handleProcessedSignal(messagePayload),
      );
      this.logger.log(
        `✓ Successfully subscribed to topic: ${this.outputTopic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start consuming from ${this.outputTopic}: ${(error as Error).message}`,
        (error as Error).stack,
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
        `[${payload.topic}] Received processed signal: ID=${signalData.id}, Status=${signalData.status}`,
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
        `Failed to process and store signal: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Produce failed signal to failed topic
      await this.produceFailedSignal(payload, error as Error);
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
        `Failed to produce error signal to ${this.failedSignalsTopic}: ${(produceError as Error).message}`,
        (produceError as Error).stack,
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
        `Failed to retrieve signal ${signalId}: ${(error as Error).message}`,
        (error as Error).stack,
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
        `Failed to retrieve signals by date range: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
