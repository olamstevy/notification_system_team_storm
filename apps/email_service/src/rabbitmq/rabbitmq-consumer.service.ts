import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { EmailServiceService } from '../email_service.service';

@Injectable()
export class RabbitMQConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumerService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly EXCHANGE = 'notifications.direct';
  private readonly EMAIL_QUEUE = 'email.queue';
  private readonly STATUS_EXCHANGE = 'notifications.status';
  private readonly STATUS_ROUTING_KEY = 'status.update';
  private readonly MAX_RETRIES = 3;

  constructor(
    private configService: ConfigService,
    private emailService: EmailServiceService,
  ) { }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl =
        this.configService.get<string>('RABBITMQ_URL') ||
        'amqp://guest:guest@localhost:5672';

      this.connection = amqp.connect([rabbitmqUrl]);

      this.connection.on('connect', () => {
        this.logger.log('Connected to RabbitMQ');
      });

      this.connection.on('disconnect', (err) => {
        this.logger.error('Disconnected from RabbitMQ', err);
      });

      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel: ConfirmChannel) => {
          // Declare exchange and queue
          await channel.assertExchange(this.EXCHANGE, 'direct', {
            durable: true,
          });

          // Declare email queue with retry configuration
          await channel.assertQueue(this.EMAIL_QUEUE, {
            durable: true,
            arguments: {
              'x-max-length': 10000,
              'x-message-ttl': 3600000, // 1 hour
            },
          });

          // Bind queue to exchange
          await channel.bindQueue(this.EMAIL_QUEUE, this.EXCHANGE, 'email');

          // Ensure status exchange exists for publishing status updates
          await channel.assertExchange(this.STATUS_EXCHANGE, 'direct', {
            durable: true,
          });

          // Set prefetch count for fair dispatch
          await channel.prefetch(1);

          this.logger.log('Email queue setup completed');
        },
      });

      // Start consuming messages
      await this.startConsuming();
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  private async startConsuming(): Promise<void> {
    try {
      await this.channelWrapper.consume(
        this.EMAIL_QUEUE,
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async (msg) => {
          if (!msg) return;

          try {
            const emailMessage = JSON.parse(msg.content.toString());

            // Process the email
            await this.emailService.processEmailNotification(emailMessage);

            // Acknowledge the message
            this.channelWrapper.ack(msg);
          } catch (error) {
            this.logger.error('Error processing email message', error);

            // Check retry count
            const retryCount =
              (msg.properties.headers?.['x-retry-count'] as number) || 0;

            if (retryCount < this.MAX_RETRIES) {
              // Republish with incremented retry count
              const newHeaders = {
                ...msg.properties.headers,
                'x-retry-count': retryCount + 1,
              };

              await this.channelWrapper.publish(
                this.EXCHANGE,
                'email',
                msg.content,
                {
                  ...msg.properties,
                  headers: newHeaders,
                  deliveryMode: 2,
                },
              );

              this.logger.warn(
                `Requeued message after retry ${retryCount + 1}/${this.MAX_RETRIES}`,
              );
            } else {
              this.logger.error(
                `Message failed after ${this.MAX_RETRIES} retries, moving to DLQ`,
              );
            }

            // Acknowledge to prevent infinite loop
            this.channelWrapper.ack(msg);
          }
        },
        { noAck: false },
      );

      this.logger.log('Started consuming messages from email queue');
    } catch (error) {
      this.logger.error('Failed to start consuming messages', error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channelWrapper) {
        await this.channelWrapper.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error during RabbitMQ disconnection', error);
    }
  }

  async publishToFailedQueue(message: any): Promise<void> {
    try {
      await this.channelWrapper.sendToQueue('email.failed.queue', message, {
        deliveryMode: 2,
      } as any);
      this.logger.log(
        `Message moved to failed queue: ${message.notification_id}`,
      );
    } catch (error) {
      this.logger.error('Failed to publish to failed queue', error);
    }
  }

  async publishStatusUpdate(
    notificationId: string,
    status: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const payload = {
        notification_id: notificationId,
        status,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      };

      await this.channelWrapper.publish(
        this.STATUS_EXCHANGE,
        this.STATUS_ROUTING_KEY,
        payload,
        { deliveryMode: 2 } as any,
      );

      this.logger.log(
        `Published status update for ${notificationId}: ${status}`,
      );
    } catch (error) {
      this.logger.error('Failed to publish status update', error);
    }
  }
}
