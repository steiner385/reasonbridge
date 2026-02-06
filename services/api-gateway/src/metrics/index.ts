/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Metrics module exports
 * Provides Prometheus metrics for observability
 */
export { MetricsModule } from './metrics.module.js';
export {
  HTTP_REQUEST_DURATION,
  HTTP_REQUEST_TOTAL,
  HTTP_ACTIVE_CONNECTIONS,
  UPSTREAM_REQUEST_DURATION,
  UPSTREAM_REQUEST_TOTAL,
  CACHE_HITS_TOTAL,
  CACHE_MISSES_TOTAL,
} from './metrics.module.js';
export { MetricsInterceptor } from './metrics.interceptor.js';
