/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ModerationModule } from './services/moderation.module.js';
import { ModerationController } from './controllers/moderation.controller.js';
import { ChildContentController } from './controllers/child-content.controller.js';
import { MetricsModule } from './observability/index.js';
import { JobsModule } from './jobs/jobs.module.js';

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
    ModerationModule,
    JobsModule,
  ],
  controllers: [ModerationController, ChildContentController],
  providers: [],
})
export class AppModule {}
