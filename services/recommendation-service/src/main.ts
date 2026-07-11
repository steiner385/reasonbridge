/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PinoLoggerService, SERVICE_PORTS, setupGracefulShutdown, createValidationPipe } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { TracingInterceptor } from './observability/index.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: new PinoLoggerService({ name: 'recommendation-service' }),
  });

  // Shared platform validation policy (whitelist + forbidNonWhitelisted + transform).
  app.useGlobalPipes(createValidationPipe());

  // OpenAPI/Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ReasonBridge Recommendation Service')
    .setDescription('Content recommendations and discovery endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Enable request validation with class-transformer (parity with
  // user-service/discussion-service). Without a global ValidationPipe,
  // class-validator DTO decorators are never enforced.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Distributed tracing interceptor
  app.useGlobalInterceptors(new TracingInterceptor('recommendation-service'));

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app, { serviceName: 'recommendation-service' });

  const port = process.env['PORT'] || SERVICE_PORTS.RECOMMENDATION_SERVICE;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Recommendation Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
