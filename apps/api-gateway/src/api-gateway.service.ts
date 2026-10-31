import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from 'my-db/database';

interface ProcessedSignal {
  id: string;
  value: number;
  timestamp: number;
  processedValue: number;
  status: 'NORMAL' | 'ANOMALY' | 'INSUFFICIENT_DATA';
  anomalyType: 'SPIKE' | 'DROP' | 'FLAT' | null;
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
  normalCount: number;
  anomalyCount: number;
  missingDataCount: number;
  anomalyTypeCounts: {
    SPIKE: number;
    DROP: number;
    FLAT: number;
    UNKNOWN: number;
  };
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
        `Failed to fetch signal ${signalId}: ${(error as Error).message}`,
        (error as Error).stack,
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
        `Failed to fetch signals by date range: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // not used in dashboard, but can be used in future for analytics or reporting
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
          normalCount: 0,
          anomalyCount: 0,
          missingDataCount: 0,
          anomalyTypeCounts: {
            SPIKE: 0,
            DROP: 0,
            FLAT: 0,
            UNKNOWN: 0,
          },
          timeRange: { start: startTimestamp, end: endTimestamp },
        };
      }

      const values = signals.map((s) => s.value);
      const processedValues = signals.map((s) => s.processedValue);
      const statuses = signals.map((s) => s.status);

      const stats: SignalStatistics = {
        count: signals.length,
        avgValue: values.reduce((a, b) => a + b, 0) / values.length,
        avgProcessedValue:
          processedValues.reduce((a, b) => a + b, 0) / processedValues.length,
        minValue: Math.min(...values),
        maxValue: Math.max(...values),
        minProcessedValue: Math.min(...processedValues),
        maxProcessedValue: Math.max(...processedValues),
        normalCount: statuses.filter((s) => s === 'NORMAL').length,
        anomalyCount: statuses.filter((s) => s === 'ANOMALY').length,
        missingDataCount: statuses.filter((s) => s === 'INSUFFICIENT_DATA')
          .length,
        anomalyTypeCounts: {
          SPIKE: signals.filter(
            (s) => s.status === 'ANOMALY' && s.anomalyType === 'SPIKE',
          ).length,
          DROP: signals.filter(
            (s) => s.status === 'ANOMALY' && s.anomalyType === 'DROP',
          ).length,
          FLAT: signals.filter(
            (s) => s.status === 'ANOMALY' && s.anomalyType === 'FLAT',
          ).length,
          UNKNOWN: signals.filter(
            (s) => s.status === 'ANOMALY' && s.anomalyType === null,
          ).length,
        },
        timeRange: { start: startTimestamp, end: endTimestamp },
      };

      this.logger.log(`Calculated statistics: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to calculate statistics: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
