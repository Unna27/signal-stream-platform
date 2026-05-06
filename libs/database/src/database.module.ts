import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SharedModule } from 'my-shared/shared';

@Module({
  imports: [SharedModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
