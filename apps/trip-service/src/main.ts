import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { TripServiceModule } from './trip-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TripServiceModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors();
  await app.listen(process.env.port ?? 4000);
  console.log(
    `🚀 Application is running on: http://localhost:${process.env.port ?? 4000}`,
  );
}
bootstrap();
