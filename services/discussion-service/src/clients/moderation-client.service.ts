/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

/**
 * Child safety risk levels for content screening
 */
export type ChildSafetyRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Types of grooming patterns that can be detected
 */
export type GroomingPatternType =
  | 'isolation_attempt'
  | 'secrecy_request'
  | 'inappropriate_contact'
  | 'age_probing'
  | 'gift_offering'
  | 'excessive_flattery'
  | 'boundary_testing';

/**
 * Result from grooming detection analysis
 */
export interface GroomingDetectionResult {
  detected: boolean;
  confidence: number;
  patternType: GroomingPatternType | null;
  flaggedPhrases: string[];
  recommendedAction: 'BLOCK' | 'REVIEW' | 'FLAG' | 'ALLOW';
  explanation: string;
}

/**
 * Result from child content screening
 */
export interface ChildScreeningResult {
  /** Overall child safety risk level */
  childSafetyRisk: ChildSafetyRisk;
  /** Grooming detection result from ai-service */
  groomingDetection?: GroomingDetectionResult;
}

/**
 * Data required to queue child content for moderation
 */
export interface QueueChildContentData {
  responseId: string;
  topicId: string;
  authorId: string;
  content: string;
  aiFlags?: {
    grooming?: boolean;
    groomingConfidence?: number;
    groomingPatternType?: GroomingPatternType | string;
    recommendedAction?: 'BLOCK' | 'REVIEW' | 'FLAG' | 'ALLOW';
    [key: string]: unknown;
  };
}

/**
 * HTTP client for communicating with the moderation-service.
 *
 * @remarks
 * This service provides methods for routing child content to the moderation queue
 * and screening content for child safety concerns. It uses fire-and-forget patterns
 * for queue operations to avoid blocking response creation.
 *
 * Endpoints used:
 * - POST /moderation/child-content/queue - Queue content for child review
 * - POST /moderation/child-content/screen - Screen content for children
 *
 * @example
 * ```typescript
 * // Screen content for child safety
 * const screening = await moderationClient.screenContentForChildren(content);
 * if (screening.childSafetyRisk === 'critical') {
 *   // Handle critical risk
 * }
 *
 * // Queue for moderation review (fire-and-forget)
 * await moderationClient.tryQueueChildContent({
 *   responseId: 'resp-123',
 *   topicId: 'topic-456',
 *   authorId: 'user-789',
 *   content: 'Response content',
 * });
 * ```
 */
/** Default timeout for HTTP requests in milliseconds */
const DEFAULT_TIMEOUT_MS = 30000;

@Injectable()
export class ModerationClientService {
  private readonly logger = new Logger(ModerationClientService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env['MODERATION_SERVICE_URL'] || getServiceUrl('MODERATION_SERVICE');
    this.timeoutMs = parseInt(
      process.env['MODERATION_SERVICE_TIMEOUT_MS'] || String(DEFAULT_TIMEOUT_MS),
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
   * Queue child-authored content for moderation review.
   *
   * @param data - The content data to queue for review
   *
   * @remarks
   * This is a fire-and-forget operation. Failures are logged but do not
   * throw exceptions to avoid blocking response creation. The moderation
   * queue will process the content asynchronously.
   *
   * Priority is determined based on AI flags:
   * - URGENT: Grooming patterns detected
   * - HIGH: Other concerning content flagged
   * - NORMAL: No flags or low concern
   */
  async tryQueueChildContent(data: QueueChildContentData): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/moderation/child-content/queue`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to queue child content for moderation: ${response.status} ${response.statusText}`,
          { responseId: data.responseId, topicId: data.topicId },
        );
      } else {
        this.logger.debug(
          `Queued child content for moderation: response ${data.responseId} in topic ${data.topicId}`,
        );
      }
    } catch (error) {
      // Fire-and-forget - log but don't throw
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('Request to queue child content timed out', {
          responseId: data.responseId,
          topicId: data.topicId,
        });
      } else {
        this.logger.warn(
          `Error queuing child content for moderation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { responseId: data.responseId, topicId: data.topicId },
        );
      }
    }
  }

  /**
   * Screen content for child safety concerns.
   *
   * @param content - The text content to screen
   * @returns Screening result with child safety risk and grooming detection
   * @throws Error if the moderation service is unavailable or returns an error
   *
   * @remarks
   * This method calls the moderation-service which in turn calls the ai-service
   * for grooming pattern detection. The result includes:
   * - Overall child safety risk level (none, low, medium, high, critical)
   * - Grooming detection details if patterns were found
   *
   * Use this before queueChildContent to include AI flags in the queue entry.
   */
  async screenContentForChildren(content: string): Promise<ChildScreeningResult> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/moderation/child-content/screen`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to screen content for children: ${response.status} ${response.statusText}`,
        );
        // Return safe default on failure
        return { childSafetyRisk: 'none' };
      }

      const result = (await response.json()) as ChildScreeningResult;
      return result;
    } catch (error) {
      // Log and return safe default on failure
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('Request to screen content for children timed out');
      } else {
        this.logger.warn(
          `Error screening content for children: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      return { childSafetyRisk: 'none' };
    }
  }
}
