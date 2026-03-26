/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InternalSlaBreachController,
  SlaBreachNotificationDto,
  SlaBreachItem,
} from '../internal-sla-breach.controller.js';

describe('InternalSlaBreachController', () => {
  let controller: InternalSlaBreachController;
  let mockPrisma: any;
  let mockNotificationGateway: any;

  const createMockBreach = (overrides: Partial<SlaBreachItem> = {}): SlaBreachItem => ({
    queueId: 'queue-123',
    priority: 'HIGH',
    ageMinutes: 300,
    slaMinutes: 240,
    breachPercent: 125,
    responseId: 'response-456',
    topicId: 'topic-789',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      user: {
        findMany: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
    };

    mockNotificationGateway = {
      emitSlaBreachNotification: vi.fn(),
    };

    controller = new InternalSlaBreachController(mockPrisma, mockNotificationGateway);
  });

  describe('handleSlaBreachNotification', () => {
    it('should return early with no notifications when breaches array is empty', async () => {
      const dto: SlaBreachNotificationDto = {
        breaches: [],
        checkedAt: new Date().toISOString(),
      };

      const result = await controller.handleSlaBreachNotification(dto);

      expect(result).toEqual({
        success: true,
        notificationsSent: 0,
        broadcastSent: false,
      });
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      expect(mockNotificationGateway.emitSlaBreachNotification).not.toHaveBeenCalled();
    });

    it('should create notifications for all moderators and broadcast via WebSocket', async () => {
      const moderators = [
        { id: 'mod-1', displayName: 'Moderator One' },
        { id: 'mod-2', displayName: 'Moderator Two' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(moderators);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-123' });

      const breaches = [
        createMockBreach({ queueId: 'q1', priority: 'URGENT', ageMinutes: 90 }),
        createMockBreach({ queueId: 'q2', priority: 'HIGH', ageMinutes: 300 }),
      ];

      const dto: SlaBreachNotificationDto = {
        breaches,
        checkedAt: '2026-03-26T10:00:00Z',
      };

      const result = await controller.handleSlaBreachNotification(dto);

      expect(result).toEqual({
        success: true,
        notificationsSent: 2,
        broadcastSent: true,
      });

      // Should query for moderators
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: ['MODERATOR', 'ADMIN'] },
          isActive: true,
        },
        select: {
          id: true,
          displayName: true,
        },
      });

      // Should create notification for each moderator
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);

      // Should broadcast via WebSocket
      expect(mockNotificationGateway.emitSlaBreachNotification).toHaveBeenCalledWith({
        breaches,
        checkedAt: '2026-03-26T10:00:00Z',
        timestamp: expect.any(String),
      });
    });

    it('should return 0 notifications when no moderators exist', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const dto: SlaBreachNotificationDto = {
        breaches: [createMockBreach()],
        checkedAt: new Date().toISOString(),
      };

      const result = await controller.handleSlaBreachNotification(dto);

      expect(result).toEqual({
        success: true,
        notificationsSent: 0,
        broadcastSent: true,
      });

      // Should still broadcast even without moderators
      expect(mockNotificationGateway.emitSlaBreachNotification).toHaveBeenCalled();
    });

    it('should handle mixed priority breaches correctly', async () => {
      const moderators = [{ id: 'mod-1', displayName: 'Moderator' }];
      mockPrisma.user.findMany.mockResolvedValue(moderators);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-123' });

      const breaches = [
        createMockBreach({ priority: 'URGENT', ageMinutes: 90 }),
        createMockBreach({ priority: 'URGENT', ageMinutes: 100 }),
        createMockBreach({ priority: 'HIGH', ageMinutes: 300 }),
        createMockBreach({ priority: 'NORMAL', ageMinutes: 2000 }),
      ];

      const dto: SlaBreachNotificationDto = {
        breaches,
        checkedAt: new Date().toISOString(),
      };

      const result = await controller.handleSlaBreachNotification(dto);

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(1);

      // Verify notification content includes priority breakdown
      const createCall = mockPrisma.notification.create.mock.calls[0][0];
      expect(createCall.data.title).toContain('[SLA BREACH]');
      expect(createCall.data.title).toContain('4 items');
      expect(createCall.data.metadata.urgentCount).toBe(2);
      expect(createCall.data.metadata.highCount).toBe(1);
    });

    it('should include action URL pointing to moderation queue', async () => {
      const moderators = [{ id: 'mod-1', displayName: 'Moderator' }];
      mockPrisma.user.findMany.mockResolvedValue(moderators);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-123' });

      const dto: SlaBreachNotificationDto = {
        breaches: [createMockBreach()],
        checkedAt: new Date().toISOString(),
      };

      await controller.handleSlaBreachNotification(dto);

      const createCall = mockPrisma.notification.create.mock.calls[0][0];
      expect(createCall.data.actionUrl).toBe('/moderation/queue?filter=breached');
    });

    it('should throw error when database operation fails', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database connection failed'));

      const dto: SlaBreachNotificationDto = {
        breaches: [createMockBreach()],
        checkedAt: new Date().toISOString(),
      };

      await expect(controller.handleSlaBreachNotification(dto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should limit breaches included in metadata to first 10', async () => {
      const moderators = [{ id: 'mod-1', displayName: 'Moderator' }];
      mockPrisma.user.findMany.mockResolvedValue(moderators);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-123' });

      // Create 15 breaches
      const breaches = Array.from({ length: 15 }, (_, i) =>
        createMockBreach({ queueId: `q-${i}` }),
      );

      const dto: SlaBreachNotificationDto = {
        breaches,
        checkedAt: new Date().toISOString(),
      };

      await controller.handleSlaBreachNotification(dto);

      const createCall = mockPrisma.notification.create.mock.calls[0][0];
      expect(createCall.data.metadata.breaches).toHaveLength(10);
      expect(createCall.data.metadata.breachCount).toBe(15);
    });
  });
});
