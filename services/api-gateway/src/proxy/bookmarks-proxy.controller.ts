/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  Headers,
  Body,
  Inject,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * BookmarksProxyController - Proxy for bookmark endpoints
 *
 * Handles routes under /bookmarks:
 * - GET /bookmarks - Get user's bookmarks
 * - GET /bookmarks/:responseId/status - Get bookmark status for a response
 * - POST /bookmarks - Add a bookmark
 * - DELETE /bookmarks/:responseId - Remove a bookmark
 */
@Controller('bookmarks')
export class BookmarksProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  /**
   * GET /bookmarks - Get user's bookmarks
   *
   * Proxies to discussion-service: GET /bookmarks
   */
  @Get()
  async getBookmarks(
    @Query() query: Record<string, string>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: '/bookmarks',
      query,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * GET /bookmarks/:responseId/status - Get bookmark status for a response
   *
   * Proxies to discussion-service: GET /bookmarks/:responseId/status
   */
  @Get(':responseId/status')
  async getBookmarkStatus(
    @Param('responseId') responseId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'GET',
      path: `/bookmarks/${responseId}/status`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * POST /bookmarks - Add a bookmark
   *
   * Proxies to discussion-service: POST /bookmarks
   */
  @Post()
  async addBookmark(
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'POST',
      path: '/bookmarks',
      body,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }

  /**
   * DELETE /bookmarks/:responseId - Remove a bookmark
   *
   * Proxies to discussion-service: DELETE /bookmarks/:responseId
   */
  @Delete(':responseId')
  async removeBookmark(
    @Param('responseId') responseId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
    @Res() res: FastifyReply,
  ) {
    const response = await this.proxyService.proxyToDiscussionService({
      method: 'DELETE',
      path: `/bookmarks/${responseId}`,
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    res.status(response.status).send(response.data);
  }
}
