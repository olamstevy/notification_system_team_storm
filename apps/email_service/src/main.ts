import { NestFactory } from '@nestjs/core';
import { EmailServiceModule } from './email_service.module';

async function bootstrap() {
  const app = await NestFactory.create(EmailServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
