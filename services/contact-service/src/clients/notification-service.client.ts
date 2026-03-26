/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

/**
 * Notification types for invitation events.
 */
export type InvitationNotificationType = 'TOPIC_INVITATION' | 'INVITATION_ACCEPTED';

/**
 * Parameters for sending an invitation notification.
 */
export interface InvitationNotificationParams {
  recipientUserId: string;
  inviterName: string;
  topicTitle: string;
  invitationId: string;
  message?: string;
}

/**
 * Parameters for sending an invitation accepted notification.
 */
export interface InvitationAcceptedNotificationParams {
  inviterUserId: string;
  accepterName: string;
  topicTitle: string;
}

/**
 * HTTP client for sending notifications to notification-service.
 *
 * Uses fire-and-forget pattern for resilience - failures are logged but don't
 * block the calling operation. This ensures the contact-service remains
 * responsive even when notification-service is unavailable.
 *
 * @remarks
 * - sendInvitationNotification: Notifies a user they've been invited to a topic
 * - sendInvitationAcceptedNotification: Notifies the inviter that their invitation was accepted
 * - All errors are logged but not thrown
 *
 * @example
 * ```typescript
 * // Send invitation notification
 * await notificationClient.sendInvitationNotification({
 *   recipientUserId: 'user-123',
 *   inviterName: 'John Doe',
 *   topicTitle: 'Climate Discussion',
 *   invitationId: 'inv-456',
 *   message: 'Join our discussion!',
 * });
 *
 * // Send acceptance notification
 * await notificationClient.sendInvitationAcceptedNotification({
 *   inviterUserId: 'user-789',
 *   accepterName: 'Jane Smith',
 *   topicTitle: 'Climate Discussion',
 * });
 * ```
 */
/** Default timeout for HTTP requests in milliseconds */
const DEFAULT_TIMEOUT_MS = 30000;

@Injectable()
export class NotificationServiceClient {
  private readonly logger = new Logger(NotificationServiceClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env['NOTIFICATION_SERVICE_URL'] || getServiceUrl('NOTIFICATION_SERVICE');
    this.timeoutMs = parseInt(
      process.env['NOTIFICATION_SERVICE_TIMEOUT_MS'] || String(DEFAULT_TIMEOUT_MS),
      10,
    );
  }

  /**
   * Fetch with timeout using AbortController
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send notification for a new topic invitation.
   * Fire-and-forget pattern: logs errors but doesn't throw.
   *
   * @param params - Invitation notification parameters
   */
  async sendInvitationNotification(params: InvitationNotificationParams): Promise<void> {
    const { recipientUserId, inviterName, topicTitle, invitationId, message } = params;

    const payload = {
      userId: recipientUserId,
      type: 'TOPIC_INVITATION' as InvitationNotificationType,
      title: `${inviterName} has invited you to discuss "${topicTitle}"`,
      body: message || `You've been invited to join a discussion on "${topicTitle}".`,
      metadata: {
        invitationId,
        inviterName,
        topicTitle,
        ...(message !== undefined && { message }),
      },
    };

    await this.sendNotification(payload);
  }

  /**
   * Send notification when an invitation is accepted.
   * Fire-and-forget pattern: logs errors but doesn't throw.
   *
   * @param params - Acceptance notification parameters
   */
  async sendInvitationAcceptedNotification(
    params: InvitationAcceptedNotificationParams,
  ): Promise<void> {
    const { inviterUserId, accepterName, topicTitle } = params;

    const payload = {
      userId: inviterUserId,
      type: 'INVITATION_ACCEPTED' as InvitationNotificationType,
      title: `${accepterName} accepted your invitation to "${topicTitle}"`,
      body: `${accepterName} has joined the discussion on "${topicTitle}".`,
      metadata: {
        accepterName,
        topicTitle,
      },
    };

    await this.sendNotification(payload);
  }

  /**
   * Internal method to send notification to notification-service.
   * Implements fire-and-forget pattern.
   */
  private async sendNotification(payload: {
    userId: string;
    type: InvitationNotificationType;
    title: string;
    body: string;
    metadata: Record<string, string | undefined>;
  }): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to send ${payload.type} notification to user ${payload.userId}: ${response.status}`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Request to send ${payload.type} notification timed out`);
      } else {
        this.logger.warn(`Error sending ${payload.type} notification: ${(error as Error).message}`);
      }
    }
  }
}
