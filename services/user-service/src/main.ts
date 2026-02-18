/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { setupGracefulShutdown } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { TracingInterceptor } from './observability/index.js';

async function bootstrap() {
  // @ts-ignore - Fastify adapter type compatibility with updated @nestjs/platform-fastify
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  // OpenAPI/Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ReasonBridge User Service')
    .setDescription('User management, authentication, and profile endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
  const document = SwaggerModule.createDocument(app, config);
  // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
  SwaggerModule.setup('api-docs', app, document);

  // Distributed tracing interceptor
  app.useGlobalInterceptors(new TracingInterceptor('user-service'));

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app, { serviceName: 'user-service' });

  const port = process.env['PORT'] || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 User Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
