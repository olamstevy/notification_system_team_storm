import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TemplateServiceService } from './template_service.service';

@Controller('api/v1')
export class TemplateServiceController {
  constructor(private readonly templateServiceService: TemplateServiceService) {}

  @Get('health')
  async getHealth() {
    return this.templateServiceService.getHealth();
  }

  @Post('templates/render')
  async renderTemplate(
    @Body() dto: {
      template_code: string;
      variables: Record<string, any>;
      type?: 'email' | 'push';
      language?: string;
    },
  ) {
    const result = await this.templateServiceService.renderTemplate(dto);
    return {
      success: true,
      message: 'Template rendered successfully',
      data: result,
    };
  }

  @Get('templates')
  async getAllTemplates() {
    const templates = await this.templateServiceService.getAllTemplates();
    return {
      success: true,
      message: 'Templates retrieved successfully',
      data: templates,
    };
  }

  @Get('templates/:code')
  async getTemplate(
    @Param('code') code: string,
    @Query('type') type?: string,
    @Query('language') language?: string,
  ) {
    const template = await this.templateServiceService.getTemplate(
      code,
      type,
      language,
    );
    return {
      success: true,
      message: 'Template retrieved successfully',
      data: template,
    };
  }

  @Post('templates')
  async createTemplate(@Body() templateData: any) {
    const template = await this.templateServiceService.createTemplate(
      templateData,
    );
    return {
      success: true,
      message: 'Template created successfully',
      data: template,
    };
  }
}
