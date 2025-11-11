import { Module } from '@nestjs/common';
import { TemplateServiceController } from './template_service.controller';
import { TemplateServiceService } from './template_service.service';

@Module({
  imports: [],
  controllers: [TemplateServiceController],
  providers: [TemplateServiceService],
})
export class TemplateServiceModule {}
