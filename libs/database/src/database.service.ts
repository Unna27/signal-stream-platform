import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { DatabaseConfigService } from 'my-shared/shared';
import { ProcessedSignalEntity } from './entities/processed-signal.entity';
import { UserEntity } from './entities/user.entity';

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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
  createdAt: Date;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private dataSource!: DataSource;
  private processedSignalRepository!: Repository<ProcessedSignalEntity>;
  private userRepository!: Repository<UserEntity>;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dbConfig: DatabaseConfigService) {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.dbConfig.host ?? 'localhost',
      port: this.dbConfig.port ?? 5434,
      username: this.dbConfig.user ?? '',
      password: this.dbConfig.password ?? '',
      database: this.dbConfig.name ?? '',
      entities: [ProcessedSignalEntity, UserEntity],
      synchronize: true, // true for development, synchronize changes in fields; use migrations in production
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing database connection...');
    await this.dataSource.initialize();
    this.processedSignalRepository = this.dataSource.getRepository(
      ProcessedSignalEntity,
    );
    this.userRepository = this.dataSource.getRepository(UserEntity);
    this.logger.log('✓ Database initialized successfully');
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

    // Validate deviceId
    if (!signal.deviceId || typeof signal.deviceId !== 'string') {
      errors.push('Device ID must be a non-empty string');
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

    // Validate status
    if (!['NORMAL', 'ANOMALY', 'INSUFFICIENT_DATA'].includes(signal.status)) {
      errors.push('Status must be one of: NORMAL, ANOMALY, INSUFFICIENT_DATA');
    }

    // Validate anomalyType
    if (
      signal.anomalyType !== null &&
      !['SPIKE', 'DROP', 'FLAT'].includes(signal.anomalyType)
    ) {
      errors.push('Anomaly type must be one of: SPIKE, DROP, FLAT, or null');
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
    console.log(
      `Validating signal ${signal.id}: ${validation.valid ? 'valid' : 'invalid'}, signal.processedAt=${signal.processedAt}, signal.timestamp=${signal.timestamp}`,
    );
    if (!validation.valid) {
      throw new Error(
        `Signal validation failed: ${validation.errors.join(', ')}`,
      );
    }

    try {
      await this.processedSignalRepository.upsert(
        {
          signalId: signal.id,
          deviceId: signal.deviceId,
          value: signal.value,
          status: signal.status,
          anomalyType: signal.anomalyType,
          timestamp: new Date(signal.timestamp),
          processedValue: signal.processedValue,
          processedAt: new Date(signal.processedAt),
        },
        ['signalId'], // Upsert based on signalId to avoid duplicates (Idempotency)
      );

      this.logger.log(`✓ Inserted/Updated signal ${signal.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to insert signal ${signal.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getProcessedSignal(signalId: string): Promise<ProcessedSignal | null> {
    try {
      const entity = await this.processedSignalRepository.findOne({
        where: { signalId },
      });

      if (!entity) {
        return null;
      }

      return {
        id: entity.signalId,
        deviceId: entity.deviceId,
        value: entity.value,
        status: entity.status,
        anomalyType: entity.anomalyType,
        timestamp: entity.timestamp.getTime(),
        processedValue: entity.processedValue,
        processedAt: entity.processedAt.getTime(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get signal ${signalId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getProcessedSignalsByDateRange(
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<ProcessedSignal[]> {
    try {
      console.log(startTimestamp, endTimestamp);
      const entities = await this.processedSignalRepository.find({
        where: {
          timestamp: Between(new Date(startTimestamp), new Date(endTimestamp)),
        },
        order: { timestamp: 'DESC' },
      });

      return entities.map((entity) => ({
        id: entity.signalId,
        deviceId: entity.deviceId,
        value: entity.value,
        timestamp: entity.timestamp.getTime(),
        processedValue: entity.processedValue,
        processedAt: entity.processedAt.getTime(),
        status: entity.status,
        anomalyType: entity.anomalyType,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get signals by date range: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getLatestProcessedSignalValues(
    deviceId: string,
    limit: number,
  ): Promise<number[]> {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError('Signal history limit must be a positive integer');
    }

    try {
      const entities = await this.processedSignalRepository.find({
        where: { deviceId },
        select: ['value', 'status', 'timestamp', 'id'],
        order: { timestamp: 'DESC', id: 'DESC' },
        take: limit * 3, // to account for filtering out anomalies and insufficient data, fetch more than needed
      });

      return entities
        .filter(
          (entity) =>
            entity.status === 'NORMAL' || entity.status === 'INSUFFICIENT_DATA',
        )
        .slice(0, limit)
        .map((entity) => Number(entity.value))
        .filter(Number.isFinite);
    } catch (error) {
      this.logger.error(
        `Failed to get latest signals for device ${deviceId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // User methods
  async insertUser(user: Omit<User, 'id' | 'createdAt'>) {
    try {
      const entity = this.userRepository.create({
        name: user.name,
        email: user.email,
        role: user.role,
        password: user.password,
      });
      const savedEntity = await this.userRepository.save(entity);
      return {
        id: savedEntity.id,
        name: savedEntity.name,
        email: savedEntity.email,
        role: savedEntity.role,
        password: savedEntity.password,
        createdAt: savedEntity.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to insert user ${user.email}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const entity = await this.userRepository.findOne({ where: { id } });
      if (!entity) return null;
      return {
        id: entity.id,
        name: entity.name,
        email: entity.email,
        role: entity.role,
        password: entity.password,
        createdAt: entity.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const entity = await this.userRepository.findOne({ where: { email } });
      if (!entity) return null;
      return {
        id: entity.id,
        name: entity.name,
        email: entity.email,
        role: entity.role,
        password: entity.password,
        createdAt: entity.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user by email ${email}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async updateUser(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>,
  ): Promise<User | null> {
    try {
      await this.userRepository.update(id, updates);
      return this.getUserById(id);
    } catch (error) {
      this.logger.error(
        `Failed to update user ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await this.userRepository.delete(id);
      return !!result.affected && result.affected > 0;
    } catch (error) {
      this.logger.error(
        `Failed to delete user ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.dataSource.destroy();
    this.logger.log('Database connection closed');
  }
}
