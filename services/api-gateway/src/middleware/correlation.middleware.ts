import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * Correlation ID Header name
 * Standard header for distributed tracing correlation
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Request ID Header name (alias for correlation ID)
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Correlation ID Middleware
 *
 * Generates or propagates a correlation ID for each request.
 * The correlation ID is used for distributed tracing across services.
 *
 * Behavior:
 * - If X-Correlation-ID header is present, use it (for propagation)
 * - Otherwise, generate a new UUID v4
 * - Adds the correlation ID to the response headers
 * - Attaches the correlation ID to the request for downstream use
 *
 * Usage in downstream services:
 * - Access via request.headers['x-correlation-id']
 * - Include in all log messages
 * - Propagate to any outbound HTTP calls
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  /**
   * Apply correlation ID tracking to incoming requests
   */
  use(
    req: FastifyRequest['raw'] & { correlationId?: string },
    res: FastifyReply['raw'],
    next: (error?: Error) => void,
  ): void {
    // Get existing correlation ID from headers or generate a new one
    const existingCorrelationId =
      (req.headers[CORRELATION_ID_HEADER] as string) || (req.headers[REQUEST_ID_HEADER] as string);

    const correlationId = existingCorrelationId || randomUUID();

    // Attach correlation ID to request for downstream access
    req.correlationId = correlationId;

    // Add correlation ID to response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, correlationId);

    next();
  }
}

/**
 * Generate a new correlation ID
 * Useful for starting new trace chains (e.g., background jobs, scheduled tasks)
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from request headers
 * Returns undefined if not present
 */
export function getCorrelationId(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const correlationId = headers[CORRELATION_ID_HEADER] || headers[REQUEST_ID_HEADER];
  return Array.isArray(correlationId) ? correlationId[0] : correlationId;
}
