import { Body, Controller, Post, Get, BadRequestException } from '@nestjs/common';
import type { ScreeningResult } from '../services/content-screening.service.js';
import { ContentScreeningService } from '../services/content-screening.service.js';
import type {
  AiRecommendationRequest,
  AiRecommendationResponse,
} from '../services/ai-review.service.js';
import { AIReviewService } from '../services/ai-review.service.js';

export interface ScreenContentRequest {
  contentId: string;
  content: string;
}

export interface ScreenContentResponse {
  screening_result: ScreeningResult;
  recommendations: string[];
}

@Controller('moderation')
export class ModerationController {
  constructor(
    private readonly screeningService: ContentScreeningService,
    private readonly aiReviewService: AIReviewService,
  ) {}

  @Post('screen')
  async screenContent(
    @Body() request: ScreenContentRequest,
  ): Promise<ScreenContentResponse> {
    if (!request.contentId || !request.content) {
      throw new BadRequestException(
        'contentId and content are required fields',
      );
    }

    if (request.content.trim().length === 0) {
      throw new BadRequestException('content cannot be empty');
    }

    if (request.content.length > 10000) {
      throw new BadRequestException('content exceeds maximum length of 10000');
    }

    const screening_result = await this.screeningService.screenContent(
      request.contentId,
      request.content,
    );

    const recommendations = this.screeningService.getRecommendations(
      screening_result,
    );

    return {
      screening_result,
      recommendations,
    };
  }

  @Post('actions/ai-recommend')
  async submitAiRecommendation(
    @Body() request: AiRecommendationRequest,
  ): Promise<AiRecommendationResponse> {
    // Validate required fields
    if (!request.targetType || !request.targetId || !request.actionType) {
      throw new BadRequestException(
        'targetType, targetId, and actionType are required',
      );
    }

    if (request.reasoning === undefined || request.reasoning.trim().length === 0) {
      throw new BadRequestException('reasoning is required');
    }

    if (request.confidence === undefined || typeof request.confidence !== 'number') {
      throw new BadRequestException('confidence is required and must be a number');
    }

    if (request.confidence < 0 || request.confidence > 1) {
      throw new BadRequestException('confidence must be between 0 and 1');
    }

    // Validate actionType is valid
    const validActions = ['educate', 'warn', 'hide', 'remove', 'suspend', 'ban'];
    if (!validActions.includes(request.actionType.toLowerCase())) {
      throw new BadRequestException(
        `actionType must be one of: ${validActions.join(', ')}`,
      );
    }

    // Validate targetType is valid
    const validTargets = ['response', 'user', 'topic'];
    if (!validTargets.includes(request.targetType.toLowerCase())) {
      throw new BadRequestException(
        `targetType must be one of: ${validTargets.join(', ')}`,
      );
    }

    return this.aiReviewService.submitAiRecommendation(request);
  }

  @Get('actions/ai-pending')
  async getPendingRecommendations(): Promise<{
    recommendations: AiRecommendationResponse[];
  }> {
    const recommendations =
      await this.aiReviewService.getPendingRecommendations(20);
    return { recommendations };
  }

  @Get('ai-stats')
  async getAiStats(): Promise<{
    totalPending: number;
    byActionType: Record<string, number>;
    avgConfidence: number;
    approvalRate: number;
  }> {
    return this.aiReviewService.getRecommendationStats();
  }
}
