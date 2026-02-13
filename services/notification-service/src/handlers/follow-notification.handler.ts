/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationGateway } from '../gateways/notification.gateway.js';
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

      // Notify the user who was followed
      await this.createNotifications({
        recipientIds: [event.payload.followedId],
        type: 'follow',
        title,
        body,
        actionUrl: `/users/${event.payload.followerId}`,
        metadata: {
          followerId: event.payload.followerId,
          followerName,
          followedAt: event.payload.followedAt,
        },
      });

      this.logger.log(`Created follow notification for user ${event.payload.followedId}`);

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
   * Create notification records
   * NOTE: This currently logs notifications until the Notification model is implemented in the database
   */
  private async createNotifications(params: {
    recipientIds: string[];
    type: string;
    title: string;
    body: string;
    actionUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const { recipientIds, type, title, body, actionUrl, metadata } = params;

    // Log notification details (placeholder until Notification model exists in schema)
    this.logger.log(`Would create ${recipientIds.length} notification(s) of type "${type}"`);
    this.logger.debug(
      `Notification details: title="${title}", body="${body}", actionUrl="${actionUrl}"`,
    );
    this.logger.debug(`Recipients: ${recipientIds.join(', ')}`);
    this.logger.debug(`Metadata: ${JSON.stringify(metadata)}`);

    // TODO: Uncomment when Notification model is added to Prisma schema (see task T198)
    /*
    await this.prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        actionUrl,
        metadata: JSON.stringify(metadata),
        isRead: false,
      })),
    });
    */
  }
}
