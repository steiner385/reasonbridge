/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Param, Query, Body, Res, Headers } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Discussions Proxy Controller
 *
 * Proxies discussion-related endpoints to the discussion-service.
 * Part of Feature 009 - Discussion Participation
 */
@Controller('discussions')
export class DiscussionsProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * GET /discussions - List discussions with filters
   */
  @Get()
  async listDiscussions(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: '/discussions',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /discussions - Create a new discussion
   */
  @Post()
  async createDiscussion(
    @Body() body: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: '/discussions',
      body,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /discussions/:id - Get discussion by ID
   */
  @Get(':id')
  async getDiscussionById(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/discussions/${id}`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /discussions/:id/responses - Get responses for a discussion
   */
  @Get(':id/responses')
  async getDiscussionResponses(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/discussions/${id}/responses`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /discussions/:id/responses - Create a response to a discussion
   * Maps to POST /topics/responses with discussionId in body
   */
  @Post(':id/responses')
  async createResponse(
    @Param('id') discussionId: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Add discussionId to the body
    const enrichedBody = { ...body, discussionId };

    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: '/topics/responses',
      body: enrichedBody,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
