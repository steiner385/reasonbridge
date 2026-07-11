/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import 'reflect-metadata';
import { Logger, VersioningType, VERSION_NEUTRAL } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import { PinoLoggerService, SERVICE_PORTS, setupGracefulShutdown } from '@reason-bridge/common';
import { AppModule } from './app.module.js';
import { getCorsConfig, getHelmetConfig } from './config/security.config.js';
import { TracingInterceptor } from './observability/tracing.interceptor.js';
import { getCurrentRequestContext } from './middleware/correlation.middleware.js';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    // Structured JSON logger; binds correlationId/traceparent from the
    // AsyncLocalStorage request context (set by CorrelationMiddleware) onto
    // every log line so aggregators can query by trace.
    logger: new PinoLoggerService({
      name: 'api-gateway',
      contextProvider: () => {
        const ctx = getCurrentRequestContext();
        return ctx ? { correlationId: ctx.correlationId, traceparent: ctx.traceparent } : undefined;
      },
    }),
  });

  // Register Fastify security headers plugin (OWASP compliant)
  await app.register(helmet, getHelmetConfig());

  // Enable CORS with environment-aware configuration
  const corsConfig = getCorsConfig();
  app.enableCors(corsConfig);

  // API versioning (URI-based, e.g. /v1/topics). VERSION_NEUTRAL is kept in the
  // default list so every route is served BOTH at its versioned path (/v1/...)
  // and its original unversioned path, giving existing consumers (including the
  // frontend '/api' base) a deprecation window with no breaking change.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: [VERSION_NEUTRAL, '1'],
    prefix: 'v',
  });

  // Configure OpenAPI/Swagger documentation (skip if SKIP_SWAGGER is set for faster dev startup)
  if (!process.env['SKIP_SWAGGER']) {
    const config = new DocumentBuilder()
      .setTitle('ReasonBridge API')
      .setDescription(
        'RESTful API for the ReasonBridge rational discussion platform. ' +
          'Provides endpoints for user management, discussions, topics, AI analysis, and moderation.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'JWT authentication token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication and authorization')
      .addTag('users', 'User management')
      .addTag('topics', 'Discussion topics')
      .addTag('discussions', 'Discussion threads')
      .addTag('responses', 'Discussion responses')
      .addTag('ai', 'AI-powered analysis')
      .addTag('moderation', 'Content moderation')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });
  }

  // Distributed tracing interceptor
  app.useGlobalInterceptors(new TracingInterceptor('api-gateway'));

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app, { serviceName: 'api-gateway' });

  const port = process.env['PORT'] || SERVICE_PORTS.API_GATEWAY;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`API Gateway is running on: http://localhost:${port}`);
  if (!process.env['SKIP_SWAGGER']) {
    logger.log(`API Documentation available at: http://localhost:${port}/api-docs`);
  } else {
    logger.warn('Swagger disabled (SKIP_SWAGGER=1)');
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
