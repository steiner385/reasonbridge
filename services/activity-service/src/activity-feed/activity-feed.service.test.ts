/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityFeedService } from './activity-feed.service.js';

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;
  let mockPrisma: {
    userFollow: { findMany: ReturnType<typeof vi.fn> };
    activityEvent: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      userFollow: { findMany: vi.fn() },
      activityEvent: { findMany: vi.fn() },
    };

    service = new ActivityFeedService(mockPrisma as any);
  });

  describe('getFeed', () => {
    it('should return empty feed when user follows no one', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([]);

      const result = await service.getFeed('user-123', { limit: 20 });

      expect(result).toEqual({
        activities: [],
        nextCursor: null,
        hasMore: false,
      });

      expect(mockPrisma.activityEvent.findMany).not.toHaveBeenCalled();
    });

    it('should return activities from followed users', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([
        { followedId: 'followed-1' },
        { followedId: 'followed-2' },
      ]);

      mockPrisma.activityEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          userId: 'followed-1',
          activityType: 'TOPIC_CREATED',
          targetId: 'topic-1',
          targetType: 'TOPIC',
          targetTitle: 'Test Topic',
          targetSlug: 'test-topic',
          createdAt: new Date('2026-02-13T12:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane Doe' },
        },
      ]);

      const result = await service.getFeed('user-123', { limit: 20 });

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0]).toEqual({
        id: 'event-1',
        activityType: 'TOPIC_CREATED',
        targetId: 'topic-1',
        targetType: 'TOPIC',
        targetTitle: 'Test Topic',
        targetSlug: 'test-topic',
        createdAt: '2026-02-13T12:00:00.000Z',
        user: { id: 'followed-1', displayName: 'Jane Doe' },
      });
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle pagination with hasMore', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([{ followedId: 'followed-1' }]);

      // Return 3 events when limit is 2 (indicates hasMore)
      mockPrisma.activityEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          createdAt: new Date('2026-02-13T12:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane' },
          activityType: 'TOPIC_CREATED',
          targetId: 't1',
          targetType: 'TOPIC',
          targetTitle: 'Topic 1',
          targetSlug: 'topic-1',
        },
        {
          id: 'event-2',
          createdAt: new Date('2026-02-13T11:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane' },
          activityType: 'RESPONSE_POSTED',
          targetId: 'r1',
          targetType: 'RESPONSE',
          targetTitle: 'Topic 1',
          targetSlug: 'topic-1',
        },
        {
          id: 'event-3',
          createdAt: new Date('2026-02-13T10:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane' },
          activityType: 'DISCUSSION_JOINED',
          targetId: 'd1',
          targetType: 'DISCUSSION',
          targetTitle: 'Topic 1',
          targetSlug: 'topic-1',
        },
      ]);

      const result = await service.getFeed('user-123', { limit: 2 });

      expect(result.activities).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('2026-02-13T11:00:00.000Z');
    });

    it('should apply cursor for pagination', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([{ followedId: 'followed-1' }]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);

      await service.getFeed('user-123', {
        limit: 20,
        cursor: '2026-02-13T12:00:00.000Z',
      });

      expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: new Date('2026-02-13T12:00:00.000Z') },
          }),
        }),
      );
    });
  });
});
