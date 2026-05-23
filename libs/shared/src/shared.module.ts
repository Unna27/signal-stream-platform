import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedService } from './shared.service';
import { AppConfigService } from './app-config.service';
import { DatabaseConfigService } from './database-config.service';
import { KafkaConfigService } from './kafka-config.service';

//@Global() // This makes the module global, so you don't need to import it in other modules. Loaded only once
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
