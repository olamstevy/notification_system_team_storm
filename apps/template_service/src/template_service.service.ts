import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as Handlebars from 'handlebars';

interface Template {
  id: string;
  code: string;
  name: string;
  type: 'email' | 'push';
  language: string;
  version: number;
  email_subject?: string;
  email_html?: string;
  email_text?: string;
  push_title?: string;
  push_body?: string;
  variables: string[];
  created_at: Date;
  updated_at: Date;
}

interface RenderTemplateDto {
  template_code: string;
  variables: Record<string, any>;
  type?: 'email' | 'push';
  language?: string;
}

@Injectable()
export class TemplateServiceService {
  private readonly logger = new Logger(TemplateServiceService.name);
  
  // In-memory storage for demo - should be replaced with database
  private templates: Map<string, Template[]> = new Map();

  constructor() {
    this.seedTemplates();
  }

  private seedTemplates() {
    // Seed some default templates for testing
    const welcomeEmail: Template = {
      id: '1',
      code: 'welcome',
      name: 'Welcome Email',
      type: 'email',
      language: 'en',
      version: 1,
      email_subject: 'Welcome to {{app_name}}!',
      email_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome {{name}}!</h1>
          <p>Thank you for joining us. We're excited to have you on board.</p>
          <p>Click the button below to get started:</p>
          <a href="{{link}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Get Started
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `,
      email_text: 'Welcome {{name}}! Thank you for joining us. Visit {{link}} to get started.',
      variables: ['name', 'link', 'app_name'],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const welcomePush: Template = {
      id: '2',
      code: 'welcome',
      name: 'Welcome Push',
      type: 'push',
      language: 'en',
      version: 1,
      push_title: 'Welcome to {{app_name}}!',
      push_body: 'Hi {{name}}, thanks for joining us. Tap to explore!',
      variables: ['name', 'app_name'],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const newMessageEmail: Template = {
      id: '3',
      code: 'new_message',
      name: 'New Message Email',
      type: 'email',
      language: 'en',
      version: 1,
      email_subject: 'You have a new message from {{sender_name}}',
      email_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Message</h2>
          <p><strong>From:</strong> {{sender_name}}</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            {{message_preview}}
          </div>
          <a href="{{link}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Message
          </a>
        </div>
      `,
      email_text: 'New message from {{sender_name}}: {{message_preview}}. View at {{link}}',
      variables: ['sender_name', 'message_preview', 'link'],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const newMessagePush: Template = {
      id: '4',
      code: 'new_message',
      name: 'New Message Push',
      type: 'push',
      language: 'en',
      version: 1,
      push_title: 'New message from {{sender_name}}',
      push_body: '{{message_preview}}',
      variables: ['sender_name', 'message_preview'],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const passwordResetEmail: Template = {
      id: '5',
      code: 'password_reset',
      name: 'Password Reset Email',
      type: 'email',
      language: 'en',
      version: 1,
      email_subject: 'Reset your password',
      email_html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi {{name}},</p>
          <p>We received a request to reset your password. Click the button below to choose a new password:</p>
          <a href="{{link}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
      email_text: 'Reset your password: {{link}} (expires in 1 hour)',
      variables: ['name', 'link'],
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Store templates
    this.templates.set('welcome-email-en', [welcomeEmail]);
    this.templates.set('welcome-push-en', [welcomePush]);
    this.templates.set('new_message-email-en', [newMessageEmail]);
    this.templates.set('new_message-push-en', [newMessagePush]);
    this.templates.set('password_reset-email-en', [passwordResetEmail]);

    this.logger.log('Seeded default templates');
  }

  async renderTemplate(dto: RenderTemplateDto): Promise<any> {
    const language = dto.language || 'en';
    const type = dto.type || 'email';
    
    const key = `${dto.template_code}-${type}-${language}`;
    const templates = this.templates.get(key);

    if (!templates || templates.length === 0) {
      throw new NotFoundException(
        `Template '${dto.template_code}' not found for type '${type}' and language '${language}'`,
      );
    }

    // Get latest version
    const template = templates[templates.length - 1];

    // Render template
    if (type === 'email') {
      return {
        subject: this.renderString(template.email_subject || '', dto.variables),
        html: this.renderString(template.email_html || '', dto.variables),
        text: this.renderString(template.email_text || '', dto.variables),
      };
    } else {
      return {
        title: this.renderString(template.push_title || '', dto.variables),
        body: this.renderString(template.push_body || '', dto.variables),
        link: dto.variables.link || '',
        image: dto.variables.image || null,
        data: dto.variables.meta || {},
      };
    }
  }

  private renderString(template: string, variables: Record<string, any>): string {
    try {
      // Add default variables
      const data = {
        app_name: 'NotificationSystem',
        ...variables,
      };

      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data);
    } catch (error) {
      this.logger.error('Template rendering error', error);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  async getTemplate(template_code: string, type?: string, language?: string): Promise<Template> {
    const lang = language || 'en';
    const templateType = type || 'email';
    const key = `${template_code}-${templateType}-${lang}`;
    
    const templates = this.templates.get(key);
    if (!templates || templates.length === 0) {
      throw new NotFoundException(`Template '${template_code}' not found`);
    }

    return templates[templates.length - 1];
  }

  async getAllTemplates(): Promise<Template[]> {
    const allTemplates: Template[] = [];
    this.templates.forEach((templates) => {
      allTemplates.push(...templates);
    });
    return allTemplates;
  }

  async createTemplate(templateData: Partial<Template>): Promise<Template> {
    const template: Template = {
      id: Date.now().toString(),
      code: templateData.code || '',
      name: templateData.name || '',
      type: templateData.type || 'email',
      language: templateData.language || 'en',
      version: 1,
      email_subject: templateData.email_subject,
      email_html: templateData.email_html,
      email_text: templateData.email_text,
      push_title: templateData.push_title,
      push_body: templateData.push_body,
      variables: templateData.variables || [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const key = `${template.code}-${template.type}-${template.language}`;
    const existing = this.templates.get(key) || [];
    existing.push(template);
    this.templates.set(key, existing);

    this.logger.log(`Created template: ${template.code}`);
    return template;
  }

  async getHealth(): Promise<any> {
    const templateCount = Array.from(this.templates.values()).reduce(
      (sum, templates) => sum + templates.length,
      0,
    );

    return {
      success: true,
      message: 'Template service is healthy',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        templates_loaded: templateCount,
        supported_languages: ['en'],
        supported_types: ['email', 'push'],
      },
    };
  }
}
