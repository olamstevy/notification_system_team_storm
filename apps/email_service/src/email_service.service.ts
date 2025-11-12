import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmtpEmailProvider } from './providers/smtp.provider';
import { HttpClientService } from './services/http-client.service';
import { RabbitMQConsumerService } from './rabbitmq/rabbitmq-consumer.service';
import { QueueMessage } from './interfaces/email.interface';

@Injectable()
export class EmailServiceService {
  private readonly logger = new Logger(EmailServiceService.name);
  private retryAttempts = 0;

  constructor(
    private configService: ConfigService,
    private smtpProvider: SmtpEmailProvider,
    private httpClient: HttpClientService,
    private rabbitMQConsumer: RabbitMQConsumerService,
  ) { }

  async processEmailNotification(message: QueueMessage): Promise<void> {
    try {
      // Fetch user details
      const userResponse = await this.httpClient.getUser(message.user_id);
      const userEmail: string = userResponse.data?.email;

      if (!userEmail) {
        await this.updateNotificationStatus(
          message.notification_id,
          'failed',
          'User has no email address',
        );
        return;
      }

      // Render template with variables
      const renderedTemplate = await this.renderTemplate(
        message.template_code,
        message.variables || {},
      );

      // Send email
      const sendResult = await this.sendEmail(
        userEmail,
        renderedTemplate.subject,
        renderedTemplate.body,
        renderedTemplate.rendered,
        message.notification_id,
      );

      if (sendResult.success) {
        // Update status to sent
        await this.updateNotificationStatus(
          message.notification_id,
          'sent',
          undefined,
          { messageId: sendResult.messageId },
        );

        this.logger.log(
          `Email sent successfully for notification: ${message.notification_id}`,
        );
      } else {
        // Update status to failed
        await this.updateNotificationStatus(
          message.notification_id,
          'failed',
          sendResult.error,
        );

        this.logger.error(
          `Failed to send email for notification: ${message.notification_id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing email notification: ${message.notification_id}`,
        error,
      );

      // Update status to failed
      await this.updateNotificationStatus(
        message.notification_id,
        'failed',
        `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      throw error;
    }
  }

  private async renderTemplate(
    templateCode: string,
    variables: Record<string, any>,
  ): Promise<any> {
    try {
      const template = await this.httpClient.renderTemplate(
        templateCode,
        variables,
      );

      // Ensure we have rendered content
      if (!template.subject || !template.rendered) {
        throw new BadRequestException(
          'Template missing required fields (subject, body)',
        );
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to render template ${templateCode}`, error);
      throw error;
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    plainTextBody: string,
    htmlBody: string,
    notificationId: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await this.smtpProvider.sendEmail(
        to,
        subject,
        plainTextBody,
        htmlBody,
      );

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email to ${to} for notification ${notificationId}`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update notification status via API gateway
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: string,
    errorMessage?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Publish status update asynchronously to status exchange so API Gateway
      // or other interested services can process the update.
      await this.rabbitMQConsumer.publishStatusUpdate(notificationId, status, {
        ...metadata,
        error: errorMessage,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish notification status for ${notificationId}`,
        error,
      );
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: 'healthy',
      timestamp: new Date(),
    };
  }

  /**
   * Get service status with queue information
   */
  async getServiceStatus(): Promise<any> {
    try {
      const smtpConnected = await this.smtpProvider.verifyConnection();

      return {
        status: 'ok',
        service: 'email_service',
        smtp_connected: smtpConnected,
        queue_consumer_active: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get service status', error);
      return {
        status: 'error',
        service: 'email_service',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }
}
