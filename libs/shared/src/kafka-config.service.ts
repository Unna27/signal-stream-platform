import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

@Injectable()
export class KafkaConfigService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  get broker(): string {
    return this.configService.get('kafka.broker', { infer: true });
  }

  get inputTopic(): string {
    return this.configService.get('kafka.topics.input', { infer: true });
  }

  get outputTopic(): string {
    return this.configService.get('kafka.topics.output', { infer: true });
  }

  get failedTopic(): string {
    return this.configService.get('kafka.topics.failed', { infer: true });
  }
}
