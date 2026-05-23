import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'my-db/database';
import { HttpService } from '@nestjs/axios';

interface ProcessedSignal {
  id: string;
  value: number;
  timestamp: number;
  processedValue: number;
  strength: 'weak' | 'medium' | 'strong';
  processedAt: number;
}

export interface SignalStatistics {
  count: number;
  avgValue: number;
  avgProcessedValue: number;
  minValue: number;
  maxValue: number;
  minProcessedValue: number;
  maxProcessedValue: number;
  weakCount: number;
  mediumCount: number;
  strongCount: number;
  timeRange: {
    start: number;
    end: number;
  };
}

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  getHello(): string {
    return 'API Gateway is running and ready to stream signals!';
  }

  async getSignal(signalId: string): Promise<ProcessedSignal | null> {
    this.logger.log(`Fetching signal with ID: ${signalId}`);
    try {
      const signal = await this.databaseService.getProcessedSignal(signalId); // change it to http call to storage service
      if (!signal) {
        this.logger.warn(`Signal not found: ${signalId}`);
        return null;
      }
      return signal;
    } catch (error) {
      this.logger.error(
        `Failed to fetch signal ${signalId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getSignalsByDateRange(
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<ProcessedSignal[]> {
    this.logger.log(
      `Fetching signals between ${new Date(startTimestamp).toLocaleString()} and ${new Date(endTimestamp).toLocaleString()}`,
    );
    try {
      const signals = await this.databaseService.getProcessedSignalsByDateRange(
        startTimestamp,
        endTimestamp,
      );
      this.logger.log(`Retrieved ${signals.length} signals`);
      return signals;
    } catch (error) {
      this.logger.error(
        `Failed to fetch signals by date range: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getStatistics(
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<SignalStatistics> {
    this.logger.log(
      `Calculating statistics for range: ${startTimestamp} - ${endTimestamp}`,
    );
    try {
      const signals = await this.getSignalsByDateRange(
        startTimestamp,
        endTimestamp,
      );

      if (signals.length === 0) {
        return {
          count: 0,
          avgValue: 0,
          avgProcessedValue: 0,
          minValue: 0,
          maxValue: 0,
          minProcessedValue: 0,
          maxProcessedValue: 0,
          weakCount: 0,
          mediumCount: 0,
          strongCount: 0,
          timeRange: { start: startTimestamp, end: endTimestamp },
        };
      }

      const values = signals.map((s) => s.value);
      const processedValues = signals.map((s) => s.processedValue);
      const strengths = signals.map((s) => s.strength);

      const stats: SignalStatistics = {
        count: signals.length,
        avgValue: values.reduce((a, b) => a + b, 0) / values.length,
        avgProcessedValue:
          processedValues.reduce((a, b) => a + b, 0) / processedValues.length,
        minValue: Math.min(...values),
        maxValue: Math.max(...values),
        minProcessedValue: Math.min(...processedValues),
        maxProcessedValue: Math.max(...processedValues),
        weakCount: strengths.filter((s) => s === 'weak').length,
        mediumCount: strengths.filter((s) => s === 'medium').length,
        strongCount: strengths.filter((s) => s === 'strong').length,
        timeRange: { start: startTimestamp, end: endTimestamp },
      };

      this.logger.log(`Calculated statistics: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to calculate statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
