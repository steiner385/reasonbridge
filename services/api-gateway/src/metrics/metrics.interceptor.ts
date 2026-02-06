/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import type { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import type { Counter, Histogram, Gauge } from 'prom-client';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  HTTP_REQUEST_DURATION,
  HTTP_REQUEST_TOTAL,
  HTTP_ACTIVE_CONNECTIONS,
} from './metrics.module.js';

/**
 * Interceptor that automatically records HTTP request metrics
 *
 * Tracks:
 * - Request duration (histogram)
 * - Request count (counter)
 * - Active connections (gauge)
 *
 * Usage: Apply globally in main.ts or per-controller
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION)
    private readonly requestDuration: Histogram<string>,
    @InjectMetric(HTTP_REQUEST_TOTAL)
    private readonly requestTotal: Counter<string>,
    @InjectMetric(HTTP_ACTIVE_CONNECTIONS)
    private readonly activeConnections: Gauge<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<FastifyRequest>();
    const response = httpContext.getResponse<FastifyReply>();

    // Extract route pattern (use url path, but normalize to avoid high cardinality)
    const route = this.normalizeRoute(request.url);
    const method = request.method;

    // Start timing
    const startTime = process.hrtime.bigint();

    // Increment active connections
    this.activeConnections.inc({ route });

    return next.handle().pipe(
      tap({
        error: () => {
          // On error, we'll record in finalize
        },
      }),
      finalize(() => {
        // Calculate duration
        const endTime = process.hrtime.bigint();
        const durationInSeconds = Number(endTime - startTime) / 1e9;

        // Get status code (default to 500 on error before response is set)
        const statusCode = response.statusCode?.toString() ?? '500';

        // Record metrics
        const labels = { method, route, status_code: statusCode };

        this.requestDuration.observe(labels, durationInSeconds);
        this.requestTotal.inc(labels);

        // Decrement active connections
        this.activeConnections.dec({ route });
      }),
    );
  }

  /**
   * Normalize route to avoid high cardinality labels
   * Replaces dynamic path segments (UUIDs, IDs) with placeholders
   */
  private normalizeRoute(url: string): string {
    // Remove query string
    const path = url.split('?')[0] ?? '/';

    // Replace UUIDs with :id
    let normalized = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id',
    );

    // Replace numeric IDs with :id
    normalized = normalized.replace(/\/\d+/g, '/:id');

    // Limit path depth to avoid extremely long labels
    const segments = normalized.split('/').slice(0, 5);
    return segments.join('/') || '/';
  }
}
