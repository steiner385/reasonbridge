import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '@prisma/client';

/**
 * ModerationActionRepository provides data access operations for moderation actions.
 * Encapsulates Prisma queries for creating, reading, updating, and querying moderation actions.
 */
@Injectable()
export class ModerationActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new moderation action
   */
  async create(data: Prisma.ModerationActionCreateInput) {
    return this.prisma.moderationAction.create({
      data,
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  /**
   * Find a moderation action by ID
   */
  async findById(id: string) {
    return this.prisma.moderationAction.findUnique({
      where: { id },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
        appeals: true,
      },
    });
  }

  /**
   * Find moderation actions by target
   */
  async findByTarget(targetType: string, targetId: string) {
    return this.prisma.moderationAction.findMany({
      where: {
        targetType: targetType as any,
        targetId,
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find moderation actions for a user (actions where user is the target)
   */
  async findByUserId(userId: string) {
    return this.prisma.moderationAction.findMany({
      where: {
        targetType: 'USER',
        targetId: userId,
      },
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find all moderation actions with optional filters and pagination
   */
  async findMany(
    where?: Prisma.ModerationActionWhereInput,
    limit: number = 20,
    cursor?: string,
  ) {
    const findManyArgs: Prisma.ModerationActionFindManyArgs = {
      ...(where && { where }),
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    };

    if (cursor) {
      findManyArgs.skip = 1;
      findManyArgs.cursor = { id: cursor };
    }

    return this.prisma.moderationAction.findMany(findManyArgs);
  }

  /**
   * Count moderation actions matching the filter
   */
  async count(where?: Prisma.ModerationActionWhereInput): Promise<number> {
    return this.prisma.moderationAction.count({
      ...(where && { where }),
    });
  }

  /**
   * Update a moderation action
   */
  async update(id: string, data: Prisma.ModerationActionUpdateInput) {
    return this.prisma.moderationAction.update({
      where: { id },
      data,
      include: {
        approvedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  /**
   * Update moderation action status
   */
  async updateStatus(id: string, status: string) {
    return this.update(id, { status: status as any });
  }

  /**
   * Mark a moderation action as approved
   */
  async approve(id: string, approvedById: string, modifiedReasoning?: string) {
    return this.prisma.moderationAction.update({
      where: { id },
      data: {
        status: 'ACTIVE' as any,
        approvedBy: {
          connect: { id: approvedById },
        },
        approvedAt: new Date(),
        ...(modifiedReasoning && { reasoning: modifiedReasoning }),
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
  }

  /**
   * Reject a moderation action (delete it from active queue)
   */
  async reject(id: string) {
    return this.update(id, {
      status: 'REVERSED',
    });
  }

  /**
   * Find pending moderation actions awaiting approval
   */
  async findPending(limit: number = 50, cursor?: string) {
    return this.findMany(
      { status: 'PENDING' },
      limit,
      cursor,
    );
  }

  /**
   * Find active moderation actions
   */
  async findActive(limit: number = 50, cursor?: string) {
    return this.findMany(
      { status: 'ACTIVE' },
      limit,
      cursor,
    );
  }

  /**
   * Find moderation actions that have been appealed
   */
  async findAppealed(limit: number = 50, cursor?: string) {
    return this.findMany(
      { status: 'APPEALED' },
      limit,
      cursor,
    );
  }

  /**
   * Find moderation actions by severity level
   */
  async findBySeverity(severity: string, limit: number = 50, cursor?: string) {
    return this.findMany(
      { severity: severity as any },
      limit,
      cursor,
    );
  }

  /**
   * Find moderation actions by action type
   */
  async findByActionType(actionType: string, limit: number = 50, cursor?: string) {
    return this.findMany(
      { actionType: actionType as any },
      limit,
      cursor,
    );
  }

  /**
   * Find AI-recommended moderation actions
   */
  async findAiRecommended(limit: number = 50, cursor?: string) {
    return this.findMany(
      { aiRecommended: true, status: 'PENDING' },
      limit,
      cursor,
    );
  }

  /**
   * Find expired temporary bans
   */
  async findExpiredBans() {
    return this.prisma.moderationAction.findMany({
      where: {
        isTemporary: true,
        status: 'ACTIVE',
        expiresAt: {
          lte: new Date(),
        },
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
  }

  /**
   * Lift an expired temporary ban
   */
  async liftBan(id: string) {
    return this.update(id, {
      status: 'REVERSED',
      liftedAt: new Date(),
    });
  }

  /**
   * Delete a moderation action (soft delete by setting status)
   */
  async delete(id: string) {
    return this.update(id, {
      status: 'REVERSED',
    });
  }

  /**
   * Find moderation actions by moderator (approved by)
   */
  async findByModerator(moderatorId: string, limit: number = 50, cursor?: string) {
    return this.findMany(
      { approvedById: moderatorId },
      limit,
      cursor,
    );
  }

  /**
   * Get moderation statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const where: Prisma.ModerationActionWhereInput = {};
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

    const [total, byStatus, bySeverity, byActionType] = await Promise.all([
      this.count(where),
      this.prisma.moderationAction.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.moderationAction.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),
      this.prisma.moderationAction.groupBy({
        by: ['actionType'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus,
      bySeverity,
      byActionType,
    };
  }
}
