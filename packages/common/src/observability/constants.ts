/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared observability constants for distributed tracing, metrics, and logging.
 * Used consistently across all services in the reasonBridge platform.
 */

/** Standard header for distributed tracing correlation */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/** Alias header for correlation ID (commonly used by infrastructure) */
export const REQUEST_ID_HEADER = 'x-request-id';

/** W3C Trace Context header for distributed tracing */
export const TRACEPARENT_HEADER = 'traceparent';

/** W3C Trace Context state header for vendor-specific trace data */
export const TRACESTATE_HEADER = 'tracestate';

/** Header for propagating the originating service name */
export const SERVICE_NAME_HEADER = 'x-service-name';

/**
 * Headers that should be propagated across service boundaries
 * for distributed tracing and correlation
 */
export const PROPAGATED_HEADERS = [
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  TRACEPARENT_HEADER,
  TRACESTATE_HEADER,
  SERVICE_NAME_HEADER,
] as const;
