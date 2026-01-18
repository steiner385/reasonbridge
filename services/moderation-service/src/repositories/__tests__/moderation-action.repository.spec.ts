import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerationActionRepository } from '../moderation-action.repository.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * ModerationActionRepository Unit Tests
 *
 * Tests focus on repository interface and method signatures.
 * Database integration is tested via E2E tests.
 */
describe('ModerationActionRepository', () => {
  let repository: ModerationActionRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      moderationAction: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
      },
    };
    repository = new ModerationActionRepository(mockPrisma as PrismaService);
  });

  describe('Repository Instantiation', () => {
    it('should be instantiable', () => {
      expect(repository).toBeInstanceOf(ModerationActionRepository);
    });

    it('should have all required methods', () => {
      const methods = [
        'create',
        'findById',
        'findByTarget',
        'findByUserId',
        'findMany',
        'count',
        'update',
        'updateStatus',
        'approve',
        'reject',
        'findPending',
        'findActive',
        'findAppealed',
        'findBySeverity',
        'findByActionType',
        'findAiRecommended',
        'findExpiredBans',
        'liftBan',
        'delete',
        'findByModerator',
        'getStatistics',
      ];

      for (const method of methods) {
        expect(typeof (repository as any)[method]).toBe('function');
      }
    });
  });

  describe('CRUD Operations', () => {
    it('should call create with correct data structure', async () => {
      const createData = {
        targetType: 'USER' as const,
        targetId: '550e8400-e29b-41d4-a716-446655440001',
        actionType: 'WARN' as const,
        severity: 'NON_PUNITIVE' as const,
        reasoning: 'Test reasoning',
      };

      mockPrisma.moderationAction.create.mockResolvedValue({
        id: '123',
        ...createData,
        approvedBy: null,
      });

      await repository.create(createData as any);

      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Object),
          include: expect.any(Object),
        }),
      );
    });

    it('should call findById with correct parameters', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440001';
      mockPrisma.moderationAction.findUnique.mockResolvedValue(null);

      await repository.findById(actionId);

      expect(mockPrisma.moderationAction.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: actionId },
          include: expect.any(Object),
        }),
      );
    });

    it('should call findMany with pagination parameters', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      const limit = 10;
      const cursor = '550e8400-e29b-41d4-a716-446655440001';

      await repository.findMany({}, limit, cursor);

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: limit,
          skip: 1,
          cursor: { id: cursor },
        }),
      );
    });

    it('should call count with where filter', async () => {
      mockPrisma.moderationAction.count.mockResolvedValue(5);

      const where = { status: 'PENDING' as const };
      await repository.count(where as any);

      expect(mockPrisma.moderationAction.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
    });

    it('should call update with correct data', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440001';
      const updateData = { status: 'ACTIVE' as const };

      mockPrisma.moderationAction.update.mockResolvedValue({
        id: actionId,
        ...updateData,
      });

      await repository.update(actionId, updateData as any);

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: actionId },
          data: expect.any(Object),
        }),
      );
    });
  });

  describe('Filtering Methods', () => {
    it('should find pending actions', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findPending();

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
          take: 50,
        }),
      );
    });

    it('should find active actions', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findActive();

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        }),
      );
    });

    it('should find actions by user ID', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findByUserId(userId);

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            targetType: 'USER',
            targetId: userId,
          },
        }),
      );
    });

    it('should find AI-recommended actions', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findAiRecommended();

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            aiRecommended: true,
            status: 'PENDING',
          },
        }),
      );
    });

    it('should find actions by severity', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findBySeverity('NON_PUNITIVE');

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { severity: 'NON_PUNITIVE' },
        }),
      );
    });

    it('should find actions by action type', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findByActionType('WARN');

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { actionType: 'WARN' },
        }),
      );
    });

    it('should find actions by moderator', async () => {
      const moderatorId = '550e8400-e29b-41d4-a716-446655440001';
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findByModerator(moderatorId);

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { approvedById: moderatorId },
        }),
      );
    });
  });

  describe('Action Status Methods', () => {
    it('should approve an action', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440001';
      const moderatorId = '550e8400-e29b-41d4-a716-446655440002';

      mockPrisma.moderationAction.update.mockResolvedValue({});

      await repository.approve(actionId, moderatorId);

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: actionId },
          data: expect.objectContaining({
            status: 'ACTIVE',
            approvedBy: expect.objectContaining({
              connect: { id: moderatorId },
            }),
            approvedAt: expect.any(Date),
            executedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should approve an action with modified reasoning', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440001';
      const moderatorId = '550e8400-e29b-41d4-a716-446655440002';
      const modifiedReasoning = 'Updated reason';

      mockPrisma.moderationAction.update.mockResolvedValue({});

      await repository.approve(actionId, moderatorId, modifiedReasoning);

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: actionId },
          data: expect.objectContaining({
            reasoning: modifiedReasoning,
          }),
        }),
      );
    });

    it('should reject an action', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440001';

      mockPrisma.moderationAction.update.mockResolvedValue({});

      await repository.reject(actionId);

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: actionId },
          data: { status: 'REVERSED' },
        }),
      );
    });

    it('should lift a ban', async () => {
      const actionId = '550e8400-e29b-41d4-a716-446655440001';

      mockPrisma.moderationAction.update.mockResolvedValue({});

      await repository.liftBan(actionId);

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REVERSED',
            liftedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('Ban Management', () => {
    it('should find expired bans', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      await repository.findExpiredBans();

      expect(mockPrisma.moderationAction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isTemporary: true,
            status: 'ACTIVE',
            expiresAt: {
              lte: expect.any(Date),
            },
          },
        }),
      );
    });
  });

  describe('Statistics', () => {
    it('should get statistics without date filters', async () => {
      mockPrisma.moderationAction.count.mockResolvedValue(10);
      mockPrisma.moderationAction.groupBy.mockResolvedValue([]);

      await repository.getStatistics();

      expect(mockPrisma.moderationAction.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );

      expect(mockPrisma.moderationAction.groupBy).toHaveBeenCalledTimes(3);
    });

    it('should get statistics with date filters', async () => {
      mockPrisma.moderationAction.count.mockResolvedValue(5);
      mockPrisma.moderationAction.groupBy.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await repository.getStatistics(startDate, endDate);

      expect(mockPrisma.moderationAction.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('Interface Contracts', () => {
    it('should return objects with required fields from create', async () => {
      const mockAction = {
        id: '123',
        targetType: 'USER',
        targetId: '456',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'Test',
        approvedBy: null,
      };

      mockPrisma.moderationAction.create.mockResolvedValue(mockAction);

      const result = await repository.create({} as any);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('targetType');
      expect(result).toHaveProperty('actionType');
    });

    it('should return array from findMany', async () => {
      mockPrisma.moderationAction.findMany.mockResolvedValue([]);

      const result = await repository.findMany();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return number from count', async () => {
      mockPrisma.moderationAction.count.mockResolvedValue(42);

      const result = await repository.count();

      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });
  });
});
