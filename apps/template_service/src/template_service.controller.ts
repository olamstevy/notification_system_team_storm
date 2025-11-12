import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { TemplateService } from "./template_service.service";
import * as templateDto from "./template.dto";

@Controller("api/v1/templates")
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  @Post()
  async create(@Body() body: templateDto.CreateTemplateDto) {
    const data = await this.templateService.create(body);
    return {
      success: true,
      data,
      message: "template_created",
      meta: {
        total: 1, limit: 1, page: 1, total_pages: 1, has_next: false, has_previous: false
      }
    };
  }

  @Get(":code")
  async getByCode(@Param("code") code: string) {
    const data = await this.templateService.findByCode(code);
    return { success: true, data, message: "template_fetched", meta: { total: 1, limit: 1, page: 1, total_pages: 1, has_next: false, has_previous: false }};
  }

  @Post("render/:code")
  async render(@Param("code") code: string, @Body() body: templateDto.RenderTemplateDto) {
    const data = await this.templateService.render(code, body);
    return { success: true, data, message: "template_rendered", meta: { total: 1, limit: 1, page: 1, total_pages: 1, has_next: false, has_previous: false }};
  }

  @Get()
  async getAllTemplates() {
    const templates = await this.templateService.getAll();
    return {
      success: true,
      data: templates,
      message: 'All templates fetched successfully',
      meta: {
        total: templates.length,
        limit: templates.length,
        page: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false
      }
    };
  }
}
