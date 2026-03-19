/**
// @see https://github.com/steiner385/reasonbridge/issues/959
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationGateway } from '../gateways/notification.gateway.js';
import type { ResponseCreatedEvent } from '@reason-bridge/event-schemas/discussion';

/**
 * Regular expression to parse mentions in format: @[displayName](userId)
 */
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parsed mention from response content
 */
interface ParsedMention {
  displayName: string;
  userId: string;
}

/**
 * Handles response.created events and creates notifications for mentioned users
 */
@Injectable()
export class MentionNotificationHandler {
  private readonly logger = new Logger(MentionNotificationHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Parse mentions from response content
   * @param content - Response content containing @[displayName](userId) mentions
   * @returns Array of parsed mentions
   */
  parseMentions(content: string): ParsedMention[] {
    const mentions: ParsedMention[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state for fresh matching
    MENTION_REGEX.lastIndex = 0;

    while ((match = MENTION_REGEX.exec(content)) !== null) {
      // Non-null assertions are safe: regex guarantees these capture groups exist when match succeeds
      mentions.push({
        displayName: match[1]!,
        userId: match[2]!,
      });
    }

    return mentions;
  }

  /**
   * Handle response.created event
   * Creates notifications for users mentioned in the response
   */
  async handleResponseCreated(event: ResponseCreatedEvent): Promise<void> {
    const { responseId, topicId, authorId, content, createdAt } = event.payload;

    // Parse mentions from content
    const mentions = this.parseMentions(content);

    if (mentions.length === 0) {
      this.logger.debug(`No mentions found in response ${responseId}`);
      return;
    }

    this.logger.log(`Processing ${mentions.length} mention(s) in response ${responseId}`);

    try {
      // Get unique mentioned user IDs, excluding the author
      const mentionedUserIds = [...new Set(mentions.map((m) => m.userId))].filter(
        (userId) => userId !== authorId,
      );

      if (mentionedUserIds.length === 0) {
        this.logger.debug(`All mentions are self-mentions, skipping notifications`);
        return;
      }

      // Fetch author details
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: {
          id: true,
          displayName: true,
        },
      });

      if (!author) {
        this.logger.warn(`Author ${authorId} not found, skipping mention notifications`);
        return;
      }

      // Fetch topic details for the notification
      const topic = await this.prisma.discussionTopic.findUnique({
        where: { id: topicId },
        select: {
          id: true,
          title: true,
          slug: true,
        },
      });

      if (!topic) {
        this.logger.warn(`Topic ${topicId} not found, skipping mention notifications`);
        return;
      }

      // Verify mentioned users exist and are active
      const validUsers = await this.prisma.user.findMany({
        where: {
          id: { in: mentionedUserIds },
          accountStatus: 'ACTIVE',
        },
        select: { id: true },
      });

      const validUserIds = validUsers.map((u) => u.id);

      if (validUserIds.length === 0) {
        this.logger.debug(`No valid mentioned users found`);
        return;
      }

      const authorName = author.displayName || 'Someone';
      const title = 'You were mentioned';
      const body = `${authorName} mentioned you in "${topic.title}"`;
      const actionUrl = `/topics/${topic.slug}?response=${responseId}`;

      // Create notifications for each mentioned user
      await this.createNotifications({
        recipientIds: validUserIds,
        type: 'mention',
        title,
        body,
        actionUrl,
        metadata: {
          responseId,
          topicId,
          topicTitle: topic.title,
          topicSlug: topic.slug,
          authorId,
          authorName,
          mentionedAt: createdAt,
        },
      });

      this.logger.log(`Created mention notifications for ${validUserIds.length} user(s)`);

      // Emit WebSocket events for real-time delivery
      for (const userId of validUserIds) {
        this.notificationGateway.emitToUser(userId, 'notification:mention', {
          type: 'mention',
          title,
          body,
          responseId,
          topicId,
          topicTitle: topic.title,
          topicSlug: topic.slug,
          authorId,
          authorName,
          actionUrl,
          timestamp: createdAt,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle mentions in response ${responseId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Create notification records in the database
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

    this.logger.log(`Creating ${recipientIds.length} notification(s) of type "${type}"`);

    await this.prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        actionUrl,
        metadata: metadata as Prisma.InputJsonValue,
        isRead: false,
      })),
    });
  }
}
