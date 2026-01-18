import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import type { ScreeningResult } from './content-screening.service.js';
import { ContentScreeningService } from './content-screening.service.js';
import type { ModerationActionRequestedEvent } from '@unite-discord/event-schemas';
import { MODERATION_EVENT_TYPES } from '@unite-discord/event-schemas';

export interface AiRecommendationRequest {
  targetType: 'response' | 'user' | 'topic';
  targetId: string;
  actionType: 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban';
  reasoning: string;
  confidence: number;
  analysisDetails?: Record<string, unknown>;
}

export interface AiRecommendationResponse {
  id: string;
  targetType: string;
  targetId: string;
  actionType: string;
  severity: string;
  reasoning: string;
  aiRecommended: boolean;
  aiConfidence: number;
  status: string;
  createdAt: string;
}

/**
 * AIReviewService handles AI-assisted moderation review.
 * Creates moderation action recommendations based on AI analysis.
 */
@Injectable()
export class AIReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly screeningService: ContentScreeningService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Submit an AI-recommended moderation action
   * Creates a PENDING moderation action for human review
   * Publishes event to queue for other services to consume
   */
  async submitAiRecommendation(
    request: AiRecommendationRequest,
  ): Promise<AiRecommendationResponse> {
    // Validate confidence score
    if (request.confidence < 0 || request.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    // Map action type to severity based on escalation
    const severity = this.mapActionToSeverity(request.actionType);

    // Create moderation action with AI recommendation flag
    const moderationAction = await this.prisma.moderationAction.create({
      data: {
        targetType: this.mapTargetType(request.targetType),
        targetId: request.targetId,
        actionType: this.mapActionType(request.actionType),
        severity: severity,
        reasoning: request.reasoning,
        aiRecommended: true,
        aiConfidence: request.confidence,
        status: 'PENDING', // AI recommendations are always pending human review
      },
    });

    // Publish event to queue for other services
    try {
      const event: ModerationActionRequestedEvent = {
        id: moderationAction.id,
        type: MODERATION_EVENT_TYPES.ACTION_REQUESTED,
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          targetType: request.targetType as 'response' | 'user' | 'topic',
          targetId: request.targetId,
          actionType: request.actionType as 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban',
          severity: severity === 'NON_PUNITIVE' ? 'non_punitive' : 'consequential',
          reasoning: request.reasoning,
          aiConfidence: request.confidence,
          violationContext: request.analysisDetails as any,
          requestedAt: new Date().toISOString(),
        },
        metadata: {
          source: 'moderation-service',
          userId: 'system',
        },
      };

      await this.queueService.publishEvent(event);
    } catch (error) {
      // Log error but don't fail the request - moderation action is created
      console.error('Failed to publish moderation action event', error);
    }

    return this.mapModerationActionToResponse(moderationAction);
  }

  /**
   * Get pending AI recommendations for moderator review queue
   */
  async getPendingRecommendations(
    limit: number = 20,
  ): Promise<AiRecommendationResponse[]> {
    const actions = await this.prisma.moderationAction.findMany({
      where: {
        aiRecommended: true,
        status: 'PENDING',
      },
      orderBy: [
        { aiConfidence: 'desc' }, // Higher confidence first
        { createdAt: 'asc' }, // FIFO for same confidence
      ],
      take: limit,
    });

    return actions.map((action) => this.mapModerationActionToResponse(action));
  }

  /**
   * Get AI recommendation statistics
   */
  async getRecommendationStats(): Promise<{
    totalPending: number;
    byActionType: Record<string, number>;
    avgConfidence: number;
    approvalRate: number;
  }> {
    const pending = await this.prisma.moderationAction.count({
      where: {
        aiRecommended: true,
        status: 'PENDING',
      },
    });

    const approved = await this.prisma.moderationAction.count({
      where: {
        aiRecommended: true,
        status: { not: 'PENDING' },
      },
    });

    const byActionType = await this.prisma.moderationAction.groupBy({
      by: ['actionType'],
      where: {
        aiRecommended: true,
        status: 'PENDING',
      },
      _count: true,
    });

    const avgConfidenceResult = await this.prisma.moderationAction.aggregate({
      where: {
        aiRecommended: true,
        status: 'PENDING',
      },
      _avg: {
        aiConfidence: true,
      },
    });

    const total = pending + approved;
    const approvalRate = total > 0 ? approved / total : 0;
    const avgConfidence = avgConfidenceResult._avg.aiConfidence
      ? Number(avgConfidenceResult._avg.aiConfidence)
      : 0;

    return {
      totalPending: pending,
      byActionType: Object.fromEntries(
        byActionType.map((item) => [item.actionType, item._count]),
      ),
      avgConfidence,
      approvalRate,
    };
  }

  /**
   * Approve an AI recommendation (moderator action)
   */
  async approveRecommendation(
    actionId: string,
    approverUserId: string,
  ): Promise<AiRecommendationResponse> {
    const action = await this.prisma.moderationAction.update({
      where: { id: actionId },
      data: {
        status: 'ACTIVE',
        approvedById: approverUserId,
        approvedAt: new Date(),
        executedAt: new Date(),
      },
    });

    return this.mapModerationActionToResponse(action);
  }

  /**
   * Reject an AI recommendation (moderator action)
   */
  async rejectRecommendation(
    actionId: string,
    rejectionReason: string,
  ): Promise<void> {
    await this.prisma.moderationAction.update({
      where: { id: actionId },
      data: {
        status: 'APPEALED', // Mark as appealed to indicate human disagreement
        reasoning: `${rejectionReason} [REJECTED BY MODERATOR]`,
      },
    });
  }

  /**
   * Map target type string to enum value
   */
  private mapTargetType(
    targetType: string,
  ): 'RESPONSE' | 'USER' | 'TOPIC' {
    const typeMap: Record<string, 'RESPONSE' | 'USER' | 'TOPIC'> = {
      response: 'RESPONSE',
      user: 'USER',
      topic: 'TOPIC',
    };
    return typeMap[targetType.toLowerCase()] ?? 'RESPONSE';
  }

  /**
   * Map action type string to enum value
   */
  private mapActionType(
    actionType: string,
  ): 'EDUCATE' | 'WARN' | 'HIDE' | 'REMOVE' | 'SUSPEND' | 'BAN' {
    const actionMap: Record<
      string,
      'EDUCATE' | 'WARN' | 'HIDE' | 'REMOVE' | 'SUSPEND' | 'BAN'
    > = {
      educate: 'EDUCATE',
      warn: 'WARN',
      hide: 'HIDE',
      remove: 'REMOVE',
      suspend: 'SUSPEND',
      ban: 'BAN',
    };
    return actionMap[actionType.toLowerCase()] ?? 'EDUCATE';
  }

  /**
   * Map action type to severity level
   * Non-punitive vs consequential based on action
   */
  private mapActionToSeverity(actionType: string): 'NON_PUNITIVE' | 'CONSEQUENTIAL' {
    const nonPunitive = ['educate', 'warn'];
    const isNonPunitive = nonPunitive.some(
      (action) => action.toLowerCase() === actionType.toLowerCase(),
    );
    return isNonPunitive ? 'NON_PUNITIVE' : 'CONSEQUENTIAL';
  }

  /**
   * Map Prisma moderation action to response DTO
   */
  private mapModerationActionToResponse(
    action: any,
  ): AiRecommendationResponse {
    return {
      id: action.id,
      targetType: action.targetType,
      targetId: action.targetId,
      actionType: action.actionType,
      severity: action.severity,
      reasoning: action.reasoning,
      aiRecommended: action.aiRecommended,
      aiConfidence: action.aiConfidence ? Number(action.aiConfidence) : 0,
      status: action.status,
      createdAt: action.createdAt.toISOString(),
    };
  }
}
