/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import { NotificationServiceClient } from '../clients/notification-service.client.js';
import type { UserTrustUpdatedEvent } from '@reason-bridge/event-schemas';
import { MODERATION_EVENT_TYPES } from '@reason-bridge/event-schemas';
import type {
  CreateAppealRequest,
  AppealResponse,
  ReviewAppealRequest,
  PendingAppealResponse,
  ListAppealResponse,
} from '../dto/appeal.dto.js';
import type { ModerationActionResponse } from '../dto/moderation-action.dto.js';
import { APPEAL_CONSTRAINTS } from '../constants/index.js';

/**
 * AppealService handles moderation appeal management including:
 * - Appeal creation and validation
 * - Moderator assignment and routing
 * - Appeal review workflow
 * - Appeal status tracking and history
 */
@Injectable()
export class AppealService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    // Optional so unit tests that construct the service directly keep working;
    // when present, appellants are notified of appeal decisions.
    @Optional() private readonly notificationClient?: NotificationServiceClient,
  ) {}

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

    if (request.reason.length < APPEAL_CONSTRAINTS.REASON_MIN_LENGTH) {
      throw new BadRequestException(
        `Appeal reason must be at least ${APPEAL_CONSTRAINTS.REASON_MIN_LENGTH} characters long`,
      );
    }

    if (request.reason.length > APPEAL_CONSTRAINTS.REASON_MAX_LENGTH) {
      throw new BadRequestException(
        `Appeal reason cannot exceed ${APPEAL_CONSTRAINTS.REASON_MAX_LENGTH} characters`,
      );
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

    // Ownership check: only the user targeted by the action may appeal it.
    // For USER targets, targetId IS the affected user, so this is an exact check
    // and prevents unaffected/accomplice accounts from filing appeals to game
    // status-based enforcement (see getUserBanStatus).
    if (action.targetType === 'USER' && action.targetId !== appellantId) {
      throw new ForbiddenException('You can only appeal moderation actions that target you');
    }

    // Check if an appeal already exists for this action by this user. There is
    // a @@unique([moderationActionId, appellantId]) constraint, so a second
    // appeal — whether the prior one is still open OR already resolved — must be
    // rejected explicitly. Previously only PENDING/UNDER_REVIEW was blocked, so
    // re-appealing a DENIED decision fell through to create() and surfaced as an
    // unhandled Prisma P2002 → HTTP 500 (Issue #1316).
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
        throw new ConflictException(
          'An appeal for this moderation action is already pending review',
        );
      }
      throw new ConflictException(
        'You have already appealed this moderation action and it has been resolved',
      );
    }

    // Create the appeal and flip the action to APPEALED atomically so a partial
    // failure can't leave an appeal without its action transition.
    let appeal;
    try {
      appeal = await this.prisma.$transaction(async (tx) => {
        const created = await tx.appeal.create({
          data: {
            moderationActionId: actionId,
            appellantId: appellantId,
            reason: request.reason,
            status: 'PENDING',
          },
        });

        await tx.moderationAction.update({
          where: { id: actionId },
          data: { status: 'APPEALED' },
        });

        return created;
      });
    } catch (error) {
      // Concurrent duplicate createAppeal calls race past the findUnique check
      // above and collide on the unique constraint. Map that to a 409 rather
      // than letting the raw P2002 bubble up as a 500 (Issue #1316).
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('An appeal for this moderation action already exists');
      }
      throw error;
    }

    return this.mapAppealToResponse(appeal);
  }

  /**
   * Get pending appeals for review with optional moderator assignment
   */
  async getPendingAppeals(
    limit: number = 20,
    cursor?: string,
    assignedModeratorId?: string,
  ): Promise<ListAppealResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where clause with dynamic properties
    const where: any = {
      status: 'PENDING' as const,
    };

    // If requesting appeals assigned to a specific moderator
    if (assignedModeratorId) {
      where.reviewerId = assignedModeratorId;
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
   * List all appeals with an optional status filter (moderator/admin view).
   */
  async listAppeals(
    status?: 'PENDING' | 'UNDER_REVIEW' | 'UPHELD' | 'DENIED',
    limit: number = 20,
    cursor?: string,
  ): Promise<ListAppealResponse> {
    return this.listAppealsWhere(status ? { status } : {}, limit, cursor);
  }

  /**
   * List appeals filed by a specific appellant (the authenticated user).
   *
   * This is the scoped counterpart to {@link listAppeals} used by the
   * "your appeals" surface so a user only ever sees their own appeals — the
   * unscoped listAppeals leaked every user's appeal reason and the moderator's
   * decision reasoning to any visitor (Issue #1396).
   */
  async listAppealsByAppellant(
    appellantId: string,
    status?: 'PENDING' | 'UNDER_REVIEW' | 'UPHELD' | 'DENIED',
    limit: number = 20,
    cursor?: string,
  ): Promise<ListAppealResponse> {
    return this.listAppealsWhere(status ? { appellantId, status } : { appellantId }, limit, cursor);
  }

  /**
   * Shared cursor-paginated appeal listing keyed on a caller-provided where
   * clause, so scoped and unscoped listings can't drift apart.
   */
  private async listAppealsWhere(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where clause with dynamic properties
    where: any,
    limit: number,
    cursor?: string,
  ): Promise<ListAppealResponse> {
    const totalCount = await this.prisma.appeal.count({ where });

    const appeals = await this.prisma.appeal.findMany({
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
    });

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
   * Assign an appeal to a moderator for review
   * Updates appeal status to UNDER_REVIEW
   */
  async assignAppealToModerator(appealId: string, moderatorId: string): Promise<AppealResponse> {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }

    if (appeal.status !== 'PENDING') {
      throw new BadRequestException(
        `Appeal must be in PENDING status to assign, current status: ${appeal.status}`,
      );
    }

    // Verify the moderator exists
    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorId },
    });

    if (!moderator) {
      throw new NotFoundException(`Moderator ${moderatorId} not found`);
    }

    // Assign the appeal to the moderator and update status to UNDER_REVIEW
    const updatedAppeal = await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        reviewerId: moderatorId,
        status: 'UNDER_REVIEW',
      },
    });

    return this.mapAppealToResponse(updatedAppeal);
  }

  /**
   * Unassign an appeal from a moderator (return to PENDING)
   */
  async unassignAppeal(appealId: string): Promise<AppealResponse> {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal ${appealId} not found`);
    }

    if (appeal.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        `Appeal must be in UNDER_REVIEW status to unassign, current status: ${appeal.status}`,
      );
    }

    // Return appeal to PENDING and clear reviewerId
    const updatedAppeal = await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        reviewerId: null,
        status: 'PENDING',
      },
    });

    return this.mapAppealToResponse(updatedAppeal);
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

    if (request.reasoning.length < APPEAL_CONSTRAINTS.DECISION_REASONING_MIN_LENGTH) {
      throw new BadRequestException(
        `Appeal decision reasoning must be at least ${APPEAL_CONSTRAINTS.DECISION_REASONING_MIN_LENGTH} characters long`,
      );
    }

    if (request.reasoning.length > APPEAL_CONSTRAINTS.DECISION_REASONING_MAX_LENGTH) {
      throw new BadRequestException(
        `Appeal decision reasoning cannot exceed ${APPEAL_CONSTRAINTS.DECISION_REASONING_MAX_LENGTH} characters`,
      );
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

    if (appeal.status !== 'PENDING' && appeal.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        `Appeal must be in PENDING or UNDER_REVIEW status to review, current status: ${appeal.status}`,
      );
    }

    const newStatus = request.decision === 'upheld' ? 'UPHELD' : 'DENIED';

    // Conditional write: only decide an appeal still in a reviewable state. This
    // closes the check-then-update race where two moderators both pass the
    // status check above and the appeal is double-processed — publishing the
    // trust event twice and reversing the action redundantly (Issue #1316).
    const { count } = await this.prisma.appeal.updateMany({
      where: { id: appealId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      data: {
        status: newStatus,
        reviewerId: reviewerId,
        decisionReasoning: request.reasoning,
        resolvedAt: new Date(),
      },
    });

    if (count === 0) {
      throw new ConflictException(`Appeal ${appealId} was already reviewed by another moderator`);
    }

    const updatedAppeal = await this.prisma.appeal.findUniqueOrThrow({
      where: { id: appealId },
    });

    // If appeal is upheld, reverse the moderation action. Guard on the action
    // still being APPEALED so a concurrent path can't double-reverse it.
    if (request.decision === 'upheld' && appeal.moderationAction) {
      await this.prisma.moderationAction.updateMany({
        where: { id: appeal.moderationAction.id, status: 'APPEALED' },
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
        console.error('Failed to publish appeal upheld event:', error);
        // Don't throw - the appeal decision should still be recorded
      }
    } else if (request.decision === 'denied' && appeal.moderationAction) {
      // A denied appeal must return the action to ACTIVE so enforcement resumes,
      // rather than leaving it stuck in APPEALED indefinitely.
      if (appeal.moderationAction.status === 'APPEALED') {
        await this.prisma.moderationAction.update({
          where: { id: appeal.moderationAction.id },
          data: { status: 'ACTIVE' },
        });
      }
    }

    // Notify the appellant of the outcome (best-effort). The Appeal Status page
    // promises "You will receive a notification when your appeal has been
    // reviewed" — this fulfils that promise for both upheld and denied decisions.
    const upheld = request.decision === 'upheld';
    await this.notificationClient?.trySendModerationNotification({
      userId: appeal.appellantId,
      type: 'appeal_decision',
      title: upheld ? 'Your appeal was upheld' : 'Your appeal was denied',
      body: upheld
        ? `Your appeal has been reviewed and upheld. The moderation action has been reversed.\n\nReviewer note: ${request.reasoning}`
        : `Your appeal has been reviewed and denied. The moderation action remains in effect.\n\nReviewer note: ${request.reasoning}`,
      actionUrl: `/appeal/${appealId}`,
      metadata: { appealId, decision: newStatus },
    });

    return this.mapAppealToResponse(updatedAppeal);
  }

  /**
   * Find an appeal by ID.
   *
   * @param appealId - The appeal's unique identifier
   * @returns The appeal if found, null otherwise
   */
  async findAppealById(appealId: string): Promise<PendingAppealResponse | null> {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
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
    });

    if (!appeal) {
      return null;
    }

    return {
      ...this.mapAppealToResponse(appeal),
      moderationAction: appeal.moderationAction
        ? this.mapModerationActionToResponse(appeal.moderationAction)
        : undefined,
    };
  }

  /**
   * Get appeal statistics and metrics
   */
  async getAppealStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byStatus: Array<{ status: string; _count: number }>;
    pending: number;
    underReview: number;
    upheld: number;
    denied: number;
    avgResolutionTime?: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where clause with dynamic properties
    const where: any = {};
    if (startDate) {
      where.createdAt = { gte: startDate };
    }
    if (endDate) {
      if (where.createdAt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Extending Prisma date filter
        (where.createdAt as any).lte = endDate;
      } else {
        where.createdAt = { lte: endDate };
      }
    }

    const total = await this.prisma.appeal.count({ where });

    const byStatus = await this.prisma.appeal.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const pending = await this.prisma.appeal.count({
      where: { ...where, status: 'PENDING' },
    });

    const underReview = await this.prisma.appeal.count({
      where: { ...where, status: 'UNDER_REVIEW' },
    });

    const upheld = await this.prisma.appeal.count({
      where: { ...where, status: 'UPHELD' },
    });

    const denied = await this.prisma.appeal.count({
      where: { ...where, status: 'DENIED' },
    });

    return {
      total,
      byStatus,
      pending,
      underReview,
      upheld,
      denied,
    };
  }

  /**
   * Helper: Map appeal to response DTO
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma Appeal with dynamic includes
  mapAppealToResponse(appeal: any): AppealResponse {
    return {
      id: appeal.id,
      moderationActionId: appeal.moderationActionId,
      appellantId: appeal.appellantId,
      reason: appeal.reason,
      // Enum values are surfaced to the API in lower case (the frontend types
      // expect 'pending' | 'under_review' | 'upheld' | 'denied'), matching the
      // contract the now-removed ModerationActionsService appeal path emitted.
      status: appeal.status.toLowerCase(),
      reviewerId: appeal.reviewerId || null,
      decisionReasoning: appeal.decisionReasoning || null,
      createdAt: appeal.createdAt.toISOString(),
      resolvedAt: appeal.resolvedAt ? appeal.resolvedAt.toISOString() : null,
    };
  }

  /**
   * Helper: Map moderation action to response (for appeal context)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma ModerationAction with dynamic includes
  mapModerationActionToResponse(action: any): ModerationActionResponse {
    const approvedBy = action.approvedBy
      ? { id: action.approvedBy.id, displayName: action.approvedBy.displayName }
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
      approvedAt: action.approvedAt ? action.approvedAt.toISOString() : null,
      status: action.status.toLowerCase(),
      createdAt: action.createdAt.toISOString(),
      executedAt: action.executedAt ? action.executedAt.toISOString() : null,
    };
  }
}
