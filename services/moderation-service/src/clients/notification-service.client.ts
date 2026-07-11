/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getServiceUrl } from '@reason-bridge/common';
import { CLIENT_TIMEOUTS } from '../constants/index.js';

/**
 * Single SLA breach item for notification
 */
export interface SlaBreachItem {
  queueId: string;
  priority: string;
  ageMinutes: number;
  slaMinutes: number;
  breachPercent: number;
  responseId: string;
  topicId: string;
}

/**
 * Response from SLA breach notification endpoint
 */
export interface SlaBreachNotificationResponse {
  success: boolean;
  notificationsSent: number;
  broadcastSent: boolean;
}

/**
 * Payload for a moderation-driven user notification (action taken, appeal
 * decided, or cooling-off prompt). Provide either `userId` or `userIds`.
 */
export interface ModerationNotificationPayload {
  userId?: string;
  userIds?: string[];
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response from the moderation notification endpoint.
 */
export interface ModerationNotificationResponse {
  success: boolean;
  notificationsSent: number;
}

/**
 * HTTP client for sending notifications to notification-service.
 *
 * Uses fire-and-forget pattern for resilience - failures are logged but don't
 * block the calling operation. This ensures the moderation-service remains
 * responsive even when notification-service is unavailable.
 *
 * @remarks
 * - trySendSlaBreachNotification: Notifies moderators about SLA breaches (fire-and-forget)
 * - All errors are logged but not thrown
 *
 * @example
 * ```typescript
 * // Send SLA breach notification (fire-and-forget)
 * const result = await notificationClient.trySendSlaBreachNotification([
 *   {
 *     queueId: 'queue-123',
 *     priority: 'URGENT',
 *     ageMinutes: 90,
 *     slaMinutes: 60,
 *     breachPercent: 150,
 *     responseId: 'resp-456',
 *     topicId: 'topic-789',
 *   },
 * ]);
 * ```
 */
@Injectable()
export class NotificationServiceClient {
  private readonly logger = new Logger(NotificationServiceClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly internalApiKey: string | undefined;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.baseUrl = process.env['NOTIFICATION_SERVICE_URL'] || getServiceUrl('NOTIFICATION_SERVICE');
    this.timeoutMs = parseInt(
      process.env['NOTIFICATION_SERVICE_TIMEOUT_MS'] || String(CLIENT_TIMEOUTS.DEFAULT_MS),
      10,
    );
    this.internalApiKey =
      this.configService?.get<string>('INTERNAL_API_KEY') ?? process.env['INTERNAL_API_KEY'];
  }

  /**
   * Build headers for internal requests
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.internalApiKey) {
      headers['Authorization'] = `ApiKey ${this.internalApiKey}`;
    }

    return headers;
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
   * Send SLA breach notification to notification-service.
   *
   * This triggers:
   * 1. Creation of notifications for all moderators
   * 2. WebSocket broadcast to moderation:actions room
   *
   * @param breaches - Array of SLA breach items
   * @returns Response with notification counts, or null on error
   *
   * @remarks
   * Fire-and-forget pattern: logs errors but doesn't throw. Named with "try"
   * prefix to indicate this behavior.
   */
  async trySendSlaBreachNotification(
    breaches: SlaBreachItem[],
  ): Promise<SlaBreachNotificationResponse | null> {
    if (breaches.length === 0) {
      return { success: true, notificationsSent: 0, broadcastSent: false };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/internal/sla-breach`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          breaches,
          checkedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to send SLA breach notification: ${response.status}`);
        return null;
      }

      const result = (await response.json()) as SlaBreachNotificationResponse;
      this.logger.log(
        `SLA breach notification sent: ${result.notificationsSent} notifications, broadcast: ${result.broadcastSent}`,
      );
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('Request to send SLA breach notification timed out');
      } else {
        this.logger.warn(`Error sending SLA breach notification: ${(error as Error).message}`);
      }
      return null;
    }
  }

  /**
   * Send a moderation-driven notification to the affected user(s).
   *
   * Used to notify a user when a moderation action is taken against them, when
   * their appeal is decided, or when a cooling-off prompt is issued.
   *
   * @param payload - The notification content and recipient(s)
   * @returns Response with the number of notifications created, or null on error
   *
   * @remarks
   * Fire-and-forget pattern: logs errors but doesn't throw. Named with "try"
   * prefix to indicate this behaviour, so a notification-service outage never
   * blocks the moderation action or appeal decision itself.
   */
  async trySendModerationNotification(
    payload: ModerationNotificationPayload,
  ): Promise<ModerationNotificationResponse | null> {
    const recipients = payload.userIds ?? (payload.userId ? [payload.userId] : []);
    if (recipients.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/internal/moderation-notification`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        this.logger.warn(`Failed to send moderation notification: ${response.status}`);
        return null;
      }

      const result = (await response.json()) as ModerationNotificationResponse;
      this.logger.log(`Moderation notification sent: ${result.notificationsSent} notification(s)`);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('Request to send moderation notification timed out');
      } else {
        this.logger.warn(`Error sending moderation notification: ${(error as Error).message}`);
      }
      return null;
    }
  }
}
