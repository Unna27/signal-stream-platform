import { Module, DynamicModule } from '@nestjs/common';
import { SharedModule } from 'my-shared/shared';
import { KafkaConfigService } from 'my-shared/shared';
import { KafkaService } from './kafka.service';

@Module({
  imports: [SharedModule],
  providers: [
    {
      provide: KafkaService,
      useFactory: (kafkaConfig: KafkaConfigService) =>
        new KafkaService('signal-processor-group', kafkaConfig),
      inject: [KafkaConfigService],
    },
  ],
  exports: [KafkaService],
})
export class KafkaModule {
  static forFeature(groupId: string): DynamicModule {
    return {
      module: KafkaModule,
      imports: [SharedModule],
      providers: [
        {
          provide: KafkaService,
          useFactory: (kafkaConfig: KafkaConfigService) =>
            new KafkaService(groupId, kafkaConfig),
          inject: [KafkaConfigService],
        },
      ],
      exports: [KafkaService],
    };
  }
}
