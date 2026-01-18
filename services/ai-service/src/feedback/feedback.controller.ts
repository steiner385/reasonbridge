import { Controller, Post, Get, Patch, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { RequestFeedbackDto, FeedbackResponseDto, DismissFeedbackDto } from './dto/index.js';

/**
 * Controller for feedback-related endpoints
 */
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Request AI-generated feedback for a response
   * POST /feedback/request
   *
   * @param dto Request containing responseId and content
   * @returns Created feedback record
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async requestFeedback(@Body() dto: RequestFeedbackDto): Promise<FeedbackResponseDto> {
    return this.feedbackService.requestFeedback(dto);
  }

  /**
   * Get feedback by ID
   * GET /feedback/:id
   *
   * @param id Feedback UUID
   * @returns Feedback record
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getFeedback(@Param('id') id: string): Promise<FeedbackResponseDto> {
    return this.feedbackService.getFeedbackById(id);
  }

  /**
   * Dismiss feedback
   * PATCH /feedback/:id/dismiss
   *
   * @param id Feedback UUID
   * @param dto Dismissal information (optional reason)
   * @returns Updated feedback record
   */
  @Patch(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissFeedback(
    @Param('id') id: string,
    @Body() dto: DismissFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    return this.feedbackService.dismissFeedback(id, dto);
  }
}
