import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EmailServiceController } from './email_service.controller';
import { EmailServiceService } from './email_service.service';
import { SmtpEmailProvider } from './providers/smtp.provider';
import { HttpClientService } from './services/http-client.service';
import { RabbitMQConsumerService } from './rabbitmq/rabbitmq-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
  ],
  controllers: [EmailServiceController],
  providers: [
    EmailServiceService,
    SmtpEmailProvider,
    HttpClientService,
    RabbitMQConsumerService,
  ],
})
export class EmailServiceModule { }
