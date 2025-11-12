import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ApiGatewayController } from './api_gateway.controller';
import { ApiGatewayService } from './api_gateway.service';
import { PrismaService } from './prisma.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService, PrismaService, RabbitMQService],
})
export class ApiGatewayModule {}
