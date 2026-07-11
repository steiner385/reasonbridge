/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type JwtPayload } from '@reason-bridge/common';
import { ActivityFeedService } from './activity-feed.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { GetFeedQueryDto } from './dto/activity-feed.dto.js';
import type { ActivityFeedResponseDto } from './dto/activity-feed.dto.js';

/**
 * Public API for retrieving activity feed.
 *
 * Requires a verified JWT. The user id is derived from the verified token
 * (user.sub) rather than a caller-supplied x-user-id header, so the endpoint
 * cannot be spoofed if the service port is reachable directly (issue #1301).
 */
@Controller('feed')
@UseGuards(JwtAuthGuard)
export class ActivityFeedController {
  constructor(private readonly feedService: ActivityFeedService) {}

  @Get()
  async getFeed(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetFeedQueryDto,
  ): Promise<ActivityFeedResponseDto> {
    return this.feedService.getFeed(user.sub, query);
  }
}
