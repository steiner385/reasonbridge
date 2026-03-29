/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Skip rate limiting entirely in test mode for E2E tests
const isTest = process.env['NODE_ENV'] === 'test';

// Conditionally provide ThrottlerGuard only in non-test environments
const throttlerGuardProvider: Provider[] = isTest
  ? []
  : [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
    ];
import { PrismaModule } from './prisma/prisma.module.js';
import { CacheModule } from './cache/cache.module.js';
import { HealthModule } from './health/health.module.js';
import { UploadModule } from './upload/upload.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { ComplianceModule } from './compliance/compliance.module.js';
import { MetricsModule } from './observability/index.js';
import { DemoModule } from './demo/demo.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env files in order: local service config, then root monorepo config
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    // Enable scheduled jobs for compliance features
    ScheduleModule.forRoot(),
    // Rate limiting for brute force protection
    // Use higher limits in test mode to allow E2E tests to run without throttling
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: process.env['NODE_ENV'] === 'test' ? 10000 : 100, // 100 req/min in prod, 10000 in test
      },
    ]),
    PrismaModule,
    CacheModule,
    MetricsModule,
    HealthModule,
    UploadModule,
    AuthModule,
    UsersModule,
    VerificationModule,
    ComplianceModule,
    DemoModule,
  ],
  controllers: [],
  providers: [
    // Enable global rate limiting
    // In test mode (E2E tests), the guard is skipped entirely to avoid test flakiness
    ...throttlerGuardProvider,
  ],
})
export class AppModule {}
