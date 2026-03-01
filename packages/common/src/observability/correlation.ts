/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from './constants.js';

/**
 * Cross-platform UUID generation using Web Crypto API.
 * Works in both Node.js 20+ and modern browsers.
 */
function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Generate a new correlation ID (UUID v4).
 * Used for starting new trace chains (e.g., background jobs, scheduled tasks).
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from request headers.
 * Checks both x-correlation-id and x-request-id headers.
 *
 * @returns The correlation ID or undefined if not present
 */
export function getCorrelationId(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const correlationId = headers[CORRELATION_ID_HEADER] || headers[REQUEST_ID_HEADER];
  return Array.isArray(correlationId) ? correlationId[0] : correlationId;
}

/**
 * Generate a W3C Trace Context traceparent header value.
 *
 * Format: {version}-{trace-id}-{parent-id}-{trace-flags}
 * - version: 00 (current version)
 * - trace-id: 32 hex characters (128-bit)
 * - parent-id: 16 hex characters (64-bit)
 * - trace-flags: 2 hex characters (01 = sampled)
 *
 * @see https://www.w3.org/TR/trace-context/
 */
export function generateTraceparent(traceId?: string): string {
  const version = '00';
  const resolvedTraceId = traceId || randomUUID().replace(/-/g, '');
  const parentId = randomUUID().replace(/-/g, '').substring(0, 16);
  const traceFlags = '01'; // sampled
  return `${version}-${resolvedTraceId}-${parentId}-${traceFlags}`;
}

/**
 * Parse a W3C traceparent header into its components.
 *
 * @returns Parsed trace context or null if invalid
 */
export function parseTraceparent(
  traceparent: string,
): { version: string; traceId: string; parentId: string; traceFlags: string } | null {
  const parts = traceparent.split('-');
  if (parts.length !== 4) return null;

  const [version, traceId, parentId, traceFlags] = parts;
  if (!version || !traceId || !parentId || !traceFlags) return null;
  if (traceId.length !== 32 || parentId.length !== 16) return null;

  return { version, traceId, parentId, traceFlags };
}
