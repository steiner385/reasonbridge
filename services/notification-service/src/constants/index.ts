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
 * SMS rate limiting constants.
 *
 * @remarks
 * Prevents SMS abuse while allowing legitimate verification flows.
 */
export const SMS_RATE_LIMITS = {
  /** Maximum SMS messages per phone number per hour */
  MAX_PER_PHONE_PER_HOUR: 5,
  /** Maximum SMS messages globally per hour */
  MAX_GLOBAL_PER_HOUR: 100,
  /** Rate limit window duration (ms) - 1 hour */
  WINDOW_MS: 60 * 60 * 1000,
} as const;

/**
 * JWT verification cache constants.
 *
 * @remarks
 * Cache JWT verification results to reduce auth service calls.
 */
export const JWT_CACHE = {
  /** Maximum age for cached JWT verification results (ms) - 24 hours */
  MAX_AGE_MS: 24 * 60 * 60 * 1000,
} as const;

/**
 * Query result limits for database operations.
 *
 * @remarks
 * Prevents unbounded result sets that could cause memory issues.
 */
export const QUERY_LIMITS = {
  /** Default limit for notification queries */
  DEFAULT: 100,
  /** Limit for SLA breach queries */
  SLA_BREACH: 500,
  /** Limit for common ground notification queries */
  COMMON_GROUND: 1000,
  /** Limit for reading back a batch of mention notifications */
  MENTIONS: 1000,
  /** Limit for parent digest queries */
  PARENT_DIGEST: 10000,
  /** Limit for digest topic queries */
  DIGEST_TOPICS: 1000,
  /** Limit for digest response queries */
  DIGEST_RESPONSES: 500,
} as const;
