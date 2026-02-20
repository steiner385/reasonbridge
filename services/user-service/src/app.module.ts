/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { CacheModule } from './cache/cache.module.js';
import { HealthModule } from './health/health.module.js';
import { UploadModule } from './upload/upload.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { ComplianceModule } from './compliance/compliance.module.js';
import { MetricsModule } from './observability/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Rate limiting for brute force protection
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute globally
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
  ],
  controllers: [],
  providers: [
    // Enable global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
