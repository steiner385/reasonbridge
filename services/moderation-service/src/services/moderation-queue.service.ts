/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * QueueItem represents an item in the moderation review queue
 */
export interface QueueItem {
  type: 'action' | 'appeal' | 'report';
  id: string;
  priority: 'high' | 'normal' | 'low';
  waitTime: string; // ISO 8601 duration
  summary: string;
}

/**
 * QueueResponse contains paginated queue items
 */
export interface QueueResponse {
  items: QueueItem[];
  totalCount: number;
}

/**
 * QueueStats contains aggregated queue statistics
 */
export interface QueueStats {
  pendingActions: number;
  pendingAppeals: number;
  pendingReports: number;
  avgResolutionTimeMinutes: number;
  oldestItemAge: string; // ISO 8601 duration
}

/**
 * ModerationQueueService provides queue management and analytics for the moderation system.
 *
 * Responsibilities:
 * - Retrieve queue items (actions, appeals, reports) for moderator review
 * - Calculate item priority and wait times
 * - Generate queue statistics and metrics
 * - Track moderation analytics and effectiveness
 */
@Injectable()
export class ModerationQueueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get moderation review queue with filtering
   *
   * @param type - Filter by queue item type ('action', 'appeal', or 'report')
   * @param priority - Filter by priority level ('high', 'normal', or 'low')
   * @param pageSize - Maximum number of items to return (default: 20)
   * @param cursor - For pagination, the ID of the last item from previous page
   * @returns Queue items with their metadata
   */
  async getQueue(
    type?: 'action' | 'appeal' | 'report',
    priority?: 'high' | 'normal' | 'low',
    pageSize: number = 20,
    cursor?: string,
  ): Promise<QueueResponse> {
    const items: QueueItem[] = [];

    if (!type || type === 'action') {
      const actions = await this.getPendingActions(priority, pageSize, cursor);
      items.push(...actions);
    }

    if (!type || type === 'appeal') {
      const appeals = await this.getPendingAppeals(priority, pageSize, cursor);
      items.push(...appeals);
    }

    // Reports will be added once the Report model is implemented
    // if (!type || type === 'report') {
    //   const reports = await this.getPendingReports(priority, pageSize, cursor);
    //   items.push(...reports);
    // }

    // Sort items by priority and creation time
    const sortedItems = this.sortQueueItems(items).slice(0, pageSize);

    // Count total items in queue
    let totalCount = 0;
    if (!type || type === 'action') {
      totalCount += await this.countPendingActions();
    }
    if (!type || type === 'appeal') {
      totalCount += await this.countPendingAppeals();
    }
    // if (!type || type === 'report') {
    //   totalCount += await this.countPendingReports();
    // }

    return {
      items: sortedItems,
      totalCount,
    };
  }

  /**
   * Get queue statistics including counts and resolution metrics
   */
  async getQueueStats(): Promise<QueueStats> {
    const [pendingActions, pendingAppeals, metrics] = await Promise.all([
      this.countPendingActions(),
      this.countPendingAppeals(),
      // this.countPendingReports(), // TODO: add when Report model is implemented
      this.calculateMetrics(),
    ]);

    return {
      pendingActions,
      pendingAppeals,
      pendingReports: 0, // TODO: update when Report model is implemented
      avgResolutionTimeMinutes: metrics.avgResolutionTimeMinutes,
      oldestItemAge: metrics.oldestItemAge,
    };
  }

  /**
   * Get pending moderation actions
   */
  private async getPendingActions(
    priority?: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<QueueItem[]> {
    let where: any = { status: 'PENDING' };

    const actions = await this.prisma.moderationAction.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }],
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    return actions.map((action) => ({
      type: 'action' as const,
      id: action.id,
      priority: this.calculateActionPriority(action),
      waitTime: this.calculateWaitTime(action.createdAt),
      summary: `${action.actionType} on ${action.targetType.toLowerCase()} ${action.targetId.substring(0, 8)}`,
    }));
  }

  /**
   * Get pending appeals
   */
  private async getPendingAppeals(
    priority?: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<QueueItem[]> {
    const appeals = await this.prisma.appeal.findMany({
      where: {
        status: {
          in: ['PENDING', 'UNDER_REVIEW'],
        },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      include: {
        moderationAction: true,
      },
    });

    return appeals.map((appeal) => ({
      type: 'appeal' as const,
      id: appeal.id,
      priority: this.calculateAppealPriority(appeal),
      waitTime: this.calculateWaitTime(appeal.createdAt),
      summary: `Appeal: ${appeal.moderationAction.actionType} on ${appeal.moderationAction.targetType.toLowerCase()}`,
    }));
  }

  // /**
  //  * Get pending reports (from users)
  //  * TODO: Implement when Report model is added to Prisma schema
  //  */
  // private async getPendingReports(
  //   priority?: string,
  //   limit: number = 20,
  //   cursor?: string,
  // ): Promise<QueueItem[]> {
  //   const reports = await this.prisma.report.findMany({
  //     where: {
  //       status: 'PENDING',
  //     },
  //     orderBy: [{ createdAt: 'asc' }],
  //     take: limit,
  //     ...(cursor && { skip: 1, cursor: { id: cursor } }),
  //   });
  //
  //   return reports.map((report) => ({
  //     type: 'report' as const,
  //     id: report.id,
  //     priority: this.calculateReportPriority(report),
  //     waitTime: this.calculateWaitTime(report.createdAt),
  //     summary: `Report: ${report.reason.substring(0, 30)}...`,
  //   }));
  // }

  /**
   * Count pending moderation actions
   */
  private async countPendingActions(): Promise<number> {
    return this.prisma.moderationAction.count({
      where: { status: 'PENDING' },
    });
  }

  /**
   * Count pending appeals
   */
  private async countPendingAppeals(): Promise<number> {
    return this.prisma.appeal.count({
      where: {
        status: {
          in: ['PENDING', 'UNDER_REVIEW'],
        },
      },
    });
  }

  // /**
  //  * Count pending reports
  //  * TODO: Implement when Report model is added
  //  */
  // private async countPendingReports(): Promise<number> {
  //   return this.prisma.report.count({
  //     where: { status: 'PENDING' },
  //   });
  // }

  /**
   * Calculate priority for a moderation action
   */
  private calculateActionPriority(action: any): 'high' | 'normal' | 'low' {
    // High priority: consequential actions or high severity
    if (action.severity === 'CONSEQUENTIAL' || (action.aiConfidence && action.aiConfidence < 0.7)) {
      return 'high';
    }

    // Normal priority: medium severity
    if (action.severity === 'MEDIUM') {
      return 'normal';
    }

    // Low priority: non-punitive actions
    return 'low';
  }

  /**
   * Calculate priority for an appeal
   */
  private calculateAppealPriority(appeal: any): 'high' | 'normal' | 'low' {
    // Appeals are generally high priority as they affect user trust
    if (appeal.moderationAction.severity === 'CONSEQUENTIAL') {
      return 'high';
    }
    return 'normal';
  }

  // /**
  //  * Calculate priority for a report
  //  * TODO: Use when Report model is implemented
  //  */
  // private calculateReportPriority(report: any): 'high' | 'normal' | 'low' {
  //   // High priority: reports of severe violations
  //   if (report.reason && report.reason.toLowerCase().includes('violence')) {
  //     return 'high';
  //   }
  //
  //   // Normal priority: default
  //   return 'normal';
  // }

  /**
   * Calculate wait time as ISO 8601 duration
   */
  private calculateWaitTime(createdAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `P${diffDays}D`;
    }
    if (diffHours > 0) {
      return `PT${diffHours}H`;
    }
    if (diffMinutes > 0) {
      return `PT${diffMinutes}M`;
    }
    return `PT${diffSeconds}S`;
  }

  /**
   * Sort queue items by priority (high -> normal -> low) and then by wait time (oldest first)
   */
  private sortQueueItems(items: QueueItem[]): QueueItem[] {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return items.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // If same priority, sort by wait time (older items first)
      return this.parseDuration(a.waitTime) - this.parseDuration(b.waitTime);
    });
  }

  /**
   * Parse ISO 8601 duration to milliseconds
   */
  private parseDuration(iso8601: string): number {
    const regex =
      /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?/;
    const matches = iso8601.match(regex);

    if (!matches) return 0;

    const [, years, months, days, hours, minutes, seconds] = matches;
    return (
      parseInt(years || '0') * 365 * 24 * 60 * 60 * 1000 +
      parseInt(months || '0') * 30 * 24 * 60 * 60 * 1000 +
      parseInt(days || '0') * 24 * 60 * 60 * 1000 +
      parseInt(hours || '0') * 60 * 60 * 1000 +
      parseInt(minutes || '0') * 60 * 1000 +
      parseFloat(seconds || '0') * 1000
    );
  }

  /**
   * Calculate queue metrics (average resolution time, oldest item age)
   */
  private async calculateMetrics(): Promise<{
    avgResolutionTimeMinutes: number;
    oldestItemAge: string;
  }> {
    // Get resolved actions to calculate average resolution time
    const resolvedActions = await this.prisma.moderationAction.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'REVERSED', 'APPEALED'],
        },
        approvedAt: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        createdAt: true,
        approvedAt: true,
      },
    });

    let avgResolutionTimeMinutes = 0;
    if (resolvedActions.length > 0) {
      const totalResolutionMs = resolvedActions.reduce((sum, action) => {
        const resolutionMs = action.approvedAt!.getTime() - action.createdAt.getTime();
        return sum + resolutionMs;
      }, 0);
      avgResolutionTimeMinutes = Math.floor(totalResolutionMs / resolvedActions.length / 60 / 1000);
    }

    // Get oldest pending item
    let oldestItemAge = 'PT0S';
    const oldestAction = await this.prisma.moderationAction.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    const oldestAppeal = await this.prisma.appeal.findFirst({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
    });

    // TODO: Add oldestReport once Report model is implemented
    // const oldestReport = await this.prisma.report.findFirst({
    //   where: { status: 'PENDING' },
    //   orderBy: { createdAt: 'asc' },
    // });

    const oldestItems = [oldestAction, oldestAppeal].filter(Boolean);
    if (oldestItems.length > 0) {
      const oldest = oldestItems.reduce((min, item) => {
        return (min?.createdAt || new Date()).getTime() > (item?.createdAt || new Date()).getTime()
          ? item
          : min;
      });

      if (oldest && oldest.createdAt) {
        oldestItemAge = this.calculateWaitTime(oldest.createdAt);
      }
    }

    return {
      avgResolutionTimeMinutes,
      oldestItemAge,
    };
  }

  /**
   * Get moderation analytics for a time period
   *
   * @param startDate - Start of analysis period
   * @param endDate - End of analysis period
   * @returns Analytics data including action counts, approval rates, and resolution times
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const actions = await this.prisma.moderationAction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const appeals = await this.prisma.appeal.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalActions = actions.length;
    const approvedActions = actions.filter((a) => a.approvedAt !== null).length;
    const reversedActions = actions.filter((a) => a.status === 'REVERSED').length;
    const appealedActions = actions.filter((a) => a.status === 'APPEALED').length;

    const approvalRate = totalActions > 0 ? (approvedActions / totalActions) * 100 : 0;
    const reversalRate = totalActions > 0 ? (reversedActions / totalActions) * 100 : 0;
    const appealRate = totalActions > 0 ? (appealedActions / totalActions) * 100 : 0;

    // Calculate average resolution time
    const resolvedActions = actions.filter((a) => a.approvedAt !== null && a.createdAt);
    let avgResolutionMs = 0;
    if (resolvedActions.length > 0) {
      const totalMs = resolvedActions.reduce((sum, action) => {
        return sum + (action.approvedAt!.getTime() - action.createdAt.getTime());
      }, 0);
      avgResolutionMs = totalMs / resolvedActions.length;
    }

    // Count by action type
    const actionTypeBreakdown: Record<string, number> = {};
    actions.forEach((action) => {
      actionTypeBreakdown[action.actionType] = (actionTypeBreakdown[action.actionType] || 0) + 1;
    });

    // Count by severity
    const severityBreakdown: Record<string, number> = {};
    actions.forEach((action) => {
      severityBreakdown[action.severity] = (severityBreakdown[action.severity] || 0) + 1;
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalActions,
        approvedActions,
        reversedActions,
        appealedActions,
        totalAppeals: appeals.length,
      },
      rates: {
        approvalRate: Math.round(approvalRate * 100) / 100,
        reversalRate: Math.round(reversalRate * 100) / 100,
        appealRate: Math.round(appealRate * 100) / 100,
      },
      timing: {
        avgResolutionMs,
        avgResolutionMinutes: Math.round(avgResolutionMs / 60 / 1000),
      },
      breakdown: {
        byActionType: actionTypeBreakdown,
        bySeverity: severityBreakdown,
      },
    };
  }
}
