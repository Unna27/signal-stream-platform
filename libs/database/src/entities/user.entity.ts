import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  role: string = 'user'; // default role

  @Column()
  password!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
