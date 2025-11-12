import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { TemplateModule } from "./template_service.module";

@Module({
  imports: [TemplateModule],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Use JSON parsing and set global prefix if you like. Keep defaults to keep it simple.
  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 4000);
  console.log(`Template Service running on http://localhost:${process.env.PORT || 4000}`);
}
bootstrap();
