/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Res,
  Headers,
  Body,
  Inject,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

@ApiTags('topics')
@Controller('topics')
export class TopicsProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  @Get()
  async getTopics(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: '/topics',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get('search')
  async searchTopics(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: '/topics/search',
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id')
  async getTopicById(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id/common-ground')
  async getCommonGroundAnalysis(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/common-ground`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * @deprecated Use GET /topics/:id/common-ground instead. This alias is kept
   * only for backwards compatibility with older frontend builds and should be
   * removed once no clients depend on it.
   */
  // Alias for common-ground (frontend uses both routes)
  @Get(':id/common-ground-analysis')
  async getCommonGroundAnalysisAlias(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    // Delegate to the same handler
    return this.getCommonGroundAnalysis(id, query, authHeader, res);
  }

  /**
   * GET /topics/:id/common-ground/export - Export common ground analysis
   *
   * Proxies to discussion-service: GET /topics/:id/common-ground/export
   */
  @Get(':id/common-ground/export')
  async exportCommonGround(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/common-ground/export`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /topics/:id/common-ground/share-link - Get a shareable link for the analysis
   *
   * Proxies to discussion-service: GET /topics/:id/common-ground/share-link
   */
  @Get(':id/common-ground/share-link')
  async getCommonGroundShareLink(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/common-ground/share-link`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /topics/:id/history - Get topic edit history
   *
   * Proxies to discussion-service: GET /topics/:id/history
   */
  @Get(':id/history')
  async getTopicEditHistory(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/history`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /topics/:id/analytics - Get topic analytics
   *
   * Proxies to discussion-service: GET /topics/:id/analytics
   */
  @Get(':id/analytics')
  async getTopicAnalytics(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/analytics`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id/bridging-suggestions')
  async getBridgingSuggestions(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToAiService({
      method: 'GET',
      path: `/suggest/bridging-suggestions/${id}`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id/propositions')
  async getTopicPropositions(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/propositions`,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  @Get(':id/responses')
  async getTopicResponses(
    @Param('id') id: string,
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/responses`,
      query,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /topics/merge - Merge multiple topics into one (moderator only)
   *
   * Proxies to discussion-service: POST /topics/merge
   */
  @Post('merge')
  async mergeTopics(
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: '/topics/merge',
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  @Post()
  async createTopic(
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: '/topics',
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * PATCH /topics/:id/status - Update topic status (archive, lock, reopen)
   *
   * Proxies to discussion-service: PATCH /topics/:id/status
   */
  @Patch(':id/status')
  async updateTopicStatus(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'PATCH',
      path: `/topics/${id}/status`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  @Patch(':id')
  async updateTopic(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'PATCH',
      path: `/topics/${id}`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /topics/:id/tags - Add a tag to a topic (e.g. accepting an AI suggestion)
   *
   * Proxies to discussion-service: POST /topics/:id/tags
   */
  @Post(':id/tags')
  async addTagToTopic(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: `/topics/${id}/tags`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  @Post(':id/responses')
  async createResponse(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: `/topics/${id}/responses`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  @Put(':id/responses/:responseId')
  async updateResponse(
    @Param('id') id: string,
    @Param('responseId') responseId: string,
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'PUT',
      path: `/topics/${id}/responses/${responseId}`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /topics/:id/read-state - Get read state for a topic
   *
   * Proxies to discussion-service: GET /topics/:topicId/read-state
   */
  @Get(':id/read-state')
  async getReadState(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/topics/${id}/read-state`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * PUT /topics/:id/read-state - Update read state for a topic
   *
   * Proxies to discussion-service: PUT /topics/:topicId/read-state
   */
  @Put(':id/read-state')
  async updateReadState(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'PUT',
      path: `/topics/${id}/read-state`,
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }
}
