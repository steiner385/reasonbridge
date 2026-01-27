import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  // @ts-ignore - Fastify adapter type compatibility with updated @nestjs/platform-fastify
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  // Enable CORS for frontend requests
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env['PORT'] || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
