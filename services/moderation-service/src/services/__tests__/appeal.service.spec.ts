import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppealService } from '../appeal.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * AppealService Unit Tests
 *
 * Comprehensive test suite covering:
 * - Appeal creation with validation
 * - Moderator assignment workflow
 * - Appeal review and decision-making
 * - Appeal lifecycle management
 * - Statistics and metrics
 * - Error handling and validation
 */
describe('AppealService', () => {
  let service: AppealService;
  let prismaService: any;
  let queueService: any;

  beforeEach(() => {
    prismaService = {
      appeal: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
      },
      moderationAction: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    queueService = {
      publishEvent: vi.fn().mockResolvedValue(undefined),
    };

    service = new AppealService(prismaService, queueService);
  });

  describe('Service Instantiation', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(AppealService);
    });

    it('should have all required methods', () => {
      const methods = [
        'createAppeal',
        'getPendingAppeals',
        'assignAppealToModerator',
        'unassignAppeal',
        'reviewAppeal',
        'getAppealById',
        'getAppealStatistics',
        'mapAppealToResponse',
      ];

      methods.forEach((method) => {
        expect(typeof service[method as keyof AppealService]).toBe('function');
      });
    });
  });

  describe('createAppeal', () => {
    const actionId = 'action-123';
    const appellantId = 'user-456';
    const validRequest = {
      reason: 'This is a valid appeal reason with more than 20 characters',
    };

    it('should create an appeal successfully', async () => {
      const appealData = {
        id: 'appeal-789',
        moderationActionId: actionId,
        appellantId: appellantId,
        reason: validRequest.reason,
        status: 'PENDING',
        reviewerId: null,
        decisionReasoning: null,
        createdAt: new Date(),
        resolvedAt: null,
      };

      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: actionId,
        status: 'ACTIVE',
      });

      prismaService.appeal.findUnique.mockResolvedValue(null);
      prismaService.appeal.create.mockResolvedValue(appealData);
      prismaService.moderationAction.update.mockResolvedValue({});

      const result = await service.createAppeal(actionId, appellantId, validRequest);

      expect(result).toBeDefined();
      expect(result.id).toBe('appeal-789');
      expect(result.status).toBe('PENDING');
      expect(prismaService.appeal.create).toHaveBeenCalled();
      expect(prismaService.moderationAction.update).toHaveBeenCalledWith({
        where: { id: actionId },
        data: { status: 'APPEALED' },
      });
    });

    it('should throw BadRequestException if reason is empty', async () => {
      await expect(service.createAppeal(actionId, appellantId, { reason: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if reason is too short', async () => {
      await expect(
        service.createAppeal(actionId, appellantId, { reason: 'Too short' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if reason exceeds max length', async () => {
      const longReason = 'a'.repeat(5001);
      await expect(
        service.createAppeal(actionId, appellantId, { reason: longReason }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if moderation action does not exist', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue(null);

      await expect(service.createAppeal(actionId, appellantId, validRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if action is already reversed', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: actionId,
        status: 'REVERSED',
      });

      await expect(service.createAppeal(actionId, appellantId, validRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if an appeal is already pending', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: actionId,
        status: 'ACTIVE',
      });

      prismaService.appeal.findUnique.mockResolvedValue({
        id: 'existing-appeal',
        status: 'PENDING',
      });

      await expect(service.createAppeal(actionId, appellantId, validRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow creating appeal if previous appeal was denied', async () => {
      const appealData = {
        id: 'appeal-new',
        moderationActionId: actionId,
        appellantId: appellantId,
        reason: validRequest.reason,
        status: 'PENDING',
        reviewerId: null,
        decisionReasoning: null,
        createdAt: new Date(),
        resolvedAt: new Date(),
      };

      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: actionId,
        status: 'ACTIVE',
      });

      prismaService.appeal.findUnique.mockResolvedValue({
        id: 'previous-appeal',
        status: 'DENIED',
      });

      prismaService.appeal.create.mockResolvedValue(appealData);
      prismaService.moderationAction.update.mockResolvedValue({});

      const result = await service.createAppeal(actionId, appellantId, validRequest);

      expect(result.id).toBe('appeal-new');
      expect(prismaService.appeal.create).toHaveBeenCalled();
    });
  });

  describe('getPendingAppeals', () => {
    it('should retrieve pending appeals with pagination', async () => {
      const appeals = [
        {
          id: 'appeal-1',
          status: 'PENDING',
          moderationActionId: 'action-1',
          appellantId: 'user-1',
          reason: 'Appeal reason',
          reviewerId: null,
          decisionReasoning: null,
          createdAt: new Date(),
          resolvedAt: null,
          moderationAction: {
            id: 'action-1',
            targetType: 'RESPONSE',
            targetId: 'response-1',
            actionType: 'HIDE',
            severity: 'NON_PUNITIVE',
            reasoning: 'Violates guidelines',
            aiRecommended: false,
            aiConfidence: null,
            approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
            approvedAt: new Date(),
            status: 'ACTIVE',
            createdAt: new Date(),
            executedAt: new Date(),
          },
        },
      ];

      prismaService.appeal.count.mockResolvedValue(1);
      prismaService.appeal.findMany.mockResolvedValue(appeals);

      const result = await service.getPendingAppeals(20);

      expect(result.appeals).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.nextCursor).toBeNull();
    });

    it('should support cursor pagination', async () => {
      // Return exactly 20 items to trigger nextCursor calculation
      const appeals = Array.from({ length: 20 }, (_, i) => ({
        id: `appeal-${i}`,
        status: 'PENDING',
        moderationAction: null,
        createdAt: new Date(),
      }));

      prismaService.appeal.count.mockResolvedValue(21);
      prismaService.appeal.findMany.mockResolvedValue(appeals);

      const result = await service.getPendingAppeals(20, 'appeal-1');

      expect(result.nextCursor).toBe('appeal-19');
      expect(prismaService.appeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'appeal-1' },
        }),
      );
    });

    it('should filter by assigned moderator', async () => {
      const moderatorId = 'mod-123';
      prismaService.appeal.count.mockResolvedValue(1);
      prismaService.appeal.findMany.mockResolvedValue([]);

      await service.getPendingAppeals(20, undefined, moderatorId);

      expect(prismaService.appeal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            reviewerId: moderatorId,
          }),
        }),
      );
    });

    it('should return empty list when no pending appeals', async () => {
      prismaService.appeal.count.mockResolvedValue(0);
      prismaService.appeal.findMany.mockResolvedValue([]);

      const result = await service.getPendingAppeals(20);

      expect(result.appeals).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('assignAppealToModerator', () => {
    const appealId = 'appeal-123';
    const moderatorId = 'mod-456';

    it('should assign appeal to moderator', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'PENDING',
      });

      prismaService.user.findUnique.mockResolvedValue({
        id: moderatorId,
        displayName: 'Moderator',
      });

      prismaService.appeal.update.mockResolvedValue({
        id: appealId,
        status: 'UNDER_REVIEW',
        reviewerId: moderatorId,
        createdAt: new Date(),
      });

      const result = await service.assignAppealToModerator(appealId, moderatorId);

      expect(result.status).toBe('UNDER_REVIEW');
      expect(result.reviewerId).toBe(moderatorId);
      expect(prismaService.appeal.update).toHaveBeenCalledWith({
        where: { id: appealId },
        data: {
          reviewerId: moderatorId,
          status: 'UNDER_REVIEW',
        },
      });
    });

    it('should throw NotFoundException if appeal not found', async () => {
      prismaService.appeal.findUnique.mockResolvedValue(null);

      await expect(service.assignAppealToModerator(appealId, moderatorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if appeal not in PENDING status', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'UNDER_REVIEW',
      });

      await expect(service.assignAppealToModerator(appealId, moderatorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if moderator not found', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'PENDING',
      });

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assignAppealToModerator(appealId, moderatorId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unassignAppeal', () => {
    const appealId = 'appeal-123';

    it('should unassign appeal back to PENDING', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'UNDER_REVIEW',
      });

      prismaService.appeal.update.mockResolvedValue({
        id: appealId,
        status: 'PENDING',
        reviewerId: null,
        createdAt: new Date(),
      });

      const result = await service.unassignAppeal(appealId);

      expect(result.status).toBe('PENDING');
      expect(result.reviewerId).toBeNull();
      expect(prismaService.appeal.update).toHaveBeenCalledWith({
        where: { id: appealId },
        data: {
          reviewerId: null,
          status: 'PENDING',
        },
      });
    });

    it('should throw NotFoundException if appeal not found', async () => {
      prismaService.appeal.findUnique.mockResolvedValue(null);

      await expect(service.unassignAppeal(appealId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if appeal not in UNDER_REVIEW status', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'PENDING',
      });

      await expect(service.unassignAppeal(appealId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewAppeal', () => {
    const appealId = 'appeal-123';
    const reviewerId = 'mod-456';
    const validRequest = {
      decision: 'upheld' as const,
      reasoning: 'This appeal has valid grounds and should be upheld based on evidence presented',
    };

    it('should review appeal and uphold with event publishing', async () => {
      const actionId = 'action-789';
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'UNDER_REVIEW',
        appellantId: 'user-123',
        moderationAction: {
          id: actionId,
          reasoning: 'Original reasoning',
        },
      });

      prismaService.appeal.update.mockResolvedValue({
        id: appealId,
        status: 'UPHELD',
        reviewerId: reviewerId,
        decisionReasoning: validRequest.reasoning,
        resolvedAt: new Date(),
        createdAt: new Date(),
      });

      prismaService.moderationAction.update.mockResolvedValue({});

      const result = await service.reviewAppeal(appealId, reviewerId, validRequest);

      expect(result.status).toBe('UPHELD');
      expect(prismaService.moderationAction.update).toHaveBeenCalledWith({
        where: { id: actionId },
        data: {
          status: 'REVERSED',
          reasoning: expect.stringContaining('APPEAL UPHELD'),
        },
      });
      expect(queueService.publishEvent).toHaveBeenCalled();
    });

    it('should review appeal and deny', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'PENDING',
        moderationAction: {
          id: 'action-789',
        },
      });

      prismaService.appeal.update.mockResolvedValue({
        id: appealId,
        status: 'DENIED',
        reviewerId: reviewerId,
        decisionReasoning: validRequest.reasoning,
        resolvedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.reviewAppeal(appealId, reviewerId, {
        decision: 'denied',
        reasoning: validRequest.reasoning,
      });

      expect(result.status).toBe('DENIED');
      expect(queueService.publishEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reasoning is empty', async () => {
      await expect(
        service.reviewAppeal(appealId, reviewerId, {
          decision: 'upheld',
          reasoning: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if reasoning is too short', async () => {
      await expect(
        service.reviewAppeal(appealId, reviewerId, {
          decision: 'upheld',
          reasoning: 'Too short',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if reasoning exceeds max length', async () => {
      const longReasoning = 'a'.repeat(2001);
      await expect(
        service.reviewAppeal(appealId, reviewerId, {
          decision: 'upheld',
          reasoning: longReasoning,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if appeal not found', async () => {
      prismaService.appeal.findUnique.mockResolvedValue(null);

      await expect(service.reviewAppeal(appealId, reviewerId, validRequest)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if appeal cannot be reviewed', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'UPHELD',
      });

      await expect(service.reviewAppeal(appealId, reviewerId, validRequest)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle event publishing failure gracefully', async () => {
      const actionId = 'action-789';
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        status: 'UNDER_REVIEW',
        appellantId: 'user-123',
        moderationAction: {
          id: actionId,
          reasoning: 'Original reasoning',
        },
      });

      prismaService.appeal.update.mockResolvedValue({
        id: appealId,
        status: 'UPHELD',
        reviewerId: reviewerId,
        decisionReasoning: validRequest.reasoning,
        resolvedAt: new Date(),
        createdAt: new Date(),
      });

      prismaService.moderationAction.update.mockResolvedValue({});
      queueService.publishEvent.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.reviewAppeal(appealId, reviewerId, validRequest);

      expect(result.status).toBe('UPHELD');
      // Should not throw despite event publishing failure
    });
  });

  describe('getAppealById', () => {
    const appealId = 'appeal-123';

    it('should retrieve appeal by ID with moderation action details', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: appealId,
        moderationActionId: 'action-456',
        appellantId: 'user-789',
        reason: 'This is my appeal',
        status: 'PENDING',
        reviewerId: null,
        decisionReasoning: null,
        createdAt: new Date(),
        resolvedAt: null,
        moderationAction: {
          id: 'action-456',
          actionType: 'HIDE',
          severity: 'NON_PUNITIVE',
          targetType: 'RESPONSE',
          targetId: 'response-123',
          reasoning: 'Violates community guidelines',
          aiRecommended: false,
          aiConfidence: null,
          approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
          approvedAt: new Date(),
          status: 'ACTIVE',
          createdAt: new Date(),
          executedAt: new Date(),
        },
      });

      const result = await service.getAppealById(appealId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(appealId);
      expect(result?.moderationAction).toBeDefined();
    });

    it('should return null if appeal not found', async () => {
      prismaService.appeal.findUnique.mockResolvedValue(null);

      const result = await service.getAppealById(appealId);

      expect(result).toBeNull();
    });
  });

  describe('getAppealStatistics', () => {
    it('should retrieve appeal statistics', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-20');

      prismaService.appeal.count.mockResolvedValue(15);
      prismaService.appeal.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 5 },
        { status: 'UNDER_REVIEW', _count: 3 },
        { status: 'UPHELD', _count: 4 },
        { status: 'DENIED', _count: 3 },
      ]);

      prismaService.appeal.count
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(3) // underReview
        .mockResolvedValueOnce(4) // upheld
        .mockResolvedValueOnce(3); // denied

      const result = await service.getAppealStatistics(startDate, endDate);

      expect(result.total).toBe(15);
      expect(result.pending).toBe(5);
      expect(result.underReview).toBe(3);
      expect(result.upheld).toBe(4);
      expect(result.denied).toBe(3);
      expect(result.byStatus).toHaveLength(4);
    });

    it('should retrieve statistics without date range', async () => {
      prismaService.appeal.count.mockResolvedValue(10);
      prismaService.appeal.groupBy.mockResolvedValue([]);

      prismaService.appeal.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const result = await service.getAppealStatistics();

      expect(result.total).toBe(10);
    });

    it('should handle date range with only start date', async () => {
      const startDate = new Date('2026-01-01');

      prismaService.appeal.count.mockResolvedValue(5);
      prismaService.appeal.groupBy.mockResolvedValue([]);

      prismaService.appeal.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getAppealStatistics(startDate);

      expect(result.total).toBe(5);
      expect(prismaService.appeal.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: startDate,
            }),
          }),
        }),
      );
    });

    it('should handle date range with only end date', async () => {
      const endDate = new Date('2026-01-20');

      prismaService.appeal.count.mockResolvedValue(8);
      prismaService.appeal.groupBy.mockResolvedValue([]);

      prismaService.appeal.count
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const result = await service.getAppealStatistics(undefined, endDate);

      expect(result.total).toBe(8);
    });
  });

  describe('mapAppealToResponse', () => {
    it('should map appeal to response DTO', () => {
      const appeal = {
        id: 'appeal-123',
        moderationActionId: 'action-456',
        appellantId: 'user-789',
        reason: 'Appeal reason',
        status: 'PENDING',
        reviewerId: null,
        decisionReasoning: null,
        createdAt: new Date('2026-01-15'),
        resolvedAt: null,
      };

      const result = service.mapAppealToResponse(appeal);

      expect(result.id).toBe('appeal-123');
      expect(result.status).toBe('PENDING');
      expect(result.reviewerId).toBeNull();
      expect(result.resolvedAt).toBeNull();
      expect(typeof result.createdAt).toBe('string');
    });

    it('should map resolved appeal with decision', () => {
      const resolvedDate = new Date('2026-01-16');
      const appeal = {
        id: 'appeal-123',
        moderationActionId: 'action-456',
        appellantId: 'user-789',
        reason: 'Appeal reason',
        status: 'UPHELD',
        reviewerId: 'mod-123',
        decisionReasoning: 'Appeal has valid grounds',
        createdAt: new Date('2026-01-15'),
        resolvedAt: resolvedDate,
      };

      const result = service.mapAppealToResponse(appeal);

      expect(result.status).toBe('UPHELD');
      expect(result.reviewerId).toBe('mod-123');
      expect(result.decisionReasoning).toBe('Appeal has valid grounds');
      expect(result.resolvedAt).toBeDefined();
    });
  });
});
