import { Module } from "@nestjs/common";
import { TemplateController } from "./template_service.controller";
import { TemplateService } from "./template_service.service";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [TemplateController],
  providers: [TemplateService, PrismaService],
})
export class TemplateModule {}
