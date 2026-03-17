import { NestFactory } from '@nestjs/core';
import { SignalProcessorModule } from './signal-processor.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(SignalProcessorModule); // no need for Port since it's a worker
  console.log('Signal processor worker started');
}
bootstrap();
