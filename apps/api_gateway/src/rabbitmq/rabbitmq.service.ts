import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { NotificationType } from '../enums/notification.enum';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  private readonly EXCHANGE = 'notifications.direct';
  private readonly EMAIL_QUEUE = 'email.queue';
  private readonly PUSH_QUEUE = 'push.queue';
  private readonly FAILED_QUEUE = 'failed.queue';

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    try {
      const rabbitmqUrl =
        process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

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
          // Declare exchange
          await channel.assertExchange(this.EXCHANGE, 'direct', {
            durable: true,
          });

          // Declare queues
          await channel.assertQueue(this.EMAIL_QUEUE, { durable: true });
          await channel.assertQueue(this.PUSH_QUEUE, { durable: true });
          await channel.assertQueue(this.FAILED_QUEUE, { durable: true });

          // Bind queues to exchange
          await channel.bindQueue(
            this.EMAIL_QUEUE,
            this.EXCHANGE,
            NotificationType.EMAIL,
          );
          await channel.bindQueue(
            this.PUSH_QUEUE,
            this.EXCHANGE,
            NotificationType.PUSH,
          );

          this.logger.log('RabbitMQ channel setup completed');
        },
      });
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }

  async publishNotification(
    notificationType: NotificationType,
    message: any,
  ): Promise<boolean> {
    try {
      await this.channelWrapper.publish(
        this.EXCHANGE,
        notificationType,
        message,
        {
          deliveryMode: 2, // persistent
          contentType: 'application/json',
        } as any,
      );

      this.logger.log(
        `Published ${notificationType} notification: ${message.notification_id}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to publish notification', error);
      return false;
    }
  }

  async publishToFailedQueue(message: any): Promise<void> {
    try {
      await this.channelWrapper.sendToQueue(this.FAILED_QUEUE, message, {
        deliveryMode: 2, // persistent
      } as any);
      this.logger.log(`Sent message to failed queue`);
    } catch (error) {
      this.logger.error('Failed to publish to failed queue', error);
    }
  }

  async close() {
    await this.channelWrapper.close();
    await this.connection.close();
  }
}
