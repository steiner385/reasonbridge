import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { FeedbackAnalyticsService } from '../services/feedback-analytics.service.js';
import {
  RequestFeedbackDto,
  FeedbackResponseDto,
  DismissFeedbackDto,
  FeedbackAnalyticsDto,
  FeedbackAnalyticsQueryDto,
  PreviewFeedbackDto,
  PreviewFeedbackResultDto,
} from './dto/index.js';

/**
 * Controller for feedback-related endpoints
 */
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly analyticsService: FeedbackAnalyticsService,
  ) {}

  /**
   * Get real-time preview feedback for draft content (regex-based, fast)
   * POST /feedback/preview
   *
   * @param dto Preview request containing content and optional context
   * @returns Ephemeral feedback items (not stored in database)
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewFeedback(@Body() dto: PreviewFeedbackDto): Promise<PreviewFeedbackResultDto> {
    return this.feedbackService.previewFeedback(dto);
  }

  /**
   * Get AI-powered preview feedback for draft content (Bedrock-based, slower but more accurate)
   * POST /feedback/preview/ai
   *
   * @param dto Preview request containing content and optional context
   * @returns AI-analyzed feedback items (not stored in database)
   */
  @Post('preview/ai')
  @HttpCode(HttpStatus.OK)
  async previewFeedbackAI(@Body() dto: PreviewFeedbackDto): Promise<PreviewFeedbackResultDto> {
    return this.feedbackService.previewFeedbackAI(dto);
  }

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
   * Get feedback effectiveness analytics
   * GET /feedback/analytics
   *
   * @param query Query parameters for filtering (date range, type, etc.)
   * @returns Analytics data with metrics and insights
   */
  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  async getAnalytics(@Query() query: FeedbackAnalyticsQueryDto): Promise<FeedbackAnalyticsDto> {
    return this.analyticsService.getAnalytics(query);
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
