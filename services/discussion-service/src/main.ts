import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // @ts-ignore - Fastify adapter type compatibility with updated @nestjs/platform-fastify
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  // Enable validation with class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env['PORT'] || 3002;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Discussion Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
