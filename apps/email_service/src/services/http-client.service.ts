import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) { }

  /**
   * Fetch user preferences from user service
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      const userServiceUrl =
        this.configService.get<string>('USER_SERVICE_URL') ||
        'http://localhost:3001';
      const response = await firstValueFrom(
        this.httpService.get(
          `${userServiceUrl}/api/v1/users/${userId}/preferences`,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user preferences for ${userId}`,
        error,
      );
      throw new NotFoundException(
        `User ${userId} not found or preferences unavailable`,
      );
    }
  }

  /**
   * Fetch user details from user service
   */
  async getUser(userId: string): Promise<any> {
    try {
      const userServiceUrl =
        this.configService.get<string>('USER_SERVICE_URL') ||
        'http://localhost:3001';
      const response = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/api/v1/users/${userId}`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch user details for ${userId}`, error);
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  /**
   * Fetch template from template service and render it
   */
  async renderTemplate(
    templateCode: string,
    variables: Record<string, any>,
  ): Promise<any> {
    try {
      const templateServiceUrl =
        this.configService.get<string>('TEMPLATE_SERVICE_URL') ||
        'http://localhost:3002';
      const response = await firstValueFrom(
        this.httpService.post(
          `${templateServiceUrl}/api/v1/templates/render/${templateCode}`,
          { variables },
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to render template ${templateCode}`, error);
      throw new NotFoundException(
        `Template ${templateCode} not found or rendering failed`,
      );
    }
  }

  /**
   * Fetch template by code from template service
   */
  async getTemplate(templateCode: string): Promise<any> {
    try {
      const templateServiceUrl =
        this.configService.get<string>('TEMPLATE_SERVICE_URL') ||
        'http://localhost:3002';
      const response = await firstValueFrom(
        this.httpService.get(
          `${templateServiceUrl}/api/v1/templates/${templateCode}`,
        ),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to fetch template ${templateCode}`, error);
      throw new NotFoundException(`Template ${templateCode} not found`);
    }
  }

  /**
   * Update notification status in API gateway
   */
  async updateNotificationStatus(
    notificationId: string,
    status: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    try {
      const apiGatewayUrl =
        this.configService.get<string>('API_GATEWAY_URL') ||
        'http://localhost:3000';
      const response = await firstValueFrom(
        this.httpService.post(`${apiGatewayUrl}/api/v1/email/status`, {
          notification_id: notificationId,
          status,
          metadata,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to update notification status for ${notificationId}`,
        error,
      );
      throw new BadRequestException('Failed to update notification status');
    }
  }
}
