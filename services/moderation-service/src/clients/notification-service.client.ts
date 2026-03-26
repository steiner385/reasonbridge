/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

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
 * HTTP client for sending notifications to notification-service.
 *
 * Uses fire-and-forget pattern for resilience - failures are logged but don't
 * block the calling operation. This ensures the moderation-service remains
 * responsive even when notification-service is unavailable.
 *
 * @remarks
 * - sendSlaBreachNotification: Notifies moderators about SLA breaches
 * - All errors are logged but not thrown
 *
 * @example
 * ```typescript
 * // Send SLA breach notification
 * const result = await notificationClient.sendSlaBreachNotification([
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
   * Send SLA breach notification to notification-service.
   * Fire-and-forget pattern: logs errors but doesn't throw.
   *
   * This triggers:
   * 1. Creation of notifications for all moderators
   * 2. WebSocket broadcast to moderation:actions room
   *
   * @param breaches - Array of SLA breach items
   * @returns Response with notification counts, or null on error
   */
  async sendSlaBreachNotification(
    breaches: SlaBreachItem[],
  ): Promise<SlaBreachNotificationResponse | null> {
    if (breaches.length === 0) {
      return { success: true, notificationsSent: 0, broadcastSent: false };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/internal/sla-breach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
}
