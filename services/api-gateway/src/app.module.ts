/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { ProxyModule } from './proxy/proxy.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { ResilienceModule } from './resilience/resilience.module.js';
import { CorrelationMiddleware } from './middleware/correlation.middleware.js';
import { JwtUserMiddleware } from './middleware/jwt-user.middleware.js';

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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env files in order: local service config, then root monorepo config
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),

    // Rate limiting with configurable storage
    // In production, configure REDIS_URL for distributed rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            // 100 requests per minute (default)
            ttl: configService.get<number>('THROTTLE_TTL', 60000),
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
          {
            name: 'strict',
            // 10 requests per minute (for expensive operations)
            ttl: 60000,
            limit: 10,
          },
        ],
        // Note: For distributed rate limiting, add Redis storage:
        // storage: new ThrottlerStorageRedisService(redisClient)
      }),
    }),

    // Core modules - ResilienceModule must come before ProxyModule
    // since ProxyService depends on CircuitBreakerService
    HealthModule,
    ResilienceModule,
    MetricsModule,
    ProxyModule,
  ],
  controllers: [],
  providers: [
    // Apply ThrottlerGuard globally - all endpoints are rate limited
    // Specific limits can be set per-endpoint using @Throttle decorator
    // In test mode (E2E tests), the guard is skipped entirely to avoid test flakiness
    ...throttlerGuardProvider,
  ],
})
export class AppModule implements NestModule {
  /**
   * Configure global middleware
   * - Correlation ID middleware: Generates request IDs for tracing
   * - JWT User middleware: Extracts user ID from JWT for downstream services
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware, JwtUserMiddleware).forRoutes('*');
  }
}
