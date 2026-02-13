/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityEventsService } from './activity-events.service.js';
import { ActivityTypeDto, TargetTypeDto } from './dto/create-event.dto.js';

describe('ActivityEventsService', () => {
  let service: ActivityEventsService;
  let mockPrisma: {
    activityEvent: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      activityEvent: {
        create: vi.fn(),
      },
    };

    service = new ActivityEventsService(mockPrisma as any);
  });

  describe('createEvent', () => {
    it('should create an activity event and return response', async () => {
      const mockEvent = {
        id: 'event-123',
        userId: 'user-456',
        activityType: 'TOPIC_CREATED',
        targetId: 'topic-789',
        targetType: 'TOPIC',
        targetTitle: 'Test Topic',
        targetSlug: 'test-topic',
        createdAt: new Date('2026-02-13T12:00:00Z'),
      };

      mockPrisma.activityEvent.create.mockResolvedValue(mockEvent);

      const result = await service.createEvent({
        userId: 'user-456',
        activityType: ActivityTypeDto.TOPIC_CREATED,
        targetId: 'topic-789',
        targetType: TargetTypeDto.TOPIC,
        targetTitle: 'Test Topic',
        targetSlug: 'test-topic',
      });

      expect(result).toEqual({
        id: 'event-123',
        createdAt: '2026-02-13T12:00:00.000Z',
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          activityType: 'TOPIC_CREATED',
          targetId: 'topic-789',
          targetType: 'TOPIC',
          targetTitle: 'Test Topic',
          targetSlug: 'test-topic',
        },
      });
    });

    it('should create event without optional fields', async () => {
      const mockEvent = {
        id: 'event-123',
        userId: 'user-456',
        activityType: 'RESPONSE_POSTED',
        targetId: 'response-789',
        targetType: 'RESPONSE',
        targetTitle: null,
        targetSlug: null,
        createdAt: new Date('2026-02-13T12:00:00Z'),
      };

      mockPrisma.activityEvent.create.mockResolvedValue(mockEvent);

      const result = await service.createEvent({
        userId: 'user-456',
        activityType: ActivityTypeDto.RESPONSE_POSTED,
        targetId: 'response-789',
        targetType: TargetTypeDto.RESPONSE,
      });

      expect(result.id).toBe('event-123');
      expect(mockPrisma.activityEvent.create).toHaveBeenCalled();
    });
  });
});
