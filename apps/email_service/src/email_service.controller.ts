import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmailServiceService } from './email_service.service';

@Controller('api/v1')
export class EmailServiceController {
  constructor(private readonly emailServiceService: EmailServiceService) { }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return {
      success: true,
      data: await this.emailServiceService.healthCheck(),
      message: 'Email service is healthy',
    };
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getStatus() {
    return {
      success: true,
      data: await this.emailServiceService.getServiceStatus(),
      message: 'Service status retrieved',
    };
  }
}
