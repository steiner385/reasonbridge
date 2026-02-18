/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  CORRELATION_ID_HEADER,
  TRACEPARENT_HEADER,
  SERVICE_NAME_HEADER,
  generateTraceparent,
  getCorrelationId,
} from '@reason-bridge/common';

/**
 * Distributed tracing interceptor for X-Ray compatible tracing.
 *
 * Records request spans with timing, correlation IDs, and trace context.
 * Propagates W3C Trace Context headers across service boundaries.
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);
  private readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<FastifyRequest>();
    const response = httpContext.getResponse<FastifyReply>();

    const correlationId = getCorrelationId(request.headers as Record<string, string>) ?? 'unknown';
    const traceparent = (request.headers[TRACEPARENT_HEADER] as string) ?? generateTraceparent();
    const method = request.method;
    const url = request.url;
    const startTime = process.hrtime.bigint();

    // Set trace headers on response
    response.header(TRACEPARENT_HEADER, traceparent);
    response.header(SERVICE_NAME_HEADER, this.serviceName);
    response.header(CORRELATION_ID_HEADER, correlationId);

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
          this.logger.log(
            `[TRACE] ${method} ${url} ${response.statusCode} ${durationMs.toFixed(2)}ms ` +
              `correlationId=${correlationId} traceparent=${traceparent}`,
          );
        },
        error: (error: Error) => {
          const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
          this.logger.warn(
            `[TRACE] ${method} ${url} ERROR ${durationMs.toFixed(2)}ms ` +
              `correlationId=${correlationId} traceparent=${traceparent} error=${error.message}`,
          );
        },
      }),
    );
  }
}
