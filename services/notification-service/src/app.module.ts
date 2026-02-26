/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { HandlersModule } from './handlers/handlers.module.js';
import { GatewaysModule } from './gateways/gateways.module.js';
import { MetricsModule } from './observability/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env files in order: local service config, then root monorepo config
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    PrismaModule,
    MetricsModule,
    HealthModule,
    HandlersModule,
    GatewaysModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
