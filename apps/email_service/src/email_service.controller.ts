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
  async getHealth() {
    return this.emailServiceService.getHealth();
  }
}
