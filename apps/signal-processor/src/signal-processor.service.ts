import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaService } from 'my-kafka/kafka';
import { KafkaConfigService } from 'my-shared/shared';
import { EachMessagePayload } from 'kafkajs';
import { AnomalyDetectorService } from './anomaly-detector/anomaly-detector.service';

interface Signal {
  id: string;
  deviceId: string;
  value: number;
  timestamp: number;
}

interface ProcessedSignal extends Signal {
  processedValue: number;
  status: 'NORMAL' | 'ANOMALY' | 'INSUFFICIENT_DATA';
  anomalyType: 'SPIKE' | 'DROP' | 'FLAT' | null;
  processedAt: number;
}

@Injectable()
export class SignalProcessorService implements OnModuleInit {
  private readonly logger = new Logger(SignalProcessorService.name);
  private readonly inputTopic: string;
  private readonly outputTopic: string;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly kafkaConfig: KafkaConfigService,
    private readonly anomalyDetectorService: AnomalyDetectorService,
  ) {
    this.inputTopic = this.kafkaConfig.inputTopic;
    this.outputTopic = this.kafkaConfig.outputTopic;
  }

  async onModuleInit() {
    this.logger.log('Starting signal processor consumer...');
    await this.startConsuming();
  }

  private async startConsuming() {
    await this.kafkaService.subscribe(
      this.inputTopic,
      (messagePayload: EachMessagePayload) =>
        this.handleMessage(messagePayload),
    );
  }

  private async handleMessage(payload: EachMessagePayload) {
    try {
      if (!payload.message.value) {
        this.logger.warn('Received empty message, skipping...');
        return;
      }
      const signal = JSON.parse(payload.message.value?.toString()) as Signal;
      this.logger.log(`Received signal: ${JSON.stringify(signal)}`);

      const processedSignal = await this.processSignal(signal);
      await this.produceProcessedSignal(processedSignal);
    } catch (error) {
      this.logger.error(
        `Failed to process message: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async processSignal(signal: Signal): Promise<ProcessedSignal> {
    const processedValue = this.applySmoothing(signal.value);
    const detection = await this.anomalyDetectorService.detect(
      signal.deviceId,
      processedValue,
    );

    return {
      ...signal,
      processedValue,
      status: detection.status,
      anomalyType: detection.anomalyType,
      processedAt: Date.now(),
    };
  }

  private applySmoothing(value: number): number {
    // Simple low-pass filter: scale and normalize
    return Math.round(value * 0.95 * 100) / 100;
  }

  private async produceProcessedSignal(signal: ProcessedSignal) {
    try {
      await this.kafkaService.produce(this.outputTopic, [
        {
          key: signal.id,
          value: JSON.stringify(signal),
        },
      ]);
      this.logger.log(
        `Produced processed signal to ${this.outputTopic}: ${JSON.stringify(signal)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to produce processed signal: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
