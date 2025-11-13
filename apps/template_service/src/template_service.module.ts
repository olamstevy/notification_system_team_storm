import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplateServiceController } from './template_service.controller';
import { TemplateServiceService } from './template_service.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [TemplateServiceController],
  providers: [TemplateServiceService],
})
export class TemplateServiceModule {}
