/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { getCurrentRequestContext } from '../middleware/correlation.middleware.js';

/**
 * Stable JSON error contract returned by the gateway for infrastructure
 * failures (upstream outages, circuit-breaker open, timeouts, unexpected
 * errors). Keeping the shape consistent lets clients handle gateway errors
 * uniformly instead of receiving Nest's default `{ statusCode, message }`.
 */
interface GatewayErrorBody {
  statusCode: number;
  error: string;
  message: string;
  correlationId?: string;
}

/**
 * Global exception filter for the API gateway.
 *
 * @remarks
 * Before this filter existed, any error rethrown by ProxyService
 * (ECONNREFUSED, request timeout, opossum breaker-open) surfaced to clients as
 * Nest's default `{"statusCode":500,"message":"Internal server error"}`, giving
 * consumers no way to distinguish an upstream outage from a genuine gateway
 * bug. This filter maps those failure modes to standard gateway status codes:
 *
 * - **Upstream returned a response** (a 5xx that survived retries): forward the
 *   real upstream status and body verbatim — preserving error transparency.
 * - **Circuit breaker open**: 503 Service Unavailable.
 * - **Timeout** (axios or opossum): 504 Gateway Timeout.
 * - **Network failure** (ECONNREFUSED/ENOTFOUND/ECONNRESET/EPIPE): 502 Bad Gateway.
 * - **Nest HttpException** (the gateway's own auth/validation/not-found errors):
 *   preserved with its original status and body.
 * - **Anything else**: 500 with the stable shape.
 */
@Catch()
export class ProxyExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProxyExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const correlationId = getCurrentRequestContext()?.correlationId;

    // 1. Gateway's own HttpExceptions (401 from guards, 404 for unknown routes,
    //    validation errors, etc.) — preserve original status and body.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'object' && body !== null
          ? { ...(body as Record<string, unknown>), ...(correlationId && { correlationId }) }
          : { statusCode: status, message: body, ...(correlationId && { correlationId }) };
      reply.status(status).send(payload);
      return;
    }

    // 2. Upstream service actually responded (e.g. a 5xx that survived all
    //    retries). Forward the real upstream status + body so clients still see
    //    the underlying error instead of an opaque gateway 5xx.
    const upstream = (exception as { response?: { status?: number; data?: unknown } }).response;
    if (upstream && typeof upstream.status === 'number') {
      this.logger.warn(
        `Upstream responded with ${upstream.status} after retries` +
          (correlationId ? ` correlationId=${correlationId}` : ''),
      );
      reply.status(upstream.status).send(upstream.data ?? { statusCode: upstream.status });
      return;
    }

    // 3. Infrastructure-level failures (no upstream response object).
    const code = (exception as { code?: string }).code;
    const message = exception instanceof Error ? exception.message : String(exception);

    let status: number;
    let error: string;
    let clientMessage: string;

    if (code === 'EOPENBREAKER' || /breaker is open/i.test(message)) {
      status = HttpStatus.SERVICE_UNAVAILABLE; // 503
      error = 'Service Unavailable';
      clientMessage = 'Upstream service is temporarily unavailable (circuit open). Retry shortly.';
    } else if (
      code === 'ETIMEDOUT' ||
      code === 'ECONNABORTED' ||
      /timed out|timeout/i.test(message)
    ) {
      status = HttpStatus.GATEWAY_TIMEOUT; // 504
      error = 'Gateway Timeout';
      clientMessage = 'Upstream service did not respond in time.';
    } else if (
      ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EPIPE'].some(
        (c) => code === c || message.includes(c),
      )
    ) {
      status = HttpStatus.BAD_GATEWAY; // 502
      error = 'Bad Gateway';
      clientMessage = 'Upstream service is unavailable.';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR; // 500
      error = 'Internal Server Error';
      clientMessage = 'An unexpected error occurred.';
    }

    this.logger.error(
      `Gateway error → ${status}: ${message}` +
        (correlationId ? ` correlationId=${correlationId}` : ''),
    );

    const responseBody: GatewayErrorBody = {
      statusCode: status,
      error,
      message: clientMessage,
      ...(correlationId && { correlationId }),
    };
    reply.status(status).send(responseBody);
  }
}
