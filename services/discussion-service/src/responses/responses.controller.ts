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
  Delete,
  Req,
} from '@nestjs/common';
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

// Placeholder for auth guard (will be implemented in Phase 9)
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
}

@Controller('topics')
export class ResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
    private readonly contentModerationService: ContentModerationService,
  ) {}

  /**
   * GET /topics/:topicId/responses
   * Get all responses for a discussion topic
   *
   * @param topicId - The ID of the topic to get responses for
   * @returns Array of responses for the topic
   */
  @Get(':topicId/responses')
  @HttpCode(HttpStatus.OK)
  async getResponsesForTopic(@Param('topicId') topicId: string): Promise<ResponseDto[]> {
    return this.responsesService.getResponsesForTopic(topicId);
  }

  /**
   * POST /topics/:topicId/responses
   * Create a new response to a discussion topic
   *
   * @param topicId - The ID of the topic to respond to
   * @param createResponseDto - The response data
   * @returns The created response
   */
  @Post(':topicId/responses')
  @HttpCode(HttpStatus.CREATED)
  async createResponse(
    @Param('topicId') topicId: string,
    @Body() createResponseDto: CreateResponseDto,
  ): Promise<ResponseDto> {
    // TODO: Extract authorId from JWT token when auth is implemented
    // For now, using a placeholder. This should be replaced with:
    // @Req() request: FastifyRequest
    // const authorId = request.user.id;
    const authorId = '00000000-0000-0000-0000-000000000000'; // Placeholder

    return this.responsesService.createResponse(topicId, authorId, createResponseDto);
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
   * @param replyDto - The reply content and optional citations
   * @returns The created reply
   * @throws NotFoundException if parent response doesn't exist
   * @throws BadRequestException if thread depth limit exceeded
   */
  @Post('responses/:responseId/replies')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 replies per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a specific response' })
  @ApiResponse({
    status: 201,
    description: 'Reply created successfully',
    type: ResponseDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Parent response not found' })
  @ApiResponse({ status: 400, description: 'Thread depth limit exceeded or validation error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (10 replies/min)' })
  async replyToResponse(
    @Param('responseId') responseId: string,
    @Body() replyDto: ReplyToResponseDto,
  ): Promise<ResponseDetailDto> {
    // TODO: Extract userId from JWT token when auth is implemented
    // For now, using a placeholder. This should be replaced with:
    // @Req() request: AuthRequest
    // const userId = request.user!.id;
    const userId = '00000000-0000-0000-0000-000000000000'; // Placeholder

    // Transform DTO to service format
    const replyData = {
      content: replyDto.content,
      citations: replyDto.citations?.map((c) => ({ url: c.url, title: c.title })),
    };

    return this.responsesService.replyToResponse(responseId, userId, replyData);
  }

  /**
   * PUT /topics/:topicId/responses/:responseId
   * Update an existing response
   *
   * @param topicId - The ID of the topic (for route consistency)
   * @param responseId - The ID of the response to update
   * @param updateResponseDto - The updated response data
   * @returns The updated response
   */
  @Put(':topicId/responses/:responseId')
  @HttpCode(HttpStatus.OK)
  async updateResponse(
    @Param('topicId') topicId: string,
    @Param('responseId') responseId: string,
    @Body() updateResponseDto: UpdateResponseDto,
  ): Promise<ResponseDto> {
    // TODO: Extract authorId from JWT token when auth is implemented
    // For now, using a placeholder. This should be replaced with:
    // @Req() request: FastifyRequest
    // const authorId = request.user.id;
    const authorId = '00000000-0000-0000-0000-000000000000'; // Placeholder

    return this.responsesService.updateResponse(responseId, authorId, updateResponseDto);
  }

  /**
   * POST /topics/:topicId/responses/:responseId/moderate
   * Moderate a response (hide or remove)
   *
   * @param topicId - The ID of the topic (for route consistency)
   * @param responseId - The ID of the response to moderate
   * @param moderateDto - The moderation action details
   * @returns Information about the moderation action
   */
  @Post(':topicId/responses/:responseId/moderate')
  @HttpCode(HttpStatus.OK)
  async moderateResponse(
    @Param('topicId') topicId: string,
    @Param('responseId') responseId: string,
    @Body() moderateDto: ModerateResponseDto,
  ): Promise<ModerationActionResponseDto> {
    // TODO: Extract moderatorId from JWT token and verify moderator permissions
    // For now, using a placeholder. This should be replaced with:
    // @Req() request: FastifyRequest
    // const moderatorId = request.user.id;
    // Verify user has moderation permissions
    const moderatorId = '00000000-0000-0000-0000-000000000000'; // Placeholder

    if (!moderateDto.reason || moderateDto.reason.trim().length === 0) {
      throw new Error('Reason is required for moderation actions');
    }

    if (moderateDto.action === 'hide') {
      return this.contentModerationService.hideResponse(responseId, moderatorId, moderateDto);
    } else if (moderateDto.action === 'remove') {
      return this.contentModerationService.removeResponse(responseId, moderatorId, moderateDto);
    }

    throw new Error('Invalid moderation action');
  }

  /**
   * POST /topics/:topicId/responses/:responseId/restore
   * Restore a hidden response back to visible
   *
   * @param topicId - The ID of the topic (for route consistency)
   * @param responseId - The ID of the response to restore
   * @returns Information about the restoration
   */
  @Post(':topicId/responses/:responseId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreResponse(
    @Param('topicId') topicId: string,
    @Param('responseId') responseId: string,
    @Body() body: { reason: string },
  ): Promise<ModerationActionResponseDto> {
    // TODO: Extract moderatorId from JWT token and verify moderator permissions
    const moderatorId = '00000000-0000-0000-0000-000000000000'; // Placeholder

    if (!body.reason || body.reason.trim().length === 0) {
      throw new Error('Reason is required for restoration');
    }

    return this.contentModerationService.restoreResponse(responseId, moderatorId, body.reason);
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

    return this.contentModerationService.getResponsesByStatus(topicId, status.toUpperCase() as any);
  }

  // ==================== Feature 009: Discussion Participation ====================

  /**
   * T040 [US2] - Post a response to a discussion
   *
   * Rate limit: 10 responses per minute per user
   *
   * @param req - Authenticated request with user info
   * @param dto - Response creation data
   * @returns The created response
   */
  @Post('responses')
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
    status: 404,
    description: 'Discussion not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (10 responses per minute)',
  })
  async createResponseForDiscussion(
    @Req() req: AuthRequest,
    @Body() dto: CreateResponseDto,
  ): Promise<ResponseDetailDto> {
    // TODO: Replace with actual auth guard in Phase 9
    const userId = req.user?.id || 'anonymous';
    return this.responsesService.createResponseForDiscussion(userId, dto);
  }

  /**
   * T041 [US2] - Get all responses for a discussion
   *
   * @param discussionId - The ID of the discussion
   * @returns Array of responses for the discussion
   */
  @Get('discussions/:discussionId/responses')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle() // No rate limit on read operations
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
