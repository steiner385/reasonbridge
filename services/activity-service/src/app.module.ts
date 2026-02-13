/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ActivityEventsModule } from './activity-events/activity-events.module.js';
import { ActivityFeedModule } from './activity-feed/activity-feed.module.js';

@Module({
  imports: [PrismaModule, HealthModule, ActivityEventsModule, ActivityFeedModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
