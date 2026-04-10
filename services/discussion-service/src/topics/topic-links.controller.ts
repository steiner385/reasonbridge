/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { TopicLinksService } from './topic-links.service.js';
import {
  CreateTopicLinkDto,
  UpdateTopicLinkStatusDto,
  GetTopicLinksQueryDto,
  type TopicLinkResponseDto,
  type LinkedTopicResponseDto,
} from './dto/topic-link.dto.js';
import { type AuthenticatedRequest, getUserIdFromRequest } from '../auth/index.js';

/**
 * Controller for topic links API
 * Feature 016: Topic Management - Topic Linking (T217)
 *
 * Endpoints:
 * - POST   /topics/:topicId/links      - Create a link from this topic to another
 * - GET    /topics/:topicId/links      - Get all links for a topic
 * - GET    /topics/:topicId/linked     - Get simplified list of linked topics
 * - GET    /topics/:topicId/links/:id  - Get a specific link
 * - PATCH  /topics/:topicId/links/:id  - Update link confirmation status
 * - DELETE /topics/:topicId/links/:id  - Delete a link
 */
@Controller('topics/:topicId/links')
export class TopicLinksController {
  constructor(private readonly topicLinksService: TopicLinksService) {}

  /**
   * Create a new link from this topic to another
   *
   * @param topicId - Source topic ID (from URL)
   * @param dto - Link creation details (target topic, relationship type)
   * @param userIdHeader - User ID from API gateway header
   * @param req - Request object for fallback user extraction
   * @returns Created topic link
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLink(
    @Param('topicId') topicId: string,
    @Body() dto: CreateTopicLinkDto,
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<TopicLinkResponseDto> {
    const userId = getUserIdFromRequest(userIdHeader, req);

    if (!userId) {
      throw new NotFoundException('User ID not found. Authentication required.');
    }

    return this.topicLinksService.createLink(topicId, dto, userId);
  }

  /**
   * Get all links for a topic (both as source and target)
   *
   * @param topicId - Topic ID
   * @param query - Filter options (relationshipType, status, linkSource)
   * @returns Array of topic links
   */
  @Get()
  async getLinks(
    @Param('topicId') topicId: string,
    @Query() query: GetTopicLinksQueryDto,
  ): Promise<TopicLinkResponseDto[]> {
    return this.topicLinksService.getLinksForTopic(topicId, query);
  }

  /**
   * Get a specific link by ID
   *
   * @param topicId - Topic ID (for validation)
   * @param linkId - Link ID
   * @returns Topic link
   */
  @Get(':linkId')
  async getLink(
    @Param('topicId') topicId: string,
    @Param('linkId') linkId: string,
  ): Promise<TopicLinkResponseDto> {
    const link = await this.topicLinksService.findLinkById(linkId);

    if (!link) {
      throw new NotFoundException(`Topic link ${linkId} not found`);
    }

    // Verify the link belongs to this topic
    if (link.sourceTopicId !== topicId && link.targetTopicId !== topicId) {
      throw new NotFoundException(`Topic link ${linkId} not found for topic ${topicId}`);
    }

    return link;
  }

  /**
   * Update a link's confirmation status
   *
   * @param topicId - Topic ID (for validation)
   * @param linkId - Link ID
   * @param dto - Status update (PENDING, CONFIRMED, REJECTED)
   * @param userIdHeader - User ID from API gateway header
   * @param req - Request object for fallback user extraction
   * @returns Updated topic link
   */
  @Patch(':linkId')
  async updateLinkStatus(
    @Param('topicId') topicId: string,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateTopicLinkStatusDto,
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Request() req: AuthenticatedRequest,
  ): Promise<TopicLinkResponseDto> {
    const userId = getUserIdFromRequest(userIdHeader, req);

    if (!userId) {
      throw new NotFoundException('User ID not found. Authentication required.');
    }

    // Verify link exists and belongs to topic
    const existingLink = await this.topicLinksService.findLinkById(linkId);
    if (!existingLink) {
      throw new NotFoundException(`Topic link ${linkId} not found`);
    }
    if (existingLink.sourceTopicId !== topicId && existingLink.targetTopicId !== topicId) {
      throw new NotFoundException(`Topic link ${linkId} not found for topic ${topicId}`);
    }

    return this.topicLinksService.updateLinkStatus(linkId, dto, userId);
  }

  /**
   * Delete a topic link
   *
   * @param topicId - Topic ID (for validation)
   * @param linkId - Link ID
   * @returns Deleted link
   */
  @Delete(':linkId')
  async deleteLink(
    @Param('topicId') topicId: string,
    @Param('linkId') linkId: string,
  ): Promise<TopicLinkResponseDto> {
    // Verify link exists and belongs to topic
    const existingLink = await this.topicLinksService.findLinkById(linkId);
    if (!existingLink) {
      throw new NotFoundException(`Topic link ${linkId} not found`);
    }
    if (existingLink.sourceTopicId !== topicId && existingLink.targetTopicId !== topicId) {
      throw new NotFoundException(`Topic link ${linkId} not found for topic ${topicId}`);
    }

    return this.topicLinksService.deleteLink(linkId);
  }
}

/**
 * Separate controller for the simplified linked topics endpoint
 * Mounted at /topics/:topicId/linked (without /links prefix)
 */
@Controller('topics/:topicId/linked')
export class LinkedTopicsController {
  constructor(private readonly topicLinksService: TopicLinksService) {}

  /**
   * Get simplified list of linked topics for display
   *
   * @param topicId - Topic ID
   * @param confirmedOnly - Only return confirmed links (default: true)
   * @returns Array of linked topics with relationship info
   */
  @Get()
  async getLinkedTopics(
    @Param('topicId') topicId: string,
    @Query('confirmedOnly') confirmedOnly?: string,
  ): Promise<LinkedTopicResponseDto[]> {
    const onlyConfirmed = confirmedOnly !== 'false';
    return this.topicLinksService.getLinkedTopics(topicId, onlyConfirmed);
  }
}
