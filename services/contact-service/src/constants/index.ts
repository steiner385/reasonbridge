/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contact provider limits.
 *
 * @remarks
 * 5000 contact limit prevents excessive API usage while supporting
 * most users' contact lists.
 */
export const CONTACT_LIMITS = {
  /** Maximum contacts to sync from external providers */
  MAX_CONTACTS: 5000,
  /** Page size for contact API pagination */
  PAGE_SIZE: 1000,
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
