import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailProvider } from '../interfaces/email.interface';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const provider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');

    if (provider === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('GMAIL_EMAIL'),
          pass: this.configService.get<string>('GMAIL_PASSWORD'),
        },
      });
    } else {
      // Default SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST', 'localhost'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASSWORD'),
        },
      });
    }

    this.logger.log(`Email transporter initialized with provider: ${provider}`);
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    htmlBody?: string,
  ): Promise<{ messageId: string; success: boolean }> {
    try {
      const mailOptions = {
        from: this.configService.get<string>(
          'EMAIL_FROM',
          'noreply@example.com',
        ),
        to,
        subject,
        text: body,
        html: htmlBody || body,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email sent successfully to ${to}. Message ID: ${info.messageId}`,
      );

      return {
        messageId: info.messageId,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to verify SMTP connection', error);
      return false;
    }
  }
}
