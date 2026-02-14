/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SERVICE_PORTS, setupGracefulShutdown } from '@reason-bridge/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // @ts-ignore - Fastify adapter type compatibility
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

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
