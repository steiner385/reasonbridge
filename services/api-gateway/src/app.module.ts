import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { ProxyModule } from './proxy/proxy.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { CorrelationMiddleware } from './middleware/correlation.middleware.js';

@Module({
  imports: [HealthModule, ProxyModule, MetricsModule],
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
