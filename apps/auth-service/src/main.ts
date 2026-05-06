import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { AppConfigService } from 'my-shared/shared';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  const appConfig = app.get(AppConfigService);
  const port = appConfig.authServicePort;
  await app.listen(port);
  console.log(`Auth Service running on port ${port}`);
}
bootstrap();
