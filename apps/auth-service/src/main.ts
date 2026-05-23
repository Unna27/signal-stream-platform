import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { AppConfigService } from 'my-shared/shared';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  const appConfig = app.get(AppConfigService);
  const port = appConfig.authServicePort;
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(port);
  console.log(`Auth Service running on port ${port}`);
}
bootstrap();
