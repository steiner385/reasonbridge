/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';
import { CLIENT_TIMEOUTS } from '../constants/index.js';

/**
 * Basic topic information returned from discussion-service.
 */
export interface TopicInfo {
  id: string;
  title: string;
  status: string;
}

/**
 * HTTP client for calling discussion-service APIs.
 *
 * Uses fire-and-forget pattern for non-critical operations - failures are
 * logged but don't block the calling operation. This ensures the contact-service
 * remains responsive even when discussion-service is unavailable.
 *
 * @remarks
 * - getTopicById: Returns null on error or if topic not found
 * - canUserAccessTopic: Returns false on error or if access denied
 * - All errors are logged but not thrown
 *
 * @example
 * ```typescript
 * // Get topic information
 * const topic = await discussionServiceClient.getTopicById('topic-123');
 * if (topic) {
 *   console.log(`Topic: ${topic.title}`);
 * }
 *
 * // Check user access
 * const canAccess = await discussionServiceClient.canUserAccessTopic('topic-123', 'user-456');
 * if (canAccess) {
 *   // User can view/participate in topic
 * }
 * ```
 */
@Injectable()
export class DiscussionServiceClient {
  private readonly logger = new Logger(DiscussionServiceClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env['DISCUSSION_SERVICE_URL'] || getServiceUrl('DISCUSSION_SERVICE');
    this.timeoutMs = parseInt(
      process.env['DISCUSSION_SERVICE_TIMEOUT_MS'] || String(CLIENT_TIMEOUTS.DEFAULT_MS),
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
   * Get topic by ID.
   * Fire-and-forget pattern: returns null on error or if not found.
   *
   * @param topicId - The ID of the topic to fetch
   * @returns Topic information or null if not found/error
   */
  async getTopicById(topicId: string): Promise<TopicInfo | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/topics/${topicId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        this.logger.warn(`Failed to get topic ${topicId}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return {
        id: data.id,
        title: data.title,
        status: data.status,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Request to get topic ${topicId} timed out`);
      } else {
        this.logger.warn(`Error fetching topic ${topicId}: ${(error as Error).message}`);
      }
      return null;
    }
  }

  /**
   * Check if a user can access a topic.
   * Fire-and-forget pattern: returns false on error or if access denied.
   *
   * @param topicId - The ID of the topic
   * @param userId - The ID of the user
   * @returns true if user can view/participate in topic, false otherwise
   */
  async canUserAccessTopic(topicId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/topics/${topicId}/access/${userId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to check access for topic ${topicId}, user ${userId}: ${response.status}`,
        );
        return false;
      }

      const data = await response.json();
      return data.canAccess === true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Request to check topic access for ${topicId} timed out`);
      } else {
        this.logger.warn(`Error checking topic access for ${topicId}: ${(error as Error).message}`);
      }
      return false;
    }
  }

  /**
   * Grant a user access to a topic.
   * Fire-and-forget pattern: returns true on success, false on error.
   * Does not throw exceptions - errors are logged but not propagated.
   *
   * @param topicId - The ID of the topic to grant access to
   * @param userId - The ID of the user to grant access to
   * @param invitationId - The ID of the invitation that triggered this grant
   * @returns true if access was granted successfully, false on error
   */
  async grantTopicAccess(topicId: string, userId: string, invitationId: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/topics/${topicId}/access/${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'INVITATION',
            invitationId,
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to grant topic access for topic ${topicId}, user ${userId}: ${response.status}`,
        );
        return false;
      }

      this.logger.log(`Granted access to topic ${topicId} for user ${userId}`);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn(`Request to grant topic access for ${topicId} timed out`);
      } else {
        this.logger.warn(`Error granting topic access for ${topicId}: ${(error as Error).message}`);
      }
      return false;
    }
  }
}
