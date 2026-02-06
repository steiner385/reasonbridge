/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, All, Req, Res, Headers } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Moderation Service Proxy Controller
 * Proxies all /moderation/* requests to the moderation service
 */
@Controller('moderation')
export class ModerationProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Proxy all moderation service requests
   * Handles: /moderation/queue/stats, /moderation/appeals, /moderation/actions/*, etc.
   */
  @All('*')
  async proxyToModeration(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('authorization') authHeader?: string,
  ) {
    // Keep full path including /moderation prefix since the moderation service expects it
    // Strip query string from path since we pass it separately in 'query' parameter
    const path = req.url.split('?')[0] || req.url;
    const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    const response = await this.proxyService.proxyToModerationService({
      method,
      path,
      body: req.body,
      query: req.query as Record<string, string>,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
