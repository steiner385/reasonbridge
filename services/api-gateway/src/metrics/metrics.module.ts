/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

/**
 * Custom Prometheus metrics for the API Gateway
 *
 * These metrics provide observability into:
 * - Request rates and latencies
 * - Active connection counts
 * - Upstream service health
 */

// HTTP request metrics
export const HTTP_REQUEST_DURATION = 'http_request_duration_seconds';
export const HTTP_REQUEST_TOTAL = 'http_requests_total';
export const HTTP_ACTIVE_CONNECTIONS = 'http_active_connections';

// Upstream service metrics
export const UPSTREAM_REQUEST_DURATION = 'upstream_request_duration_seconds';
export const UPSTREAM_REQUEST_TOTAL = 'upstream_requests_total';

// Cache metrics (for future use)
export const CACHE_HITS_TOTAL = 'cache_hits_total';
export const CACHE_MISSES_TOTAL = 'cache_misses_total';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'api_gateway_',
        },
      },
      path: '/metrics',
      defaultLabels: {
        service: 'api-gateway',
      },
    }),
  ],
  providers: [
    // HTTP Request Duration Histogram
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    // HTTP Request Counter
    makeCounterProvider({
      name: HTTP_REQUEST_TOTAL,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    // Active Connections Gauge
    makeGaugeProvider({
      name: HTTP_ACTIVE_CONNECTIONS,
      help: 'Number of active HTTP connections',
      labelNames: ['route'],
    }),
    // Upstream Request Duration
    makeHistogramProvider({
      name: UPSTREAM_REQUEST_DURATION,
      help: 'Duration of requests to upstream services in seconds',
      labelNames: ['service', 'method', 'endpoint', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    // Upstream Request Counter
    makeCounterProvider({
      name: UPSTREAM_REQUEST_TOTAL,
      help: 'Total number of requests to upstream services',
      labelNames: ['service', 'method', 'endpoint', 'status_code'],
    }),
    // Cache Hit Counter
    makeCounterProvider({
      name: CACHE_HITS_TOTAL,
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
    }),
    // Cache Miss Counter
    makeCounterProvider({
      name: CACHE_MISSES_TOTAL,
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
