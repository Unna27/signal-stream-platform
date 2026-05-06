import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedService } from './shared.service';
import { AppConfigService } from './app-config.service';
import { DatabaseConfigService } from './database-config.service';
import { KafkaConfigService } from './kafka-config.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SharedService,
    AppConfigService,
    DatabaseConfigService,
    KafkaConfigService,
  ],
  exports: [
    SharedService,
    AppConfigService,
    DatabaseConfigService,
    KafkaConfigService,
  ],
})
export class SharedModule {}
