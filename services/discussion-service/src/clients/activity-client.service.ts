/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';
import { CLIENT_TIMEOUTS } from '../constants/index.js';

interface CreateActivityEventDto {
  userId: string;
  activityType:
    | 'TOPIC_CREATED'
    | 'RESPONSE_POSTED'
    | 'DISCUSSION_JOINED'
    | 'AI_SUGGESTION_ACCEPTED';
  targetId: string;
  targetType: 'TOPIC' | 'RESPONSE' | 'DISCUSSION';
  targetTitle?: string;
  targetSlug?: string;
}

/**
 * HTTP client for calling activity-service
 * Fire-and-forget pattern - failures are logged but don't block main operations
 */
@Injectable()
export class ActivityClientService {
  private readonly logger = new Logger(ActivityClientService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env['ACTIVITY_SERVICE_URL'] || getServiceUrl('ACTIVITY_SERVICE');
    this.timeoutMs = parseInt(
      process.env['ACTIVITY_SERVICE_TIMEOUT_MS'] || String(CLIENT_TIMEOUTS.DEFAULT_MS),
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
   * Create an activity event (fire-and-forget).
   *
   * @param dto - Activity event data to create
   *
   * @remarks
   * Fire-and-forget pattern: failures are logged but don't block the calling
   * operation. Named with "try" prefix to indicate this behavior.
   */
  async tryCreateEvent(dto: CreateActivityEventDto): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to create activity event: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.debug(
          `Created activity event: ${dto.activityType} for ${dto.targetType} ${dto.targetId}`,
        );
      }
    } catch (error) {
      // Fire-and-forget - log but don't throw
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('Request to create activity event timed out');
      } else {
        this.logger.warn(
          `Error creating activity event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }
}
