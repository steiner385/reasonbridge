/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueueService } from '../queue/queue.service.js';
import type { UserTrustUpdatedEvent } from '@reason-bridge/event-schemas';
import { MODERATION_EVENT_TYPES } from '@reason-bridge/event-schemas';
import type {
  CreateAppealRequest,
  AppealResponse,
  ReviewAppealRequest,
  PendingAppealResponse,
  ListAppealResponse,
} from '../dto/appeal.dto.js';

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
   * Get pending appeals for review with optional moderator assignment
   */
  async getPendingAppeals(
    limit: number = 20,
    cursor?: string,
    assignedModeratorId?: string,
  ): Promise<ListAppealResponse> {
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

    if (appeal.status !== 'PENDING' && appeal.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(
        `Appeal must be in PENDING or UNDER_REVIEW status to review, current status: ${appeal.status}`,
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
        console.error('Failed to publish appeal upheld event:', error);
        // Don't throw - the appeal decision should still be recorded
      }
    }

    return this.mapAppealToResponse(updatedAppeal);
  }

  /**
   * Get appeal by ID
   */
  async getAppealById(appealId: string): Promise<PendingAppealResponse | null> {
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
    const where: any = {};
    if (startDate) {
      where.createdAt = { gte: startDate };
    }
    if (endDate) {
      if (where.createdAt) {
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
  mapAppealToResponse(appeal: any): AppealResponse {
    return {
      id: appeal.id,
      moderationActionId: appeal.moderationActionId,
      appellantId: appeal.appellantId,
      reason: appeal.reason,
      status: appeal.status,
      reviewerId: appeal.reviewerId || null,
      decisionReasoning: appeal.decisionReasoning || null,
      createdAt: appeal.createdAt.toISOString(),
      resolvedAt: appeal.resolvedAt ? appeal.resolvedAt.toISOString() : null,
    };
  }

  /**
   * Helper: Map moderation action to response (for appeal context)
   */
  mapModerationActionToResponse(action: any): any {
    return {
      id: action.id,
      targetType: action.targetType,
      targetId: action.targetId,
      actionType: action.actionType,
      severity: action.severity,
      reasoning: action.reasoning,
      aiRecommended: action.aiRecommended,
      aiConfidence: action.aiConfidence ? Number(action.aiConfidence) : null,
      approvedBy: action.approvedBy,
      approvedAt: action.approvedAt ? action.approvedAt.toISOString() : null,
      status: action.status,
      createdAt: action.createdAt.toISOString(),
      executedAt: action.executedAt ? action.executedAt.toISOString() : null,
    };
  }
}
