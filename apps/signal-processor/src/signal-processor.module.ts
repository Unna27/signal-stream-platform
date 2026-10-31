import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'my-db/database';
import { KafkaModule } from 'my-kafka/kafka';
import { SharedModule, configuration } from 'my-shared/shared';
import { SignalProcessorController } from './signal-processor.controller';
import { SignalProcessorService } from './signal-processor.service';
import { AnomalyDetectorService } from './anomaly-detector/anomaly-detector.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    KafkaModule.forFeature('signal-processor-group'),
    DatabaseModule,
    SharedModule,
  ],
  controllers: [SignalProcessorController],
  providers: [SignalProcessorService, AnomalyDetectorService],
})
export class SignalProcessorModule {}
