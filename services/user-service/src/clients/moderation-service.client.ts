/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

/**
 * Request data for flagging a user as suspected bot
 */
export interface BotFlagRequest {
  /** User ID flagged for bot suspicion */
  userId: string;
  /** Bot detection risk score (0.0 - 1.0) */
  riskScore: number;
  /** Detected patterns (e.g., 'very_new_account', 'rapid_posting') */
  patterns: string[];
  /** Human-readable reasoning */
  reasoning: string;
}

/**
 * Result of a bot flag operation
 */
export interface BotFlagResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

/**
 * HTTP client for calling moderation-service.
 *
 * Uses fire-and-forget pattern for resilience - failures are logged but don't
 * block the calling operation. This ensures the user-service remains
 * responsive even when moderation-service is unavailable.
 *
 * @remarks
 * - flagUserAsBot: Creates a bot suspicion report in moderation queue
 * - All errors are logged but not thrown
 *
 * @example
 * ```typescript
 * // Flag a user for bot review
 * const result = await moderationClient.flagUserAsBot({
 *   userId: 'user-123',
 *   riskScore: 0.75,
 *   patterns: ['rapid_posting', 'topic_concentration'],
 *   reasoning: 'High risk of automated behavior...',
 * });
 * ```
 */
@Injectable()
export class ModerationServiceClient {
  private readonly logger = new Logger(ModerationServiceClient.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env['MODERATION_SERVICE_URL'] || getServiceUrl('MODERATION_SERVICE');
  }

  /**
   * Flag a user as suspected bot for moderator review.
   *
   * Creates a report with category BOT_SUSPICION in the moderation queue.
   * Uses fire-and-forget pattern: logs errors but doesn't throw.
   *
   * @param request - Bot detection data
   * @returns Result with report ID, or null on error
   */
  async flagUserAsBot(request: BotFlagRequest): Promise<BotFlagResult | null> {
    const endpoint = `${this.baseUrl}/internal/bot-flagged`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          detectedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to flag user ${request.userId} as bot: HTTP ${response.status}`);
        return null;
      }

      const result = (await response.json()) as BotFlagResult;

      if (result.success) {
        this.logger.log(
          `User ${request.userId} flagged for bot review, reportId: ${result.reportId}`,
        );
      } else {
        this.logger.warn(`Failed to flag user ${request.userId} as bot: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `Error flagging user ${request.userId} as bot: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
