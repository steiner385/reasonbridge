/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SERVICE_PORTS } from '@reason-bridge/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('ContactService');

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Contact Service')
    .setDescription('Social connections, contact import, and topic invitations')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env['PORT'] || SERVICE_PORTS.CONTACT_SERVICE;
  await app.listen(port, '0.0.0.0');
  logger.log(`Contact Service running on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
