/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationGateway } from '../gateways/notification.gateway.js';
import { NotificationDeliveryService } from '../services/notification-delivery.service.js';
import type {
  CommonGroundGeneratedEvent,
  CommonGroundUpdatedEvent,
} from '@reason-bridge/event-schemas/ai';

/**
 * Handles common ground analysis events and creates notifications
 */
@Injectable()
export class CommonGroundNotificationHandler {
  private readonly logger = new Logger(CommonGroundNotificationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  /**
   * Handle common-ground.generated event
   * Creates notification when initial common ground analysis is available
   */
  async handleCommonGroundGenerated(event: CommonGroundGeneratedEvent): Promise<void> {
    this.logger.log(`Processing common-ground.generated event for topic ${event.payload.topicId}`);

    try {
      // Fetch topic details to get title and participants
      const topic = await this.prisma.discussionTopic.findUnique({
        where: { id: event.payload.topicId },
        select: {
          id: true,
          title: true,
          creatorId: true,
          participantCount: true,
        },
      });

      if (!topic) {
        this.logger.warn(`Topic ${event.payload.topicId} not found, skipping notification`);
        return;
      }

      // Build notification content based on analysis results
      const { agreementZones, misunderstandings, genuineDisagreements, overallConsensusScore } =
        event.payload;

      const title = `Common ground analysis available for "${topic.title}"`;
      const body = this.buildGeneratedNotificationBody(
        agreementZones.length,
        misunderstandings.length,
        genuineDisagreements.length,
        overallConsensusScore,
      );

      // Get all topic participants (response authors) excluding the creator
      const otherParticipants = await this.getTopicParticipants(topic.id, topic.creatorId);

      // Include topic creator and all other participants
      const recipientIds = [topic.creatorId, ...otherParticipants];

      this.logger.debug(
        `Notifying ${recipientIds.length} participants (1 creator + ${otherParticipants.length} others)`,
      );

      const actionUrl = `/topics/${topic.id}/common-ground`;

      // Create notifications for all recipients
      const notificationIds = await this.createNotifications({
        recipientIds,
        type: 'common_ground',
        title,
        body,
        actionUrl,
        metadata: {
          topicId: topic.id,
          version: event.payload.version,
          agreementZoneCount: agreementZones.length,
          misunderstandingCount: misunderstandings.length,
          disagreementCount: genuineDisagreements.length,
          consensusScore: overallConsensusScore,
        },
      });

      this.logger.log(
        `Created ${recipientIds.length} notifications for common-ground.generated event`,
      );

      // Deliver notifications via email/push based on user preferences
      for (let i = 0; i < recipientIds.length; i++) {
        const userId = recipientIds[i]!;
        const notificationId = notificationIds[i];
        if (notificationId) {
          // Fire and forget - don't block on delivery
          this.deliveryService
            .deliverNotification(userId, {
              id: notificationId,
              type: 'common_ground',
              title,
              body,
              actionUrl,
            })
            .catch((err) => {
              this.logger.error(`Failed to deliver notification ${notificationId}: ${err}`);
            });
        }
      }

      // Emit WebSocket event for real-time delivery
      this.notificationGateway.emitCommonGroundGenerated(event);
    } catch (error) {
      this.logger.error(
        `Failed to handle common-ground.generated event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle common-ground.updated event
   * Creates notification when common ground analysis is updated with new insights
   */
  async handleCommonGroundUpdated(event: CommonGroundUpdatedEvent): Promise<void> {
    this.logger.log(`Processing common-ground.updated event for topic ${event.payload.topicId}`);

    try {
      // Fetch topic details
      const topic = await this.prisma.discussionTopic.findUnique({
        where: { id: event.payload.topicId },
        select: {
          id: true,
          title: true,
          creatorId: true,
          participantCount: true,
        },
      });

      if (!topic) {
        this.logger.warn(`Topic ${event.payload.topicId} not found, skipping notification`);
        return;
      }

      // Build notification content based on changes
      const { changes, newAnalysis } = event.payload;

      const title = `New insights in "${topic.title}"`;
      const body = this.buildUpdatedNotificationBody(changes);

      // Get all topic participants (response authors) excluding the creator
      const otherParticipants = await this.getTopicParticipants(topic.id, topic.creatorId);

      // Include topic creator and all other participants
      const recipientIds = [topic.creatorId, ...otherParticipants];

      this.logger.debug(
        `Notifying ${recipientIds.length} participants (1 creator + ${otherParticipants.length} others)`,
      );

      const actionUrl = `/topics/${topic.id}/common-ground`;

      // Create notifications for all recipients
      const notificationIds = await this.createNotifications({
        recipientIds,
        type: 'common_ground',
        title,
        body,
        actionUrl,
        metadata: {
          topicId: topic.id,
          previousVersion: event.payload.previousVersion,
          newVersion: event.payload.newVersion,
          changes: changes,
          consensusScore: newAnalysis.overallConsensusScore,
          reason: event.payload.reason,
        },
      });

      this.logger.log(
        `Created ${recipientIds.length} notifications for common-ground.updated event`,
      );

      // Deliver notifications via email/push based on user preferences
      for (let i = 0; i < recipientIds.length; i++) {
        const userId = recipientIds[i]!;
        const notificationId = notificationIds[i];
        if (notificationId) {
          // Fire and forget - don't block on delivery
          this.deliveryService
            .deliverNotification(userId, {
              id: notificationId,
              type: 'common_ground',
              title,
              body,
              actionUrl,
            })
            .catch((err) => {
              this.logger.error(`Failed to deliver notification ${notificationId}: ${err}`);
            });
        }
      }

      // Emit WebSocket event for real-time delivery
      this.notificationGateway.emitCommonGroundUpdated(event);
    } catch (error) {
      this.logger.error(
        `Failed to handle common-ground.updated event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get all unique participants for a topic by querying response authors
   * Excludes the topic creator since they're already included
   *
   * @param topicId - Topic ID to get participants for
   * @param excludeUserId - Optional user ID to exclude (typically the topic creator)
   * @returns Array of unique user IDs who have contributed responses
   */
  private async getTopicParticipants(topicId: string, excludeUserId?: string): Promise<string[]> {
    // Query distinct author IDs from responses for this topic
    const participants = await this.prisma.response.findMany({
      where: {
        topicId,
        ...(excludeUserId && { authorId: { not: excludeUserId } }),
      },
      select: { authorId: true },
      distinct: ['authorId'],
    });

    return participants.map((p) => p.authorId);
  }

  /**
   * Build notification body for initial common ground generation
   */
  private buildGeneratedNotificationBody(
    agreementCount: number,
    misunderstandingCount: number,
    disagreementCount: number,
    consensusScore?: number,
  ): string {
    const parts: string[] = [];

    if (agreementCount > 0) {
      parts.push(`${agreementCount} area${agreementCount === 1 ? '' : 's'} of agreement found`);
    }

    if (misunderstandingCount > 0) {
      parts.push(
        `${misunderstandingCount} misunderstanding${misunderstandingCount === 1 ? '' : 's'} identified`,
      );
    }

    if (disagreementCount > 0) {
      parts.push(
        `${disagreementCount} genuine disagreement${disagreementCount === 1 ? '' : 's'} analyzed`,
      );
    }

    if (consensusScore !== undefined) {
      const percentage = Math.round(consensusScore * 100);
      parts.push(`Overall consensus: ${percentage}%`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Common ground analysis completed';
  }

  /**
   * Build notification body for updated common ground analysis
   */
  private buildUpdatedNotificationBody(
    changes: CommonGroundUpdatedEvent['payload']['changes'],
  ): string {
    const highlights: string[] = [];

    // Highlight new agreements
    if (changes.newAgreementZones > 0) {
      highlights.push(
        `${changes.newAgreementZones} new agreement${changes.newAgreementZones === 1 ? '' : 's'}`,
      );
    }

    // Highlight resolved misunderstandings
    if (changes.resolvedMisunderstandings > 0) {
      highlights.push(
        `${changes.resolvedMisunderstandings} misunderstanding${changes.resolvedMisunderstandings === 1 ? '' : 's'} resolved`,
      );
    }

    // Highlight consensus change
    if (changes.consensusScoreChange !== undefined && changes.consensusScoreChange !== 0) {
      const change = changes.consensusScoreChange > 0 ? 'improved' : 'decreased';
      const percentage = Math.abs(Math.round(changes.consensusScoreChange * 100));
      highlights.push(`Consensus ${change} by ${percentage}%`);
    }

    // Highlight new misunderstandings if no positive changes
    if (highlights.length === 0 && changes.newMisunderstandings > 0) {
      highlights.push(
        `${changes.newMisunderstandings} new misunderstanding${changes.newMisunderstandings === 1 ? '' : 's'}`,
      );
    }

    // Highlight new disagreements if no other changes
    if (highlights.length === 0 && changes.newDisagreements > 0) {
      highlights.push(
        `${changes.newDisagreements} new disagreement${changes.newDisagreements === 1 ? '' : 's'}`,
      );
    }

    return highlights.length > 0 ? highlights.join(' • ') : 'Common ground analysis updated';
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
