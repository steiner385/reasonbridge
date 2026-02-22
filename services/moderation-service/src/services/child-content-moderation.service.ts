/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChildReviewStatus, ReviewPriority } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Statistics for the child content review queue
 */
export interface ChildQueueStats {
  /** Count of items by status */
  byStatus: Record<string, number>;
  /** Count of items by priority */
  byPriority: Record<string, number>;
  /** Total number of items in queue */
  total: number;
  /** Number of pending items (PENDING + IN_REVIEW) */
  pendingCount: number;
  /** Number of urgent items */
  urgentCount: number;
}

/**
 * Item in the child content review queue
 */
export interface ChildQueueItem {
  id: string;
  responseId: string;
  topicId: string;
  authorId: string;
  content: string;
  status: ChildReviewStatus;
  priority: ReviewPriority;
  aiFlags: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AI flags structure for content analysis
 */
export interface AiFlags {
  /** Whether grooming patterns were detected */
  grooming?: boolean;
  /** Whether inappropriate content was detected */
  inappropriate?: boolean;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Additional flagged categories */
  [key: string]: unknown;
}

/**
 * Service for managing child content moderation.
 *
 * This service handles the review queue for content posted by child users
 * in child-accessible topics. All content from children must be reviewed
 * by a moderator before being published.
 *
 * Key features:
 * - Queue responses for review when posted in child-accessible topics
 * - Automatic priority escalation for AI-flagged grooming patterns
 * - Content approval and rejection with child-friendly feedback
 * - Escalation workflow for complex cases
 *
 * @remarks
 * This service is part of the Child-Friendly Mode feature (Phase 2: Content Safety).
 * It integrates with the ChildContentReviewQueue model defined in the Prisma schema.
 */
@Injectable()
export class ChildContentModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Queue a response for review when posted in a child-accessible topic.
   *
   * @param responseId - The ID of the response to queue
   * @param topicId - The ID of the topic where the response was posted
   * @param authorId - The ID of the response author
   * @param content - The content of the response
   * @param aiFlags - Optional AI analysis flags (e.g., grooming detection)
   *
   * @remarks
   * Priority is determined based on AI flags:
   * - URGENT: Grooming patterns detected
   * - HIGH: Other concerning content flagged
   * - NORMAL: No flags or low concern
   */
  async queueForReview(
    responseId: string,
    topicId: string,
    authorId: string,
    content: string,
    aiFlags?: AiFlags,
  ): Promise<void> {
    const priority = this.determinePriority(aiFlags);

    await this.prisma.childContentReviewQueue.create({
      data: {
        responseId,
        topicId,
        authorId,
        content,
        status: 'PENDING',
        priority,
        ...(aiFlags && { aiFlags: aiFlags as Prisma.InputJsonValue }),
      },
    });
  }

  /**
   * Approve content, making it visible to users.
   *
   * @param queueId - The ID of the queue entry to approve
   * @param moderatorId - The ID of the moderator approving the content
   * @throws NotFoundException if the queue entry is not found
   */
  async approveContent(queueId: string, moderatorId: string): Promise<void> {
    const entry = await this.prisma.childContentReviewQueue.findUnique({
      where: { id: queueId },
    });

    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    await this.prisma.childContentReviewQueue.update({
      where: { id: queueId },
      data: {
        status: 'APPROVED',
        decision: 'APPROVED',
        reviewedById: moderatorId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Reject content with child-friendly feedback.
   *
   * @param queueId - The ID of the queue entry to reject
   * @param moderatorId - The ID of the moderator rejecting the content
   * @param reason - Child-friendly explanation for the rejection
   * @throws NotFoundException if the queue entry is not found
   *
   * @remarks
   * The rejection reason should be worded in a child-friendly manner,
   * avoiding technical or harsh language. It will be shown to the
   * child user to help them understand why their content was not published.
   */
  async rejectContent(queueId: string, moderatorId: string, reason: string): Promise<void> {
    const entry = await this.prisma.childContentReviewQueue.findUnique({
      where: { id: queueId },
    });

    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    await this.prisma.childContentReviewQueue.update({
      where: { id: queueId },
      data: {
        status: 'REJECTED',
        decision: 'REJECTED',
        reviewedById: moderatorId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  /**
   * Escalate content to a senior moderator for review.
   *
   * @param queueId - The ID of the queue entry to escalate
   * @param reason - The reason for escalation
   * @throws NotFoundException if the queue entry is not found
   *
   * @remarks
   * Escalation is used when:
   * - The content requires policy interpretation
   * - The situation is complex or sensitive
   * - A moderator is uncertain about the appropriate action
   */
  async escalate(queueId: string, reason: string): Promise<void> {
    const entry = await this.prisma.childContentReviewQueue.findUnique({
      where: { id: queueId },
    });

    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    await this.prisma.childContentReviewQueue.update({
      where: { id: queueId },
      data: {
        status: 'ESCALATED',
        rejectionReason: reason,
      },
    });
  }

  /**
   * Get queue statistics for the moderation dashboard.
   *
   * @returns Statistics including counts by status and priority
   */
  async getQueueStats(): Promise<ChildQueueStats> {
    // Get counts grouped by status
    const statusGroups = await this.prisma.childContentReviewQueue.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    // Get counts grouped by priority
    const priorityGroups = await this.prisma.childContentReviewQueue.groupBy({
      by: ['priority'],
      _count: { _all: true },
    });

    // Convert to record format
    const byStatus: Record<string, number> = {};
    let total = 0;
    let pendingCount = 0;

    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
      total += group._count._all;

      if (group.status === 'PENDING' || group.status === 'IN_REVIEW') {
        pendingCount += group._count._all;
      }
    }

    const byPriority: Record<string, number> = {};
    let urgentCount = 0;

    for (const group of priorityGroups) {
      byPriority[group.priority] = group._count._all;

      if (group.priority === 'URGENT') {
        urgentCount = group._count._all;
      }
    }

    return {
      byStatus,
      byPriority,
      total,
      pendingCount,
      urgentCount,
    };
  }

  /**
   * Get pending items for moderator review.
   *
   * @param limit - Maximum number of items to return (default: 20)
   * @returns List of pending queue items ordered by priority (URGENT first) then creation time
   *
   * @remarks
   * Items are ordered to ensure urgent content (e.g., potential grooming)
   * is reviewed first, followed by older items to maintain fairness.
   */
  async getPendingItems(limit: number = 20): Promise<ChildQueueItem[]> {
    const items = await this.prisma.childContentReviewQueue.findMany({
      where: {
        status: { in: ['PENDING', 'IN_REVIEW'] },
      },
      orderBy: [
        {
          priority: 'desc', // URGENT > HIGH > NORMAL > LOW based on Prisma enum ordering
        },
        { createdAt: 'asc' }, // Older items first within same priority
      ],
      take: limit,
    });

    return items.map((item) => ({
      id: item.id,
      responseId: item.responseId,
      topicId: item.topicId,
      authorId: item.authorId,
      content: item.content,
      status: item.status,
      priority: item.priority,
      aiFlags: item.aiFlags as Record<string, unknown> | null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  /**
   * Determine the priority level based on AI flags.
   *
   * @param aiFlags - AI analysis flags
   * @returns The appropriate priority level
   */
  private determinePriority(aiFlags?: AiFlags): ReviewPriority {
    if (!aiFlags) {
      return 'NORMAL';
    }

    // Grooming patterns get highest priority
    if (aiFlags.grooming) {
      return 'URGENT';
    }

    // Other concerning flags get high priority
    if (aiFlags.inappropriate || Object.keys(aiFlags).some((key) => aiFlags[key] === true)) {
      return 'HIGH';
    }

    return 'NORMAL';
  }
}
