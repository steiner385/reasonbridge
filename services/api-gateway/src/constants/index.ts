/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HTTP client timeout constants in milliseconds.
 */
export const CLIENT_TIMEOUTS = {
  /** Default timeout for proxied requests to backend services (ms) */
  DEFAULT_MS: 5000,
  /** Extended timeout for AI/ML operations (ms) */
  AI_SERVICE_MS: 30000,
  /** Timeout for fact-check operations (ms) */
  FACT_CHECK_MS: 15000,
} as const;

/**
 * Rate limiting configuration for different tiers.
 * TTL is in milliseconds, limit is requests per TTL window.
 */
export const RATE_LIMITS = {
  /** TTL window for all rate limit tiers (ms) - 1 minute */
  TTL_MS: 60000,
  /** Default: 100 requests per minute */
  DEFAULT_LIMIT: 100,
  /** Strict: 10 requests per minute (expensive operations) */
  STRICT_LIMIT: 10,
  /** Auth: 5 login attempts per minute (brute force protection) */
  AUTH_LIMIT: 5,
  /** API: 1000 requests per minute (authenticated API users) */
  API_LIMIT: 1000,
} as const;

/**
 * Security header configuration.
 */
export const SECURITY_HEADERS = {
  /** CORS preflight cache duration (seconds) - 24 hours */
  CORS_MAX_AGE_SECONDS: 86400,
  /** HSTS max age (seconds) - 1 year */
  HSTS_MAX_AGE_SECONDS: 31536000,
} as const;

/**
 * Retry configuration for failed requests.
 */
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_ATTEMPTS: 3,
  /** Initial delay before first retry (ms) */
  INITIAL_DELAY_MS: 100,
  /** Maximum delay between retries (ms) */
  MAX_DELAY_MS: 5000,
  /** Multiplier for exponential backoff */
  BACKOFF_FACTOR: 2,
  /** Jitter range as percentage (±25%) */
  JITTER_RANGE: 0.25,
} as const;

/**
 * Circuit breaker configuration.
 */
export const CIRCUIT_BREAKER = {
  /** Timeout for circuit breaker actions (ms) */
  TIMEOUT_MS: 5000,
  /** Time to wait before trying again after circuit opens (ms) */
  RESET_TIMEOUT_MS: 30000,
} as const;

/**
 * Development server ports for CORS allowlist.
 */
export const DEV_PORTS = [5173, 5174, 5175, 5176] as const;
