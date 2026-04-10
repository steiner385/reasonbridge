/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Database connection constants.
 *
 * @remarks
 * Retry delay starts at 2 seconds and increases exponentially.
 * Provides resilience against temporary database unavailability.
 */
export const DATABASE = {
  /** Initial retry delay for database connections (ms) */
  RETRY_DELAY_MS: 2000,
} as const;

/**
 * Cache configuration
 */
export const CACHE = {
  /** Default cache TTL (seconds) */
  TTL_SECONDS: 3600, // 1 hour
  /** Maximum cached items */
  MAX_ITEMS: 1000,
} as const;

/**
 * Cache TTL values for recommendation endpoints (milliseconds)
 */
export const CACHE_TTL_MS = {
  /** Default cache TTL for interceptor (5 minutes) */
  DEFAULT: 300000,
  /** Similar topics cache TTL (24 hours) - results are stable */
  SIMILAR_TOPICS: 86400000,
  /** Trending topics cache TTL (5 minutes) - data changes frequently */
  TRENDING_TOPICS: 300000,
} as const;

/**
 * Default values for recommendation queries
 */
export const RECOMMENDATION_DEFAULTS = {
  /** Default limit for general recommendations */
  LIMIT: 10,
  /** Default limit for similar topics */
  SIMILAR_LIMIT: 5,
  /** Default trending time window (hours) */
  TRENDING_HOURS: 24,
} as const;
