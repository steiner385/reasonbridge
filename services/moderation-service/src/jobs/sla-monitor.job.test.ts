/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import {
  SlaMonitorJob,
  SLA_LIMITS_MINUTES,
  ESCALATION_THRESHOLD_PERCENT,
  ESCALATION_TARGET,
  type StaleQueueItem,
} from './sla-monitor.job.js';
import type { ReviewPriority, ChildReviewStatus } from '@prisma/client';

/**
 * Create mock PrismaService with all required methods
 */
const createMockPrismaService = () => ({
  childContentReviewQueue: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
});

/**
 * Create mock NotificationServiceClient
 */
const createMockNotificationClient = () => ({
  sendSlaBreachNotification: vi.fn().mockResolvedValue({
    success: true,
    notificationsSent: 1,
    broadcastSent: true,
  }),
});

/**
 * Helper to create a mock queue item at a specific age
 */
const createMockItem = (
  id: string,
  priority: ReviewPriority,
  ageMinutes: number,
  status: ChildReviewStatus = 'PENDING',
) => {
  // Use millisecond arithmetic for accurate time subtraction
  // setMinutes() doesn't work correctly for large values (e.g., 1080+ minutes)
  const createdAt = new Date(Date.now() - ageMinutes * 60 * 1000);

  return {
    id,
    responseId: `response-${id}`,
    topicId: `topic-${id}`,
    authorId: `author-${id}`,
    priority,
    status,
    createdAt,
  };
};

describe('SlaMonitorJob', () => {
  let job: SlaMonitorJob;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockNotificationClient: ReturnType<typeof createMockNotificationClient>;
  let loggerSpy: { log: MockInstance; warn: MockInstance; error: MockInstance };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockNotificationClient = createMockNotificationClient();
    job = new SlaMonitorJob(mockPrisma as any, mockNotificationClient as any);

    // Spy on the job's logger
    loggerSpy = {
      log: vi.spyOn((job as any).logger, 'log').mockImplementation(() => {}),
      warn: vi.spyOn((job as any).logger, 'warn').mockImplementation(() => {}),
      error: vi.spyOn((job as any).logger, 'error').mockImplementation(() => {}),
    };
  });

  describe('SLA Constants', () => {
    it('should have correct SLA limits for each priority', () => {
      expect(SLA_LIMITS_MINUTES.URGENT).toBe(60); // 1 hour
      expect(SLA_LIMITS_MINUTES.HIGH).toBe(240); // 4 hours
      expect(SLA_LIMITS_MINUTES.NORMAL).toBe(1440); // 24 hours
      expect(SLA_LIMITS_MINUTES.LOW).toBe(2880); // 48 hours
    });

    it('should have escalation threshold at 75%', () => {
      expect(ESCALATION_THRESHOLD_PERCENT).toBe(75);
    });

    it('should have correct escalation targets', () => {
      expect(ESCALATION_TARGET.LOW).toBe('NORMAL');
      expect(ESCALATION_TARGET.NORMAL).toBe('HIGH');
      expect(ESCALATION_TARGET.HIGH).toBe('URGENT');
      expect(ESCALATION_TARGET.URGENT).toBe('URGENT'); // Can't escalate higher
    });
  });

  describe('getSlaDeadline', () => {
    it('should calculate correct deadline for URGENT priority (1 hour)', () => {
      const createdAt = new Date('2026-02-22T10:00:00Z');
      const deadline = job.getSlaDeadline('URGENT', createdAt);

      expect(deadline.getTime()).toBe(new Date('2026-02-22T11:00:00Z').getTime());
    });

    it('should calculate correct deadline for HIGH priority (4 hours)', () => {
      const createdAt = new Date('2026-02-22T10:00:00Z');
      const deadline = job.getSlaDeadline('HIGH', createdAt);

      expect(deadline.getTime()).toBe(new Date('2026-02-22T14:00:00Z').getTime());
    });

    it('should calculate correct deadline for NORMAL priority (24 hours)', () => {
      const createdAt = new Date('2026-02-22T10:00:00Z');
      const deadline = job.getSlaDeadline('NORMAL', createdAt);

      expect(deadline.getTime()).toBe(new Date('2026-02-23T10:00:00Z').getTime());
    });

    it('should calculate correct deadline for LOW priority (48 hours)', () => {
      const createdAt = new Date('2026-02-22T10:00:00Z');
      const deadline = job.getSlaDeadline('LOW', createdAt);

      expect(deadline.getTime()).toBe(new Date('2026-02-24T10:00:00Z').getTime());
    });
  });

  describe('getStaleItems', () => {
    it('should return empty array when no pending items exist', async () => {
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([]);

      const result = await job.getStaleItems();

      expect(result).toEqual([]);
      expect(mockPrisma.childContentReviewQueue.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING', 'IN_REVIEW'] },
        },
        select: expect.any(Object),
      });
    });

    it('should not include items within SLA threshold (less than 75%)', async () => {
      // URGENT SLA is 60 min, 50% would be 30 min - should NOT be included
      const items = [createMockItem('1', 'URGENT', 30)];
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(0);
    });

    it('should include items at 75% of SLA (escalation threshold)', async () => {
      // URGENT SLA is 60 min, 75% would be 45 min
      const items = [createMockItem('1', 'URGENT', 45)];
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(1);
      expect(result[0].shouldEscalate).toBe(true);
      expect(result[0].isBreached).toBe(false);
    });

    it('should mark items at 100%+ as breached', async () => {
      // URGENT SLA is 60 min, 100% would be 60 min
      const items = [createMockItem('1', 'URGENT', 70)];
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(1);
      expect(result[0].isBreached).toBe(true);
      expect(result[0].slaPercent).toBeGreaterThan(100);
    });

    it('should calculate correct SLA percentages for each priority', async () => {
      // Each item at exactly 75% of their SLA
      const items = [
        createMockItem('1', 'URGENT', 45), // 75% of 60
        createMockItem('2', 'HIGH', 180), // 75% of 240
        createMockItem('3', 'NORMAL', 1080), // 75% of 1440
        createMockItem('4', 'LOW', 2160), // 75% of 2880
      ];
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(4);
      for (const item of result) {
        expect(item.shouldEscalate).toBe(true);
        expect(item.slaPercent).toBeCloseTo(75, 0);
      }
    });

    it('should sort items by SLA percentage (most critical first)', async () => {
      const items = [
        createMockItem('low-breach', 'LOW', 3000), // ~104% of 2880
        createMockItem('urgent-breach', 'URGENT', 90), // 150% of 60
        createMockItem('high-near', 'HIGH', 200), // ~83% of 240
      ];
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(3);
      // Should be sorted by SLA percentage descending
      expect(result[0].id).toBe('urgent-breach'); // 150%
      expect(result[1].id).toBe('low-breach'); // ~104%
      expect(result[2].id).toBe('high-near'); // ~83%
    });

    it('should include IN_REVIEW status items', async () => {
      const items = [createMockItem('1', 'URGENT', 50, 'IN_REVIEW')];
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('IN_REVIEW');
    });
  });

  describe('autoEscalateStaleItems', () => {
    it('should escalate LOW to NORMAL', async () => {
      const staleItem: StaleQueueItem = {
        id: 'queue-1',
        responseId: 'response-1',
        topicId: 'topic-1',
        authorId: 'author-1',
        priority: 'LOW',
        status: 'PENDING',
        createdAt: new Date(),
        ageMinutes: 2160, // 75% of LOW SLA
        slaMinutes: 2880,
        slaPercent: 75,
        isBreached: false,
        shouldEscalate: true,
      };

      mockPrisma.childContentReviewQueue.update.mockResolvedValue({});

      const result = await job.autoEscalateStaleItems([staleItem]);

      expect(result).toBe(1);
      expect(mockPrisma.childContentReviewQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-1' },
        data: { priority: 'NORMAL' },
      });
      expect(loggerSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Auto-escalated'));
    });

    it('should escalate NORMAL to HIGH', async () => {
      const staleItem: StaleQueueItem = {
        id: 'queue-2',
        responseId: 'response-2',
        topicId: 'topic-2',
        authorId: 'author-2',
        priority: 'NORMAL',
        status: 'PENDING',
        createdAt: new Date(),
        ageMinutes: 1080, // 75% of NORMAL SLA
        slaMinutes: 1440,
        slaPercent: 75,
        isBreached: false,
        shouldEscalate: true,
      };

      mockPrisma.childContentReviewQueue.update.mockResolvedValue({});

      const result = await job.autoEscalateStaleItems([staleItem]);

      expect(result).toBe(1);
      expect(mockPrisma.childContentReviewQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-2' },
        data: { priority: 'HIGH' },
      });
    });

    it('should escalate HIGH to URGENT', async () => {
      const staleItem: StaleQueueItem = {
        id: 'queue-3',
        responseId: 'response-3',
        topicId: 'topic-3',
        authorId: 'author-3',
        priority: 'HIGH',
        status: 'PENDING',
        createdAt: new Date(),
        ageMinutes: 180, // 75% of HIGH SLA
        slaMinutes: 240,
        slaPercent: 75,
        isBreached: false,
        shouldEscalate: true,
      };

      mockPrisma.childContentReviewQueue.update.mockResolvedValue({});

      const result = await job.autoEscalateStaleItems([staleItem]);

      expect(result).toBe(1);
      expect(mockPrisma.childContentReviewQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-3' },
        data: { priority: 'URGENT' },
      });
    });

    it('should NOT escalate URGENT items (already at highest priority)', async () => {
      const staleItem: StaleQueueItem = {
        id: 'queue-4',
        responseId: 'response-4',
        topicId: 'topic-4',
        authorId: 'author-4',
        priority: 'URGENT',
        status: 'PENDING',
        createdAt: new Date(),
        ageMinutes: 45, // 75% of URGENT SLA
        slaMinutes: 60,
        slaPercent: 75,
        isBreached: false,
        shouldEscalate: true,
      };

      const result = await job.autoEscalateStaleItems([staleItem]);

      expect(result).toBe(0);
      expect(mockPrisma.childContentReviewQueue.update).not.toHaveBeenCalled();
      expect(loggerSpy.warn).toHaveBeenCalledWith(expect.stringContaining('requires immediate'));
    });

    it('should handle multiple items and escalate all eligible ones', async () => {
      const staleItems: StaleQueueItem[] = [
        {
          id: 'queue-low',
          responseId: 'response-low',
          topicId: 'topic-low',
          authorId: 'author-low',
          priority: 'LOW',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 2200,
          slaMinutes: 2880,
          slaPercent: 76,
          isBreached: false,
          shouldEscalate: true,
        },
        {
          id: 'queue-normal',
          responseId: 'response-normal',
          topicId: 'topic-normal',
          authorId: 'author-normal',
          priority: 'NORMAL',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 1100,
          slaMinutes: 1440,
          slaPercent: 76,
          isBreached: false,
          shouldEscalate: true,
        },
        {
          id: 'queue-urgent',
          responseId: 'response-urgent',
          topicId: 'topic-urgent',
          authorId: 'author-urgent',
          priority: 'URGENT',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 50,
          slaMinutes: 60,
          slaPercent: 83,
          isBreached: false,
          shouldEscalate: true,
        },
      ];

      mockPrisma.childContentReviewQueue.update.mockResolvedValue({});

      const result = await job.autoEscalateStaleItems(staleItems);

      // Only LOW and NORMAL should be escalated, not URGENT
      expect(result).toBe(2);
      expect(mockPrisma.childContentReviewQueue.update).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully and continue processing', async () => {
      const staleItems: StaleQueueItem[] = [
        {
          id: 'queue-fail',
          responseId: 'response-fail',
          topicId: 'topic-fail',
          authorId: 'author-fail',
          priority: 'LOW',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 2200,
          slaMinutes: 2880,
          slaPercent: 76,
          isBreached: false,
          shouldEscalate: true,
        },
        {
          id: 'queue-success',
          responseId: 'response-success',
          topicId: 'topic-success',
          authorId: 'author-success',
          priority: 'NORMAL',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 1100,
          slaMinutes: 1440,
          slaPercent: 76,
          isBreached: false,
          shouldEscalate: true,
        },
      ];

      mockPrisma.childContentReviewQueue.update
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({});

      const result = await job.autoEscalateStaleItems(staleItems);

      // Should still process second item despite first failing
      expect(result).toBe(1);
      expect(mockPrisma.childContentReviewQueue.update).toHaveBeenCalledTimes(2);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to escalate'),
        expect.any(String),
      );
    });
  });

  describe('notifyAdminsOfBreaches', () => {
    it('should return 0 when no breaches exist', async () => {
      const result = await job.notifyAdminsOfBreaches([]);

      expect(result).toBe(0);
      expect(loggerSpy.error).not.toHaveBeenCalled();
      expect(mockNotificationClient.sendSlaBreachNotification).not.toHaveBeenCalled();
    });

    it('should log error for each breached item and send notification', async () => {
      const breachedItems: StaleQueueItem[] = [
        {
          id: 'breach-1',
          responseId: 'response-1',
          topicId: 'topic-1',
          authorId: 'author-1',
          priority: 'URGENT',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 90,
          slaMinutes: 60,
          slaPercent: 150,
          isBreached: true,
          shouldEscalate: true,
        },
        {
          id: 'breach-2',
          responseId: 'response-2',
          topicId: 'topic-2',
          authorId: 'author-2',
          priority: 'HIGH',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 300,
          slaMinutes: 240,
          slaPercent: 125,
          isBreached: true,
          shouldEscalate: true,
        },
      ];

      const result = await job.notifyAdminsOfBreaches(breachedItems);

      expect(result).toBe(2);
      // Should log individual breaches + summary
      expect(loggerSpy.error).toHaveBeenCalledTimes(3);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('SLA BREACH: Item breach-1'),
      );
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('SLA BREACH: Item breach-2'),
      );
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('SLA BREACH SUMMARY'),
        expect.any(Object),
      );

      // Should call notification service
      expect(mockNotificationClient.sendSlaBreachNotification).toHaveBeenCalledTimes(1);
      expect(mockNotificationClient.sendSlaBreachNotification).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            queueId: 'breach-1',
            priority: 'URGENT',
          }),
          expect.objectContaining({
            queueId: 'breach-2',
            priority: 'HIGH',
          }),
        ]),
      );
    });

    it('should include correct breach percentage in notification', async () => {
      const breachedItems: StaleQueueItem[] = [
        {
          id: 'breach-1',
          responseId: 'response-1',
          topicId: 'topic-1',
          authorId: 'author-1',
          priority: 'NORMAL',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 2160, // 150% of 1440
          slaMinutes: 1440,
          slaPercent: 150,
          isBreached: true,
          shouldEscalate: true,
        },
      ];

      await job.notifyAdminsOfBreaches(breachedItems);

      expect(loggerSpy.error).toHaveBeenCalledWith(expect.stringContaining('150%'));
    });

    it('should handle notification service failure gracefully', async () => {
      mockNotificationClient.sendSlaBreachNotification.mockResolvedValue(null);

      const breachedItems: StaleQueueItem[] = [
        {
          id: 'breach-1',
          responseId: 'response-1',
          topicId: 'topic-1',
          authorId: 'author-1',
          priority: 'URGENT',
          status: 'PENDING',
          createdAt: new Date(),
          ageMinutes: 90,
          slaMinutes: 60,
          slaPercent: 150,
          isBreached: true,
          shouldEscalate: true,
        },
      ];

      // Should not throw, just return breach count
      const result = await job.notifyAdminsOfBreaches(breachedItems);

      expect(result).toBe(1);
      expect(mockNotificationClient.sendSlaBreachNotification).toHaveBeenCalled();
    });
  });

  describe('checkSlaCompliance', () => {
    it('should process all pending items and return compliance result', async () => {
      // Mock no stale items
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([]);
      mockPrisma.childContentReviewQueue.count.mockResolvedValue(5);

      const result = await job.checkSlaCompliance();

      expect(result.totalPending).toBe(5);
      expect(result.withinSla).toBe(5);
      expect(result.approachingSla).toBe(0);
      expect(result.breachedSla).toBe(0);
      expect(result.escalatedCount).toBe(0);
      expect(result.notificationsSent).toBe(0);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should correctly categorize approaching and breached items', async () => {
      const items = [
        createMockItem('approaching', 'URGENT', 50), // ~83% - approaching
        createMockItem('breached', 'HIGH', 300), // 125% - breached
      ];

      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);
      mockPrisma.childContentReviewQueue.count.mockResolvedValue(10);
      mockPrisma.childContentReviewQueue.update.mockResolvedValue({});

      const result = await job.checkSlaCompliance();

      expect(result.totalPending).toBe(10);
      expect(result.withinSla).toBe(8); // 10 - 2 stale items
      expect(result.approachingSla).toBe(1);
      expect(result.breachedSla).toBe(1);
    });

    it('should escalate approaching items and notify on breaches', async () => {
      const items = [
        createMockItem('escalate-me', 'LOW', 2200), // 76% - should escalate
        createMockItem('breached', 'URGENT', 90), // 150% - breached
      ];

      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue(items);
      mockPrisma.childContentReviewQueue.count.mockResolvedValue(2);
      mockPrisma.childContentReviewQueue.update.mockResolvedValue({});

      const result = await job.checkSlaCompliance();

      expect(result.escalatedCount).toBe(1); // LOW escalated to NORMAL
      expect(result.notificationsSent).toBe(1); // 1 breach notification
      expect(mockPrisma.childContentReviewQueue.update).toHaveBeenCalledTimes(1);
    });

    it('should log completion message', async () => {
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([]);
      mockPrisma.childContentReviewQueue.count.mockResolvedValue(0);

      await job.checkSlaCompliance();

      expect(loggerSpy.log).toHaveBeenCalledWith(expect.stringContaining('Starting SLA'));
      expect(loggerSpy.log).toHaveBeenCalledWith(expect.stringContaining('SLA check complete'));
    });

    it('should handle errors and rethrow', async () => {
      mockPrisma.childContentReviewQueue.findMany.mockRejectedValue(new Error('DB error'));

      await expect(job.checkSlaCompliance()).rejects.toThrow('DB error');
      expect(loggerSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('SLA compliance check failed'),
        expect.any(String),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle items at exactly SLA threshold (75%)', async () => {
      // NORMAL SLA is 1440 min, exactly 75% is 1080 min
      const item = createMockItem('exact-threshold', 'NORMAL', 1080);
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(1);
      expect(result[0].shouldEscalate).toBe(true);
      expect(result[0].slaPercent).toBeCloseTo(75, 0);
    });

    it('should handle items at exactly 100% SLA (just breached)', async () => {
      // HIGH SLA is 240 min, exactly 100% is 240 min
      const item = createMockItem('exact-breach', 'HIGH', 240);
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(1);
      expect(result[0].isBreached).toBe(true);
      expect(result[0].slaPercent).toBeCloseTo(100, 0);
    });

    it('should handle items just below threshold (74%)', async () => {
      // LOW SLA is 2880 min, 74% is 2131 min
      const item = createMockItem('below-threshold', 'LOW', 2131);
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

      const result = await job.getStaleItems();

      // Should NOT be included (74% < 75% threshold)
      expect(result).toHaveLength(0);
    });

    it('should handle severely breached items (e.g., 500% over SLA)', async () => {
      // URGENT SLA is 60 min, 500% would be 300 min
      const item = createMockItem('severe-breach', 'URGENT', 300);
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

      const result = await job.getStaleItems();

      expect(result).toHaveLength(1);
      expect(result[0].isBreached).toBe(true);
      expect(result[0].slaPercent).toBe(500);
    });

    it('should handle empty pending queue', async () => {
      mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([]);
      mockPrisma.childContentReviewQueue.count.mockResolvedValue(0);

      const result = await job.checkSlaCompliance();

      expect(result.totalPending).toBe(0);
      expect(result.withinSla).toBe(0);
      expect(result.approachingSla).toBe(0);
      expect(result.breachedSla).toBe(0);
    });
  });

  describe('Priority-specific SLA Tests', () => {
    describe('URGENT Priority (1 hour SLA)', () => {
      it('should flag item at 45 minutes (75%) for escalation', async () => {
        const item = createMockItem('urgent-45', 'URGENT', 45);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].shouldEscalate).toBe(true);
        expect(result[0].isBreached).toBe(false);
      });

      it('should flag item at 60 minutes (100%) as breached', async () => {
        const item = createMockItem('urgent-60', 'URGENT', 60);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].isBreached).toBe(true);
      });
    });

    describe('HIGH Priority (4 hour SLA)', () => {
      it('should flag item at 3 hours (180 min, 75%) for escalation', async () => {
        const item = createMockItem('high-180', 'HIGH', 180);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].shouldEscalate).toBe(true);
        expect(result[0].isBreached).toBe(false);
      });

      it('should flag item at 4 hours (240 min, 100%) as breached', async () => {
        const item = createMockItem('high-240', 'HIGH', 240);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].isBreached).toBe(true);
      });
    });

    describe('NORMAL Priority (24 hour SLA)', () => {
      it('should flag item at 18 hours (1080 min, 75%) for escalation', async () => {
        const item = createMockItem('normal-1080', 'NORMAL', 1080);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].shouldEscalate).toBe(true);
        expect(result[0].isBreached).toBe(false);
      });

      it('should flag item at 24 hours (1440 min, 100%) as breached', async () => {
        const item = createMockItem('normal-1440', 'NORMAL', 1440);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].isBreached).toBe(true);
      });
    });

    describe('LOW Priority (48 hour SLA)', () => {
      it('should flag item at 36 hours (2160 min, 75%) for escalation', async () => {
        const item = createMockItem('low-2160', 'LOW', 2160);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].shouldEscalate).toBe(true);
        expect(result[0].isBreached).toBe(false);
      });

      it('should flag item at 48 hours (2880 min, 100%) as breached', async () => {
        const item = createMockItem('low-2880', 'LOW', 2880);
        mockPrisma.childContentReviewQueue.findMany.mockResolvedValue([item]);

        const result = await job.getStaleItems();

        expect(result).toHaveLength(1);
        expect(result[0].isBreached).toBe(true);
      });
    });
  });
});
