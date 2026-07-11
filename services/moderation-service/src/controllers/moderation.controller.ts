/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Body,
  Controller,
  Post,
  Get,
  BadRequestException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ScreeningResult } from '../services/content-screening.service.js';
import { ContentScreeningService } from '../services/content-screening.service.js';
import type {
  AiRecommendationRequest,
  AiRecommendationResponse,
} from '../services/ai-review.service.js';
import { AIReviewService } from '../services/ai-review.service.js';
import { ModerationActionsService } from '../services/moderation-actions.service.js';
import { AppealService } from '../services/appeal.service.js';
import { ModerationQueueService } from '../services/moderation-queue.service.js';
import type { QueueStats } from '../services/moderation-queue.service.js';
import { SafetyReportService } from '../services/safety-report.service.js';
import type { SafetyReportResponse, SafetyReportStats } from '../services/safety-report.service.js';
import { ReportService } from '../services/report.service.js';
import type {
  CreateReportRequest,
  UpdateReportStatusRequest,
  ReportResponse,
  ListReportsResponse,
  ReportStatsResponse,
  ReportCategory,
  ReportStatus,
  ReportContentType,
} from '../dto/report.dto.js';
import type { SafetyReportReason, SafetyReportStatus, ReviewPriority } from '@prisma/client';
import { CONTENT_SCREENING } from '../constants/index.js';
import type {
  CreateActionRequest,
  ApproveActionRequest,
  RejectActionRequest,
  ModerationActionResponse,
  ModerationActionDetailResponse,
  ListActionsResponse,
  CoolingOffPromptResponse,
  CreateTemporaryBanRequest,
  UserBanStatusResponse,
  AutoLiftBansResponse,
} from '../dto/moderation-action.dto.js';
import type {
  CreateAppealRequest,
  AppealResponse,
  ReviewAppealRequest,
  PendingAppealResponse,
  ListAppealResponse,
} from '../dto/appeal.dto.js';
import { InternalApiKeyGuard } from '@reason-bridge/common';
import {
  JwtAuthGuard,
  AdminGuard,
  ModeratorGuard,
  CurrentUser,
  type JwtPayload,
} from '../auth/index.js';

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
    private readonly queueService: ModerationQueueService,
    private readonly safetyReportService: SafetyReportService,
    private readonly reportService: ReportService,
    private readonly appealService: AppealService,
  ) {}

  @Post('screen')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async screenContent(@Body() request: ScreenContentRequest): Promise<ScreenContentResponse> {
    if (!request.contentId || !request.content) {
      throw new BadRequestException('contentId and content are required fields');
    }

    if (request.content.trim().length === 0) {
      throw new BadRequestException('content cannot be empty');
    }

    if (request.content.length > CONTENT_SCREENING.MAX_LENGTH) {
      throw new BadRequestException(
        `content exceeds maximum length of ${CONTENT_SCREENING.MAX_LENGTH}`,
      );
    }

    const screening_result = await this.screeningService.screenContent(
      request.contentId,
      request.content,
    );

    const recommendations = this.screeningService.getRecommendations(screening_result);

    return {
      screening_result,
      recommendations,
    };
  }

  @Post('actions/ai-recommend')
  @UseGuards(InternalApiKeyGuard)
  async submitAiRecommendation(
    @Body() request: AiRecommendationRequest,
  ): Promise<AiRecommendationResponse> {
    // Validate required fields
    if (!request.targetType || !request.targetId || !request.actionType) {
      throw new BadRequestException('targetType, targetId, and actionType are required');
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
      throw new BadRequestException(`actionType must be one of: ${validActions.join(', ')}`);
    }

    // Validate targetType is valid
    const validTargets = ['response', 'user', 'topic'];
    if (!validTargets.includes(request.targetType.toLowerCase())) {
      throw new BadRequestException(`targetType must be one of: ${validTargets.join(', ')}`);
    }

    return this.aiReviewService.submitAiRecommendation(request);
  }

  @Get('actions/ai-pending')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getPendingRecommendations(): Promise<{
    recommendations: AiRecommendationResponse[];
  }> {
    const recommendations = await this.aiReviewService.getPendingRecommendations(20);
    return { recommendations };
  }

  @Get('ai-stats')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getAiStats(): Promise<{
    totalPending: number;
    byActionType: Record<string, number>;
    avgConfidence: number;
    approvalRate: number;
  }> {
    return this.aiReviewService.getRecommendationStats();
  }

  @Get('queue/stats')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getQueueStats(): Promise<QueueStats> {
    return this.queueService.getQueueStats();
  }

  @Get('actions')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async listActions(
    @Query('targetType') targetType?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListActionsResponse> {
    const targetTypeEnum = targetType?.toUpperCase() as 'RESPONSE' | 'USER' | 'TOPIC' | undefined;
    const statusEnum = status?.toUpperCase() as
      | 'PENDING'
      | 'ACTIVE'
      | 'APPEALED'
      | 'REVERSED'
      | undefined;
    const severityEnum = severity?.toUpperCase() as 'NON_PUNITIVE' | 'CONSEQUENTIAL' | undefined;

    return this.actionsService.listActions(targetTypeEnum, statusEnum, severityEnum, limit, cursor);
  }

  @Post('actions')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async createAction(
    @CurrentUser() user: JwtPayload,
    @Body() request: CreateActionRequest,
  ): Promise<ModerationActionResponse> {
    if (!request.targetType || !request.targetId || !request.actionType) {
      throw new BadRequestException('targetType, targetId, and actionType are required');
    }

    if (!request.reasoning || request.reasoning.trim().length === 0) {
      throw new BadRequestException('reasoning is required');
    }

    return this.actionsService.createAction(request, user.sub);
  }

  @Get('actions/:actionId')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getAction(@Param('actionId') actionId: string): Promise<ModerationActionDetailResponse> {
    return this.actionsService.getAction(actionId);
  }

  @Post('actions/:actionId/approve')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async approveAction(
    @Param('actionId') actionId: string,
    @CurrentUser() user: JwtPayload,
    @Body() request?: ApproveActionRequest,
  ): Promise<ModerationActionResponse> {
    return this.actionsService.approveAction(actionId, user.sub, request);
  }

  @Post('actions/:actionId/reject')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async rejectAction(
    @Param('actionId') actionId: string,
    @CurrentUser() user: JwtPayload,
    @Body() request: RejectActionRequest,
  ): Promise<void> {
    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('reason is required');
    }

    return this.actionsService.rejectAction(actionId, user.sub, request);
  }

  @Get('users/:userId/actions')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getUserActions(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListActionsResponse> {
    return this.actionsService.getUserActions(userId, limit, cursor);
  }

  @Post('interventions/cooling-off')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
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
  @UseGuards(JwtAuthGuard)
  async createAppeal(
    @Param('actionId') actionId: string,
    @CurrentUser() user: JwtPayload,
    @Body() request: CreateAppealRequest,
  ): Promise<AppealResponse> {
    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('reason is required');
    }

    return this.appealService.createAppeal(actionId, user.sub, request);
  }

  @Get('appeals/pending')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getPendingAppeals(
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListAppealResponse> {
    return this.appealService.getPendingAppeals(limit, cursor);
  }

  /**
   * List the authenticated user's own appeals.
   *
   * Scoped to the JWT subject so the "your appeals" surface can no longer leak
   * every user's appeal reason and moderator decision reasoning (Issue #1396).
   * Declared before the unscoped `GET appeals` handler; both paths are static
   * so ordering is unambiguous.
   */
  @Get('appeals/me')
  @UseGuards(JwtAuthGuard)
  async listMyAppeals(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListAppealResponse> {
    const statusEnum = status?.toUpperCase() as
      | 'PENDING'
      | 'UNDER_REVIEW'
      | 'UPHELD'
      | 'DENIED'
      | undefined;
    return this.appealService.listAppealsByAppellant(user.sub, statusEnum, limit, cursor);
  }

  @Get('appeals')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async listAppeals(
    @Query('status') status?: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListAppealResponse> {
    const statusEnum = status?.toUpperCase() as
      | 'PENDING'
      | 'UNDER_REVIEW'
      | 'UPHELD'
      | 'DENIED'
      | undefined;
    return this.appealService.listAppeals(statusEnum, limit, cursor);
  }

  @Post('appeals/:appealId/review')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async reviewAppeal(
    @Param('appealId') appealId: string,
    @CurrentUser() user: JwtPayload,
    @Body() request: ReviewAppealRequest,
  ): Promise<AppealResponse> {
    if (!request.decision || !['upheld', 'denied'].includes(request.decision)) {
      throw new BadRequestException('decision must be either "upheld" or "denied"');
    }

    if (!request.reasoning || request.reasoning.trim().length === 0) {
      throw new BadRequestException('reasoning is required');
    }

    return this.appealService.reviewAppeal(appealId, user.sub, request);
  }

  /**
   * Claim an appeal for review (PENDING → UNDER_REVIEW).
   *
   * Makes the previously-unreachable UNDER_REVIEW state usable so two
   * moderators don't unknowingly review the same appeal (Issue #1320).
   */
  @Post('appeals/:appealId/assign')
  @UseGuards(JwtAuthGuard)
  async assignAppeal(
    @Param('appealId') appealId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AppealResponse> {
    return this.appealService.assignAppealToModerator(appealId, user.sub);
  }

  /**
   * Release a claimed appeal back to the queue (UNDER_REVIEW → PENDING).
   */
  @Post('appeals/:appealId/unassign')
  @UseGuards(JwtAuthGuard)
  async unassignAppeal(@Param('appealId') appealId: string): Promise<AppealResponse> {
    return this.appealService.unassignAppeal(appealId);
  }

  @Post('bans/temporary')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async createTemporaryBan(
    @CurrentUser() user: JwtPayload,
    @Body() request: CreateTemporaryBanRequest,
  ): Promise<ModerationActionResponse> {
    if (!request.userId || !request.userId.trim()) {
      throw new BadRequestException('userId is required');
    }

    if (!request.durationDays || request.durationDays <= 0) {
      throw new BadRequestException('durationDays must be greater than 0');
    }

    if (request.durationDays > 365) {
      throw new BadRequestException('durationDays cannot exceed 365');
    }

    if (!request.reasoning || request.reasoning.trim().length === 0) {
      throw new BadRequestException('reasoning is required');
    }

    return this.actionsService.createTemporaryBan(
      request.userId,
      request.durationDays,
      request.reasoning,
      user.sub,
    );
  }

  @Get('bans/user/:userId/status')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getUserBanStatus(@Param('userId') userId: string): Promise<UserBanStatusResponse> {
    if (!userId || !userId.trim()) {
      throw new BadRequestException('userId is required');
    }

    return this.actionsService.getUserBanStatus(userId);
  }

  @Post('bans/auto-lift')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async autoLiftExpiredBans(): Promise<AutoLiftBansResponse> {
    // This endpoint should be called by a scheduled task or admin
    return this.actionsService.autoLiftExpiredBans();
  }

  // ============================================================================
  // SAFETY REPORT ENDPOINTS (Child-Friendly Mode Feature #783)
  // ============================================================================

  @Post('safety-reports')
  @UseGuards(JwtAuthGuard)
  async createSafetyReport(
    @CurrentUser() user: JwtPayload,
    @Body()
    request: {
      reporterId?: string; // Optional - will use authenticated user if not provided
      reason: SafetyReportReason;
      additionalInfo?: string;
      contextUrl?: string;
      contextTopicId?: string;
      contextResponseId?: string;
    },
  ): Promise<SafetyReportResponse> {
    if (!request.reason) {
      throw new BadRequestException('reason is required');
    }

    const validReasons: SafetyReportReason[] = [
      'UNCOMFORTABLE',
      'SCARY_CONTENT',
      'STRANGER_CONTACT',
      'PERSONAL_QUESTIONS',
      'OTHER',
    ];

    if (!validReasons.includes(request.reason)) {
      throw new BadRequestException(`reason must be one of: ${validReasons.join(', ')}`);
    }

    // Use authenticated user if reporterId not explicitly provided
    return this.safetyReportService.createReport({
      ...request,
      reporterId: request.reporterId || user.sub,
    });
  }

  @Get('safety-reports')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async listSafetyReports(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<{ reports: SafetyReportResponse[]; nextCursor: string | null }> {
    const statusEnum = status?.toUpperCase() as SafetyReportStatus | undefined;
    const priorityEnum = priority?.toUpperCase() as ReviewPriority | undefined;

    return this.safetyReportService.listReports(statusEnum, priorityEnum, limit, cursor);
  }

  @Get('safety-reports/pending')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getPendingSafetyReports(
    @Query('limit') limit: number = 20,
  ): Promise<SafetyReportResponse[]> {
    return this.safetyReportService.getPendingReports(limit);
  }

  @Get('safety-reports/stats')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getSafetyReportStats(): Promise<SafetyReportStats> {
    return this.safetyReportService.getStats();
  }

  @Get('safety-reports/:reportId')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getSafetyReport(@Param('reportId') reportId: string): Promise<SafetyReportResponse> {
    const report = await this.safetyReportService.findReport(reportId);
    if (!report) {
      throw new BadRequestException('Safety report not found');
    }
    return report;
  }

  @Post('safety-reports/:reportId/resolve')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async resolveSafetyReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: JwtPayload,
    @Body() request: { notes?: string },
  ): Promise<SafetyReportResponse> {
    return this.safetyReportService.resolveReport(reportId, user.sub, request.notes);
  }

  @Post('safety-reports/:reportId/escalate')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async escalateSafetyReport(
    @Param('reportId') reportId: string,
    @CurrentUser() user: JwtPayload,
    @Body() request: { notes?: string },
  ): Promise<SafetyReportResponse> {
    return this.safetyReportService.escalateReport(reportId, user.sub, request.notes);
  }

  @Get('users/:userId/safety-reports')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getUserSafetyReports(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20,
  ): Promise<SafetyReportResponse[]> {
    return this.safetyReportService.getReportsByReporter(userId, limit);
  }

  // ============================================================================
  // CONTENT REPORT ENDPOINTS (Issue #1046)
  // ============================================================================

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  async createReport(
    @CurrentUser() user: JwtPayload,
    @Body() request: CreateReportRequest,
  ): Promise<ReportResponse> {
    if (!request.contentType) {
      throw new BadRequestException('contentType is required');
    }

    if (!request.contentId) {
      throw new BadRequestException('contentId is required');
    }

    if (!request.category) {
      throw new BadRequestException('category is required');
    }

    const validContentTypes: ReportContentType[] = ['topic', 'response', 'user'];
    if (!validContentTypes.includes(request.contentType)) {
      throw new BadRequestException(`contentType must be one of: ${validContentTypes.join(', ')}`);
    }

    const validCategories: ReportCategory[] = [
      'SPAM',
      'HARASSMENT',
      'MISINFORMATION',
      'HATE_SPEECH',
      'VIOLENCE',
      'COPYRIGHT',
      'OTHER',
    ];
    if (!validCategories.includes(request.category)) {
      throw new BadRequestException(`category must be one of: ${validCategories.join(', ')}`);
    }

    return this.reportService.createReport(request, user.sub);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async listReports(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('contentType') contentType?: string,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ): Promise<ListReportsResponse> {
    const statusEnum = status?.toUpperCase() as ReportStatus | undefined;
    const categoryEnum = category?.toUpperCase() as ReportCategory | undefined;
    const contentTypeEnum = contentType?.toLowerCase() as ReportContentType | undefined;

    return this.reportService.getReports({
      status: statusEnum,
      category: categoryEnum,
      contentType: contentTypeEnum,
      limit,
      cursor,
    });
  }

  @Get('reports/stats')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getReportStats(): Promise<ReportStatsResponse> {
    return this.reportService.getReportStats();
  }

  @Get('reports/pending')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getPendingReports(@Query('limit') limit: number = 20): Promise<ReportResponse[]> {
    return this.reportService.getPendingReports(limit);
  }

  @Get('reports/:reportId')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getReport(@Param('reportId') reportId: string): Promise<ReportResponse> {
    return this.reportService.getReportById(reportId);
  }

  @Post('reports/:reportId/status')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async updateReportStatus(
    @Param('reportId') reportId: string,
    @CurrentUser() user: JwtPayload,
    @Body() request: UpdateReportStatusRequest,
  ): Promise<ReportResponse> {
    if (!request.status) {
      throw new BadRequestException('status is required');
    }

    const validStatuses: ReportStatus[] = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(request.status)) {
      throw new BadRequestException(`status must be one of: ${validStatuses.join(', ')}`);
    }

    // Require resolution for terminal statuses
    if ((request.status === 'RESOLVED' || request.status === 'DISMISSED') && !request.resolution) {
      throw new BadRequestException('resolution is required when status is RESOLVED or DISMISSED');
    }

    return this.reportService.updateReportStatus(reportId, request, user.sub);
  }

  @Get('content/:contentType/:contentId/reports')
  @UseGuards(JwtAuthGuard, ModeratorGuard)
  async getContentReports(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
  ): Promise<ReportResponse[]> {
    const validContentTypes: ReportContentType[] = ['topic', 'response', 'user'];
    if (!validContentTypes.includes(contentType as ReportContentType)) {
      throw new BadRequestException(`contentType must be one of: ${validContentTypes.join(', ')}`);
    }

    return this.reportService.getReportsByContent(contentType, contentId);
  }
}
