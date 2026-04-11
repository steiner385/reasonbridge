/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SERVICE_PORTS, setupGracefulShutdown } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { TracingInterceptor } from './observability/index.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  // OpenAPI/Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ReasonBridge Fact-Check Service')
    .setDescription('Claim verification and source validation endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Distributed tracing interceptor
  app.useGlobalInterceptors(new TracingInterceptor('fact-check-service'));

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app, { serviceName: 'fact-check-service' });

  const port = process.env['PORT'] || SERVICE_PORTS.FACT_CHECK_SERVICE;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Fact-Check Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
