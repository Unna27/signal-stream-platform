import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Pool } from 'pg';

interface ProcessedSignal {
  id: string;
  value: number;
  timestamp: number;
  processedValue: number;
  strength: 'weak' | 'medium' | 'strong';
  processedAt: number;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'signal-stream-platform',
      password: process.env.DB_PASSWORD || 'pass',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5434,
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing database tables...');
    await this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create processed_signals table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS processed_signals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_id VARCHAR(255) NOT NULL UNIQUE,
          value NUMERIC(10, 4) NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          processed_value NUMERIC(10, 4) NOT NULL,
          strength VARCHAR(10) NOT NULL CHECK (strength IN ('weak', 'medium', 'strong')),
          processed_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create index on signal_id for faster lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_processed_signals_signal_id 
        ON processed_signals(signal_id);
      `);

      // Create index on timestamp for time-range queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_processed_signals_timestamp 
        ON processed_signals(timestamp);
      `);

      this.logger.log('✓ Database schema initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize schema: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  private isValidTimestamp(timestamp: number): boolean {
    const now = Date.now();
    const fiveYearsAgo = now - 5 * 365 * 24 * 60 * 60 * 1000; // 5 years in ms
    const oneYearFuture = now + 365 * 24 * 60 * 60 * 1000; // 1 year ahead

    // Must be a number and within reasonable range
    return (
      typeof timestamp === 'number' &&
      timestamp >= fiveYearsAgo &&
      timestamp <= oneYearFuture
    );
  }

  validateSignal(signal: ProcessedSignal): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate id
    if (!signal.id || typeof signal.id !== 'string') {
      errors.push('Signal ID must be a non-empty string');
    }

    // Validate value
    if (typeof signal.value !== 'number' || isNaN(signal.value)) {
      errors.push('Value must be a valid number');
    }

    // Validate timestamp
    if (!this.isValidTimestamp(signal.timestamp)) {
      errors.push(
        'Timestamp must be a valid Unix timestamp (milliseconds) within the past 5 years and 1 year in future',
      );
    }

    // Validate processedValue
    if (
      typeof signal.processedValue !== 'number' ||
      isNaN(signal.processedValue)
    ) {
      errors.push('Processed value must be a valid number');
    }

    // Validate strength
    if (!['weak', 'medium', 'strong'].includes(signal.strength)) {
      errors.push('Strength must be one of: weak, medium, strong');
    }
    // Validate processedAt
    if (!this.isValidTimestamp(signal.processedAt)) {
      errors.push('ProcessedAt must be a valid Unix timestamp (milliseconds)');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async insertProcessedSignal(signal: ProcessedSignal): Promise<void> {
    // Validate signal before inserting
    const validation = this.validateSignal(signal);
    if (!validation.valid) {
      throw new Error(
        `Signal validation failed: ${validation.errors.join(', ')}`,
      );
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO processed_signals(signal_id, value, timestamp, processed_value, strength, processed_at)
         VALUES($1, $2, $3, $4, $5, $6)
         ON CONFLICT (signal_id) DO UPDATE SET
           value = $2,
           processed_value = $4,
           strength = $5,
           processed_at = $6,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id;`,
        [
          signal.id,
          signal.value,
          signal.timestamp,
          signal.processedValue,
          signal.strength,
          signal.processedAt,
        ],
      );

      this.logger.log(
        `✓ Inserted/Updated signal ${signal.id} with database ID: ${result.rows[0].id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to insert signal ${signal.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getProcessedSignal(signalId: string): Promise<ProcessedSignal | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT signal_id as id, value, timestamp, processed_value as "processedValue", 
                strength, processed_at as "processedAt"
         FROM processed_signals
         WHERE signal_id = $1;`,
        [signalId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getProcessedSignalsByDateRange(
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<ProcessedSignal[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT signal_id as id, value, timestamp, processed_value as "processedValue",
                strength, processed_at as "processedAt"
         FROM processed_signals
         WHERE timestamp >= $1 AND timestamp <= $2
         ORDER BY timestamp DESC;`,
        [startTimestamp, endTimestamp],
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }
}
