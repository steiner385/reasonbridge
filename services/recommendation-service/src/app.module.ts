/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CacheModule } from './cache/cache.module.js';
import { TopicRecommendationsModule } from './topic-recommendations/topic-recommendations.module.js';
import { MetricsModule } from './observability/index.js';

@Module({
  imports: [PrismaModule, CacheModule, MetricsModule, HealthModule, TopicRecommendationsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
