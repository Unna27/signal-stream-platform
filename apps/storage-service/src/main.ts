import { NestFactory } from '@nestjs/core';
import { StorageServiceModule } from './storage-service.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(StorageServiceModule); // no need for Port since it's a worker
  console.log('Storage service worker started');
}
bootstrap();
