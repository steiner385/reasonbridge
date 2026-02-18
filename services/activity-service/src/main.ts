/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SERVICE_PORTS, setupGracefulShutdown } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { TracingInterceptor } from './observability/index.js';

async function bootstrap() {
  // @ts-ignore - Fastify adapter type compatibility
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  // OpenAPI/Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ReasonBridge Activity Service')
    .setDescription('Activity events and activity feed endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
  const document = SwaggerModule.createDocument(app, config);
  // @ts-ignore - Type compatibility between Fastify and Express adapters for Swagger
  SwaggerModule.setup('api-docs', app, document);

  // Distributed tracing interceptor
  app.useGlobalInterceptors(new TracingInterceptor('activity-service'));

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app, { serviceName: 'activity-service' });

  const port = process.env['PORT'] || SERVICE_PORTS.ACTIVITY_SERVICE;
  await app.listen(port, '0.0.0.0');

  console.log(`📰 Activity Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
