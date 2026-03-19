/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Notification } from '@prisma/client';

export interface NotificationListParams {
  userId: string;
  isRead?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationListResult {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service for managing user notifications
 *
 * Handles CRUD operations for in-app notifications stored in the database.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get notifications for a user with pagination and filtering
   */
  async getNotifications(params: NotificationListParams): Promise<NotificationListResult> {
    const { userId, isRead, type, limit = 20, offset = 0 } = params;

    const where: Record<string, unknown> = { userId };

    if (isRead !== undefined) {
      where['isRead'] = isRead;
    }

    if (type) {
      where['type'] = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return notification;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    // Verify ownership
    await this.getNotificationById(id, userId);

    const notification = await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.debug(`Marked notification ${id} as read for user ${userId}`);

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.debug(`Marked ${result.count} notifications as read for user ${userId}`);

    return { count: result.count };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Create a new notification
   *
   * This is typically called by notification handlers, not directly by users.
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        actionUrl: dto.actionUrl,
        metadata: dto.metadata as object | undefined,
      },
    });

    this.logger.log(`Created notification ${notification.id} for user ${dto.userId}`);

    return notification;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string): Promise<void> {
    // Verify ownership
    await this.getNotificationById(id, userId);

    await this.prisma.notification.delete({
      where: { id },
    });

    this.logger.debug(`Deleted notification ${id} for user ${userId}`);
  }

  /**
   * Delete all read notifications for a user (cleanup)
   */
  async deleteReadNotifications(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    this.logger.debug(`Deleted ${result.count} read notifications for user ${userId}`);

    return { count: result.count };
  }
}
