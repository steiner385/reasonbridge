/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Inject,
  UseGuards,
} from '@nestjs/common';
// TEMPORARILY DISABLED for debugging hang issue
// import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { ResponsesService } from './responses.service.js';
import { ContentModerationService } from './services/content-moderation.service.js';
import { CreateResponseDto } from './dto/create-response.dto.js';
import { ReplyToResponseDto } from './dto/reply-to-response.dto.js';
import { UpdateResponseDto } from './dto/update-response.dto.js';
import { ResponseDetailDto } from './dto/response-detail.dto.js';
import { ModerateResponseDto, ModerationActionResponseDto } from './dto/moderate-response.dto.js';
import type { ResponseDto } from './dto/response.dto.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';

@Controller('topics')
export class ResponsesController {
  constructor(
    @Inject(ResponsesService) private readonly responsesService: ResponsesService,
    @Inject(ContentModerationService)
    private readonly contentModerationService: ContentModerationService,
  ) {}

  /**
   * GET /topics/:topicId/responses
   * Get all responses for a discussion topic
   * Cached for 30 seconds - responses change frequently
   *
   * @param topicId - The ID of the topic to get responses for
   * @returns Array of responses for the topic
   */
  @Get(':topicId/responses')
  @HttpCode(HttpStatus.OK)
  // @UseInterceptors(CacheInterceptor)  // TEMPORARILY DISABLED
  // @CacheTTL(30000) // 30 seconds in ms
  async getResponsesForTopic(@Param('topicId') topicId: string): Promise<ResponseDto[]> {
    return this.responsesService.getResponsesForTopic(topicId);
  }

  /**
   * POST /topics/:topicId/responses
   * Create a new response to a discussion topic
   *
   * @param topicId - The ID of the topic to respond to
   * @param user - Authenticated user from JWT
   * @param createResponseDto - The response data
   * @returns The created response
   */
  @Post(':topicId/responses')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createResponse(
    @Param('topicId') topicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() createResponseDto: CreateResponseDto,
  ): Promise<ResponseDto> {
    return this.responsesService.createResponse(topicId, user.sub, createResponseDto);
  }

  /**
   * T055 [US3] POST /responses/:responseId/replies
   * Create a threaded reply to a specific response
   *
   * Requirements (FR-019, FR-020, FR-032):
   * - Verify parent response exists and is not deleted
   * - Inherit discussionId from parent response
   * - Enforce thread depth limit (max 10 levels, UI flattens after 5)
   * - Rate limiting: 10 replies/min per user
   * - Validate content (50-25000 chars)
   *
   * @param responseId - The ID of the parent response to reply to
   * @param user - Authenticated user from JWT
   * @param replyDto - The reply content and optional citations
   * @returns The created reply
   * @throws NotFoundException if parent response doesn't exist
   * @throws BadRequestException if thread depth limit exceeded
   */
  @Post('responses/:responseId/replies')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 replies per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a specific response' })
  @ApiResponse({
    status: 201,
    description: 'Reply created successfully',
    type: ResponseDetailDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Parent response not found' })
  @ApiResponse({ status: 400, description: 'Thread depth limit exceeded or validation error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (10 replies/min)' })
  async replyToResponse(
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
    @Body() replyDto: ReplyToResponseDto,
  ): Promise<ResponseDetailDto> {
    // Transform DTO to service format
    const replyData = {
      content: replyDto.content,
      citations: replyDto.citations?.map((c) => ({ url: c.url, title: c.title })),
    };

    return this.responsesService.replyToResponse(responseId, user.sub, replyData);
  }

  /**
   * PUT /topics/:topicId/responses/:responseId
   * Update an existing response
   *
   * @param topicId - The ID of the topic (for route consistency)
   * @param responseId - The ID of the response to update
   * @param user - Authenticated user from JWT
   * @param updateResponseDto - The updated response data
   * @returns The updated response
   */
  @Put(':topicId/responses/:responseId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateResponse(
    @Param('topicId') topicId: string,
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateResponseDto: UpdateResponseDto,
  ): Promise<ResponseDto> {
    return this.responsesService.updateResponse(responseId, user.sub, updateResponseDto);
  }

  /**
   * POST /topics/:topicId/responses/:responseId/moderate
   * Moderate a response (hide or remove)
   *
   * @param topicId - The ID of the topic (for route consistency)
   * @param responseId - The ID of the response to moderate
   * @param user - Authenticated user from JWT (must be moderator)
   * @param moderateDto - The moderation action details
   * @returns Information about the moderation action
   */
  @Post(':topicId/responses/:responseId/moderate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async moderateResponse(
    @Param('topicId') topicId: string,
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
    @Body() moderateDto: ModerateResponseDto,
  ): Promise<ModerationActionResponseDto> {
    // TODO: Add ModeratorGuard for proper role verification

    if (!moderateDto.reason || moderateDto.reason.trim().length === 0) {
      throw new Error('Reason is required for moderation actions');
    }

    if (moderateDto.action === 'hide') {
      return this.contentModerationService.hideResponse(responseId, user.sub, moderateDto);
    } else if (moderateDto.action === 'remove') {
      return this.contentModerationService.removeResponse(responseId, user.sub, moderateDto);
    }

    throw new Error('Invalid moderation action');
  }

  /**
   * POST /topics/:topicId/responses/:responseId/restore
   * Restore a hidden response back to visible
   *
   * @param topicId - The ID of the topic (for route consistency)
   * @param responseId - The ID of the response to restore
   * @param user - Authenticated user from JWT (must be moderator)
   * @returns Information about the restoration
   */
  @Post(':topicId/responses/:responseId/restore')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async restoreResponse(
    @Param('topicId') topicId: string,
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { reason: string },
  ): Promise<ModerationActionResponseDto> {
    // TODO: Add ModeratorGuard for proper role verification

    if (!body.reason || body.reason.trim().length === 0) {
      throw new Error('Reason is required for restoration');
    }

    return this.contentModerationService.restoreResponse(responseId, user.sub, body.reason);
  }

  /**
   * GET /topics/:topicId/responses/:responseId/moderation-status
   * Get the moderation status of a response
   *
   * @param responseId - The ID of the response
   * @returns The moderation status details
   */
  @Get(':topicId/responses/:responseId/moderation-status')
  @HttpCode(HttpStatus.OK)
  async getResponseModerationStatus(
    @Param('topicId') topicId: string,
    @Param('responseId') responseId: string,
  ) {
    return this.contentModerationService.getResponseModerationStatus(responseId);
  }

  /**
   * GET /topics/:topicId/responses/by-status/:status
   * Get all responses with a specific moderation status
   *
   * @param topicId - The ID of the topic
   * @param status - The status to filter by (VISIBLE, HIDDEN, or REMOVED)
   * @returns Array of responses with the specified status
   */
  @Get(':topicId/responses/by-status/:status')
  @HttpCode(HttpStatus.OK)
  async getResponsesByStatus(@Param('topicId') topicId: string, @Param('status') status: string) {
    const validStatuses = ['VISIBLE', 'HIDDEN', 'REMOVED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.contentModerationService.getResponsesByStatus(
      topicId,
      status.toUpperCase() as 'VISIBLE' | 'HIDDEN' | 'REMOVED',
    );
  }

  // ==================== Feature 009: Discussion Participation ====================

  /**
   * T040 [US2] - Post a response to a discussion
   *
   * Rate limit: 10 responses per minute per user
   *
   * @param user - Authenticated user from JWT
   * @param dto - Response creation data
   * @returns The created response
   */
  @Post('responses')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ 'response-posting': { limit: 10, ttl: 60000 } }) // 10 per minute
  @ApiBearerAuth()
  @ApiTags('responses')
  @ApiOperation({
    summary: 'Post a response to a discussion',
    description: 'Creates a top-level response in a discussion. Rate limited to 10 per minute.',
  })
  @ApiResponse({
    status: 201,
    description: 'Response created successfully',
    type: ResponseDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or discussion not active',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Discussion not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (10 responses per minute)',
  })
  async createResponseForDiscussion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateResponseDto,
  ): Promise<ResponseDetailDto> {
    return this.responsesService.createResponseForDiscussion(user.sub, dto);
  }

  /**
   * T041 [US2] - Get all responses for a discussion
   * Cached for 30 seconds - responses change frequently
   *
   * @param discussionId - The ID of the discussion
   * @returns Array of responses for the discussion
   */
  @Get('discussions/:discussionId/responses')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle() // No rate limit on read operations
  // @UseInterceptors(CacheInterceptor)  // TEMPORARILY DISABLED
  // @CacheTTL(30000) // 30 seconds in ms
  @ApiTags('responses')
  @ApiOperation({
    summary: 'Get responses for a discussion',
    description: 'Retrieve all non-deleted responses for a discussion in chronological order.',
  })
  @ApiResponse({
    status: 200,
    description: 'Responses retrieved successfully',
    type: [ResponseDetailDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Discussion not found',
  })
  async getDiscussionResponses(
    @Param('discussionId') discussionId: string,
  ): Promise<ResponseDetailDto[]> {
    return this.responsesService.getDiscussionResponses(discussionId);
  }
}
