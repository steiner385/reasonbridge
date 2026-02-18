/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ModerationModule } from './services/moderation.module.js';
import { ModerationController } from './controllers/moderation.controller.js';
import { MetricsModule } from './observability/index.js';

@Module({
  imports: [PrismaModule, MetricsModule, HealthModule, ModerationModule],
  controllers: [ModerationController],
  providers: [],
})
export class AppModule {}
