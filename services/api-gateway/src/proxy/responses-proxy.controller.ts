/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Delete, Param, Res, Headers, Body, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * ResponsesProxyController - Proxy for response-specific endpoints
 *
 * Handles routes under /responses that are not topic-scoped:
 * - POST /responses/:id/replies - Reply to a specific response (threaded replies)
 * - GET /responses/:id/reactions - Get reactions for a response
 * - POST /responses/:id/reactions - Add a reaction to a response
 * - DELETE /responses/:id/reactions/:emoji - Remove a reaction from a response
 * - GET /responses/:id/votes - Get vote summary for a response
 * - POST /responses/:id/vote - Vote on a response
 * - DELETE /responses/:id/vote - Remove vote from a response
 */
@ApiTags('responses')
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

  /**
   * GET /responses/:responseId/reactions - Get reactions for a response
   *
   * Proxies to discussion-service: GET /responses/:responseId/reactions
   */
  @Get(':responseId/reactions')
  async getReactions(
    @Param('responseId') responseId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/responses/${responseId}/reactions`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /responses/:responseId/reactions - Add a reaction to a response
   *
   * Proxies to discussion-service: POST /responses/:responseId/reactions
   */
  @Post(':responseId/reactions')
  async addReaction(
    @Param('responseId') responseId: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: `/responses/${responseId}/reactions`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * DELETE /responses/:responseId/reactions/:emoji - Remove a reaction from a response
   *
   * Proxies to discussion-service: DELETE /responses/:responseId/reactions/:emoji
   */
  @Delete(':responseId/reactions/:emoji')
  async removeReaction(
    @Param('responseId') responseId: string,
    @Param('emoji') emoji: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'DELETE',
      path: `/responses/${responseId}/reactions/${emoji}`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /responses/:responseId/votes - Get vote summary for a response
   *
   * Proxies to discussion-service: GET /responses/:responseId/votes
   */
  @Get(':responseId/votes')
  async getVotes(
    @Param('responseId') responseId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/responses/${responseId}/votes`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /responses/:responseId/vote - Vote on a response
   *
   * Proxies to discussion-service: POST /responses/:responseId/vote
   */
  @Post(':responseId/vote')
  async vote(
    @Param('responseId') responseId: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: `/responses/${responseId}/vote`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * DELETE /responses/:responseId/vote - Remove vote from a response
   *
   * Proxies to discussion-service: DELETE /responses/:responseId/vote
   */
  @Delete(':responseId/vote')
  async removeVote(
    @Param('responseId') responseId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'DELETE',
      path: `/responses/${responseId}/vote`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }
}
