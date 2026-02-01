// @ts-nocheck
/**
 * Integration tests for Appeal Process
 *
 * Tests the complete appeal workflow including:
 * 1. Moderator Assignment Flow: Assign → Review → Resolve
 * 2. Appeal Queue Management: Pagination, filtering, statistics
 * 3. Complete Appeal Lifecycle: Create → Assign → Review → Resolve
 * 4. Edge Cases: Re-appealing after denial, concurrent appeals prevention
 *
 * These tests verify the service layer interactions and state transitions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppealService } from '../../services/appeal.service.js';
import { ModerationActionsService } from '../../services/moderation-actions.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueueService } from '../../queue/queue.service.js';
import {
  testResponseId,
  testUserId,
  testModeratorId,
  testModerationActionId,
  testAppealId,
  mockModerator,
  mockUser,
  createMockModerationAction,
  createMockAppeal,
} from '../fixtures/test-data.js';

describe('Appeal Process Integration Tests', () => {
  let appealService: AppealService;
  let moderationActionsService: ModerationActionsService;
  let mockPrisma: any;
  let mockQueueService: any;

  beforeEach(() => {
    // Mock QueueService
    mockQueueService = {
      publishEvent: vi.fn().mockResolvedValue('message-id-123'),
      initialize: vi.fn().mockResolvedValue(undefined),
      startConsuming: vi.fn().mockResolvedValue(undefined),
      stopConsuming: vi.fn().mockResolvedValue(undefined),
      getHealthStatus: vi.fn().mockReturnValue({ publisherReady: true }),
    };

    // Mock Prisma with default implementations
    mockPrisma = {
      moderationAction: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({ _avg: { aiConfidence: null } }),
      },
      appeal: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    // Create service instances
    appealService = new AppealService(
      mockPrisma as unknown as PrismaService,
      mockQueueService as unknown as QueueService,
    );

    moderationActionsService = new ModerationActionsService(
      mockPrisma as unknown as PrismaService,
      mockQueueService as unknown as QueueService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Moderator Assignment Flow', () => {
    it('should assign appeal to moderator and transition to UNDER_REVIEW', async () => {
      const pendingAppeal = createMockAppeal({
        status: 'PENDING',
        reviewerId: null,
      });
      const assignedAppeal = {
        ...pendingAppeal,
        status: 'UNDER_REVIEW',
        reviewerId: testModeratorId,
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.user.findUnique.mockResolvedValue(mockModerator);
      mockPrisma.appeal.update.mockResolvedValue(assignedAppeal);

      const result = await appealService.assignAppealToModerator(testAppealId, testModeratorId);

      expect(mockPrisma.appeal.update).toHaveBeenCalledWith({
        where: { id: testAppealId },
        data: {
          reviewerId: testModeratorId,
          status: 'UNDER_REVIEW',
        },
      });
      expect(result.status).toBe('UNDER_REVIEW');
      expect(result.reviewerId).toBe(testModeratorId);
    });

    it('should allow unassigning appeal and returning to PENDING', async () => {
      const assignedAppeal = createMockAppeal({
        status: 'UNDER_REVIEW',
        reviewerId: testModeratorId,
      });
      const unassignedAppeal = {
        ...assignedAppeal,
        status: 'PENDING',
        reviewerId: null,
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(assignedAppeal);
      mockPrisma.appeal.update.mockResolvedValue(unassignedAppeal);

      const result = await appealService.unassignAppeal(testAppealId);

      expect(mockPrisma.appeal.update).toHaveBeenCalledWith({
        where: { id: testAppealId },
        data: {
          reviewerId: null,
          status: 'PENDING',
        },
      });
      expect(result.status).toBe('PENDING');
      expect(result.reviewerId).toBeNull();
    });

    it('should prevent assigning already assigned appeal', async () => {
      const assignedAppeal = createMockAppeal({
        status: 'UNDER_REVIEW',
        reviewerId: 'other-moderator-id',
      });

      mockPrisma.appeal.findUnique.mockResolvedValue(assignedAppeal);

      await expect(
        appealService.assignAppealToModerator(testAppealId, testModeratorId),
      ).rejects.toThrow('Appeal must be in PENDING status to assign');
    });

    it('should prevent unassigning PENDING appeal', async () => {
      const pendingAppeal = createMockAppeal({
        status: 'PENDING',
        reviewerId: null,
      });

      mockPrisma.appeal.findUnique.mockResolvedValue(pendingAppeal);

      await expect(appealService.unassignAppeal(testAppealId)).rejects.toThrow(
        'Appeal must be in UNDER_REVIEW status to unassign',
      );
    });

    it('should validate moderator exists before assignment', async () => {
      const pendingAppeal = createMockAppeal({
        status: 'PENDING',
      });

      mockPrisma.appeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.user.findUnique.mockResolvedValue(null); // Moderator not found

      await expect(
        appealService.assignAppealToModerator(testAppealId, 'nonexistent-mod'),
      ).rejects.toThrow('Moderator nonexistent-mod not found');
    });
  });

  describe('Complete Appeal Lifecycle with Assignment', () => {
    it('should complete full lifecycle: Create → Assign → Review (Upheld)', async () => {
      // Step 1: Create appeal
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
      });
      const newAppeal = createMockAppeal({
        id: 'lifecycle-appeal-1',
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);
      mockPrisma.appeal.findUnique.mockResolvedValue(null);
      mockPrisma.appeal.create.mockResolvedValue(newAppeal);

      const createResult = await moderationActionsService.createAppeal(
        testModerationActionId,
        testUserId,
        { reason: 'I believe this moderation action was taken in error and should be reversed.' },
      );
      expect(createResult.status).toBe('pending');

      // Step 2: Assign to moderator
      mockPrisma.appeal.findUnique.mockResolvedValue(newAppeal);
      mockPrisma.user.findUnique.mockResolvedValue(mockModerator);
      const assignedAppeal = {
        ...newAppeal,
        status: 'UNDER_REVIEW',
        reviewerId: testModeratorId,
      };
      mockPrisma.appeal.update.mockResolvedValue(assignedAppeal);

      const assignResult = await appealService.assignAppealToModerator(
        'lifecycle-appeal-1',
        testModeratorId,
      );
      expect(assignResult.status).toBe('UNDER_REVIEW');

      // Step 3: Review and uphold (using AppealService which allows UNDER_REVIEW status)
      const appealWithAction = {
        ...assignedAppeal,
        moderationAction: { ...activeAction, id: testModerationActionId, status: 'APPEALED' },
      };
      const upheldAppeal = {
        ...appealWithAction,
        status: 'UPHELD',
        decisionReasoning: 'Upon review, the original action was inappropriate.',
        resolvedAt: new Date(),
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(appealWithAction);
      mockPrisma.appeal.update.mockResolvedValue(upheldAppeal);
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...activeAction,
        status: 'REVERSED',
      });

      mockQueueService.publishEvent.mockClear();

      // Use AppealService.reviewAppeal which allows UNDER_REVIEW status
      const reviewResult = await appealService.reviewAppeal('lifecycle-appeal-1', testModeratorId, {
        decision: 'upheld',
        reasoning: 'Upon review, the original action was inappropriate and should be reversed.',
      });

      expect(reviewResult.status).toBe('UPHELD');
      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.trust.updated',
          payload: expect.objectContaining({
            userId: testUserId,
            reason: 'appeal_upheld',
          }),
        }),
      );
    });

    it('should complete lifecycle with denial: Create → Assign → Review (Denied)', async () => {
      // Step 1: Create appeal
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
      });
      const newAppeal = createMockAppeal({
        id: 'lifecycle-appeal-2',
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);
      mockPrisma.appeal.findUnique.mockResolvedValue(null);
      mockPrisma.appeal.create.mockResolvedValue(newAppeal);

      await moderationActionsService.createAppeal(testModerationActionId, testUserId, {
        reason: 'I believe this moderation action was taken in error and should be reversed.',
      });

      // Step 2: Assign to moderator
      mockPrisma.appeal.findUnique.mockResolvedValue(newAppeal);
      mockPrisma.user.findUnique.mockResolvedValue(mockModerator);
      const assignedAppeal = {
        ...newAppeal,
        status: 'UNDER_REVIEW',
        reviewerId: testModeratorId,
      };
      mockPrisma.appeal.update.mockResolvedValue(assignedAppeal);

      await appealService.assignAppealToModerator('lifecycle-appeal-2', testModeratorId);

      // Step 3: Review and deny (using AppealService which allows UNDER_REVIEW status)
      const appealWithAction = {
        ...assignedAppeal,
        moderationAction: { ...activeAction, id: testModerationActionId, status: 'APPEALED' },
      };
      const deniedAppeal = {
        ...appealWithAction,
        status: 'DENIED',
        decisionReasoning: 'The original moderation decision was correct.',
        resolvedAt: new Date(),
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(appealWithAction);
      mockPrisma.appeal.update.mockResolvedValue(deniedAppeal);

      mockQueueService.publishEvent.mockClear();
      mockPrisma.moderationAction.update.mockClear();

      // Use AppealService.reviewAppeal which allows UNDER_REVIEW status
      const reviewResult = await appealService.reviewAppeal('lifecycle-appeal-2', testModeratorId, {
        decision: 'denied',
        reasoning: 'The original moderation decision was correct and will be maintained.',
      });

      expect(reviewResult.status).toBe('DENIED');
      // No trust update event for denied appeals
      expect(mockQueueService.publishEvent).not.toHaveBeenCalled();
      // Moderation action should NOT be updated during review for denied appeals
      expect(mockPrisma.moderationAction.update).not.toHaveBeenCalled();
    });
  });

  describe('Pending Appeals Queue Management', () => {
    it('should retrieve pending appeals with pagination', async () => {
      const appeals = [
        createMockAppeal({ id: 'appeal-1', status: 'PENDING' }),
        createMockAppeal({ id: 'appeal-2', status: 'PENDING' }),
        createMockAppeal({ id: 'appeal-3', status: 'PENDING' }),
      ].map((appeal) => ({
        ...appeal,
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      }));

      mockPrisma.appeal.count.mockResolvedValue(10);
      mockPrisma.appeal.findMany.mockResolvedValue(appeals);

      const result = await appealService.getPendingAppeals(3);

      expect(result.totalCount).toBe(10);
      expect(result.appeals).toHaveLength(3);
      expect(result.nextCursor).toBe('appeal-3');
      expect(mockPrisma.appeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
          take: 3,
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should support cursor-based pagination for appeals', async () => {
      const appeals = [createMockAppeal({ id: 'appeal-4', status: 'PENDING' })].map((appeal) => ({
        ...appeal,
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      }));

      mockPrisma.appeal.count.mockResolvedValue(10);
      mockPrisma.appeal.findMany.mockResolvedValue(appeals);

      await appealService.getPendingAppeals(5, 'appeal-3');

      expect(mockPrisma.appeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'appeal-3' },
          take: 5,
        }),
      );
    });

    it('should filter pending appeals by assigned moderator', async () => {
      mockPrisma.appeal.count.mockResolvedValue(3);
      mockPrisma.appeal.findMany.mockResolvedValue([]);

      await appealService.getPendingAppeals(20, undefined, testModeratorId);

      expect(mockPrisma.appeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            reviewerId: testModeratorId,
          },
        }),
      );
    });

    it('should return empty nextCursor when no more results', async () => {
      const appeals = [createMockAppeal({ id: 'appeal-1', status: 'PENDING' })].map((appeal) => ({
        ...appeal,
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      }));

      mockPrisma.appeal.count.mockResolvedValue(1); // Only 1 total
      mockPrisma.appeal.findMany.mockResolvedValue(appeals);

      const result = await appealService.getPendingAppeals(10);

      expect(result.totalCount).toBe(1);
      expect(result.appeals).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('Appeal Statistics Tracking', () => {
    it('should calculate appeal statistics correctly', async () => {
      mockPrisma.appeal.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25) // pending
        .mockResolvedValueOnce(10) // underReview
        .mockResolvedValueOnce(45) // upheld
        .mockResolvedValueOnce(20); // denied

      mockPrisma.appeal.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 25 },
        { status: 'UNDER_REVIEW', _count: 10 },
        { status: 'UPHELD', _count: 45 },
        { status: 'DENIED', _count: 20 },
      ]);

      const result = await appealService.getAppealStatistics();

      expect(result.total).toBe(100);
      expect(result.pending).toBe(25);
      expect(result.underReview).toBe(10);
      expect(result.upheld).toBe(45);
      expect(result.denied).toBe(20);
      expect(result.byStatus).toHaveLength(4);
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.appeal.groupBy.mockResolvedValue([]);

      await appealService.getAppealStatistics(startDate, endDate);

      expect(mockPrisma.appeal.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should handle empty statistics gracefully', async () => {
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.appeal.groupBy.mockResolvedValue([]);

      const result = await appealService.getAppealStatistics();

      expect(result.total).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.underReview).toBe(0);
      expect(result.upheld).toBe(0);
      expect(result.denied).toBe(0);
      expect(result.byStatus).toHaveLength(0);
    });
  });

  describe('Re-Appeal After Denial', () => {
    it('should allow new appeal after previous denial', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE', // Back to ACTIVE after denial
      });
      const previousDeniedAppeal = createMockAppeal({
        id: 'old-appeal',
        status: 'DENIED',
        decisionReasoning: 'Previous denial reasoning',
        resolvedAt: new Date(),
      });
      const newAppeal = createMockAppeal({
        id: 'new-appeal',
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);
      mockPrisma.appeal.findUnique.mockResolvedValue(previousDeniedAppeal);
      mockPrisma.appeal.create.mockResolvedValue(newAppeal);

      const result = await moderationActionsService.createAppeal(
        testModerationActionId,
        testUserId,
        {
          reason:
            'I have new evidence that supports my appeal and would like to request a re-review.',
        },
      );

      expect(result.status).toBe('pending');
      expect(result.id).toBe('new-appeal');
      expect(mockPrisma.appeal.create).toHaveBeenCalled();
    });

    it('should prevent re-appeal while previous appeal is still pending', async () => {
      const activeAction = createMockModerationAction({
        status: 'APPEALED',
      });
      const pendingAppeal = createMockAppeal({
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);
      mockPrisma.appeal.findUnique.mockResolvedValue(pendingAppeal);

      await expect(
        moderationActionsService.createAppeal(testModerationActionId, testUserId, {
          reason: 'Trying to create duplicate appeal while one is pending.',
        }),
      ).rejects.toThrow('An appeal for this moderation action is already pending review');
    });

    it('should prevent re-appeal while previous appeal is under review', async () => {
      const activeAction = createMockModerationAction({
        status: 'APPEALED',
      });
      const underReviewAppeal = createMockAppeal({
        status: 'UNDER_REVIEW',
        reviewerId: testModeratorId,
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);
      mockPrisma.appeal.findUnique.mockResolvedValue(underReviewAppeal);

      await expect(
        moderationActionsService.createAppeal(testModerationActionId, testUserId, {
          reason: 'Trying to create duplicate appeal while one is under review.',
        }),
      ).rejects.toThrow('An appeal for this moderation action is already pending review');
    });
  });

  describe('Appeal Validation', () => {
    it('should validate minimum appeal reason length', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);

      await expect(
        moderationActionsService.createAppeal(testModerationActionId, testUserId, {
          reason: 'Too short',
        }),
      ).rejects.toThrow('Appeal reason must be at least 20 characters long');
    });

    it('should validate maximum appeal reason length', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);

      await expect(
        moderationActionsService.createAppeal(testModerationActionId, testUserId, {
          reason: 'a'.repeat(5001),
        }),
      ).rejects.toThrow('Appeal reason cannot exceed 5000 characters');
    });

    it('should validate decision reasoning minimum length', async () => {
      await expect(
        moderationActionsService.reviewAppeal(testAppealId, testModeratorId, {
          decision: 'upheld',
          reasoning: 'Too short',
        }),
      ).rejects.toThrow('Appeal decision reasoning must be at least 20 characters long');
    });

    it('should validate decision reasoning maximum length', async () => {
      await expect(
        moderationActionsService.reviewAppeal(testAppealId, testModeratorId, {
          decision: 'denied',
          reasoning: 'a'.repeat(2001),
        }),
      ).rejects.toThrow('Appeal decision reasoning cannot exceed 2000 characters');
    });
  });

  describe('Appeal State Transitions', () => {
    it('should prevent reviewing already resolved appeal', async () => {
      const upheldAppeal = createMockAppeal({
        status: 'UPHELD',
        decisionReasoning: 'Already resolved',
        resolvedAt: new Date(),
      });

      mockPrisma.appeal.findUnique.mockResolvedValue(upheldAppeal);

      // AppealService allows PENDING or UNDER_REVIEW, rejects resolved appeals
      await expect(
        appealService.reviewAppeal(testAppealId, testModeratorId, {
          decision: 'denied',
          reasoning: 'Trying to change decision on resolved appeal.',
        }),
      ).rejects.toThrow('Appeal must be in PENDING or UNDER_REVIEW status to review');
    });

    it('should allow reviewing PENDING appeal directly (skip assignment)', async () => {
      const pendingAppeal = createMockAppeal({
        status: 'PENDING',
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      });
      const deniedAppeal = {
        ...pendingAppeal,
        status: 'DENIED',
        reviewerId: testModeratorId,
        decisionReasoning: 'Direct review without assignment.',
        resolvedAt: new Date(),
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.appeal.update.mockResolvedValue(deniedAppeal);

      const result = await moderationActionsService.reviewAppeal(testAppealId, testModeratorId, {
        decision: 'denied',
        reasoning: 'Direct review without formal assignment step.',
      });

      expect(result.status).toBe('denied');
    });

    it('should allow reviewing UNDER_REVIEW appeal', async () => {
      const underReviewAppeal = createMockAppeal({
        status: 'UNDER_REVIEW',
        reviewerId: testModeratorId,
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      });
      const upheldAppeal = {
        ...underReviewAppeal,
        status: 'UPHELD',
        decisionReasoning: 'Appeal has merit.',
        resolvedAt: new Date(),
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(underReviewAppeal);
      mockPrisma.appeal.update.mockResolvedValue(upheldAppeal);
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...underReviewAppeal.moderationAction,
        status: 'REVERSED',
      });

      // Use AppealService which allows UNDER_REVIEW status
      const result = await appealService.reviewAppeal(testAppealId, testModeratorId, {
        decision: 'upheld',
        reasoning: 'Upon careful review, the appeal has merit.',
      });

      expect(result.status).toBe('UPHELD');
    });
  });

  describe('Event Publishing', () => {
    it('should publish trust update event only when appeal is upheld', async () => {
      const appealWithAction = createMockAppeal({
        status: 'PENDING',
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      });

      mockPrisma.appeal.findUnique.mockResolvedValue(appealWithAction);
      mockPrisma.appeal.update.mockResolvedValue({
        ...appealWithAction,
        status: 'UPHELD',
        resolvedAt: new Date(),
      });
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...appealWithAction.moderationAction,
        status: 'REVERSED',
      });

      await moderationActionsService.reviewAppeal(testAppealId, testModeratorId, {
        decision: 'upheld',
        reasoning: 'Appeal is valid and should be upheld.',
      });

      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.trust.updated',
          payload: expect.objectContaining({
            userId: testUserId,
            reason: 'appeal_upheld',
            moderationActionId: testModerationActionId,
          }),
        }),
      );
    });

    it('should NOT publish trust update event when appeal is denied', async () => {
      const appealWithAction = createMockAppeal({
        status: 'PENDING',
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      });

      mockPrisma.appeal.findUnique.mockResolvedValue(appealWithAction);
      mockPrisma.appeal.update.mockResolvedValue({
        ...appealWithAction,
        status: 'DENIED',
        resolvedAt: new Date(),
      });

      await moderationActionsService.reviewAppeal(testAppealId, testModeratorId, {
        decision: 'denied',
        reasoning: 'The appeal does not have sufficient merit.',
      });

      expect(mockQueueService.publishEvent).not.toHaveBeenCalled();
    });

    it('should handle event publishing failure gracefully', async () => {
      const appealWithAction = createMockAppeal({
        status: 'PENDING',
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      });

      mockPrisma.appeal.findUnique.mockResolvedValue(appealWithAction);
      mockPrisma.appeal.update.mockResolvedValue({
        ...appealWithAction,
        status: 'UPHELD',
        resolvedAt: new Date(),
      });
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...appealWithAction.moderationAction,
        status: 'REVERSED',
      });
      mockQueueService.publishEvent.mockRejectedValue(new Error('Queue unavailable'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw even if event publishing fails
      const result = await moderationActionsService.reviewAppeal(testAppealId, testModeratorId, {
        decision: 'upheld',
        reasoning: 'Appeal is valid despite queue issues.',
      });

      expect(result.status).toBe('upheld');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Get Appeal By ID', () => {
    it('should retrieve appeal with associated moderation action', async () => {
      const appealWithAction = {
        ...createMockAppeal({ status: 'PENDING' }),
        moderationAction: {
          ...createMockModerationAction({ status: 'APPEALED' }),
          approvedBy: null,
        },
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(appealWithAction);

      const result = await appealService.getAppealById(testAppealId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(testAppealId);
      expect(result?.moderationAction).toBeDefined();
      // Verify the correct include structure is used
      expect(mockPrisma.appeal.findUnique).toHaveBeenCalledWith({
        where: { id: testAppealId },
        include: {
          moderationAction: {
            include: {
              approvedBy: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return null for non-existent appeal', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue(null);

      const result = await appealService.getAppealById('nonexistent-appeal');

      expect(result).toBeNull();
    });
  });
});
