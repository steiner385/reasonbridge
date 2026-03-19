/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseBoolPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { JwtAuthGuard, CurrentUser, type JwtPayload } from '../auth/index.js';
import type { Notification } from '@prisma/client';

/**
 * Response DTO for notification list
 */
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

/**
 * Response DTO for mark all as read
 */
export interface MarkAllReadResponse {
  count: number;
  message: string;
}

/**
 * Controller for user notification management
 *
 * Provides REST endpoints for:
 * - Listing notifications with pagination and filtering
 * - Marking notifications as read (single or all)
 * - Deleting notifications
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Get user's notifications with optional filtering
   *
   * @param user - Authenticated user from JWT
   * @param isRead - Filter by read status (optional)
   * @param type - Filter by notification type (optional)
   * @param limit - Maximum items to return (default: 20, max: 100)
   * @param offset - Offset for pagination (default: 0)
   */
  @Get()
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('isRead', new ParseBoolPipe({ optional: true })) isRead?: boolean,
    @Query('type') type?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<NotificationListResponse> {
    const userId = user.userId ?? user.sub;
    const effectiveLimit = Math.min(limit ?? 20, 100);

    return this.notificationService.getNotifications({
      userId,
      isRead,
      type,
      limit: effectiveLimit,
      offset: offset ?? 0,
    });
  }

  /**
   * Get a single notification by ID
   */
  @Get(':id')
  async getNotification(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Notification> {
    const userId = user.userId ?? user.sub;
    return this.notificationService.getNotificationById(id, userId);
  }

  /**
   * Get unread notification count
   */
  @Get('unread/count')
  async getUnreadCount(@CurrentUser() user: JwtPayload): Promise<{ count: number }> {
    const userId = user.userId ?? user.sub;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Notification> {
    const userId = user.userId ?? user.sub;
    return this.notificationService.markAsRead(id, userId);
  }

  /**
   * Mark all notifications as read
   */
  @Patch('mark-all-read')
  async markAllAsRead(@CurrentUser() user: JwtPayload): Promise<MarkAllReadResponse> {
    const userId = user.userId ?? user.sub;
    const result = await this.notificationService.markAllAsRead(userId);
    return {
      count: result.count,
      message: `Marked ${result.count} notifications as read`,
    };
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const userId = user.userId ?? user.sub;
    await this.notificationService.deleteNotification(id, userId);
  }

  /**
   * Delete all read notifications (cleanup)
   */
  @Delete('read')
  async deleteReadNotifications(@CurrentUser() user: JwtPayload): Promise<{ count: number }> {
    const userId = user.userId ?? user.sub;
    return this.notificationService.deleteReadNotifications(userId);
  }
}
