import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from 'my-kafka/kafka';
import { DatabaseModule } from 'my-db/database';
import { StorageServiceController } from './storage-service.controller';
import { StorageServiceService } from './storage-service.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    KafkaModule.forFeature('storage-group'),
    DatabaseModule,
  ],
  controllers: [StorageServiceController],
  providers: [StorageServiceService],
})
export class StorageServiceModule {}
