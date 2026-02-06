/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ModerationModule } from './services/moderation.module.js';
import { ModerationController } from './controllers/moderation.controller.js';

@Module({
  imports: [PrismaModule, HealthModule, ModerationModule],
  controllers: [ModerationController],
  providers: [],
})
export class AppModule {}
