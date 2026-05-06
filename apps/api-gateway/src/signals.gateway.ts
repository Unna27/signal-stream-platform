import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { KafkaService } from 'my-kafka/kafka';
import { KafkaConfigService } from 'my-shared/shared';
import { EachMessagePayload } from 'kafkajs';

interface ProcessedSignal {
  id: string;
  value: number;
  timestamp: number;
  processedValue: number;
  strength: 'weak' | 'medium' | 'strong';
  processedAt: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class SignalsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalsGateway.name);
  private readonly outputTopic: string;
  private readonly gatewayGroupId = 'api-gateway-group';

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly kafkaConfig: KafkaConfigService,
  ) {
    this.outputTopic = this.kafkaConfig.outputTopic;
  }

  async onModuleInit() {
    this.logger.log('Initializing SignalsGateway...');
    await this.startKafkaConsumer();
  }

  private async startKafkaConsumer() {
    try {
      this.logger.log(`Starting Kafka consumer for topic: ${this.outputTopic}`);
      await this.kafkaService.subscribe(
        this.outputTopic,
        (messagePayload: EachMessagePayload) =>
          this.handleKafkaMessage(messagePayload),
      );
    } catch (error) {
      this.logger.error(
        `Failed to start Kafka consumer: ${error.message}`,
        error.stack,
      );
    }
  }

  private async handleKafkaMessage(payload: EachMessagePayload) {
    try {
      if (!payload.message.value) {
        this.logger.warn('Received empty Kafka message, skipping...');
        return;
      }

      const signal = JSON.parse(
        payload.message.value.toString(),
      ) as ProcessedSignal;

      this.logger.log(`Received signal from Kafka: ${JSON.stringify(signal)}`);

      // Broadcast to all connected WebSocket clients
      this.broadcastSignal(signal);
    } catch (error) {
      this.logger.error(
        `Failed to process Kafka message: ${error.message}`,
        error.stack,
      );
    }
  }

  private broadcastSignal(signal: ProcessedSignal) {
    this.logger.log(
      `Broadcasting signal to ${this.server.engine.clientsCount} clients`,
    );
    this.server.emit('signal', signal);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.logger.log(
      `Total connected clients: ${this.server.engine.clientsCount}`,
    );

    // Send connection confirmation
    client.emit('connected', {
      message: 'Connected to signal stream gateway',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.logger.log(
      `Total connected clients: ${this.server.engine.clientsCount}`,
    );
  }
}
