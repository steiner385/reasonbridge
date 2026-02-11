/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TopicDraftsService } from './topic-drafts.service.js';
import { SaveTopicDraftDto } from './dto/topic-draft.dto.js';
import type { TopicDraftResponseDto, TopicDraftsListResponseDto } from './dto/topic-draft.dto.js';

/**
 * Controller for topic draft endpoints
 * Feature 016: Topic Management (T212)
 *
 * Endpoints:
 * - POST /topics/drafts - Create or update a draft
 * - GET /topics/drafts - List user's drafts
 * - GET /topics/drafts/:id - Get a specific draft
 * - DELETE /topics/drafts/:id - Delete a draft
 */
@Controller('topics/drafts')
export class TopicDraftsController {
  constructor(private readonly draftsService: TopicDraftsService) {}

  /**
   * Save a topic draft (create or update)
   * If dto.id is provided, updates existing draft; otherwise creates new
   */
  @Post()
  async saveDraft(
    @Body() dto: SaveTopicDraftDto,
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Request() req: any,
  ): Promise<TopicDraftResponseDto> {
    const userId = userIdHeader || req.user?.id || req.userId;
    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }
    return this.draftsService.saveDraft(userId, dto);
  }

  /**
   * Get all drafts for the authenticated user
   */
  @Get()
  async getDrafts(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Request() req: any,
  ): Promise<TopicDraftsListResponseDto> {
    const userId = userIdHeader || req.user?.id || req.userId;
    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }
    return this.draftsService.getDrafts(userId);
  }

  /**
   * Get a specific draft by ID
   */
  @Get(':id')
  async getDraft(
    @Param('id') draftId: string,
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Request() req: any,
  ): Promise<TopicDraftResponseDto> {
    const userId = userIdHeader || req.user?.id || req.userId;
    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }
    return this.draftsService.getDraft(userId, draftId);
  }

  /**
   * Delete a draft
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDraft(
    @Param('id') draftId: string,
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Request() req: any,
  ): Promise<void> {
    const userId = userIdHeader || req.user?.id || req.userId;
    if (!userId) {
      throw new Error('User ID not found in request. Authentication required.');
    }
    return this.draftsService.deleteDraft(userId, draftId);
  }
}
