import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CreateActionRequest {
  targetType: 'response' | 'user' | 'topic';
  targetId: string;
  actionType: 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban';
  reasoning: string;
}

export interface ApproveActionRequest {
  modifiedReasoning?: string;
}

export interface RejectActionRequest {
  reason: string;
}

export interface ModerationActionResponse {
  id: string;
  targetType: string;
  targetId: string;
  actionType: string;
  severity: string;
  reasoning: string;
  aiRecommended: boolean;
  aiConfidence: number | null;
  approvedBy: {
    id: string;
    displayName: string;
  } | null;
  approvedAt: string | null;
  status: string;
  createdAt: string;
  executedAt: string | null;
}

export interface ModerationActionDetailResponse extends ModerationActionResponse {
  targetContent?: Record<string, unknown>;
  appeal?: Record<string, unknown> | null;
  relatedActions?: ModerationActionResponse[];
}

/**
 * ModerationActionsService handles moderation action management.
 * Provides operations for creating, approving, rejecting, and listing moderation actions.
 */
@Injectable()
export class ModerationActionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List moderation actions with optional filters
   */
  async listActions(
    targetType?: 'RESPONSE' | 'USER' | 'TOPIC',
    status?: 'PENDING' | 'ACTIVE' | 'APPEALED' | 'REVERSED',
    severity?: 'NON_PUNITIVE' | 'CONSEQUENTIAL',
    limit: number = 20,
    cursor?: string,
  ): Promise<{
    actions: ModerationActionResponse[];
    nextCursor: string | null;
    totalCount: number;
  }> {
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

    const nextCursor =
      actions.length === limit ? actions[actions.length - 1]!.id : null;

    return {
      actions: actions.map((action) =>
        this.mapModerationActionToResponse(action),
      ),
      nextCursor,
      totalCount,
    };
  }

  /**
   * Create a new moderation action (moderator-initiated)
   */
  async createAction(
    request: CreateActionRequest,
    moderatorId: string,
  ): Promise<ModerationActionResponse> {
    if (request.reasoning.length < 20) {
      throw new BadRequestException(
        'Reasoning must be at least 20 characters long',
      );
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
      throw new BadRequestException(
        'Non-punitive actions cannot be explicitly approved',
      );
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
  async rejectAction(
    actionId: string,
    request: RejectActionRequest,
  ): Promise<void> {
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
  ): Promise<{
    actions: ModerationActionResponse[];
    nextCursor: string | null;
    totalCount: number;
  }> {
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

    const nextCursor =
      actions.length === limit ? actions[actions.length - 1]!.id : null;

    return {
      actions: actions.map((action) =>
        this.mapModerationActionToResponse(action),
      ),
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
  ): Promise<{ sent: number }> {
    // This is a non-punitive intervention
    // In a full implementation, this would create notification records
    // For now, we'll just track that the action was taken
    return {
      sent: userIds.length,
    };
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
    };
  }
}
