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
import { RedisThrottlerStorage } from './throttler/redis-throttler-storage.js';

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

    // Rate limiting with configurable storage.
    //
    // When REDIS_URL is set, counters are stored in Redis so limits are shared
    // across all gateway replicas (a single logical limit) and survive restarts.
    // Without REDIS_URL the module falls back to per-process in-memory storage,
    // which is only correct for a single replica (dev/local).
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        // Fail open by default so a Redis outage doesn't reject all gateway
        // traffic; set THROTTLE_FAIL_CLOSED=true to fail closed instead.
        const failClosed = configService.get<string>('THROTTLE_FAIL_CLOSED') === 'true';
        return {
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
          // Distributed rate limiting: only wire Redis storage when a URL is
          // provided so single-replica/local setups keep working out of the box.
          ...(redisUrl
            ? { storage: new RedisThrottlerStorage(redisUrl, { failOpen: !failClosed }) }
            : {}),
        };
      },
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
