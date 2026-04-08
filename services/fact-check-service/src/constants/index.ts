/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HTTP client timeout constants in milliseconds.
 *
 * @remarks
 * 5 second timeout for external fact-check APIs (Google Fact Check).
 * Shorter than internal service timeouts since external APIs should be fast.
 */
export const CLIENT_TIMEOUTS = {
  /** Timeout for external fact-check API calls (ms) */
  EXTERNAL_API_MS: 5000,
} as const;

/**
 * Cache constants.
 *
 * @remarks
 * Fact check results are cached for 24 hours since they change infrequently.
 */
export const CACHE = {
  /** Default fact check cache TTL in milliseconds (24 hours) */
  DEFAULT_TTL_MS: 24 * 60 * 60 * 1000,
  /** Maximum items in cache (default) */
  MAX_ITEMS: 10000,
} as const;

/**
 * Database connection constants.
 *
 * @remarks
 * Retry delay starts at 2 seconds and increases exponentially.
 */
export const DATABASE = {
  /** Initial retry delay for database connections (ms) */
  RETRY_DELAY_MS: 2000,
} as const;
