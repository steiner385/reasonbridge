import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { RequestFeedbackDto, FeedbackResponseDto } from './dto/index.js';

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
}
