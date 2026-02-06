/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import type {
  UserTrustUpdatedEvent,
  ModerationActionRequestedEvent,
} from '@reason-bridge/event-schemas';
import { MODERATION_EVENT_TYPES } from '@reason-bridge/event-schemas';
import type {
  CreateActionRequest,
  ApproveActionRequest,
  RejectActionRequest,
  ModerationActionResponse,
  ModerationActionDetailResponse,
  ListActionsResponse,
  CoolingOffPromptRequest,
  CoolingOffPromptResponse,
} from '../dto/moderation-action.dto.js';
import type {
  CreateAppealRequest,
  AppealResponse,
  ReviewAppealRequest,
  PendingAppealResponse,
  ListAppealResponse,
} from '../dto/appeal.dto.js';

// Re-export DTOs for backward compatibility
export type {
  CreateActionRequest,
  ApproveActionRequest,
  RejectActionRequest,
  ModerationActionResponse,
  ModerationActionDetailResponse,
  ListActionsResponse,
  CoolingOffPromptRequest,
  CoolingOffPromptResponse,
} from '../dto/moderation-action.dto.js';

export type {
  CreateAppealRequest,
  AppealResponse,
  ReviewAppealRequest,
  PendingAppealResponse,
  ListAppealResponse,
} from '../dto/appeal.dto.js';

/**
 * ModerationActionsService handles moderation action management.
 * Provides operations for creating, approving, rejecting, and listing moderation actions.
 */
@Injectable()
export class ModerationActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * List moderation actions with optional filters
   */
  async listActions(
    targetType?: 'RESPONSE' | 'USER' | 'TOPIC',
    status?: 'PENDING' | 'ACTIVE' | 'APPEALED' | 'REVERSED',
    severity?: 'NON_PUNITIVE' | 'CONSEQUENTIAL',
    limit: number = 20,
    cursor?: string,
  ): Promise<ListActionsResponse> {
    type WhereInput = {
      targetType?: 'RESPONSE' | 'USER' | 'TOPIC';
      status?: 'PENDING' | 'ACTIVE' | 'APPEALED' | 'REVERSED';
      severity?: 'NON_PUNITIVE' | 'CONSEQUENTIAL';
    };
    const where: WhereInput = {};

    if (targetType) {
      where['targetType'] = targetType;
    }
    if (status) {
      where['status'] = status;
    }
    if (severity) {
      where['severity'] = severity;
    }

    const totalCount = await this.prisma.moderationAction.count({ where });

    const findManyArgs = {
      where,
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' as const },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
    };

    const actions = await this.prisma.moderationAction.findMany(findManyArgs);

    const nextCursor = actions.length === limit ? actions[actions.length - 1]!.id : null;

    return {
      actions: actions.map((action) => this.mapModerationActionToResponse(action)),
      nextCursor,
      totalCount,
    };
  }

  /**
   * Create a new moderation action (moderator-initiated)
   * Publishes event to queue for other services to consume
   */
  async createAction(
    request: CreateActionRequest,
    moderatorId: string,
  ): Promise<ModerationActionResponse> {
    if (request.reasoning.length < 20) {
      throw new BadRequestException('Reasoning must be at least 20 characters long');
    }

    const severity = this.mapActionToSeverity(request.actionType);

    const action = await this.prisma.moderationAction.create({
      data: {
        targetType: this.mapTargetType(request.targetType),
        targetId: request.targetId,
        actionType: this.mapActionType(request.actionType),
        severity,
        reasoning: request.reasoning,
        aiRecommended: false,
        status: 'ACTIVE', // Moderator-initiated actions are immediately active
        approvedById: moderatorId,
        approvedAt: new Date(),
        executedAt: new Date(),
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Publish event to queue for other services
    try {
      const event: ModerationActionRequestedEvent = {
        id: action.id,
        type: MODERATION_EVENT_TYPES.ACTION_REQUESTED,
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          targetType: request.targetType as 'response' | 'user' | 'topic',
          targetId: request.targetId,
          actionType: request.actionType as
            | 'educate'
            | 'warn'
            | 'hide'
            | 'remove'
            | 'suspend'
            | 'ban',
          severity: severity === 'NON_PUNITIVE' ? 'non_punitive' : 'consequential',
          reasoning: request.reasoning,
          aiConfidence: 1.0, // Moderator-initiated actions have high confidence
          requestedAt: new Date().toISOString(),
        },
        metadata: {
          source: 'moderation-service',
          userId: moderatorId,
        },
      };

      await this.queueService.publishEvent(event);
    } catch (error) {
      // Log error but don't fail the request - moderation action is created
      console.error('Failed to publish moderation action event', error);
    }

    return this.mapModerationActionToResponse(action);
  }

  /**
   * Get a moderation action with details
   */
  async getAction(actionId: string): Promise<ModerationActionDetailResponse> {
    const action = await this.prisma.moderationAction.findUnique({
      where: { id: actionId },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
        appeals: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!action) {
      throw new NotFoundException(`Moderation action ${actionId} not found`);
    }

    return {
      ...this.mapModerationActionToResponse(action),
      appeal: action.appeals[0] || null,
      relatedActions: [],
    };
  }

  /**
   * Approve a pending moderation action
   */
  async approveAction(
    actionId: string,
    moderatorId: string,
    request?: ApproveActionRequest,
  ): Promise<ModerationActionResponse> {
    const action = await this.prisma.moderationAction.findUnique({
      where: { id: actionId },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!action) {
      throw new NotFoundException(`Moderation action ${actionId} not found`);
    }

    if (action.status !== 'PENDING') {
      throw new BadRequestException(
        `Action must be in PENDING status to approve, current status: ${action.status}`,
      );
    }

    if (action.severity === 'NON_PUNITIVE') {
      throw new BadRequestException('Non-punitive actions cannot be explicitly approved');
    }

    const updatedAction = await this.prisma.moderationAction.update({
      where: { id: actionId },
      data: {
        status: 'ACTIVE',
        approvedById: moderatorId,
        approvedAt: new Date(),
        executedAt: new Date(),
        reasoning: request?.modifiedReasoning || action.reasoning,
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    return this.mapModerationActionToResponse(updatedAction);
  }

  /**
   * Reject a pending moderation action
   */
  async rejectAction(actionId: string, request: RejectActionRequest): Promise<void> {
    const action = await this.prisma.moderationAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Moderation action ${actionId} not found`);
    }

    if (action.status !== 'PENDING') {
      throw new BadRequestException(
        `Action must be in PENDING status to reject, current status: ${action.status}`,
      );
    }

    await this.prisma.moderationAction.update({
      where: { id: actionId },
      data: {
        status: 'REVERSED',
        reasoning: `${action.reasoning}\n\n[REJECTED BY MODERATOR: ${request.reason}]`,
      },
    });
  }

  /**
   * Get moderation history for a specific user
   */
  async getUserActions(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<ListActionsResponse> {
    const where = {
      targetId: userId,
      targetType: 'USER' as const,
    };

    const totalCount = await this.prisma.moderationAction.count({ where });

    const findManyArgs = {
      where,
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' as const },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
    };

    const actions = await this.prisma.moderationAction.findMany(findManyArgs);

    const nextCursor = actions.length === limit ? actions[actions.length - 1]!.id : null;

    return {
      actions: actions.map((action) => this.mapModerationActionToResponse(action)),
      nextCursor,
      totalCount,
    };
  }

  /**
   * Send cooling-off intervention prompt
   */
  async sendCoolingOffPrompt(
    userIds: string[],
    topicId: string,
    prompt: string,
  ): Promise<CoolingOffPromptResponse> {
    // This is a non-punitive intervention
    // In a full implementation, this would create notification records
    // For now, we'll just track that the action was taken
    return {
      sent: userIds.length,
    };
  }

  /**
   * Create an appeal against a moderation action
   */
  async createAppeal(
    actionId: string,
    appellantId: string,
    request: CreateAppealRequest,
  ): Promise<AppealResponse> {
    if (!request.reason || request.reason.trim().length === 0) {
      throw new BadRequestException('reason is required');
    }

    if (request.reason.length < 20) {
      throw new BadRequestException('Appeal reason must be at least 20 characters long');
    }

    if (request.reason.length > 5000) {
      throw new BadRequestException('Appeal reason cannot exceed 5000 characters');
    }

    const action = await this.prisma.moderationAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Moderation action ${actionId} not found`);
    }

    if (action.status === 'REVERSED') {
      throw new BadRequestException(
        'Cannot appeal a moderation action that has already been reversed',
      );
    }

    // Check if an appeal already exists for this action by this user
    const existingAppeal = await this.prisma.appeal.findUnique({
      where: {
        moderationActionId_appellantId: {
          moderationActionId: actionId,
          appellantId: appellantId,
        },
      },
    });

    if (existingAppeal) {
      if (existingAppeal.status === 'PENDING' || existingAppeal.status === 'UNDER_REVIEW') {
        throw new BadRequestException(
          'An appeal for this moderation action is already pending review',
        );
      }
    }

    // Create the appeal and update the action status to APPEALED
    const appeal = await this.prisma.appeal.create({
      data: {
        moderationActionId: actionId,
        appellantId: appellantId,
        reason: request.reason,
        status: 'PENDING',
      },
    });

    // Update the moderation action status to APPEALED
    await this.prisma.moderationAction.update({
      where: { id: actionId },
      data: { status: 'APPEALED' },
    });

    return this.mapAppealToResponse(appeal);
  }

  /**
   * Get pending appeals for review
   */
  async getPendingAppeals(limit: number = 20, cursor?: string): Promise<ListAppealResponse> {
    const where = {
      status: 'PENDING' as const,
    };

    const totalCount = await this.prisma.appeal.count({ where });

    const findManyArgs = {
      where,
      include: {
        moderationAction: {
          include: {
            approvedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
    };

    const appeals = await this.prisma.appeal.findMany(findManyArgs);

    const nextCursor = appeals.length === limit ? appeals[appeals.length - 1]!.id : null;

    return {
      appeals: appeals.map((appeal) => ({
        ...this.mapAppealToResponse(appeal),
        moderationAction: appeal.moderationAction
          ? this.mapModerationActionToResponse(appeal.moderationAction)
          : undefined,
      })),
      nextCursor,
      totalCount,
    };
  }

  /**
   * List all appeals with optional status filter
   */
  async listAppeals(
    status?: 'PENDING' | 'UNDER_REVIEW' | 'UPHELD' | 'DENIED',
    limit: number = 20,
    cursor?: string,
  ): Promise<ListAppealResponse> {
    type WhereInput = {
      status?: 'PENDING' | 'UNDER_REVIEW' | 'UPHELD' | 'DENIED';
    };
    const where: WhereInput = {};

    if (status) {
      where.status = status;
    }

    const totalCount = await this.prisma.appeal.count({ where });

    const findManyArgs = {
      where,
      include: {
        moderationAction: {
          include: {
            approvedBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' as const },
      take: limit,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
    };

    const appeals = await this.prisma.appeal.findMany(findManyArgs);

    const nextCursor = appeals.length === limit ? appeals[appeals.length - 1]!.id : null;

    return {
      appeals: appeals.map((appeal) => ({
        ...this.mapAppealToResponse(appeal),
        moderationAction: appeal.moderationAction
          ? this.mapModerationActionToResponse(appeal.moderationAction)
          : undefined,
      })),
      nextCursor,
      totalCount,
    };
  }

  /**
   * Review and decide on an appeal
   */
  async reviewAppeal(
    appealId: string,
    reviewerId: string,
    request: ReviewAppealRequest,
  ): Promise<AppealResponse> {
    if (!request.reasoning || request.reasoning.trim().length === 0) {
      throw new BadRequestException('reasoning is required');
    }

    if (request.reasoning.length < 20) {
      throw new BadRequestException(
        'Appeal decision reasoning must be at least 20 characters long',
      );
    }

    if (request.reasoning.length > 2000) {
      throw new BadRequestException('Appeal decision reasoning cannot exceed 2000 characters');
    }

    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        moderationAction: true,
      },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }

    if (appeal.status !== 'PENDING') {
      throw new BadRequestException(
        `Appeal must be in PENDING status to review, current status: ${appeal.status}`,
      );
    }

    const newStatus = request.decision === 'upheld' ? 'UPHELD' : 'DENIED';

    // Update the appeal with the decision
    const updatedAppeal = await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: newStatus,
        reviewerId: reviewerId,
        decisionReasoning: request.reasoning,
        resolvedAt: new Date(),
      },
    });

    // If appeal is upheld, reverse the moderation action
    if (request.decision === 'upheld' && appeal.moderationAction) {
      await this.prisma.moderationAction.update({
        where: { id: appeal.moderationAction.id },
        data: {
          status: 'REVERSED',
          reasoning: `${appeal.moderationAction.reasoning}\n\n[APPEAL UPHELD: ${request.reasoning}]`,
        },
      });

      // Publish appeal upheld event
      try {
        const event: UserTrustUpdatedEvent = {
          id: appealId,
          type: MODERATION_EVENT_TYPES.USER_TRUST_UPDATED,
          timestamp: new Date().toISOString(),
          version: 1,
          payload: {
            userId: appeal.appellantId,
            previousScores: {
              ability: 0,
              benevolence: 0,
              integrity: 0,
            },
            newScores: {
              ability: 0,
              benevolence: 0,
              integrity: 0,
            },
            reason: 'appeal_upheld',
            moderationActionId: appeal.moderationAction.id,
            updatedAt: new Date().toISOString(),
          },
          metadata: {
            source: 'moderation-service',
            userId: reviewerId,
          },
        };

        await this.queueService.publishEvent(event);
      } catch (error) {
        // Log error but don't fail the request - appeal is still decided
        console.error('Failed to publish appeal upheld event', error);
      }
    }

    return this.mapAppealToResponse(updatedAppeal);
  }

  /**
   * Map target type string to enum value
   */
  private mapTargetType(targetType: string): 'RESPONSE' | 'USER' | 'TOPIC' {
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
    const actionMap: Record<string, 'EDUCATE' | 'WARN' | 'HIDE' | 'REMOVE' | 'SUSPEND' | 'BAN'> = {
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
  private mapModerationActionToResponse(action: any): ModerationActionResponse {
    const approvedBy = action.approvedBy
      ? {
          id: action.approvedBy.id,
          displayName: action.approvedBy.displayName,
        }
      : null;

    return {
      id: action.id,
      targetType: action.targetType.toLowerCase(),
      targetId: action.targetId,
      actionType: action.actionType.toLowerCase(),
      severity: action.severity.toLowerCase(),
      reasoning: action.reasoning,
      aiRecommended: action.aiRecommended,
      aiConfidence: action.aiConfidence ? Number(action.aiConfidence) : null,
      approvedBy,
      approvedAt: action.approvedAt?.toISOString() || null,
      status: action.status.toLowerCase(),
      createdAt: action.createdAt.toISOString(),
      executedAt: action.executedAt?.toISOString() || null,
      isTemporary: action.isTemporary || undefined,
      banDurationDays: action.banDurationDays || undefined,
      expiresAt: action.expiresAt?.toISOString() || undefined,
      liftedAt: action.liftedAt?.toISOString() || undefined,
    };
  }

  /**
   * Create a temporary ban for a user
   */
  async createTemporaryBan(
    userId: string,
    durationDays: number,
    reasoning: string,
    moderatorId: string,
  ): Promise<ModerationActionResponse> {
    if (durationDays <= 0) {
      throw new BadRequestException('Ban duration must be greater than 0 days');
    }

    if (durationDays > 365) {
      throw new BadRequestException(
        'Ban duration cannot exceed 365 days (use permanent ban instead)',
      );
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Create the temporary ban action
    const request: CreateActionRequest = {
      targetType: 'user',
      targetId: userId,
      actionType: 'ban',
      reasoning: reasoning,
    };

    const severity = this.mapActionToSeverity(request.actionType);

    const action = await this.prisma.moderationAction.create({
      data: {
        targetType: this.mapTargetType(request.targetType),
        targetId: request.targetId,
        actionType: this.mapActionType(request.actionType),
        severity,
        reasoning: request.reasoning,
        aiRecommended: false,
        status: 'ACTIVE',
        approvedById: moderatorId,
        approvedAt: new Date(),
        executedAt: new Date(),
        isTemporary: true,
        banDurationDays: durationDays,
        expiresAt: expiresAt,
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Publish event
    try {
      const event: ModerationActionRequestedEvent = {
        id: action.id,
        type: MODERATION_EVENT_TYPES.ACTION_REQUESTED,
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          targetType: 'user' as const,
          targetId: userId,
          actionType: 'ban' as const,
          severity: 'consequential',
          reasoning: request.reasoning,
          aiConfidence: 1.0,
          requestedAt: new Date().toISOString(),
        },
        metadata: {
          source: 'moderation-service',
          userId: moderatorId,
        },
      };

      await this.queueService.publishEvent(event);
    } catch (error) {
      console.error('Failed to publish temporary ban event', error);
    }

    return this.mapModerationActionToResponse(action);
  }

  /**
   * Auto-lift expired temporary bans
   * This should be called periodically by a scheduled task
   */
  async autoLiftExpiredBans(): Promise<{ lifted: number }> {
    const now = new Date();

    // Find all active temporary bans that have expired
    const expiredBans = await this.prisma.moderationAction.findMany({
      where: {
        actionType: 'BAN',
        status: 'ACTIVE',
        isTemporary: true,
        expiresAt: {
          lte: now,
        },
        liftedAt: null,
      },
    });

    if (expiredBans.length === 0) {
      return { lifted: 0 };
    }

    // Update all expired bans to REVERSED status
    if (expiredBans.length > 0) {
      await this.prisma.moderationAction.updateMany({
        where: {
          id: {
            in: expiredBans.map((b) => b.id),
          },
        },
        data: {
          status: 'REVERSED',
          liftedAt: now,
          reasoning: `${expiredBans[0]!.reasoning}\n\n[AUTOMATICALLY LIFTED: Temporary ban duration expired]`,
        },
      });
    }

    return { lifted: expiredBans.length };
  }

  /**
   * Get temporary ban status for a user
   */
  async getUserBanStatus(userId: string): Promise<{
    isBanned: boolean;
    isTemporaryBan: boolean;
    expiresAt: string | null;
    action: ModerationActionResponse | null;
  }> {
    const activeBan = await this.prisma.moderationAction.findFirst({
      where: {
        targetId: userId,
        targetType: 'USER',
        actionType: 'BAN',
        status: 'ACTIVE',
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeBan) {
      return {
        isBanned: false,
        isTemporaryBan: false,
        expiresAt: null,
        action: null,
      };
    }

    // Check if temporary ban has expired
    if (activeBan.isTemporary && activeBan.expiresAt && activeBan.expiresAt <= new Date()) {
      return {
        isBanned: false,
        isTemporaryBan: true,
        expiresAt: activeBan.expiresAt.toISOString(),
        action: null,
      };
    }

    return {
      isBanned: true,
      isTemporaryBan: activeBan.isTemporary || false,
      expiresAt: activeBan.expiresAt?.toISOString() || null,
      action: this.mapModerationActionToResponse(activeBan),
    };
  }

  /**
   * Map Prisma appeal to response DTO
   */
  private mapAppealToResponse(appeal: any): AppealResponse {
    return {
      id: appeal.id,
      moderationActionId: appeal.moderationActionId,
      appellantId: appeal.appellantId,
      reason: appeal.reason,
      status: appeal.status.toLowerCase(),
      reviewerId: appeal.reviewerId,
      decisionReasoning: appeal.decisionReasoning,
      createdAt: appeal.createdAt.toISOString(),
      resolvedAt: appeal.resolvedAt?.toISOString() || null,
    };
  }
}
