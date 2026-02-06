/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { ProxyModule } from './proxy/proxy.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { ResilienceModule } from './resilience/resilience.module.js';
import { CorrelationMiddleware } from './middleware/correlation.middleware.js';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
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
  providers: [],
})
export class AppModule implements NestModule {
  /**
   * Configure global middleware
   * Correlation ID middleware runs on all routes
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
