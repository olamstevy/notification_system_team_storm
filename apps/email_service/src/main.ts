import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { EmailServiceModule } from './email_service.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(EmailServiceModule);

  // Add global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Email Service listening on port ${port}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Failed to start email service', err);
  process.exit(1);
});
