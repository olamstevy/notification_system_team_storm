import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiGatewayService } from './api_gateway.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { ApiResponse } from './interfaces/response.interface';

@Controller('api/v1')
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Post('notifications')
  @HttpCode(HttpStatus.CREATED)
  async createNotification(
    @Body(ValidationPipe) dto: CreateNotificationDto,
  ): Promise<ApiResponse> {
    return this.apiGatewayService.createNotification(dto);
  }

  @Post(':notification_preference/status')
  @HttpCode(HttpStatus.OK)
  async updateNotificationStatus(
    @Param('notification_preference') notificationPreference: string,
    @Body(ValidationPipe) dto: UpdateNotificationStatusDto,
  ): Promise<ApiResponse> {
    return this.apiGatewayService.updateNotificationStatus(
      notificationPreference,
      dto,
    );
  }

  @Get('notifications/:id/status')
  async getNotificationStatus(
    @Param('id') notificationId: string,
  ): Promise<ApiResponse> {
    return this.apiGatewayService.getNotificationStatus(notificationId);
  }

  @Get('health')
  async healthCheck(): Promise<ApiResponse> {
    return this.apiGatewayService.healthCheck();
  }
}
