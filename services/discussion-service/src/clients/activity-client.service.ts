/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

interface CreateActivityEventDto {
  userId: string;
  activityType: 'TOPIC_CREATED' | 'RESPONSE_POSTED' | 'DISCUSSION_JOINED';
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

  constructor() {
    this.baseUrl = process.env['ACTIVITY_SERVICE_URL'] || getServiceUrl('ACTIVITY_SERVICE');
  }

  /**
   * Create an activity event (fire-and-forget)
   * Failures are logged but don't block the calling operation
   */
  async createEvent(dto: CreateActivityEventDto): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/events`, {
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
      this.logger.warn(
        `Error creating activity event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
