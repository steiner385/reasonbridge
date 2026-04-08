/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Content screening constraints.
 *
 * @remarks
 * Maximum content length prevents abuse and ensures reasonable processing time.
 */
export const CONTENT_SCREENING = {
  /** Maximum content length for screening (characters) */
  MAX_LENGTH: 10000,
} as const;

/**
 * Appeal request constraints.
 *
 * @remarks
 * Minimum length ensures appellants provide meaningful context.
 * Maximum length prevents abuse while allowing detailed explanations.
 */
export const APPEAL_CONSTRAINTS = {
  /** Minimum appeal reason length (characters) */
  REASON_MIN_LENGTH: 20,
  /** Maximum appeal reason length (characters) */
  REASON_MAX_LENGTH: 5000,
  /** Minimum moderator reasoning length (characters) */
  DECISION_REASONING_MIN_LENGTH: 20,
  /** Maximum moderator reasoning length (characters) */
  DECISION_REASONING_MAX_LENGTH: 2000,
} as const;

/**
 * Moderation action constraints.
 *
 * @remarks
 * Similar to appeals, reasoning must be substantial but bounded.
 */
export const ACTION_CONSTRAINTS = {
  /** Minimum reasoning length for moderation actions (characters) */
  REASONING_MIN_LENGTH: 20,
  /** Maximum reasoning length for moderation actions (characters) */
  REASONING_MAX_LENGTH: 2000,
  /** Minimum reason length for reports (characters) */
  REPORT_REASON_MIN_LENGTH: 20,
  /** Maximum reason length for reports (characters) */
  REPORT_REASON_MAX_LENGTH: 5000,
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
 * SQS queue configuration defaults.
 *
 * @remarks
 * These values control message polling and processing behavior.
 * Visibility timeout must exceed expected processing time.
 */
export const QUEUE_CONFIG = {
  /** Maximum messages to receive in a single poll */
  MAX_MESSAGES: 10,
  /** Long polling wait time in seconds */
  WAIT_TIME_SECONDS: 20,
  /** Message visibility timeout in seconds */
  VISIBILITY_TIMEOUT_SECONDS: 120,
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
