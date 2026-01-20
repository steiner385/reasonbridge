// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppealService } from '../appeal.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock QueueService
const createMockQueueService = () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
});

// Mock PrismaService
const createMockPrismaService = () => ({
  appeal: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  moderationAction: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
});

describe('AppealService', () => {
  let service: AppealService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockQueueService: ReturnType<typeof createMockQueueService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockQueueService = createMockQueueService();
    service = new AppealService(mockPrisma as any, mockQueueService as any);
    vi.clearAllMocks();
  });

  describe('createAppeal', () => {
    const validRequest = {
      reason: 'This is a valid appeal reason that is at least 20 characters long.',
    };

    it('should throw BadRequestException if reason is empty', async () => {
      await expect(service.createAppeal('action-1', 'user-1', { reason: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if reason is too short', async () => {
      await expect(
        service.createAppeal('action-1', 'user-1', { reason: 'Too short' }),
      ).rejects.toThrow('Appeal reason must be at least 20 characters long');
    });

    it('should throw BadRequestException if reason exceeds 5000 characters', async () => {
      const longReason = 'a'.repeat(5001);
      await expect(
        service.createAppeal('action-1', 'user-1', { reason: longReason }),
      ).rejects.toThrow('Appeal reason cannot exceed 5000 characters');
    });

    it('should throw NotFoundException if moderation action does not exist', async () => {
      mockPrisma.moderationAction.findUnique.mockResolvedValue(null);

      await expect(service.createAppeal('nonexistent', 'user-1', validRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if action is already reversed', async () => {
      mockPrisma.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'REVERSED',
      });

      await expect(service.createAppeal('action-1', 'user-1', validRequest)).rejects.toThrow(
        'Cannot appeal a moderation action that has already been reversed',
      );
    });

    it('should throw BadRequestException if appeal already exists and is pending', async () => {
      mockPrisma.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'ACTIVE',
      });
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'existing-appeal',
        status: 'PENDING',
      });

      await expect(service.createAppeal('action-1', 'user-1', validRequest)).rejects.toThrow(
        'An appeal for this moderation action is already pending review',
      );
    });

    it('should throw BadRequestException if appeal already exists and is under review', async () => {
      mockPrisma.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'ACTIVE',
      });
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'existing-appeal',
        status: 'UNDER_REVIEW',
      });

      await expect(service.createAppeal('action-1', 'user-1', validRequest)).rejects.toThrow(
        'An appeal for this moderation action is already pending review',
      );
    });

    it('should create appeal successfully', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'ACTIVE',
      });
      mockPrisma.appeal.findUnique.mockResolvedValue(null);
      mockPrisma.appeal.create.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: validRequest.reason,
        status: 'PENDING',
        createdAt,
        reviewerId: null,
        decisionReasoning: null,
        resolvedAt: null,
      });

      const result = await service.createAppeal('action-1', 'user-1', validRequest);

      expect(mockPrisma.appeal.create).toHaveBeenCalledWith({
        data: {
          moderationActionId: 'action-1',
          appellantId: 'user-1',
          reason: validRequest.reason,
          status: 'PENDING',
        },
      });
      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: 'action-1' },
        data: { status: 'APPEALED' },
      });
      expect(result.id).toBe('appeal-1');
      expect(result.status).toBe('PENDING');
    });

    it('should allow new appeal if previous appeal was resolved', async () => {
      const createdAt = new Date();
      mockPrisma.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'ACTIVE',
      });
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'old-appeal',
        status: 'DENIED', // Previous appeal was resolved
      });
      mockPrisma.appeal.create.mockResolvedValue({
        id: 'new-appeal',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: validRequest.reason,
        status: 'PENDING',
        createdAt,
        reviewerId: null,
        decisionReasoning: null,
        resolvedAt: null,
      });

      const result = await service.createAppeal('action-1', 'user-1', validRequest);

      expect(result.id).toBe('new-appeal');
    });
  });

  describe('getPendingAppeals', () => {
    it('should return pending appeals with pagination', async () => {
      const createdAt = new Date();
      mockPrisma.appeal.count.mockResolvedValue(5);
      mockPrisma.appeal.findMany.mockResolvedValue([
        {
          id: 'appeal-1',
          moderationActionId: 'action-1',
          appellantId: 'user-1',
          reason: 'Valid reason that is at least 20 characters',
          status: 'PENDING',
          createdAt,
          reviewerId: null,
          decisionReasoning: null,
          resolvedAt: null,
          moderationAction: {
            id: 'action-1',
            targetType: 'RESPONSE',
            targetId: 'response-1',
            actionType: 'WARN',
            severity: 'NON_PUNITIVE',
            reasoning: 'Test reasoning',
            status: 'APPEALED',
            createdAt,
            approvedBy: null,
            approvedAt: null,
            aiRecommended: false,
            aiConfidence: null,
            executedAt: null,
          },
        },
      ]);

      const result = await service.getPendingAppeals(20);

      expect(result.totalCount).toBe(5);
      expect(result.appeals).toHaveLength(1);
      expect(result.appeals[0].id).toBe('appeal-1');
    });

    it('should filter by assigned moderator', async () => {
      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.appeal.findMany.mockResolvedValue([]);

      await service.getPendingAppeals(20, undefined, 'moderator-1');

      expect(mockPrisma.appeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            reviewerId: 'moderator-1',
          }),
        }),
      );
    });

    it('should handle cursor-based pagination', async () => {
      mockPrisma.appeal.count.mockResolvedValue(10);
      mockPrisma.appeal.findMany.mockResolvedValue([]);

      await service.getPendingAppeals(5, 'cursor-appeal-id');

      expect(mockPrisma.appeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'cursor-appeal-id' },
        }),
      );
    });

    it('should return nextCursor when more items exist', async () => {
      const createdAt = new Date();
      mockPrisma.appeal.count.mockResolvedValue(10);
      mockPrisma.appeal.findMany.mockResolvedValue([
        {
          id: 'appeal-1',
          moderationActionId: 'action-1',
          appellantId: 'user-1',
          reason: 'Valid reason',
          status: 'PENDING',
          createdAt,
          reviewerId: null,
          decisionReasoning: null,
          resolvedAt: null,
          moderationAction: null,
        },
        {
          id: 'appeal-2',
          moderationActionId: 'action-2',
          appellantId: 'user-2',
          reason: 'Valid reason',
          status: 'PENDING',
          createdAt,
          reviewerId: null,
          decisionReasoning: null,
          resolvedAt: null,
          moderationAction: null,
        },
      ]);

      const result = await service.getPendingAppeals(2);

      expect(result.nextCursor).toBe('appeal-2');
    });
  });

  describe('assignAppealToModerator', () => {
    it('should throw NotFoundException if appeal does not exist', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue(null);

      await expect(service.assignAppealToModerator('nonexistent', 'mod-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if appeal is not in PENDING status', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'UNDER_REVIEW',
      });

      await expect(service.assignAppealToModerator('appeal-1', 'mod-1')).rejects.toThrow(
        'Appeal must be in PENDING status to assign',
      );
    });

    it('should throw NotFoundException if moderator does not exist', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.assignAppealToModerator('appeal-1', 'nonexistent-mod')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should assign appeal to moderator successfully', async () => {
      const createdAt = new Date();
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'mod-1',
        displayName: 'Moderator',
      });
      mockPrisma.appeal.update.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Valid reason',
        status: 'UNDER_REVIEW',
        reviewerId: 'mod-1',
        createdAt,
        decisionReasoning: null,
        resolvedAt: null,
      });

      const result = await service.assignAppealToModerator('appeal-1', 'mod-1');

      expect(mockPrisma.appeal.update).toHaveBeenCalledWith({
        where: { id: 'appeal-1' },
        data: {
          reviewerId: 'mod-1',
          status: 'UNDER_REVIEW',
        },
      });
      expect(result.status).toBe('UNDER_REVIEW');
      expect(result.reviewerId).toBe('mod-1');
    });
  });

  describe('unassignAppeal', () => {
    it('should throw NotFoundException if appeal does not exist', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue(null);

      await expect(service.unassignAppeal('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if appeal is not UNDER_REVIEW', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
      });

      await expect(service.unassignAppeal('appeal-1')).rejects.toThrow(
        'Appeal must be in UNDER_REVIEW status to unassign',
      );
    });

    it('should unassign appeal successfully', async () => {
      const createdAt = new Date();
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'UNDER_REVIEW',
        reviewerId: 'mod-1',
      });
      mockPrisma.appeal.update.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Valid reason',
        status: 'PENDING',
        reviewerId: null,
        createdAt,
        decisionReasoning: null,
        resolvedAt: null,
      });

      const result = await service.unassignAppeal('appeal-1');

      expect(mockPrisma.appeal.update).toHaveBeenCalledWith({
        where: { id: 'appeal-1' },
        data: {
          reviewerId: null,
          status: 'PENDING',
        },
      });
      expect(result.status).toBe('PENDING');
      expect(result.reviewerId).toBeNull();
    });
  });

  describe('reviewAppeal', () => {
    const validReviewRequest = {
      decision: 'upheld' as const,
      reasoning: 'This appeal has merit and should be upheld.',
    };

    it('should throw BadRequestException if reasoning is empty', async () => {
      await expect(
        service.reviewAppeal('appeal-1', 'mod-1', {
          decision: 'upheld',
          reasoning: '',
        }),
      ).rejects.toThrow('reasoning is required');
    });

    it('should throw BadRequestException if reasoning is too short', async () => {
      await expect(
        service.reviewAppeal('appeal-1', 'mod-1', {
          decision: 'upheld',
          reasoning: 'Too short',
        }),
      ).rejects.toThrow('Appeal decision reasoning must be at least 20 characters long');
    });

    it('should throw BadRequestException if reasoning exceeds 2000 characters', async () => {
      await expect(
        service.reviewAppeal('appeal-1', 'mod-1', {
          decision: 'upheld',
          reasoning: 'a'.repeat(2001),
        }),
      ).rejects.toThrow('Appeal decision reasoning cannot exceed 2000 characters');
    });

    it('should throw NotFoundException if appeal does not exist', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewAppeal('nonexistent', 'mod-1', validReviewRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if appeal is not reviewable', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'UPHELD',
      });

      await expect(service.reviewAppeal('appeal-1', 'mod-1', validReviewRequest)).rejects.toThrow(
        'Appeal must be in PENDING or UNDER_REVIEW status to review',
      );
    });

    it('should deny appeal successfully', async () => {
      const createdAt = new Date();
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
        appellantId: 'user-1',
        moderationAction: null,
      });
      mockPrisma.appeal.update.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Appeal reason',
        status: 'DENIED',
        reviewerId: 'mod-1',
        decisionReasoning: validReviewRequest.reasoning,
        createdAt,
        resolvedAt: new Date(),
      });

      const result = await service.reviewAppeal('appeal-1', 'mod-1', {
        decision: 'denied',
        reasoning: 'The appeal does not have sufficient merit.',
      });

      expect(mockPrisma.appeal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appeal-1' },
          data: expect.objectContaining({
            status: 'DENIED',
            reviewerId: 'mod-1',
          }),
        }),
      );
      expect(result.status).toBe('DENIED');
    });

    it('should uphold appeal and reverse moderation action', async () => {
      const createdAt = new Date();
      const moderationAction = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        status: 'APPEALED',
        reasoning: 'Original reasoning',
      };
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'UNDER_REVIEW',
        appellantId: 'user-1',
        moderationAction,
      });
      mockPrisma.appeal.update.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Appeal reason',
        status: 'UPHELD',
        reviewerId: 'mod-1',
        decisionReasoning: validReviewRequest.reasoning,
        createdAt,
        resolvedAt: new Date(),
      });

      const result = await service.reviewAppeal('appeal-1', 'mod-1', validReviewRequest);

      expect(mockPrisma.appeal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'UPHELD',
          }),
        }),
      );
      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: 'action-1' },
        data: expect.objectContaining({
          status: 'REVERSED',
        }),
      });
      expect(result.status).toBe('UPHELD');
    });

    it('should publish trust update event when appeal is upheld', async () => {
      const createdAt = new Date();
      const moderationAction = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
      };
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
        appellantId: 'user-1',
        moderationAction,
      });
      mockPrisma.appeal.update.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Appeal reason',
        status: 'UPHELD',
        reviewerId: 'mod-1',
        decisionReasoning: validReviewRequest.reasoning,
        createdAt,
        resolvedAt: new Date(),
      });

      await service.reviewAppeal('appeal-1', 'mod-1', validReviewRequest);

      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.trust.updated',
          payload: expect.objectContaining({
            userId: 'user-1',
            reason: 'appeal_upheld',
          }),
        }),
      );
    });

    it('should handle queue service failure gracefully', async () => {
      const createdAt = new Date();
      const moderationAction = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
      };
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
        appellantId: 'user-1',
        moderationAction,
      });
      mockPrisma.appeal.update.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Appeal reason',
        status: 'UPHELD',
        reviewerId: 'mod-1',
        decisionReasoning: validReviewRequest.reasoning,
        createdAt,
        resolvedAt: new Date(),
      });
      mockQueueService.publishEvent.mockRejectedValue(new Error('Queue unavailable'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw even if queue fails
      const result = await service.reviewAppeal('appeal-1', 'mod-1', validReviewRequest);

      expect(result.status).toBe('UPHELD');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getAppealById', () => {
    it('should return null if appeal does not exist', async () => {
      mockPrisma.appeal.findUnique.mockResolvedValue(null);

      const result = await service.getAppealById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return appeal with moderation action', async () => {
      const createdAt = new Date();
      mockPrisma.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Valid reason',
        status: 'PENDING',
        reviewerId: null,
        decisionReasoning: null,
        createdAt,
        resolvedAt: null,
        moderationAction: {
          id: 'action-1',
          targetType: 'RESPONSE',
          targetId: 'response-1',
          actionType: 'WARN',
          severity: 'NON_PUNITIVE',
          reasoning: 'Test reasoning',
          aiRecommended: false,
          aiConfidence: null,
          status: 'APPEALED',
          createdAt,
          approvedBy: null,
          approvedAt: null,
          executedAt: null,
        },
      });

      const result = await service.getAppealById('appeal-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('appeal-1');
      expect(result?.moderationAction).toBeDefined();
      expect(result?.moderationAction.id).toBe('action-1');
    });
  });

  describe('getAppealStatistics', () => {
    it('should return appeal statistics', async () => {
      mockPrisma.appeal.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(10) // underReview
        .mockResolvedValueOnce(40) // upheld
        .mockResolvedValueOnce(20); // denied
      mockPrisma.appeal.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 30 },
        { status: 'UNDER_REVIEW', _count: 10 },
        { status: 'UPHELD', _count: 40 },
        { status: 'DENIED', _count: 20 },
      ]);

      const result = await service.getAppealStatistics();

      expect(result.total).toBe(100);
      expect(result.pending).toBe(30);
      expect(result.underReview).toBe(10);
      expect(result.upheld).toBe(40);
      expect(result.denied).toBe(20);
      expect(result.byStatus).toHaveLength(4);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.appeal.groupBy.mockResolvedValue([]);

      await service.getAppealStatistics(startDate, endDate);

      expect(mockPrisma.appeal.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: startDate,
              lte: endDate,
            }),
          }),
        }),
      );
    });

    it('should handle startDate only', async () => {
      const startDate = new Date('2026-01-01');

      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.appeal.groupBy.mockResolvedValue([]);

      await service.getAppealStatistics(startDate);

      expect(mockPrisma.appeal.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate },
          }),
        }),
      );
    });

    it('should handle endDate only', async () => {
      const endDate = new Date('2026-01-31');

      mockPrisma.appeal.count.mockResolvedValue(0);
      mockPrisma.appeal.groupBy.mockResolvedValue([]);

      await service.getAppealStatistics(undefined, endDate);

      expect(mockPrisma.appeal.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lte: endDate },
          }),
        }),
      );
    });
  });

  describe('mapAppealToResponse', () => {
    it('should map appeal entity to response DTO', () => {
      const createdAt = new Date();
      const resolvedAt = new Date();
      const appeal = {
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Valid reason',
        status: 'UPHELD',
        reviewerId: 'mod-1',
        decisionReasoning: 'Decision reasoning',
        createdAt,
        resolvedAt,
      };

      const result = service.mapAppealToResponse(appeal);

      expect(result.id).toBe('appeal-1');
      expect(result.moderationActionId).toBe('action-1');
      expect(result.appellantId).toBe('user-1');
      expect(result.reason).toBe('Valid reason');
      expect(result.status).toBe('UPHELD');
      expect(result.reviewerId).toBe('mod-1');
      expect(result.decisionReasoning).toBe('Decision reasoning');
      expect(result.createdAt).toBe(createdAt.toISOString());
      expect(result.resolvedAt).toBe(resolvedAt.toISOString());
    });

    it('should handle null optional fields', () => {
      const createdAt = new Date();
      const appeal = {
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'Valid reason',
        status: 'PENDING',
        reviewerId: null,
        decisionReasoning: null,
        createdAt,
        resolvedAt: null,
      };

      const result = service.mapAppealToResponse(appeal);

      expect(result.reviewerId).toBeNull();
      expect(result.decisionReasoning).toBeNull();
      expect(result.resolvedAt).toBeNull();
    });
  });

  describe('mapModerationActionToResponse', () => {
    it('should map moderation action to response', () => {
      const createdAt = new Date();
      const approvedAt = new Date();
      const executedAt = new Date();
      const action = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'Test reasoning',
        aiRecommended: true,
        aiConfidence: 0.85,
        status: 'ACTIVE',
        createdAt,
        approvedBy: { id: 'mod-1', displayName: 'Moderator' },
        approvedAt,
        executedAt,
      };

      const result = service.mapModerationActionToResponse(action);

      expect(result.id).toBe('action-1');
      expect(result.targetType).toBe('RESPONSE');
      expect(result.targetId).toBe('response-1');
      expect(result.actionType).toBe('WARN');
      expect(result.severity).toBe('NON_PUNITIVE');
      expect(result.aiRecommended).toBe(true);
      expect(result.aiConfidence).toBe(0.85);
      expect(result.approvedBy).toEqual({ id: 'mod-1', displayName: 'Moderator' });
      expect(result.createdAt).toBe(createdAt.toISOString());
    });

    it('should handle null optional fields in moderation action', () => {
      const createdAt = new Date();
      const action = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'Test reasoning',
        aiRecommended: false,
        aiConfidence: null,
        status: 'PENDING',
        createdAt,
        approvedBy: null,
        approvedAt: null,
        executedAt: null,
      };

      const result = service.mapModerationActionToResponse(action);

      expect(result.aiConfidence).toBeNull();
      expect(result.approvedBy).toBeNull();
      expect(result.approvedAt).toBeNull();
      expect(result.executedAt).toBeNull();
    });
  });
});
