/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationServiceClient } from '../clients/notification-service.client.js';
import type { ReviewPriority, ChildReviewStatus } from '@prisma/client';

/**
 * SLA time limits in minutes for each priority level.
 */
export const SLA_LIMITS_MINUTES: Record<ReviewPriority, number> = {
  URGENT: 60, // 1 hour
  HIGH: 240, // 4 hours
  NORMAL: 1440, // 24 hours
  LOW: 2880, // 48 hours
};

/**
 * Escalation thresholds - percentage of SLA time at which items should be escalated.
 */
export const ESCALATION_THRESHOLD_PERCENT = 75;

/**
 * Target priority for escalation based on current priority.
 */
export const ESCALATION_TARGET: Record<ReviewPriority, ReviewPriority> = {
  LOW: 'NORMAL',
  NORMAL: 'HIGH',
  HIGH: 'URGENT',
  URGENT: 'URGENT', // Already at highest, triggers additional notifications
};

/**
 * Represents a queue item that is approaching or past its SLA deadline.
 */
export interface StaleQueueItem {
  /** Queue entry ID */
  id: string;
  /** Response ID being reviewed */
  responseId: string;
  /** Topic ID where response was posted */
  topicId: string;
  /** Author ID of the content */
  authorId: string;
  /** Current review priority */
  priority: ReviewPriority;
  /** Current review status */
  status: ChildReviewStatus;
  /** When the item was created */
  createdAt: Date;
  /** Age of the item in minutes */
  ageMinutes: number;
  /** SLA deadline in minutes */
  slaMinutes: number;
  /** Percentage of SLA time elapsed */
  slaPercent: number;
  /** Whether SLA has been breached */
  isBreached: boolean;
  /** Whether item should be escalated (at 75%+ of SLA) */
  shouldEscalate: boolean;
}

/**
 * Notification data for SLA breaches sent to admins.
 */
export interface SlaBreachNotification {
  /** Queue entry ID */
  queueId: string;
  /** Current priority of the item */
  priority: ReviewPriority;
  /** Age of the item in minutes */
  ageMinutes: number;
  /** SLA limit in minutes */
  slaMinutes: number;
  /** Percentage over SLA (e.g., 150 means 50% over) */
  breachPercent: number;
  /** Response ID for reference */
  responseId: string;
  /** Topic ID for reference */
  topicId: string;
}

/**
 * Result of SLA compliance check.
 */
export interface SlaComplianceResult {
  /** Timestamp of the check */
  checkedAt: Date;
  /** Total pending items checked */
  totalPending: number;
  /** Items within SLA */
  withinSla: number;
  /** Items approaching SLA (75-100%) */
  approachingSla: number;
  /** Items that have breached SLA */
  breachedSla: number;
  /** Items that were auto-escalated */
  escalatedCount: number;
  /** Admin notifications sent */
  notificationsSent: number;
}

/**
 * Scheduled job for monitoring SLA compliance of child content moderation queue.
 *
 * @remarks
 * This job runs every 5 minutes to:
 * 1. Check all pending child content review items for SLA compliance
 * 2. Auto-escalate items that have reached 75% of their SLA time
 * 3. Notify administrators of any SLA breaches
 *
 * SLA Limits:
 * - URGENT: 1 hour (must be reviewed immediately)
 * - HIGH: 4 hours
 * - NORMAL: 24 hours
 * - LOW: 48 hours
 *
 * @example
 * ```typescript
 * // The job is triggered by cron, but can be invoked manually:
 * const result = await slaMonitorJob.checkSlaCompliance();
 * console.log(`Checked ${result.totalPending} items, ${result.breachedSla} breached`);
 *
 * // Get stale items directly:
 * const staleItems = await slaMonitorJob.getStaleItems();
 * ```
 */
@Injectable()
export class SlaMonitorJob {
  private readonly logger = new Logger(SlaMonitorJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationClient: NotificationServiceClient,
  ) {}

  /**
   * Main cron handler - runs every 5 minutes
   *
   * @remarks
   * Cron pattern: `* /5 * * * *` means every 5 minutes (space added to avoid comment termination)
   *
   * @returns Result of the compliance check including counts and actions taken
   */
  @Cron('*/5 * * * *')
  async checkSlaCompliance(): Promise<SlaComplianceResult> {
    this.logger.log('Starting SLA compliance check...');
    const checkedAt = new Date();

    try {
      // Get all stale items (items approaching or past SLA)
      const staleItems = await this.getStaleItems();
      const allPendingCount = await this.getPendingCount();

      // Categorize items
      const approachingSla = staleItems.filter((item) => item.shouldEscalate && !item.isBreached);
      const breachedSla = staleItems.filter((item) => item.isBreached);
      const withinSla = allPendingCount - staleItems.length;

      // Auto-escalate items at 75%+ of SLA
      const escalatedCount = await this.autoEscalateStaleItems(approachingSla);

      // Notify admins of breaches
      const notificationsSent = await this.notifyAdminsOfBreaches(breachedSla);

      const result: SlaComplianceResult = {
        checkedAt,
        totalPending: allPendingCount,
        withinSla,
        approachingSla: approachingSla.length,
        breachedSla: breachedSla.length,
        escalatedCount,
        notificationsSent,
      };

      this.logger.log(
        `SLA check complete: ${result.totalPending} pending, ` +
          `${result.withinSla} within SLA, ${result.approachingSla} approaching, ` +
          `${result.breachedSla} breached, ${result.escalatedCount} escalated`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'SLA compliance check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Get items that are approaching or past their SLA deadline.
   *
   * @returns Array of stale queue items with SLA metrics
   *
   * @remarks
   * An item is considered "stale" if it has exceeded 75% of its SLA time.
   * This allows proactive escalation before actual SLA breaches occur.
   */
  async getStaleItems(): Promise<StaleQueueItem[]> {
    const now = new Date();

    // Get all pending items
    const pendingItems = await this.prisma.childContentReviewQueue.findMany({
      where: {
        status: { in: ['PENDING', 'IN_REVIEW'] },
      },
      select: {
        id: true,
        responseId: true,
        topicId: true,
        authorId: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    });

    // Calculate SLA metrics for each item
    const staleItems: StaleQueueItem[] = [];

    for (const item of pendingItems) {
      const ageMinutes = this.calculateAgeMinutes(item.createdAt, now);
      const slaMinutes = SLA_LIMITS_MINUTES[item.priority];
      const slaPercent = (ageMinutes / slaMinutes) * 100;
      const isBreached = slaPercent >= 100;
      const shouldEscalate = slaPercent >= ESCALATION_THRESHOLD_PERCENT;

      // Only include items that need attention (at 75%+ of SLA)
      if (shouldEscalate) {
        staleItems.push({
          id: item.id,
          responseId: item.responseId,
          topicId: item.topicId,
          authorId: item.authorId,
          priority: item.priority,
          status: item.status,
          createdAt: item.createdAt,
          ageMinutes,
          slaMinutes,
          slaPercent: Math.round(slaPercent * 100) / 100,
          isBreached,
          shouldEscalate,
        });
      }
    }

    // Sort by SLA percentage (most critical first)
    return staleItems.sort((a, b) => b.slaPercent - a.slaPercent);
  }

  /**
   * Calculate the SLA deadline for an item based on its priority and creation time.
   *
   * @param priority - The review priority level
   * @param createdAt - When the item was created
   * @returns The deadline by which the item should be reviewed
   */
  getSlaDeadline(priority: ReviewPriority, createdAt: Date): Date {
    const slaMinutes = SLA_LIMITS_MINUTES[priority];
    const deadline = new Date(createdAt);
    deadline.setMinutes(deadline.getMinutes() + slaMinutes);
    return deadline;
  }

  /**
   * Auto-escalate items that have reached 75% of their SLA time.
   *
   * @param items - Array of stale items to potentially escalate
   * @returns Number of items that were escalated
   *
   * @remarks
   * Escalation rules:
   * - LOW at 36 hours (75% of 48) -> NORMAL
   * - NORMAL at 18 hours (75% of 24) -> HIGH
   * - HIGH at 3 hours (75% of 4) -> URGENT
   * - URGENT at 45 min (75% of 60) -> Remains URGENT but triggers extra notification
   */
  async autoEscalateStaleItems(items: StaleQueueItem[]): Promise<number> {
    let escalatedCount = 0;

    for (const item of items) {
      try {
        const targetPriority = ESCALATION_TARGET[item.priority];

        // Only escalate if priority would actually change
        if (targetPriority !== item.priority) {
          await this.prisma.childContentReviewQueue.update({
            where: { id: item.id },
            data: { priority: targetPriority },
          });

          this.logger.warn(
            `Auto-escalated item ${item.id} from ${item.priority} to ${targetPriority} ` +
              `(${item.ageMinutes} min old, ${item.slaPercent}% of SLA)`,
          );

          escalatedCount++;
        } else if (item.priority === 'URGENT' && item.shouldEscalate) {
          // URGENT items at 75%+ need special attention but can't escalate further
          this.logger.warn(
            `URGENT item ${item.id} at ${item.slaPercent}% of SLA - requires immediate attention`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to escalate item ${item.id}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return escalatedCount;
  }

  /**
   * Notify administrators about SLA breaches.
   *
   * @param breachedItems - Array of items that have breached their SLA
   * @returns Number of notifications sent
   *
   * @remarks
   * This method:
   * 1. Logs warnings for breached items
   * 2. Sends notifications to notification-service for real-time moderator alerts
   * 3. Broadcasts via WebSocket to connected moderator dashboards
   */
  async notifyAdminsOfBreaches(breachedItems: StaleQueueItem[]): Promise<number> {
    if (breachedItems.length === 0) {
      return 0;
    }

    const notifications: SlaBreachNotification[] = breachedItems.map((item) => ({
      queueId: item.id,
      priority: item.priority,
      ageMinutes: item.ageMinutes,
      slaMinutes: item.slaMinutes,
      breachPercent: item.slaPercent,
      responseId: item.responseId,
      topicId: item.topicId,
    }));

    // Log all breaches
    for (const notification of notifications) {
      this.logger.error(
        `SLA BREACH: Item ${notification.queueId} (${notification.priority}) ` +
          `is ${notification.breachPercent}% of SLA ` +
          `(${notification.ageMinutes} min / ${notification.slaMinutes} min limit)`,
      );
    }

    // Summary notification
    this.logger.error(`SLA BREACH SUMMARY: ${notifications.length} items have breached SLA`, {
      breaches: notifications.map((n) => ({
        queueId: n.queueId,
        priority: n.priority,
        breachPercent: n.breachPercent,
      })),
    });

    // Send to notification-service for real-time moderator alerts
    // Fire-and-forget pattern - failures are logged but don't block the SLA check
    const result = await this.notificationClient.sendSlaBreachNotification(notifications);

    if (result) {
      this.logger.log(
        `SLA breach notifications sent: ${result.notificationsSent} in-app, WebSocket broadcast: ${result.broadcastSent}`,
      );
    }

    return notifications.length;
  }

  /**
   * Get the count of all pending items in the queue.
   *
   * @returns Count of pending/in-review items
   */
  private async getPendingCount(): Promise<number> {
    return this.prisma.childContentReviewQueue.count({
      where: {
        status: { in: ['PENDING', 'IN_REVIEW'] },
      },
    });
  }

  /**
   * Calculate the age of an item in minutes.
   *
   * @param createdAt - When the item was created
   * @param now - Current time (defaults to now)
   * @returns Age in minutes
   */
  private calculateAgeMinutes(createdAt: Date, now: Date = new Date()): number {
    const diffMs = now.getTime() - createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }
}
