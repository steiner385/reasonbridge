/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Param, Res, Headers, Body, Inject } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * ResponsesProxyController - Proxy for response-specific endpoints
 *
 * Handles routes under /responses that are not topic-scoped:
 * - POST /responses/:id/replies - Reply to a specific response (threaded replies)
 */
@Controller('responses')
export class ResponsesProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  /**
   * POST /responses/:responseId/replies - Create a threaded reply to a response
   *
   * Proxies to discussion-service: POST /responses/:responseId/replies
   */
  @Post(':responseId/replies')
  async replyToResponse(
    @Param('responseId') responseId: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: `/topics/responses/${responseId}/replies`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }
}
