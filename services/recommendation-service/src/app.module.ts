/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CacheModule } from './cache/cache.module.js';
import { TopicRecommendationsModule } from './topic-recommendations/topic-recommendations.module.js';
import { MetricsModule } from './observability/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env files in order: local service config, then root monorepo config
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    PrismaModule,
    CacheModule,
    MetricsModule,
    HealthModule,
    TopicRecommendationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
