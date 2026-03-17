import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ApiGatewayModule } from './api-gateway.module';
import cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.use(cors());

  // Enable WebSocket support using Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.API_GATEWAY_PORT ?? 3001;
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
  console.log(`WebSocket server available at ws://localhost:${port}`);
}
bootstrap();
