/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PinoLoggerService, setupGracefulShutdown, createValidationPipe } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { TracingInterceptor } from './observability/index.js';
import { assertTestModeSafe } from './verification/test-mode.util.js';

async function bootstrap() {
  // Fail fast on a dangerous env combination before anything else boots
  // (issue #1305): E2E_MODE=true would enable plaintext OTP storage and the
  // test-otp disclosure endpoint, which must never happen in production.
  assertTestModeSafe();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    // Only log errors in test mode to prevent memory leaks from verbose logging
    logger: new PinoLoggerService({ name: 'user-service' }),
  });

  // Enable validation globally using the shared platform policy
  // (whitelist + forbidNonWhitelisted + transform).
  app.useGlobalPipes(createValidationPipe());

  // OpenAPI/Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ReasonBridge User Service')
    .setDescription('User management, authentication, and profile endpoints')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Distributed tracing interceptor
  app.useGlobalInterceptors(new TracingInterceptor('user-service'));

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app, { serviceName: 'user-service' });

  const port = process.env['PORT'] || 3001;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`User Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
