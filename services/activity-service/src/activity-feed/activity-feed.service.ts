/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  GetFeedQueryDto,
  ActivityFeedResponseDto,
  ActivityEventDto,
} from './dto/activity-feed.dto.js';

@Injectable()
export class ActivityFeedService {
  private readonly logger = new Logger(ActivityFeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get activity feed for a user showing activities from followed users
   */
  async getFeed(userId: string, query: GetFeedQueryDto): Promise<ActivityFeedResponseDto> {
    const { cursor } = query;

    // Coerce and bound `limit` defensively. The global ValidationPipe normally
    // transforms it to an integer via GetFeedQueryDto's @Transform/@IsInt, but
    // guarding here keeps the service correct even when called without the pipe
    // (internal callers, unit tests). A raw string would otherwise make
    // `take: limit + 1` concatenate (e.g. "50" + 1 = "501") and break Prisma.
    const parsedLimit = Number(query.limit);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), 100) : 20;

    // Step 1: Get IDs of users the current user follows (limit to 1000 most recent)
    // Note: Limiting follows prevents extremely large IN clauses for power users
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followedId: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const followedUserIds = follows.map((f) => f.followedId);

    // Early return if not following anyone
    if (followedUserIds.length === 0) {
      this.logger.debug(`User ${userId} is not following anyone - returning empty feed`);
      return {
        activities: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    // Step 2: Build cursor condition
    const cursorCondition = cursor ? { createdAt: { lt: new Date(cursor) } } : {};

    // Step 3: Query activity events from followed users
    const events = await this.prisma.activityEvent.findMany({
      where: {
        userId: { in: followedUserIds },
        ...cursorCondition,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check hasMore
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Step 4: Determine pagination
    const hasMore = events.length > limit;
    const activities = events.slice(0, limit);

    const lastActivity = activities[activities.length - 1];
    const nextCursor = hasMore && lastActivity ? lastActivity.createdAt.toISOString() : null;

    // Step 5: Map to response DTOs
    const mappedActivities: ActivityEventDto[] = activities.map((event) => ({
      id: event.id,
      activityType: event.activityType,
      targetId: event.targetId,
      targetType: event.targetType,
      targetTitle: event.targetTitle,
      targetSlug: event.targetSlug,
      createdAt: event.createdAt.toISOString(),
      user: {
        id: event.user.id,
        displayName: event.user.displayName,
      },
    }));

    this.logger.debug(
      `Returning ${mappedActivities.length} activities for user ${userId}, hasMore: ${hasMore}`,
    );

    return {
      activities: mappedActivities,
      nextCursor,
      hasMore,
    };
  }
}
