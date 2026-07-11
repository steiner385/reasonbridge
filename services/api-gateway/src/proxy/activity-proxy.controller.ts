/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Query, Body, Res, Headers, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Activity Proxy Controller
 *
 * Proxies activity feed and event endpoints to the activity-service.
 * Part of Issue #245 - Activity feed from followed users
 */
@ApiTags('activity')
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
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // activity-service authenticates solely via the X-User-Id header (set by the
    // gateway's JwtUserMiddleware from the Bearer token). ProxyService does not
    // relay inbound headers automatically, so we must forward it explicitly —
    // otherwise every /feed request reaches the activity-service without an
    // identity and is rejected with 401. See topics-proxy.controller for the
    // canonical pattern.
    const response = await this.proxyService.proxyToActivityService({
      method: 'GET',
      path: '/feed',
      query,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
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
