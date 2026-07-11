/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, Logger, UseGuards, BadRequestException } from '@nestjs/common';
import { InternalApiKeyGuard } from '@reason-bridge/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Request payload for creating moderation-related notifications.
 *
 * Either a single `userId` or a list of `userIds` may be supplied; both forms
 * are normalised to a recipient list.
 */
export interface ModerationNotificationDto {
  userId?: string;
  userIds?: string[];
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response DTO for moderation notification creation.
 */
export interface ModerationNotificationResponse {
  success: boolean;
  notificationsSent: number;
}

/**
 * Internal controller for moderation-driven notifications.
 *
 * @remarks
 * Called by moderation-service to notify the affected user when a moderation
 * action is taken, an appeal is decided, or a cooling-off prompt is issued.
 * Previously moderation-service had no way to reach the notification pipeline
 * for a specific user (only the SLA-breach moderator broadcast existed), so
 * these user-facing notifications were silently dropped.
 *
 * Protected by API key for service-to-service communication only.
 */
@Controller('internal/moderation-notification')
@UseGuards(InternalApiKeyGuard)
export class InternalModerationController {
  private readonly logger = new Logger(InternalModerationController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification for one or more affected users.
   *
   * @param dto - The notification payload
   * @returns The number of notifications created
   * @throws {BadRequestException} When required fields are missing
   */
  @Post()
  async createModerationNotification(
    @Body() dto: ModerationNotificationDto,
  ): Promise<ModerationNotificationResponse> {
    if (!dto.type || !dto.title || !dto.body) {
      throw new BadRequestException('type, title, and body are required');
    }

    const userIds = dto.userIds ?? (dto.userId ? [dto.userId] : []);
    if (userIds.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    // metadata is round-tripped through JSON to guarantee plain-JSON compatibility with Prisma's JsonB column.
    const metadata =
      dto.metadata !== undefined ? JSON.parse(JSON.stringify(dto.metadata)) : undefined;

    const created = await Promise.all(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            type: dto.type,
            title: dto.title,
            body: dto.body,
            actionUrl: dto.actionUrl ?? null,
            ...(metadata !== undefined && { metadata }),
          },
        }),
      ),
    );

    this.logger.log(`Created ${created.length} moderation notification(s) of type "${dto.type}"`);

    return { success: true, notificationsSent: created.length };
  }
}
