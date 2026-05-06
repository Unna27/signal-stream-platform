import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from 'my-kafka/kafka';
import { SharedModule, configuration } from 'my-shared/shared';
import { SignalProcessorController } from './signal-processor.controller';
import { SignalProcessorService } from './signal-processor.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    KafkaModule.forFeature('signal-processor-group'),
    SharedModule,
  ],
  controllers: [SignalProcessorController],
  providers: [SignalProcessorService],
})
export class SignalProcessorModule {}
