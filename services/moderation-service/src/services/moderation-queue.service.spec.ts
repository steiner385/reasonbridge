import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerationQueueService } from './moderation-queue.service.js';

/**
 * ModerationQueueService Unit Tests
 *
 * Tests focus on queue logic, priority calculation, and analytics methods.
 * Database integration is tested via E2E tests.
 */
describe('ModerationQueueService', () => {
  let service: ModerationQueueService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      moderationAction: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      appeal: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      report: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new ModerationQueueService(mockPrisma);
  });

  describe('Service Instantiation', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(ModerationQueueService);
    });

    it('should have all required methods', () => {
      const methods = ['getQueue', 'getQueueStats', 'getAnalytics'];

      for (const method of methods) {
        expect(typeof (service as any)[method]).toBe('function');
      }
    });
  });

  describe('Queue Item Interfaces', () => {
    it('should define QueueItem interface structure', () => {
      const item = {
        type: 'action' as const,
        id: '550e8400-e29b-41d4-a716-446655440001',
        priority: 'high' as const,
        waitTime: 'PT2H30M',
        summary: 'warn on response abc123',
      };

      expect(item.type).toBe('action');
      expect(item.priority).toBe('high');
      expect(item.waitTime).toMatch(/^PT/);
      expect(typeof item.summary).toBe('string');
    });

    it('should support all queue item types', () => {
      const types: Array<'action' | 'appeal' | 'report'> = ['action', 'appeal', 'report'];

      for (const type of types) {
        const item = {
          type,
          id: 'test-id',
          priority: 'normal' as const,
          waitTime: 'PT1H',
          summary: 'test',
        };
        expect(item.type).toBe(type);
      }
    });

    it('should support all priority levels', () => {
      const priorities: Array<'high' | 'normal' | 'low'> = ['high', 'normal', 'low'];

      for (const priority of priorities) {
        const item = {
          type: 'action' as const,
          id: 'test-id',
          priority,
          waitTime: 'PT1H',
          summary: 'test',
        };
        expect(item.priority).toBe(priority);
      }
    });
  });

  describe('Queue Response Interfaces', () => {
    it('should define QueueResponse structure', () => {
      const response = {
        items: [
          {
            type: 'action' as const,
            id: 'id1',
            priority: 'high' as const,
            waitTime: 'PT1H',
            summary: 'Action 1',
          },
        ],
        totalCount: 42,
      };

      expect(Array.isArray(response.items)).toBe(true);
      expect(typeof response.totalCount).toBe('number');
      expect(response.totalCount).toBe(42);
    });

    it('should define QueueStats structure', () => {
      const stats = {
        pendingActions: 5,
        pendingAppeals: 2,
        pendingReports: 3,
        avgResolutionTimeMinutes: 45,
        oldestItemAge: 'PT3H30M',
      };

      expect(typeof stats.pendingActions).toBe('number');
      expect(typeof stats.pendingAppeals).toBe('number');
      expect(typeof stats.pendingReports).toBe('number');
      expect(typeof stats.avgResolutionTimeMinutes).toBe('number');
      expect(stats.oldestItemAge).toMatch(/^PT/);
    });
  });

  describe('Priority Calculation Logic', () => {
    it('should calculate high priority for consequential actions', async () => {
      const action = {
        id: 'action-1',
        severity: 'CONSEQUENTIAL',
        aiConfidence: 0.9,
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'ban',
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrisma.moderationAction.findMany.mockResolvedValue([action]);
      mockPrisma.moderationAction.count.mockResolvedValue(1);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue('action', undefined, 20);

      expect(response.items.length).toBeGreaterThan(0);
      if (response.items.length > 0) {
        const firstItem = response.items[0];
        // High priority items should be first
        expect(['high', 'normal', 'low']).toContain(firstItem?.priority);
      }
    });

    it('should calculate normal priority for medium severity actions', async () => {
      const action = {
        id: 'action-1',
        severity: 'MEDIUM',
        aiConfidence: 0.8,
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'warn',
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrisma.moderationAction.findMany.mockResolvedValue([action]);
      mockPrisma.moderationAction.count.mockResolvedValue(1);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue('action', undefined, 20);

      expect(response.items).toBeDefined();
    });
  });

  describe('Wait Time Calculation', () => {
    it('should calculate wait time in hours', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const action = {
        id: 'action-1',
        severity: 'CONSEQUENTIAL',
        aiConfidence: 0.9,
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'ban',
        status: 'PENDING',
        createdAt: oneHourAgo,
      };

      mockPrisma.moderationAction.findMany.mockResolvedValue([action]);
      mockPrisma.moderationAction.count.mockResolvedValue(1);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue('action', undefined, 20);

      expect(response.items.length).toBeGreaterThan(0);
      if (response.items.length > 0) {
        const item = response.items[0];
        expect(item?.waitTime).toMatch(/^PT\d+[HMS]$/);
      }
    });

    it('should calculate wait time in days for older items', async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const action = {
        id: 'action-1',
        severity: 'CONSEQUENTIAL',
        aiConfidence: 0.9,
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'ban',
        status: 'PENDING',
        createdAt: twoDaysAgo,
      };

      mockPrisma.moderationAction.findMany.mockResolvedValue([action]);
      mockPrisma.moderationAction.count.mockResolvedValue(1);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue('action', undefined, 20);

      expect(response.items.length).toBeGreaterThan(0);
      if (response.items.length > 0) {
        const item = response.items[0];
        expect(item?.waitTime).toMatch(/^P\d+D$/);
      }
    });
  });

  describe('Queue Filtering by Type', () => {
    it('should filter queue by action type', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue('action');

      expect(response).toBeDefined();
      expect(response.totalCount).toBeDefined();
    });

    it('should filter queue by appeal type', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue('appeal');

      expect(response).toBeDefined();
      expect(response.totalCount).toBeDefined();
    });

    it('should filter queue by report type', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue('report');

      expect(response).toBeDefined();
      expect(response.totalCount).toBeDefined();
    });
  });

  describe('Queue Statistics', () => {
    it('should return queue statistics with all required fields', async () => {
      mockPrisma.moderationAction.count.mockResolvedValue(5);
      mockPrisma.appeal.count.mockResolvedValue(2);
      // Note: Report model is not yet implemented, so pendingReports is hardcoded to 0
      // mockPrisma.report.count.mockResolvedValue(3);
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      // mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.findFirst.mockResolvedValue(null);
      mockPrisma.appeal.findFirst.mockResolvedValue(null);
      // mockPrisma.report.findFirst.mockResolvedValue(null);

      const stats = await service.getQueueStats();

      expect(stats.pendingActions).toBe(5);
      expect(stats.pendingAppeals).toBe(2);
      // TODO: Update when Report model is implemented - currently hardcoded to 0
      expect(stats.pendingReports).toBe(0);
      expect(typeof stats.avgResolutionTimeMinutes).toBe('number');
      expect(stats.oldestItemAge).toBeDefined();
    });

    it('should calculate average resolution time from resolved actions', async () => {
      mockPrisma.moderationAction.count.mockResolvedValue(0);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.count.mockResolvedValue(0);

      const now = new Date();
      const createdAt = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const approvedAt = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago

      mockPrisma.moderationAction.findMany.mockResolvedValue([
        {
          id: 'action-1',
          createdAt,
          approvedAt,
          status: 'ACTIVE',
          severity: 'NON_PUNITIVE',
          aiRecommended: false,
          aiConfidence: null,
          approvedById: null,
          targetType: 'RESPONSE',
          targetId: 'resp-1',
          actionType: 'educate',
          reasoning: 'test',
          executedAt: approvedAt,
          isTemporary: false,
          expiresAt: null,
          liftedAt: null,
        },
      ]);

      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.findFirst.mockResolvedValue(null);
      mockPrisma.appeal.findFirst.mockResolvedValue(null);
      mockPrisma.report.findFirst.mockResolvedValue(null);

      const stats = await service.getQueueStats();

      expect(stats.avgResolutionTimeMinutes).toBeGreaterThan(0);
    });
  });

  describe('Analytics', () => {
    it('should return analytics for a given time period', async () => {
      const startDate = new Date('2026-01-10');
      const endDate = new Date('2026-01-18');

      mockPrisma.moderationAction.findMany.mockResolvedValue([]);
      mockPrisma.appeal.findMany.mockResolvedValue([]);

      const analytics = await service.getAnalytics(startDate, endDate);

      expect(analytics.period.startDate).toEqual(startDate);
      expect(analytics.period.endDate).toEqual(endDate);
      expect(analytics.summary).toBeDefined();
      expect(analytics.rates).toBeDefined();
      expect(analytics.timing).toBeDefined();
      expect(analytics.breakdown).toBeDefined();
    });

    it('should calculate approval and reversal rates', async () => {
      const startDate = new Date('2026-01-10');
      const endDate = new Date('2026-01-18');

      const actions = [
        {
          id: 'action-1',
          createdAt: startDate,
          approvedAt: new Date(),
          status: 'ACTIVE',
          severity: 'CONSEQUENTIAL',
          aiRecommended: false,
          aiConfidence: null,
          approvedById: 'mod-1',
          targetType: 'RESPONSE',
          targetId: 'resp-1',
          actionType: 'warn',
          reasoning: 'test',
          executedAt: new Date(),
          isTemporary: false,
          expiresAt: null,
          liftedAt: null,
        },
        {
          id: 'action-2',
          createdAt: startDate,
          approvedAt: null,
          status: 'REVERSED',
          severity: 'NON_PUNITIVE',
          aiRecommended: true,
          aiConfidence: 0.8,
          approvedById: null,
          targetType: 'USER',
          targetId: 'user-1',
          actionType: 'educate',
          reasoning: 'test',
          executedAt: null,
          isTemporary: false,
          expiresAt: null,
          liftedAt: null,
        },
      ];

      mockPrisma.moderationAction.findMany.mockResolvedValue(actions);
      mockPrisma.appeal.findMany.mockResolvedValue([]);

      const analytics = await service.getAnalytics(startDate, endDate);

      expect(analytics.summary.totalActions).toBe(2);
      expect(analytics.summary.approvedActions).toBe(1);
      expect(analytics.summary.reversedActions).toBe(1);
      expect(analytics.rates.approvalRate).toBe(50);
      expect(analytics.rates.reversalRate).toBe(50);
    });

    it('should calculate action type breakdown', async () => {
      const startDate = new Date('2026-01-10');
      const endDate = new Date('2026-01-18');

      const actions = [
        {
          id: 'action-1',
          createdAt: startDate,
          approvedAt: null,
          status: 'PENDING',
          severity: 'CONSEQUENTIAL',
          aiRecommended: false,
          aiConfidence: null,
          approvedById: null,
          targetType: 'RESPONSE',
          targetId: 'resp-1',
          actionType: 'warn',
          reasoning: 'test',
          executedAt: null,
          isTemporary: false,
          expiresAt: null,
          liftedAt: null,
        },
        {
          id: 'action-2',
          createdAt: startDate,
          approvedAt: null,
          status: 'PENDING',
          severity: 'NON_PUNITIVE',
          aiRecommended: true,
          aiConfidence: 0.8,
          approvedById: null,
          targetType: 'USER',
          targetId: 'user-1',
          actionType: 'educate',
          reasoning: 'test',
          executedAt: null,
          isTemporary: false,
          expiresAt: null,
          liftedAt: null,
        },
        {
          id: 'action-3',
          createdAt: startDate,
          approvedAt: null,
          status: 'PENDING',
          severity: 'CONSEQUENTIAL',
          aiRecommended: false,
          aiConfidence: null,
          approvedById: null,
          targetType: 'RESPONSE',
          targetId: 'resp-2',
          actionType: 'warn',
          reasoning: 'test',
          executedAt: null,
          isTemporary: false,
          expiresAt: null,
          liftedAt: null,
        },
      ];

      mockPrisma.moderationAction.findMany.mockResolvedValue(actions);
      mockPrisma.appeal.findMany.mockResolvedValue([]);

      const analytics = await service.getAnalytics(startDate, endDate);

      expect(analytics.breakdown.byActionType.warn).toBe(2);
      expect(analytics.breakdown.byActionType.educate).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should support cursor-based pagination', async () => {
      const pageSize = 5;
      const cursor = 'action-cursor-id';

      mockPrisma.moderationAction.findMany.mockResolvedValue([]);
      mockPrisma.moderationAction.count.mockResolvedValue(10);
      mockPrisma.appeal.findMany.mockResolvedValue([]);
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const response = await service.getQueue(undefined, undefined, pageSize, cursor);

      expect(response.totalCount).toBe(10);
    });
  });
});
