import { NestFactory } from '@nestjs/core';
import { AnalyticsServiceModule } from './analytics-service.module';
import { AppConfigService } from 'my-shared/shared';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsServiceModule);
  const appConfig = app.get(AppConfigService);
  const port = appConfig.analyticsServicePort;
  await app.listen(port);
  console.log(`Analytics Service running on port ${port}`);
}
bootstrap();
