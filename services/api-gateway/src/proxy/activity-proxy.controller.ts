/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Query, Body, Res, Headers, Inject } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Activity Proxy Controller
 *
 * Proxies activity feed and event endpoints to the activity-service.
 * Part of Issue #245 - Activity feed from followed users
 */
@Controller()
export class ActivityProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  /**
   * GET /feed - Get activity feed from followed users
   * Requires authentication
   */
  @Get('feed')
  async getFeed(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToActivityService({
      method: 'GET',
      path: '/feed',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /activity/events - Create activity event (internal API)
   * Used by other services to record activity events
   */
  @Post('activity/events')
  async createEvent(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-internal-service-key') serviceKey: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    if (serviceKey) {
      headers['X-Internal-Service-Key'] = serviceKey;
    }

    const response = await this.proxyService.proxyToActivityService({
      method: 'POST',
      path: '/events',
      body,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
