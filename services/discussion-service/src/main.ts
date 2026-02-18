/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SERVICE_PORTS, setupGracefulShutdown } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { TracingInterceptor } from './observability/index.js';

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

  // OpenAPI/Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ReasonBridge Discussion Service')
    .setDescription('Topics, propositions, responses, and discussion threading endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
  const document = SwaggerModule.createDocument(app, config);
  // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
  SwaggerModule.setup('api-docs', app, document);

  // Distributed tracing interceptor
  app.useGlobalInterceptors(new TracingInterceptor('discussion-service'));

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app, { serviceName: 'discussion-service' });

  // Port from single source of truth - see packages/common/src/config/ports.ts
  const port = process.env['PORT'] || SERVICE_PORTS.DISCUSSION_SERVICE;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Discussion Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
