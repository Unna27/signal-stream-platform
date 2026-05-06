import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from 'my-shared/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get(AppConfigService);
  await app.listen(appConfig.apiGatewayPort);
  console.log(
    `Signal Stream Platform running on port ${appConfig.apiGatewayPort}`,
  );
}
bootstrap();
