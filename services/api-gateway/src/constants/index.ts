/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * HTTP client timeout constants in milliseconds.
 *
 * @remarks
 * Default timeout for proxied requests to backend services.
 * 5 seconds balances responsiveness with allowing for slower operations.
 */
export const CLIENT_TIMEOUTS = {
  /** Default timeout for proxied requests to backend services (ms) */
  DEFAULT_MS: 5000,
} as const;
