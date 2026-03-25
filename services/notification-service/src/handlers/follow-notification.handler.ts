/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationGateway } from '../gateways/notification.gateway.js';
import { NotificationDeliveryService } from '../services/notification-delivery.service.js';
import type { UserFollowedEvent, UserUnfollowedEvent } from '@reason-bridge/event-schemas/user';

/**
 * Handles follow/unfollow events and creates notifications
 */
@Injectable()
export class FollowNotificationHandler {
  private readonly logger = new Logger(FollowNotificationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  /**
   * Handle user.followed event
   * Creates notification for the user who was followed
   */
  async handleUserFollowed(event: UserFollowedEvent): Promise<void> {
    this.logger.log(
      `Processing user.followed event: ${event.payload.followerId} followed ${event.payload.followedId}`,
    );

    try {
      // Fetch follower details to include in notification
      const follower = await this.prisma.user.findUnique({
        where: { id: event.payload.followerId },
        select: {
          id: true,
          displayName: true,
        },
      });

      if (!follower) {
        this.logger.warn(`Follower ${event.payload.followerId} not found, skipping notification`);
        return;
      }

      // Verify the followed user exists
      const followedUser = await this.prisma.user.findUnique({
        where: { id: event.payload.followedId },
        select: { id: true },
      });

      if (!followedUser) {
        this.logger.warn(
          `Followed user ${event.payload.followedId} not found, skipping notification`,
        );
        return;
      }

      const followerName = follower.displayName || 'Someone';
      const title = 'New follower';
      const body = `${followerName} started following you`;

      const actionUrl = `/users/${event.payload.followerId}`;

      // Notify the user who was followed
      const notificationIds = await this.createNotifications({
        recipientIds: [event.payload.followedId],
        type: 'follow',
        title,
        body,
        actionUrl,
        metadata: {
          followerId: event.payload.followerId,
          followerName,
          followedAt: event.payload.followedAt,
        },
      });

      this.logger.log(`Created follow notification for user ${event.payload.followedId}`);

      // Deliver notification via email/push based on user preferences
      const notificationId = notificationIds[0];
      if (notificationId) {
        // Fire and forget - don't block on delivery
        this.deliveryService
          .deliverNotification(event.payload.followedId, {
            id: notificationId,
            type: 'follow',
            title,
            body,
            actionUrl,
          })
          .catch((err) => {
            this.logger.error(`Failed to deliver notification ${notificationId}: ${err}`);
          });
      }

      // Emit WebSocket event for real-time delivery
      this.notificationGateway.emitToUser(event.payload.followedId, 'notification:follow', {
        type: 'follow',
        title,
        body,
        followerId: event.payload.followerId,
        followerName,
        timestamp: event.payload.followedAt,
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle user.followed event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle user.unfollowed event
   * Note: We typically don't notify users when they lose followers,
   * but this handler exists for potential analytics or audit logging
   */
  async handleUserUnfollowed(event: UserUnfollowedEvent): Promise<void> {
    this.logger.log(
      `Processing user.unfollowed event: ${event.payload.followerId} unfollowed ${event.payload.followedId}`,
    );

    // Unfollows are typically not notified to users to avoid negative experiences
    // This handler is primarily for logging/analytics purposes
    this.logger.debug(
      `Unfollow recorded: ${event.payload.followerId} -> ${event.payload.followedId} at ${event.payload.unfollowedAt}`,
    );

    // No notification created for unfollows by design
  }

  /**
   * Create notification records in the database
   * @returns Array of created notification IDs
   */
  private async createNotifications(params: {
    recipientIds: string[];
    type: string;
    title: string;
    body: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<string[]> {
    const { recipientIds, type, title, body, actionUrl, metadata } = params;

    this.logger.log(`Creating ${recipientIds.length} notification(s) of type "${type}"`);

    // Create notifications individually to get IDs back
    const notifications = await Promise.all(
      recipientIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            type,
            title,
            body,
            actionUrl,
            metadata: metadata as Prisma.InputJsonValue,
            isRead: false,
          },
          select: { id: true },
        }),
      ),
    );

    return notifications.map((n) => n.id);
  }
}
