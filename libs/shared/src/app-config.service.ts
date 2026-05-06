import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  get port(): number {
    return this.configService.get('app.port', { infer: true });
  }

  get apiGatewayPort(): number {
    return this.configService.get('app.api_gateway_port', { infer: true });
  }

  get analyticsServicePort(): number {
    return this.configService.get('app.analytics_service_port', {
      infer: true,
    });
  }
  get authServicePort(): number {
    return this.configService.get('app.auth_service_port', {
      infer: true,
    });
  }
}
