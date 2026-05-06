import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

@Injectable()
export class DatabaseConfigService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  get host(): string {
    return this.configService.get('database.host', { infer: true });
  }

  get port(): number {
    return this.configService.get('database.port', { infer: true });
  }

  get user(): string {
    return this.configService.get('database.user', { infer: true });
  }

  get password(): string {
    return this.configService.get('database.password', { infer: true });
  }

  get name(): string {
    return this.configService.get('database.name', { infer: true });
  }
}
