/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ActivityFeedService } from './activity-feed.service.js';
import { GetFeedQueryDto } from './dto/activity-feed.dto.js';
import type { ActivityFeedResponseDto } from './dto/activity-feed.dto.js';

/**
 * Public API for retrieving activity feed
 * Requires authenticated user (user ID from X-User-Id header set by API Gateway)
 */
@Controller('feed')
export class ActivityFeedController {
  constructor(private readonly feedService: ActivityFeedService) {}

  @Get()
  async getFeed(
    @Headers('x-user-id') userId: string | undefined,
    @Query() query: GetFeedQueryDto,
  ): Promise<ActivityFeedResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    return this.feedService.getFeed(userId, query);
  }
}
