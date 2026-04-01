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
