import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConsumeMessage } from 'amqplib';
import * as nodemailer from 'nodemailer';
import { CircuitBreakerService } from '../../../libs/common/src/circuit-breaker/circuit-breaker.service';
import { RetryService } from '../../../libs/common/src/retry/retry.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface EmailMessage {
  notification_id: string;
  user_id: string;
  template_code: string;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class EmailServiceService implements OnModuleInit {
  private readonly logger = new Logger(EmailServiceService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private transporter: nodemailer.Transporter;

  private readonly EMAIL_QUEUE = 'email.queue';
  private readonly FAILED_QUEUE = 'failed.queue';

  constructor(
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly retryService: RetryService,
    private readonly httpService: HttpService,
  ) { }

  async onModuleInit() {
    await this.setupEmailTransporter();
    await this.connectToRabbitMQ();
  }

  private async setupEmailTransporter() {
    // Configure SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
    } catch (error) {
      this.logger.error('SMTP connection failed', error);
    }
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
        await channel.assertQueue(this.EMAIL_QUEUE, { durable: true });
        await channel.assertQueue(this.FAILED_QUEUE, { durable: true });
        await channel.prefetch(1); // Process one message at a time

        await channel.consume(
          this.EMAIL_QUEUE,
          async (msg: ConsumeMessage | null) => {
            if (msg) {
              await this.handleMessage(msg, channel);
            }
          },
        );

        this.logger.log('Email service listening on queue');
      },
    });
  }

  private async handleMessage(msg: ConsumeMessage, channel: any) {
    try {
      const message: EmailMessage = JSON.parse(msg.content.toString());
      this.logger.log(`Processing email: ${message.notification_id}`);

      await this.processEmail(message);

      // Acknowledge successful processing
      channel.ack(msg);
      this.logger.log(`Email sent successfully: ${message.notification_id}`);

      // Update notification status
      await this.updateNotificationStatus(message.notification_id, 'delivered');
    } catch (error) {
      this.logger.error('Failed to process email', error);

      // Send to failed queue after max retries
      const message: EmailMessage = JSON.parse(msg.content.toString());
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

  private async processEmail(message: EmailMessage): Promise<void> {
    // Fetch user email
    const user = await this.fetchUser(message.user_id);
    if (!user?.email) {
      throw new Error('User email not found');
    }

    // Check user preferences
    if (user.preferences?.email === false) {
      this.logger.log(
        `User ${message.user_id} has email notifications disabled`,
      );
      return;
    }

    // Fetch and render template
    const emailContent = await this.fetchAndRenderTemplate(
      message.template_code,
      message.variables,
    );

    // Send email with retry and circuit breaker
    const result = await this.retryService.executeWithRetry(async () => {
      return await this.circuitBreaker.execute('smtp', async () => {
        return await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@notifications.com',
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      });
    }, `email-${message.notification_id}`);

    if (!result.success) {
      throw new Error(`Failed to send email after ${result.attempts} attempts`);
    }
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
  ): Promise<{ subject: string; html: string; text: string }> {
    try {
      const templateServiceUrl =
        process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3002';
      const response = await firstValueFrom(
        this.httpService.post(`${templateServiceUrl}/api/v1/templates/render`, {
          template_code,
          variables,
        }),
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
        this.httpService.post(`${apiGatewayUrl}/api/v1/email/status`, {
          notification_id,
          status,
          timestamp: new Date().toISOString(),
          error,
        }),
      );
    } catch (error) {
      this.logger.error('Failed to update notification status', error);
    }
  }

  private async sendToFailedQueue(
    message: EmailMessage,
    error: string,
  ): Promise<void> {
    try {
      await this.channelWrapper.sendToQueue(
        this.FAILED_QUEUE,
        {
          ...message,
          service: 'email',
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
    const smtpHealthy = await this.checkSMTPHealth();
    const rabbitmqHealthy = this.connection?.isConnected() || false;

    return {
      success: smtpHealthy && rabbitmqHealthy,
      message:
        smtpHealthy && rabbitmqHealthy
          ? 'Email service is healthy'
          : 'Email service is unhealthy',
      data: {
        status: smtpHealthy && rabbitmqHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        smtp: smtpHealthy ? 'connected' : 'disconnected',
        rabbitmq: rabbitmqHealthy ? 'connected' : 'disconnected',
        circuit_breaker_state: this.circuitBreaker.getCircuitState('smtp'),
      },
    };
  }

  private async checkSMTPHealth(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }
}
