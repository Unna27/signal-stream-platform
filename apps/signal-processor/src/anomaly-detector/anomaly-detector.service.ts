import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'my-db/database';

type AnomalyType = 'SPIKE' | 'DROP' | 'FLAT' | null;

type DetectionResult = {
  status: 'INSUFFICIENT_DATA' | 'NORMAL' | 'ANOMALY';
  anomalyType: AnomalyType;
  historyCount: number;
};

@Injectable()
export class AnomalyDetectorService {
  private readonly windowSize = 10;
  private readonly minHistory = 5;

  private readonly spikeDropThreshold = 10;
  private readonly flatTolerance = 0.1;
  private readonly flatWindowSize = 5;

  constructor(private readonly databaseService: DatabaseService) {}

  async detect(
    deviceId: string,
    currentValue: number,
  ): Promise<DetectionResult> {
    // Fetch previous readings only, newest first.
    const history = (
      await this.databaseService.getLatestProcessedSignalValues(
        deviceId,
        this.windowSize,
      )
    ).filter(Number.isFinite);

    // A new device or insufficient history.
    if (history.length < this.minHistory) {
      return {
        status: 'INSUFFICIENT_DATA',
        anomalyType: null,
        historyCount: history.length,
      };
    }

    // Robust baseline: median of historical readings.
    const baseline = this.median(history);

    // Detect sudden spikes and drops against the baseline.
    const difference = currentValue - baseline;

    if (difference > this.spikeDropThreshold) {
      return {
        status: 'ANOMALY',
        anomalyType: 'SPIKE',
        historyCount: history.length,
      };
    }

    if (difference < -this.spikeDropThreshold) {
      return {
        status: 'ANOMALY',
        anomalyType: 'DROP',
        historyCount: history.length,
      };
    }

    // Detect a sustained flat pattern using the current
    // reading and the four most recent previous readings.
    const flatWindow = [
      currentValue,
      ...history.slice(0, this.flatWindowSize - 1),
    ];

    if (this.isFlat(flatWindow)) {
      return {
        status: 'ANOMALY',
        anomalyType: 'FLAT',
        historyCount: history.length,
      };
    }

    return {
      status: 'NORMAL',
      anomalyType: null,
      historyCount: history.length,
    };
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 1) {
      return sorted[middle];
    }

    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  private isFlat(values: number[]): boolean {
    if (values.length < this.flatWindowSize) {
      return false;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    return max - min <= this.flatTolerance;
  }
}
