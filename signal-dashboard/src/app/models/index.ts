export interface ProcessedSignal {
  id: string;
  value: number;
  timestamp: number;
  processedValue: number;
  strength: 'weak' | 'medium' | 'strong';
  processedAt: number;
}
