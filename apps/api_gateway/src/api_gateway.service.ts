import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { ApiResponse } from './interfaces/response.interface';
import { NotificationStatus, NotificationType } from './enums/notification.enum';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly httpService: HttpService,
  ) {}

  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<ApiResponse> {
    // Check for idempotency - prevent duplicate notifications
    const existingNotification = await this.prisma.notification.findUnique({
      where: { request_id: dto.request_id },
    });

    if (existingNotification) {
      throw new ConflictException(
        `Notification with request_id ${dto.request_id} already exists`,
      );
    }

    // Validate user exists by calling user service
    try {
      const userServiceUrl =
        process.env.USER_SERVICE_URL || 'http://localhost:3001';
      await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/api/v1/users/${dto.user_id}`),
      );
    } catch (error) {
      throw new NotFoundException(
        `User with id ${dto.user_id} not found`,
      );
    }

    // Validate template exists by calling template service
    try {
      const templateServiceUrl =
        process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3002';
      await firstValueFrom(
        this.httpService.get(
          `${templateServiceUrl}/api/v1/templates/${dto.template_code}`,
        ),
      );
    } catch (error) {
      throw new NotFoundException(
        `Template with code ${dto.template_code} not found`,
      );
    }

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        notification_type: dto.notification_type as any,
        user_id: dto.user_id,
        template_code: dto.template_code,
        variables: dto.variables as any,
        request_id: dto.request_id,
        priority: dto.priority || 5,
        metadata: dto.metadata as any,
        status: NotificationStatus.PENDING as any,
      },
    });

    // Create initial status history
    await this.prisma.notification_status.create({
      data: {
        notification_id: notification.id,
        status: NotificationStatus.PENDING as any,
      },
    });

    // Publish to appropriate RabbitMQ queue
    const queueMessage = {
      notification_id: notification.id,
      notification_type: dto.notification_type,
      user_id: dto.user_id,
      template_code: dto.template_code,
      variables: dto.variables,
      priority: dto.priority || 5,
      metadata: dto.metadata,
    };

    const published = await this.rabbitmq.publishNotification(
      dto.notification_type,
      queueMessage,
    );

    if (!published) {
      this.logger.error(
        `Failed to publish notification ${notification.id} to queue`,
      );
    }

    return {
      success: true,
      message: 'Notification queued successfully',
      data: {
        notification_id: notification.id,
        status: notification.status,
        created_at: notification.created_at,
      },
    };
  }

  async updateNotificationStatus(
    notificationPreference: string,
    dto: UpdateNotificationStatusDto,
  ): Promise<ApiResponse> {
    // Validate notification preference
    if (
      notificationPreference !== NotificationType.EMAIL &&
      notificationPreference !== NotificationType.PUSH
    ) {
      throw new HttpException(
        'Invalid notification preference. Must be email or push',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Find notification
    const notification = await this.prisma.notification.findUnique({
      where: { id: dto.notification_id },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with id ${dto.notification_id} not found`,
      );
    }

    // Update notification status
    const updatedNotification = await this.prisma.notification.update({
      where: { id: dto.notification_id },
      data: { status: dto.status as any },
    });

    // Create status history entry
    await this.prisma.notification_status.create({
      data: {
        notification_id: dto.notification_id,
        status: dto.status as any,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        error: dto.error,
      },
    });

    return {
      success: true,
      message: 'Notification status updated successfully',
      data: {
        notification_id: updatedNotification.id,
        status: updatedNotification.status,
        updated_at: updatedNotification.updated_at,
      },
    };
  }

  async getNotificationStatus(notificationId: string): Promise<ApiResponse> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        status_history: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with id ${notificationId} not found`,
      );
    }

    return {
      success: true,
      message: 'Notification status retrieved successfully',
      data: {
        notification_id: notification.id,
        notification_type: notification.notification_type,
        user_id: notification.user_id,
        status: notification.status,
        created_at: notification.created_at,
        updated_at: notification.updated_at,
        status_history: notification.status_history,
      },
    };
  }

  async healthCheck(): Promise<ApiResponse> {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        success: true,
        message: 'API Gateway is healthy',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected',
          rabbitmq: 'connected',
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'API Gateway is unhealthy',
        error: error.message,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
