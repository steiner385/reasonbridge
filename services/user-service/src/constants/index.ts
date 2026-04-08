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
