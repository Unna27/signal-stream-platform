export interface ProcessedSignal {
  id: string;
  deviceId: string;
  value: number;
  timestamp: number;
  processedValue: number;
  status: 'NORMAL' | 'ANOMALY' | 'INSUFFICIENT_DATA';
  anomalyType: 'SPIKE' | 'DROP' | 'FLAT' | null;
  processedAt: number;
}
