import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { CreateTemplateDto, RenderTemplateDto } from "./template.dto";

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) {}

  // Create a new template. We do not auto-increment version here for simplicity.
  async create(createDto: CreateTemplateDto) {
    // Check if there is existing latest version for this code
    const latest = await this.prisma.template.findFirst({
      where: { code: createDto.code },
      orderBy: { version: "desc" },
    });

    const version = latest ? latest.version + 1 : 1;

    const created = await this.prisma.template.create({
      data: {
        code: createDto.code,
        subject: createDto.subject,
        body: createDto.body,
        language: createDto.language || "en",
        version,
      },
    });

    return created;
  }

  // Fetch latest template by code
  async findByCode(code: string) {
    const template = await this.prisma.template.findFirst({
      where: { code },
      orderBy: { version: "desc" },
    });
    if (!template) {
      throw new NotFoundException("Template not found");
    }
    return template;
  }

  // Render template: replace {{key}} with value
  async render(code: string, data: RenderTemplateDto) {
    const template = await this.findByCode(code);
    let rendered = template.body;

    for (const [key, value] of Object.entries(data.variables || {})) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      rendered = rendered.replace(pattern, value);
    }

    return {
      ...template,
      rendered,
    };
  }

  async getAll() {
    return await this.prisma.template.findMany(); // fetches all templates
  }
}
