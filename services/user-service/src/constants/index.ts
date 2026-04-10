/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * JWT and authentication token constants.
 *
 * @remarks
 * Token expiration times balance security with user experience.
 * Shorter expirations are more secure but require more frequent re-authentication.
 */
export const AUTH_TOKENS = {
  /** Default token expiration time in seconds (1 hour) */
  EXPIRES_IN_SECONDS: 3600,
  /** S3 signed URL expiration time in seconds (1 hour) */
  S3_URL_EXPIRES_IN_SECONDS: 3600,
} as const;

/**
 * Verification code constraints.
 *
 * @remarks
 * 6-digit codes provide sufficient entropy while being easy to type.
 * Range ensures consistent digit count (100000-999999).
 */
export const VERIFICATION_CODE = {
  /** Minimum value for verification code (6 digits) */
  MIN_VALUE: 100000,
  /** Maximum value for verification code (6 digits) */
  MAX_VALUE: 999999,
} as const;

/**
 * HTTP client timeout constants in milliseconds.
 *
 * @remarks
 * 30 second timeout allows for slower operations while preventing
 * indefinite hangs on external service calls.
 */
export const CLIENT_TIMEOUTS = {
  /** Default timeout for inter-service HTTP calls (ms) */
  DEFAULT_MS: 30000,
} as const;

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
 * File upload constraints.
 *
 * @remarks
 * 5MB limit balances allowing reasonable file sizes while preventing abuse.
 */
export const UPLOAD_LIMITS = {
  /** Maximum file size for uploads (bytes) */
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Verification token configuration
 */
export const VERIFICATION = {
  /** Email verification token expiration (hours) */
  TOKEN_EXPIRATION_HOURS: 24,
  /** Password reset token expiration (minutes) */
  PASSWORD_RESET_EXPIRATION_MINUTES: 15,
  /** Maximum verification attempts before lockout */
  MAX_ATTEMPTS: 5,
} as const;

/**
 * OAuth state configuration
 */
export const OAUTH = {
  /** OAuth state token TTL (seconds) */
  STATE_TTL_SECONDS: 300, // 5 minutes
} as const;

/**
 * Rate limiting configuration for auth endpoints
 *
 * @remarks
 * In test mode, limits are set to 10000 to allow E2E tests to run without throttling.
 * Production values are designed to prevent brute force attacks while allowing legitimate users.
 */
const isTest = process.env['NODE_ENV'] === 'test';

export const THROTTLE_LIMITS = {
  /** Registration attempts per minute */
  REGISTER: isTest ? 10000 : 3,
  /** Login attempts per minute */
  LOGIN: isTest ? 10000 : 5,
  /** Token refresh attempts per minute */
  REFRESH: isTest ? 10000 : 10,
  /** Email verification attempts per minute */
  VERIFY_EMAIL: isTest ? 10000 : 5,
  /** Resend verification attempts per minute */
  RESEND_VERIFICATION: isTest ? 10000 : 3,
  /** Forgot password requests per minute */
  FORGOT_PASSWORD: isTest ? 10000 : 3,
  /** Password reset attempts per minute */
  RESET_PASSWORD: isTest ? 10000 : 5,
  /** TTL for rate limit window (milliseconds) */
  TTL_MS: 60000, // 1 minute
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
 * Query limits for database operations
 */
export const QUERY_LIMITS = {
  /** Default query limit */
  DEFAULT: 100,
  /** Expertise users query limit */
  EXPERTISE_USERS: 200,
  /** Expertise metrics query limit (large for accurate stats) */
  EXPERTISE_METRICS: 10000,
  /** Expertise topics query limit */
  EXPERTISE_TOPICS: 100,
  /** Default leaderboard limit */
  LEADERBOARD_DEFAULT: 10,
} as const;
