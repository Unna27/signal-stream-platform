import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from 'my-kafka/kafka';
import { DatabaseModule } from 'my-db/database';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { SignalsGateway } from './signals.gateway';

@Module({
  imports: [
    ConfigModule.forRoot(),
    KafkaModule.forFeature('api-gateway-group'),
    DatabaseModule,
  ],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService, SignalsGateway],
})
export class ApiGatewayModule {}
