import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SERVICE_PORTS } from '@reason-bridge/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // @ts-ignore - Fastify adapter type compatibility with updated @nestjs/platform-fastify
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  const port = process.env['PORT'] || SERVICE_PORTS.MODERATION_SERVICE;
  await app.listen(port, '0.0.0.0');

  console.log(`⚖️  Moderation Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
