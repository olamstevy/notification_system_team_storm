import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { ApiGatewayService } from '../api_gateway.service';

@Injectable()
export class StatusConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatusConsumerService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly STATUS_EXCHANGE = 'notifications.status';
  private readonly STATUS_QUEUE = 'status.queue';
  private readonly STATUS_ROUTING_KEY = 'status.update';

  constructor(private readonly apiGatewayService: ApiGatewayService) { }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl =
        process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      this.connection = amqp.connect([rabbitmqUrl]);

      this.connection.on('connect', () =>
        this.logger.log('Connected to RabbitMQ (status consumer)'),
      );
      this.connection.on('disconnect', (err) =>
        this.logger.error('Disconnected (status consumer)', err),
      );

      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel: ConfirmChannel) => {
          await channel.assertExchange(this.STATUS_EXCHANGE, 'direct', {
            durable: true,
          });
          await channel.assertQueue(this.STATUS_QUEUE, { durable: true });
          await channel.bindQueue(
            this.STATUS_QUEUE,
            this.STATUS_EXCHANGE,
            this.STATUS_ROUTING_KEY,
          );
          this.logger.log('Status consumer channel setup completed');
        },
      });

      await this.startConsuming();
    } catch (error) {
      this.logger.error('Failed to start status consumer', error);
      throw error;
    }
  }

  private async startConsuming(): Promise<void> {
    await this.channelWrapper.consume(
      this.STATUS_QUEUE,
      async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          this.logger.log(
            `Received status update for ${payload.notification_id}: ${payload.status}`,
          );

          await this.apiGatewayService.handleStatusUpdateFromQueue(payload);

          this.channelWrapper.ack(msg);
        } catch (err) {
          this.logger.error('Error handling status message', err);
          // ack to avoid infinite redelivery; optionally move to DLQ
          this.channelWrapper.ack(msg);
        }
      },
      { noAck: false },
    );

    this.logger.log('Status consumer started');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channelWrapper) await this.channelWrapper.close();
      if (this.connection) await this.connection.close();
    } catch (error) {
      this.logger.error('Error shutting down status consumer', error);
    }
  }
}
