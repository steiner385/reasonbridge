/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationGateway } from '../gateways/notification.gateway.js';

/**
 * Single SLA breach notification item
 */
export interface SlaBreachItem {
  queueId: string;
  priority: string;
  ageMinutes: number;
  slaMinutes: number;
  breachPercent: number;
  responseId: string;
  topicId: string;
}

/**
 * Request DTO for SLA breach notifications
 */
export interface SlaBreachNotificationDto {
  breaches: SlaBreachItem[];
  checkedAt: string;
}

/**
 * Response DTO for SLA breach notifications
 */
export interface SlaBreachNotificationResponse {
  success: boolean;
  notificationsSent: number;
  broadcastSent: boolean;
}

/**
 * Internal controller for SLA breach notifications.
 *
 * Called by moderation-service when SLA breaches are detected.
 * This endpoint:
 * 1. Creates notifications for all moderators
 * 2. Broadcasts via WebSocket to the moderation:actions room
 *
 * @remarks
 * This is an internal endpoint without JWT protection, intended for
 * service-to-service communication only.
 */
@Controller('internal/sla-breach')
export class InternalSlaBreachController {
  private readonly logger = new Logger(InternalSlaBreachController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Handle SLA breach notification from moderation-service.
   *
   * @param dto - SLA breach notification data
   * @returns Result with notification counts
   */
  @Post()
  async handleSlaBreachNotification(
    @Body() dto: SlaBreachNotificationDto,
  ): Promise<SlaBreachNotificationResponse> {
    this.logger.log(`Received SLA breach notification with ${dto.breaches.length} breaches`);

    if (dto.breaches.length === 0) {
      return {
        success: true,
        notificationsSent: 0,
        broadcastSent: false,
      };
    }

    try {
      // Get all users with moderator role
      const moderators = await this.getModerators();

      // Create notifications for each moderator
      const notificationsSent = await this.createModeratorNotifications(
        moderators,
        dto.breaches,
        dto.checkedAt,
      );

      // Broadcast via WebSocket to moderation room
      this.broadcastSlaBreachEvent(dto.breaches, dto.checkedAt);

      this.logger.log(
        `SLA breach notification complete: ${notificationsSent} notifications sent, WebSocket broadcast sent`,
      );

      return {
        success: true,
        notificationsSent,
        broadcastSent: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process SLA breach notification: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get all users with moderator or admin role.
   */
  private async getModerators(): Promise<{ id: string; displayName: string | null }[]> {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['MODERATOR', 'ADMIN'] },
        accountStatus: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
      },
    });
  }

  /**
   * Create notifications for all moderators about SLA breaches.
   */
  private async createModeratorNotifications(
    moderators: { id: string; displayName: string | null }[],
    breaches: SlaBreachItem[],
    checkedAt: string,
  ): Promise<number> {
    if (moderators.length === 0) {
      this.logger.warn('No moderators found to notify about SLA breaches');
      return 0;
    }

    // Build notification content
    const urgentCount = breaches.filter((b) => b.priority === 'URGENT').length;
    const highCount = breaches.filter((b) => b.priority === 'HIGH').length;
    const otherCount = breaches.length - urgentCount - highCount;

    const title = `[SLA BREACH] ${breaches.length} items require attention`;
    const body = this.buildNotificationBody(urgentCount, highCount, otherCount, breaches);
    const actionUrl = '/moderation/queue?filter=breached';

    // Create notifications for each moderator
    const notifications = await Promise.all(
      moderators.map((moderator) =>
        this.prisma.notification.create({
          data: {
            userId: moderator.id,
            type: 'sla_breach',
            title,
            body,
            actionUrl,
            // Use JSON.parse/stringify to ensure plain JSON compatibility with Prisma
            metadata: JSON.parse(
              JSON.stringify({
                breachCount: breaches.length,
                urgentCount,
                highCount,
                checkedAt,
                breaches: breaches.slice(0, 10),
              }),
            ),
          },
        }),
      ),
    );

    return notifications.length;
  }

  /**
   * Build notification body text.
   */
  private buildNotificationBody(
    urgentCount: number,
    highCount: number,
    otherCount: number,
    breaches: SlaBreachItem[],
  ): string {
    const parts: string[] = [];

    if (urgentCount > 0) {
      parts.push(`${urgentCount} URGENT`);
    }
    if (highCount > 0) {
      parts.push(`${highCount} HIGH`);
    }
    if (otherCount > 0) {
      parts.push(`${otherCount} other`);
    }

    const priorityBreakdown = parts.join(', ');
    const oldestBreach = breaches.reduce((oldest, b) =>
      b.ageMinutes > oldest.ageMinutes ? b : oldest,
    );

    return (
      `${priorityBreakdown} priority items have exceeded their SLA. ` +
      `Oldest item is ${Math.round(oldestBreach.ageMinutes / 60)} hours overdue.`
    );
  }

  /**
   * Broadcast SLA breach event via WebSocket to moderation room.
   */
  private broadcastSlaBreachEvent(breaches: SlaBreachItem[], checkedAt: string): void {
    this.notificationGateway.emitSlaBreachNotification({
      breaches,
      checkedAt,
      timestamp: new Date().toISOString(),
    });
  }
}
