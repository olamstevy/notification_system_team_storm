import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import { CircuitBreakerService } from '../../../libs/common/src/circuit-breaker/circuit-breaker.service';
import { RetryService } from '../../../libs/common/src/retry/retry.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface PushMessage {
  notification_id: string;
  user_id: string;
  template_code: string;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  image?: string;
  link?: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushServiceService implements OnModuleInit {
  private readonly logger = new Logger(PushServiceService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private fcmServerKey: string;

  private readonly PUSH_QUEUE = 'push.queue';
  private readonly FAILED_QUEUE = 'failed.queue';
  private readonly FCM_URL = 'https://fcm.googleapis.com/fcm/send';

  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryService: RetryService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    this.fcmServerKey = process.env.FCM_SERVER_KEY || '';
    await this.connectToRabbitMQ();
  }

  private async connectToRabbitMQ() {
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
      setup: async (channel: any) => {
        await channel.assertQueue(this.PUSH_QUEUE, { durable: true });
        await channel.assertQueue(this.FAILED_QUEUE, { durable: true });
        await channel.prefetch(1); // Process one message at a time

        await channel.consume(
          this.PUSH_QUEUE,
          async (msg: ConsumeMessage | null) => {
            if (msg) {
              await this.handleMessage(msg, channel);
            }
          },
        );

        this.logger.log('Push service listening on queue');
      },
    });
  }

  private async handleMessage(msg: ConsumeMessage, channel: any) {
    try {
      const message: PushMessage = JSON.parse(msg.content.toString());
      this.logger.log(`Processing push: ${message.notification_id}`);

      await this.processPushNotification(message);

      // Acknowledge successful processing
      channel.ack(msg);
      this.logger.log(`Push sent successfully: ${message.notification_id}`);

      // Update notification status
      await this.updateNotificationStatus(
        message.notification_id,
        'delivered',
      );
    } catch (error) {
      this.logger.error('Failed to process push notification', error);

      // Send to failed queue after max retries
      const message: PushMessage = JSON.parse(msg.content.toString());
      await this.sendToFailedQueue(message, error.message);

      // Acknowledge to remove from queue
      channel.ack(msg);

      // Update notification status
      await this.updateNotificationStatus(
        message.notification_id,
        'failed',
        error.message,
      );
    }
  }

  private async processPushNotification(message: PushMessage): Promise<void> {
    // Fetch user push token
    const user = await this.fetchUser(message.user_id);
    if (!user?.push_token) {
      throw new Error('User push token not found');
    }

    // Check user preferences
    if (user.preferences?.push === false) {
      this.logger.log(`User ${message.user_id} has push notifications disabled`);
      return;
    }

    // Validate push token
    if (!this.isValidPushToken(user.push_token)) {
      throw new Error('Invalid push token format');
    }

    // Fetch and render template
    const pushContent = await this.fetchAndRenderTemplate(
      message.template_code,
      message.variables,
    );

    // Send push notification with retry and circuit breaker
    const result = await this.retryService.executeWithRetry(
      async () => {
        return await this.circuitBreaker.execute(
          'fcm',
          async () => {
            return await this.sendFCMNotification(
              user.push_token,
              pushContent,
            );
          },
        );
      },
      `push-${message.notification_id}`,
    );

    if (!result.success) {
      throw new Error(`Failed to send push after ${result.attempts} attempts`);
    }
  }

  private async sendFCMNotification(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.FCM_URL,
          {
            to: token,
            notification: {
              title: payload.title,
              body: payload.body,
              image: payload.image,
              click_action: payload.link,
            },
            data: payload.data || {},
            priority: 'high',
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${this.fcmServerKey}`,
            },
          },
        ),
      );

      if (response.data.failure > 0) {
        throw new Error(`FCM send failed: ${JSON.stringify(response.data)}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error('FCM send error', error);
      throw error;
    }
  }

  private isValidPushToken(token: string): boolean {
    // Basic validation - adjust based on your push provider
    return token && token.length > 20;
  }

  private async fetchUser(user_id: string): Promise<any> {
    try {
      const userServiceUrl =
        process.env.USER_SERVICE_URL || 'http://localhost:3001';
      const response = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/api/v1/users/${user_id}`),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${user_id}`, error);
      throw error;
    }
  }

  private async fetchAndRenderTemplate(
    template_code: string,
    variables: Record<string, any>,
  ): Promise<PushNotificationPayload> {
    try {
      const templateServiceUrl =
        process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3002';
      const response = await firstValueFrom(
        this.httpService.post(
          `${templateServiceUrl}/api/v1/templates/render`,
          {
            template_code,
            variables,
            type: 'push',
          },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to fetch template ${template_code}`, error);
      throw error;
    }
  }

  private async updateNotificationStatus(
    notification_id: string,
    status: string,
    error?: string,
  ): Promise<void> {
    try {
      const apiGatewayUrl =
        process.env.API_GATEWAY_URL || 'http://localhost:3000';
      await firstValueFrom(
        this.httpService.post(
          `${apiGatewayUrl}/api/v1/push/status`,
          {
            notification_id,
            status,
            timestamp: new Date().toISOString(),
            error,
          },
        ),
      );
    } catch (error) {
      this.logger.error('Failed to update notification status', error);
    }
  }

  private async sendToFailedQueue(
    message: PushMessage,
    error: string,
  ): Promise<void> {
    try {
      await this.channelWrapper.sendToQueue(
        this.FAILED_QUEUE,
        {
          ...message,
          service: 'push',
          error,
          failed_at: new Date().toISOString(),
        },
        { persistent: true },
      );
      this.logger.log(`Sent to failed queue: ${message.notification_id}`);
    } catch (error) {
      this.logger.error('Failed to send to failed queue', error);
    }
  }

  async getHealth(): Promise<any> {
    const fcmHealthy = !!this.fcmServerKey;
    const rabbitmqHealthy = this.connection?.isConnected() || false;

    return {
      success: fcmHealthy && rabbitmqHealthy,
      message: fcmHealthy && rabbitmqHealthy ? 'Push service is healthy' : 'Push service is unhealthy',
      data: {
        status: fcmHealthy && rabbitmqHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        fcm: fcmHealthy ? 'configured' : 'not configured',
        rabbitmq: rabbitmqHealthy ? 'connected' : 'disconnected',
        circuit_breaker_state: this.circuitBreaker.getCircuitState('fcm'),
      },
    };
  }
}
