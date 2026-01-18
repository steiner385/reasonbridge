import { Controller, Get, Post, Put, Param, Body, HttpCode, HttpStatus, Delete } from '@nestjs/common';
import { ResponsesService } from './responses.service.js';
import { ContentModerationService } from './services/content-moderation.service.js';
import { CreateResponseDto } from './dto/create-response.dto.js';
import { UpdateResponseDto } from './dto/update-response.dto.js';
import { ModerateResponseDto, ModerationActionResponseDto } from './dto/moderate-response.dto.js';
import type { ResponseDto } from './dto/response.dto.js';

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
  async getResponsesForTopic(
    @Param('topicId') topicId: string,
  ): Promise<ResponseDto[]> {
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
  async getResponsesByStatus(
    @Param('topicId') topicId: string,
    @Param('status') status: string,
  ) {
    const validStatuses = ['VISIBLE', 'HIDDEN', 'REMOVED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.contentModerationService.getResponsesByStatus(topicId, status.toUpperCase() as any);
  }
}
