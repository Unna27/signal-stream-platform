import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('processed_signals')
@Index(['signalId'])
@Index(['timestamp'])
export class ProcessedSignalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'signal_id', unique: true })
  signalId: string;

  @Column('decimal', { precision: 10, scale: 4 })
  value: number;

  @Column('timestamp')
  timestamp: Date;

  @Column('decimal', { precision: 10, scale: 4, name: 'processed_value' })
  processedValue: number;

  @Column({
    type: 'enum',
    enum: ['weak', 'medium', 'strong'],
  })
  strength: 'weak' | 'medium' | 'strong';

  @Column('timestamp', { name: 'processed_at' })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
