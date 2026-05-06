import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from 'my-kafka/kafka';
import { DatabaseModule } from 'my-db/database';
import { SharedModule, configuration } from 'my-shared/shared';
import { StorageServiceController } from './storage-service.controller';
import { StorageServiceService } from './storage-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    KafkaModule.forFeature('storage-group'),
    DatabaseModule,
    SharedModule,
  ],
  controllers: [StorageServiceController],
  providers: [StorageServiceService],
})
export class StorageServiceModule {}
