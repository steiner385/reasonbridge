import { Body, Controller, Post, Get, BadRequestException, Param, Query } from '@nestjs/common';
import type { ScreeningResult } from '../services/content-screening.service.js';
import { ContentScreeningService } from '../services/content-screening.service.js';
import type {
  AiRecommendationRequest,
  AiRecommendationResponse,
} from '../services/ai-review.service.js';
import { AIReviewService } from '../services/ai-review.service.js';
import { ModerationActionsService } from '../services/moderation-actions.service.js';
import type {
  CreateActionRequest,
  ApproveActionRequest,
  RejectActionRequest,
  ModerationActionResponse,
  ModerationActionDetailResponse,
  ListActionsResponse,
  CoolingOffPromptResponse,
} from '../dto/moderation-action.dto.js';
import type {
  CreateAppealRequest,
  AppealResponse,
  ReviewAppealRequest,
  PendingAppealResponse,
  ListAppealResponse,
} from '../dto/appeal.dto.js';

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
    private readonly actionsService: ModerationActionsService,
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

  @Get('actions')
  async listActions(
    @Query('targetType') targetType?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListActionsResponse> {
    const targetTypeEnum = targetType?.toUpperCase() as
      | 'RESPONSE'
      | 'USER'
      | 'TOPIC'
      | undefined;
    const statusEnum = status?.toUpperCase() as
      | 'PENDING'
      | 'ACTIVE'
      | 'APPEALED'
      | 'REVERSED'
      | undefined;
    const severityEnum = severity?.toUpperCase() as
      | 'NON_PUNITIVE'
      | 'CONSEQUENTIAL'
      | undefined;

    return this.actionsService.listActions(
      targetTypeEnum,
      statusEnum,
      severityEnum,
      limit,
      cursor,
    );
  }

  @Post('actions')
  async createAction(
    @Body() request: CreateActionRequest,
  ): Promise<ModerationActionResponse> {
    if (!request.targetType || !request.targetId || !request.actionType) {
      throw new BadRequestException(
        'targetType, targetId, and actionType are required',
      );
    }

    if (!request.reasoning || request.reasoning.trim().length === 0) {
      throw new BadRequestException('reasoning is required');
    }

    // TODO: Extract moderator ID from JWT token when auth is implemented
    const moderatorId = 'system';

    return this.actionsService.createAction(request, moderatorId);
  }

  @Get('actions/:actionId')
  async getAction(
    @Param('actionId') actionId: string,
  ): Promise<ModerationActionDetailResponse> {
    return this.actionsService.getAction(actionId);
  }

  @Post('actions/:actionId/approve')
  async approveAction(
    @Param('actionId') actionId: string,
    @Body() request?: ApproveActionRequest,
  ): Promise<ModerationActionResponse> {
    // TODO: Extract moderator ID from JWT token when auth is implemented
    const moderatorId = 'system';
    return this.actionsService.approveAction(actionId, moderatorId, request);
  }

  @Post('actions/:actionId/reject')
  async rejectAction(
    @Param('actionId') actionId: string,
    @Body() request: RejectActionRequest,
  ): Promise<void> {
    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('reason is required');
    }

    return this.actionsService.rejectAction(actionId, request);
  }

  @Get('users/:userId/actions')
  async getUserActions(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListActionsResponse> {
    return this.actionsService.getUserActions(userId, limit, cursor);
  }

  @Post('interventions/cooling-off')
  async sendCoolingOffPrompt(
    @Body()
    request: {
      userIds: string[];
      topicId: string;
      prompt: string;
    },
  ): Promise<{ sent: number }> {
    if (!request.userIds || request.userIds.length === 0) {
      throw new BadRequestException('userIds array is required');
    }

    if (!request.topicId) {
      throw new BadRequestException('topicId is required');
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new BadRequestException('prompt is required');
    }

    return this.actionsService.sendCoolingOffPrompt(
      request.userIds,
      request.topicId,
      request.prompt,
    );
  }

  @Post('actions/:actionId/appeal')
  async createAppeal(
    @Param('actionId') actionId: string,
    @Body() request: CreateAppealRequest,
  ): Promise<AppealResponse> {
    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('reason is required');
    }

    // TODO: Extract appellant ID from JWT token when auth is implemented
    const appellantId = 'system';
    return this.actionsService.createAppeal(actionId, appellantId, request);
  }

  @Get('appeals/pending')
  async getPendingAppeals(
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListAppealResponse> {
    return this.actionsService.getPendingAppeals(limit, cursor);
  }

  @Post('appeals/:appealId/review')
  async reviewAppeal(
    @Param('appealId') appealId: string,
    @Body() request: ReviewAppealRequest,
  ): Promise<AppealResponse> {
    if (!request.decision || !['upheld', 'denied'].includes(request.decision)) {
      throw new BadRequestException('decision must be either "upheld" or "denied"');
    }

    if (!request.reasoning || request.reasoning.trim().length === 0) {
      throw new BadRequestException('reasoning is required');
    }

    // TODO: Extract reviewer ID from JWT token when auth is implemented
    const reviewerId = 'system';
    return this.actionsService.reviewAppeal(appealId, reviewerId, request);
  }
}
