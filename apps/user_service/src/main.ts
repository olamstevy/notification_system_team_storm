import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { UserServiceModule } from './user_service.module';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);

  // Enable CORS
  app.enableCors();

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`User Service is running on: http://localhost:${port}`);
  console.log(
    `API Documentation: http://localhost:${port}/api/v1/users/health`,
  );
}

void bootstrap();
