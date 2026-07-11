/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { redactEmail } from '@reason-bridge/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { PushService, type PushPayload } from './push.service.js';
import { generateNotificationEmail, type NotificationEmailData } from '../templates/index.js';

/**
 * Notification data for delivery
 */
export interface NotificationForDelivery {
  /** Notification ID in database */
  id: string;
  /** Notification type */
  type: string;
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Action URL for the notification */
  actionUrl?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Delivery result for a single channel
 */
export interface ChannelDeliveryResult {
  channel: 'EMAIL' | 'PUSH';
  success: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Result of delivering a notification
 */
export interface DeliveryResult {
  notificationId: string;
  userId: string;
  channels: ChannelDeliveryResult[];
}

/**
 * Service for delivering notifications via email and push channels.
 *
 * @remarks
 * This service orchestrates notification delivery across multiple channels:
 * - Checks user notification preferences (notifyByEmail, notifyByPush)
 * - Sends email via AWS SES if email notifications are enabled
 * - Sends push via FCM if push notifications are enabled and user has FCM token
 * - Logs all delivery attempts to NotificationLog for auditing
 *
 * The service respects user preferences and gracefully handles missing
 * configuration (e.g., no FCM token, FCM not configured).
 */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
  ) {
    this.baseUrl = process.env['APP_BASE_URL'] || 'https://reasonbridge.org';
  }

  /**
   * Deliver a notification to a user via their preferred channels.
   *
   * @param userId - The user to deliver the notification to
   * @param notification - The notification data
   * @returns Delivery results for each attempted channel
   */
  async deliverNotification(
    userId: string,
    notification: NotificationForDelivery,
  ): Promise<DeliveryResult> {
    const results: ChannelDeliveryResult[] = [];

    try {
      // Fetch user preferences and contact info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          notifyByEmail: true,
          notifyByPush: true,
          fcmToken: true,
          accountStatus: true,
        },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, skipping delivery`);
        return { notificationId: notification.id, userId, channels: [] };
      }

      if (user.accountStatus !== 'ACTIVE') {
        this.logger.debug(`User ${userId} is not active, skipping delivery`);
        return { notificationId: notification.id, userId, channels: [] };
      }

      // Deliver via email if enabled
      if (user.notifyByEmail && user.email) {
        const emailResult = await this.deliverEmail(user, notification);
        results.push(emailResult);
      }

      // Deliver via push if enabled and token exists
      if (user.notifyByPush && user.fcmToken) {
        const pushResult = await this.deliverPush(user.fcmToken, notification);
        results.push(pushResult);
      }

      this.logger.log(
        `Delivered notification ${notification.id} to user ${userId} via ${results.length} channel(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to deliver notification ${notification.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      notificationId: notification.id,
      userId,
      channels: results,
    };
  }

  /**
   * Deliver notification via email.
   */
  private async deliverEmail(
    user: { id: string; email: string; displayName: string | null },
    notification: NotificationForDelivery,
  ): Promise<ChannelDeliveryResult> {
    const logId = await this.createDeliveryLog({
      notificationId: notification.id,
      channel: 'EMAIL',
      recipientEmail: user.email,
    });

    try {
      const emailData: NotificationEmailData = {
        recipientName: user.displayName || 'there',
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl ? `${this.baseUrl}${notification.actionUrl}` : undefined,
        type: this.mapNotificationType(notification.type),
        baseUrl: this.baseUrl,
      };

      const email = generateNotificationEmail(emailData);

      await this.emailService.sendDigestEmail({
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      await this.updateDeliveryLog(logId, {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });

      this.logger.debug(
        `Email delivered to ${redactEmail(user.email)} for notification ${notification.id}`,
      );

      return {
        channel: 'EMAIL',
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.updateDeliveryLog(logId, {
        status: 'FAILED',
        errorMessage,
      });

      this.logger.error(`Email delivery failed for ${redactEmail(user.email)}: ${errorMessage}`);

      return {
        channel: 'EMAIL',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Deliver notification via push.
   */
  private async deliverPush(
    fcmToken: string,
    notification: NotificationForDelivery,
  ): Promise<ChannelDeliveryResult> {
    if (!this.pushService.isAvailable()) {
      this.logger.debug('Push notifications not configured, skipping');
      return {
        channel: 'PUSH',
        success: false,
        error: 'Push notifications not configured',
      };
    }

    const logId = await this.createDeliveryLog({
      notificationId: notification.id,
      channel: 'PUSH',
      metadata: { fcmToken: fcmToken.substring(0, 20) + '...' },
    });

    try {
      const payload: PushPayload = {
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl,
        priority: 'normal',
        data: {
          notificationId: notification.id,
          type: notification.type,
        },
      };

      const result = await this.pushService.sendPush(fcmToken, payload);

      if (result.success) {
        await this.updateDeliveryLog(logId, {
          status: 'DELIVERED',
          externalId: result.messageId,
          deliveredAt: new Date(),
        });

        this.logger.debug(`Push delivered for notification ${notification.id}`);

        return {
          channel: 'PUSH',
          success: true,
          externalId: result.messageId,
        };
      } else {
        await this.updateDeliveryLog(logId, {
          status: 'FAILED',
          errorMessage: result.error,
        });

        return {
          channel: 'PUSH',
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.updateDeliveryLog(logId, {
        status: 'FAILED',
        errorMessage,
      });

      this.logger.error(`Push delivery failed: ${errorMessage}`);

      return {
        channel: 'PUSH',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Map notification type string to template type.
   */
  private mapNotificationType(
    type: string,
  ): 'mention' | 'follow' | 'common_ground' | 'moderation' | 'general' {
    switch (type) {
      case 'mention':
        return 'mention';
      case 'follow':
        return 'follow';
      case 'common_ground':
        return 'common_ground';
      case 'moderation':
      case 'moderation_action':
        return 'moderation';
      default:
        return 'general';
    }
  }

  /**
   * Create a delivery log entry.
   */
  private async createDeliveryLog(params: {
    notificationId: string;
    channel: 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
    recipientEmail?: string;
    recipientPhone?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const log = await this.prisma.notificationLog.create({
      data: {
        notificationId: params.notificationId,
        channel: params.channel,
        status: 'PENDING',
        recipientEmail: params.recipientEmail,
        recipientPhone: params.recipientPhone,
        metadata: params.metadata as Prisma.InputJsonValue,
        attemptedAt: new Date(),
      },
    });

    return log.id;
  }

  /**
   * Update a delivery log entry.
   */
  private async updateDeliveryLog(
    logId: string,
    update: {
      status: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
      externalId?: string;
      errorMessage?: string;
      deliveredAt?: Date;
    },
  ): Promise<void> {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: update,
    });
  }
}
