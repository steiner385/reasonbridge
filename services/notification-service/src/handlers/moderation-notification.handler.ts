/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationGateway } from '../gateways/notification.gateway.js';
import type {
  ModerationActionRequestedEvent,
  UserTrustUpdatedEvent,
  SafetyReportCreatedEvent,
} from '@reason-bridge/event-schemas/moderation';

/**
 * Handles moderation service events and creates notifications
 */
@Injectable()
export class ModerationNotificationHandler {
  private readonly logger = new Logger(ModerationNotificationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Handle moderation.action.requested event
   * Creates notification when AI recommends a moderation action
   */
  async handleModerationActionRequested(event: ModerationActionRequestedEvent): Promise<void> {
    this.logger.log(
      `Processing moderation.action.requested event for ${event.payload.targetType} ${event.payload.targetId}`,
    );

    try {
      // Fetch target details based on type
      let targetTitle = '';
      let affectedUserId = '';

      if (event.payload.targetType === 'response') {
        const response = await this.prisma.response.findUnique({
          where: { id: event.payload.targetId },
          select: {
            id: true,
            authorId: true,
            topicId: true,
            content: true,
          },
        });

        if (!response) {
          this.logger.warn(`Response ${event.payload.targetId} not found, skipping notification`);
          return;
        }

        targetTitle =
          response.content.substring(0, 100) + (response.content.length > 100 ? '...' : '');
        affectedUserId = response.authorId;
      } else if (event.payload.targetType === 'user') {
        const user = await this.prisma.user.findUnique({
          where: { id: event.payload.targetId },
          select: { id: true, displayName: true },
        });

        if (!user) {
          this.logger.warn(`User ${event.payload.targetId} not found, skipping notification`);
          return;
        }

        targetTitle = user.displayName ?? `User ${user.id}`;
        affectedUserId = user.id;
      } else if (event.payload.targetType === 'topic') {
        const topic = await this.prisma.discussionTopic.findUnique({
          where: { id: event.payload.targetId },
          select: { id: true, title: true },
        });

        if (!topic) {
          this.logger.warn(`Topic ${event.payload.targetId} not found, skipping notification`);
          return;
        }

        targetTitle = topic.title;
        // For topics, notify the creator (or moderators in future)
        affectedUserId = event.payload.targetId;
      }

      // Build notification content
      const title = this.buildModerationActionTitle(
        event.payload.actionType,
        event.payload.severity,
      );
      const body = this.buildModerationActionBody(
        event.payload.actionType,
        event.payload.severity,
        targetTitle,
      );

      // For moderation actions, notify moderators/admins
      // TODO: Query for moderators when roles are implemented
      // For now, we'll emit to a moderation channel via WebSocket
      const actionUrl = `/moderation/action/${event.payload.targetId}`;

      // Create notifications
      await this.createNotifications({
        recipientIds: [], // Moderators will be added once role system is implemented
        type: 'moderation_action',
        title,
        body,
        actionUrl,
        metadata: {
          targetType: event.payload.targetType,
          targetId: event.payload.targetId,
          actionType: event.payload.actionType,
          severity: event.payload.severity,
          aiConfidence: event.payload.aiConfidence,
          reasoning: event.payload.reasoning,
          violationContext: event.payload.violationContext,
        },
      });

      this.logger.log(
        `Created moderation action notification for ${event.payload.targetType} ${event.payload.targetId}`,
      );

      // Emit WebSocket event for real-time delivery to moderators
      this.notificationGateway.emitModerationActionRequested(event);
    } catch (error) {
      this.logger.error(
        `Failed to handle moderation.action.requested event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle user.trust.updated event
   * Creates notification when a user's trust scores change
   */
  async handleUserTrustUpdated(event: UserTrustUpdatedEvent): Promise<void> {
    this.logger.log(`Processing user.trust.updated event for user ${event.payload.userId}`);

    try {
      // Fetch user details
      const user = await this.prisma.user.findUnique({
        where: { id: event.payload.userId },
        select: { id: true, displayName: true },
      });

      if (!user) {
        this.logger.warn(`User ${event.payload.userId} not found, skipping notification`);
        return;
      }

      // Build notification content based on trust change
      const title = this.buildTrustUpdateTitle(event.payload.reason);
      const body = this.buildTrustUpdateBody(
        event.payload.previousScores,
        event.payload.newScores,
        event.payload.reason,
      );

      // Notify the affected user
      const recipientIds = [event.payload.userId];
      const actionUrl = `/profile/${event.payload.userId}/trust`;

      // Create notifications
      await this.createNotifications({
        recipientIds,
        type: 'trust_update',
        title,
        body,
        actionUrl,
        metadata: {
          userId: event.payload.userId,
          reason: event.payload.reason,
          previousScores: event.payload.previousScores,
          newScores: event.payload.newScores,
          moderationActionId: event.payload.moderationActionId,
        },
      });

      this.logger.log(
        `Created ${recipientIds.length} trust update notification(s) for user ${event.payload.userId}`,
      );

      // Emit WebSocket event for real-time delivery
      this.notificationGateway.emitUserTrustUpdated(event);
    } catch (error) {
      this.logger.error(
        `Failed to handle user.trust.updated event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Handle safety.report.created event
   * Creates urgent notification when a child submits a panic button report
   *
   * @remarks
   * This handler prioritizes URGENT and HIGH priority reports to ensure
   * moderators are immediately alerted to potential child safety incidents.
   * Reports with STRANGER_CONTACT or PERSONAL_QUESTIONS reasons are
   * automatically marked as URGENT.
   */
  async handleSafetyReportCreated(event: SafetyReportCreatedEvent): Promise<void> {
    this.logger.log(
      `Processing safety.report.created event: report ${event.payload.reportId} (priority: ${event.payload.priority})`,
    );

    try {
      // Fetch reporter details
      const reporter = await this.prisma.user.findUnique({
        where: { id: event.payload.reporterId },
        select: { id: true, displayName: true },
      });

      if (!reporter) {
        this.logger.warn(`Reporter ${event.payload.reporterId} not found, still processing report`);
      }

      // Build notification content based on priority and reason
      const title = this.buildSafetyReportTitle(event.payload.priority, event.payload.reason);
      const body = this.buildSafetyReportBody(
        event.payload.reason,
        event.payload.priority,
        event.payload.additionalInfo,
      );

      // For safety reports, notify all moderators with child-safety permissions
      // TODO: Query for moderators with child-safety role when roles are implemented
      const actionUrl = `/moderation/safety-reports/${event.payload.reportId}`;

      // Create notifications
      await this.createNotifications({
        recipientIds: [], // Moderators will be added once role system is implemented
        type: 'safety_report',
        title,
        body,
        actionUrl,
        metadata: {
          reportId: event.payload.reportId,
          reporterId: event.payload.reporterId,
          reason: event.payload.reason,
          priority: event.payload.priority,
          additionalInfo: event.payload.additionalInfo,
          contextUrl: event.payload.contextUrl,
          contextTopicId: event.payload.contextTopicId,
          contextResponseId: event.payload.contextResponseId,
        },
      });

      this.logger.log(
        `Created safety report notification for report ${event.payload.reportId} (priority: ${event.payload.priority})`,
      );

      // Emit WebSocket event for real-time delivery to moderators
      this.notificationGateway.emitSafetyReportCreated(event);
    } catch (error) {
      this.logger.error(
        `Failed to handle safety.report.created event: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Build notification title for safety report
   */
  private buildSafetyReportTitle(priority: string, reason: string): string {
    const priorityEmoji = priority === 'URGENT' ? '[URGENT]' : priority === 'HIGH' ? '[HIGH]' : '';
    const reasonLabels: Record<string, string> = {
      UNCOMFORTABLE: 'Child Uncomfortable',
      SCARY_CONTENT: 'Scary Content Report',
      STRANGER_CONTACT: 'Stranger Contact Alert',
      PERSONAL_QUESTIONS: 'Personal Questions Alert',
      OTHER: 'Safety Concern',
    };

    const reasonLabel = reasonLabels[reason] || 'Safety Report';
    return `${priorityEmoji} Panic Button: ${reasonLabel}`.trim();
  }

  /**
   * Build notification body for safety report
   */
  private buildSafetyReportBody(reason: string, priority: string, additionalInfo?: string): string {
    const reasonDescriptions: Record<string, string> = {
      UNCOMFORTABLE: 'A child reported feeling uncomfortable.',
      SCARY_CONTENT: 'A child reported encountering scary content.',
      STRANGER_CONTACT: 'A child reported unwanted contact from a stranger.',
      PERSONAL_QUESTIONS: 'A child reported being asked personal questions.',
      OTHER: 'A child submitted a safety report.',
    };

    let body = reasonDescriptions[reason] || 'A safety report was submitted.';
    body += ` Priority: ${priority}.`;

    if (additionalInfo) {
      body += ` Details: "${additionalInfo.substring(0, 100)}${additionalInfo.length > 100 ? '...' : ''}"`;
    }

    return body;
  }

  /**
   * Build notification title for moderation action
   */
  private buildModerationActionTitle(actionType: string, severity: string): string {
    const actionLabel = actionType.charAt(0).toUpperCase() + actionType.slice(1);
    const severityLabel = severity === 'consequential' ? 'Consequential' : 'Educational';
    return `${severityLabel} Moderation: ${actionLabel}`;
  }

  /**
   * Build notification body for moderation action
   */
  private buildModerationActionBody(
    actionType: string,
    severity: string,
    targetTitle: string,
  ): string {
    const action = actionType.toLowerCase();

    const actionDescriptions: Record<string, string> = {
      educate: 'An educational resource has been suggested',
      warn: 'A warning has been issued',
      hide: 'Content has been hidden',
      remove: 'Content has been removed',
      suspend: 'Account has been suspended',
      ban: 'Account has been banned',
    };

    const description = actionDescriptions[action] || 'A moderation action has been taken';
    const prefix = targetTitle ? `For: ${targetTitle}. ` : '';

    return `${prefix}${description}. Severity: ${severity === 'consequential' ? 'consequential' : 'non-punitive'}.`;
  }

  /**
   * Build notification title for trust update
   */
  private buildTrustUpdateTitle(reason: string): string {
    const reasonLabels: Record<string, string> = {
      moderation_action: 'Trust Score Impacted',
      positive_contribution: 'Trust Score Increased',
      appeal_upheld: 'Appeal Successful',
      periodic_recalculation: 'Trust Score Updated',
    };

    return reasonLabels[reason] || 'Trust Score Updated';
  }

  /**
   * Build notification body for trust update
   */
  private buildTrustUpdateBody(previousScores: any, newScores: any, reason: string): string {
    const changes = {
      ability: newScores.ability - previousScores.ability,
      benevolence: newScores.benevolence - previousScores.benevolence,
      integrity: newScores.integrity - previousScores.integrity,
    };

    const reasonDescriptions: Record<string, string> = {
      moderation_action: 'due to a moderation action',
      positive_contribution: 'due to positive contributions',
      appeal_upheld: 'because your appeal was upheld',
      periodic_recalculation: 'based on periodic recalculation',
    };

    const description = reasonDescriptions[reason] || '';

    // Show largest change
    const [changedScore, changeAmount] = Object.entries(changes).reduce(
      (max, [key, value]: [string, number]) => {
        const absVal = Math.abs(value);
        return absVal > Math.abs(max[1]) ? [key, value] : max;
      },
      ['', 0],
    );

    if (changeAmount !== 0) {
      const direction = changeAmount > 0 ? 'improved' : 'decreased';
      const scoreLabel = changedScore.charAt(0).toUpperCase() + changedScore.slice(1);
      return `Your ${scoreLabel} trust score ${direction} by ${Math.abs(changeAmount).toFixed(2)} ${description}.`;
    }

    return `Your trust scores have been recalculated ${description}.`;
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
    metadata: Record<string, any>;
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

    // WebSocket events are now emitted by calling handler methods
  }
}
