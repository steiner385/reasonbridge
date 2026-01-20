import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ModerationActionsService } from '../moderation-actions.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { QueueService } from '../../queue/queue.service.js';
import type {
  CreateActionRequest,
  ApproveActionRequest,
  RejectActionRequest,
} from '../../dto/moderation-action.dto.js';

describe('ModerationActionsService', () => {
  let service: ModerationActionsService;
  let prismaService: PrismaService;
  let queueService: QueueService;

  const mockModerationAction = {
    id: 'action-1',
    targetType: 'RESPONSE',
    targetId: 'response-1',
    actionType: 'HIDE',
    severity: 'CONSEQUENTIAL',
    reasoning: 'This response violates content policy',
    status: 'PENDING',
    aiRecommended: false,
    aiConfidence: 0,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-20'),
    approvedById: null,
    approvedAt: null,
    executedAt: null,
    isTemporary: false,
    banDurationDays: null,
    expiresAt: null,
    liftedAt: null,
    approvedBy: null,
  };

  const mockApprovedAction = {
    ...mockModerationAction,
    status: 'ACTIVE',
    approvedById: 'moderator-1',
    approvedAt: new Date('2026-01-20'),
    executedAt: new Date('2026-01-20'),
    approvedBy: {
      id: 'moderator-1',
      displayName: 'John Moderator',
    },
  };

  beforeEach(() => {
    prismaService = {
      moderationAction: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      appeal: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    queueService = {
      publishEvent: vi.fn(),
    } as unknown as QueueService;

    service = new ModerationActionsService(prismaService, queueService);
  });

  describe('listActions', () => {
    it('should list all moderation actions without filters', async () => {
      const mockActions = [mockModerationAction, mockApprovedAction];
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(2);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue(mockActions as any);

      const result = await service.listActions();

      expect(result).toBeDefined();
      expect(result.actions).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.nextCursor).toBeNull();
    });

    it('should list actions with status filter', async () => {
      const pendingActions = [mockModerationAction];
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(1);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue(pendingActions as any);

      const result = await service.listActions(undefined, 'PENDING');

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].status).toBe('pending');
    });

    it('should list actions with target type filter', async () => {
      const userActions = [
        {
          ...mockModerationAction,
          targetType: 'USER',
          targetId: 'user-1',
        },
      ];
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(1);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue(userActions as any);

      const result = await service.listActions('USER');

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].targetType).toBe('user');
    });

    it('should list actions with severity filter', async () => {
      const nonPunitiveActions = [
        {
          ...mockModerationAction,
          actionType: 'EDUCATE',
          severity: 'NON_PUNITIVE',
        },
      ];
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(1);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue(
        nonPunitiveActions as any,
      );

      const result = await service.listActions(undefined, undefined, 'NON_PUNITIVE');

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].severity).toBe('non_punitive');
    });

    it('should support pagination with cursor', async () => {
      const actions = Array.from({ length: 20 }, (_, i) => ({
        ...mockModerationAction,
        id: `action-${i}`,
      }));
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(50);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue(actions as any);

      const result = await service.listActions(undefined, undefined, undefined, 20, 'cursor-1');

      expect(result.actions).toHaveLength(20);
      expect(result.nextCursor).toBe('action-19');
      expect(result.totalCount).toBe(50);
    });

    it('should return null nextCursor when less than limit returned', async () => {
      const actions = [mockModerationAction, mockApprovedAction];
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(2);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue(actions as any);

      const result = await service.listActions(undefined, undefined, undefined, 20);

      expect(result.nextCursor).toBeNull();
    });
  });

  describe('createAction', () => {
    const validRequest: CreateActionRequest = {
      targetType: 'response',
      targetId: 'response-1',
      actionType: 'hide',
      reasoning: 'This response contains hate speech and violates our community standards.',
    };

    it('should create a new moderation action', async () => {
      vi.mocked(prismaService.moderationAction.create).mockResolvedValue(mockApprovedAction as any);
      vi.mocked(queueService.publishEvent).mockResolvedValue(undefined);

      const result = await service.createAction(validRequest, 'moderator-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('action-1');
      expect(result.status).toBe('active');
      expect(result.approvedBy?.id).toBe('moderator-1');
      expect(result.actionType).toBe('hide');
    });

    it('should throw BadRequestException for short reasoning', async () => {
      const invalidRequest: CreateActionRequest = {
        ...validRequest,
        reasoning: 'Too short',
      };

      await expect(service.createAction(invalidRequest, 'moderator-1')).rejects.toThrow(
        new BadRequestException('Reasoning must be at least 20 characters long'),
      );
    });

    it('should map action types to correct severity levels', async () => {
      const testCases = [
        { actionType: 'educate' as const, expectedSeverity: 'non_punitive' },
        { actionType: 'warn' as const, expectedSeverity: 'non_punitive' },
        { actionType: 'hide' as const, expectedSeverity: 'consequential' },
        { actionType: 'remove' as const, expectedSeverity: 'consequential' },
        { actionType: 'suspend' as const, expectedSeverity: 'consequential' },
        { actionType: 'ban' as const, expectedSeverity: 'consequential' },
      ];

      for (const testCase of testCases) {
        vi.mocked(prismaService.moderationAction.create).mockResolvedValue({
          ...mockApprovedAction,
          actionType: testCase.actionType.toUpperCase(),
          severity: testCase.expectedSeverity,
        } as any);

        const request: CreateActionRequest = {
          ...validRequest,
          actionType: testCase.actionType,
        };

        const result = await service.createAction(request, 'moderator-1');
        expect(result.severity).toBe(testCase.expectedSeverity);
      }
    });

    it('should publish event to queue', async () => {
      vi.mocked(prismaService.moderationAction.create).mockResolvedValue(mockApprovedAction as any);
      vi.mocked(queueService.publishEvent).mockResolvedValue(undefined);

      await service.createAction(validRequest, 'moderator-1');

      expect(queueService.publishEvent).toHaveBeenCalled();
      const eventCall = vi.mocked(queueService.publishEvent).mock.calls[0];
      expect(eventCall[0].type).toBe('moderation.action.requested');
    });

    it('should handle queue publish failure gracefully', async () => {
      vi.mocked(prismaService.moderationAction.create).mockResolvedValue(mockApprovedAction as any);
      vi.mocked(queueService.publishEvent).mockRejectedValue(new Error('Queue unavailable'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await service.createAction(validRequest, 'moderator-1');

      // Should still return the created action even if queue fails
      expect(result).toBeDefined();
      expect(result.id).toBe('action-1');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should set moderator-initiated actions as ACTIVE immediately', async () => {
      vi.mocked(prismaService.moderationAction.create).mockResolvedValue({
        ...mockApprovedAction,
        status: 'ACTIVE',
      } as any);

      const result = await service.createAction(validRequest, 'moderator-1');

      expect(result.status).toBe('active');
      expect(result.approvedBy?.id).toBe('moderator-1');
      expect(result.executedAt).toBeDefined();
    });
  });

  describe('getAction', () => {
    it('should retrieve a moderation action with details', async () => {
      const actionWithAppeals = {
        ...mockApprovedAction,
        appeals: [
          {
            id: 'appeal-1',
            reason: 'I did not violate the policy',
            status: 'PENDING',
            createdAt: new Date(),
          },
        ],
      };

      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(
        actionWithAppeals as any,
      );

      const result = await service.getAction('action-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('action-1');
      expect(result.appeal).toBeDefined();
      expect(result.appeal?.id).toBe('appeal-1');
    });

    it('should return null for appeal if none exists', async () => {
      const actionWithoutAppeals = {
        ...mockApprovedAction,
        appeals: [],
      };

      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(
        actionWithoutAppeals as any,
      );

      const result = await service.getAction('action-1');

      expect(result.appeal).toBeNull();
    });

    it('should throw NotFoundException for non-existent action', async () => {
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(null);

      await expect(service.getAction('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveAction', () => {
    it('should approve a pending moderation action', async () => {
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(
        mockModerationAction as any,
      );
      vi.mocked(prismaService.moderationAction.update).mockResolvedValue(mockApprovedAction as any);

      const result = await service.approveAction('action-1', 'moderator-1');

      expect(result.status).toBe('active');
      expect(result.approvedBy).toBeDefined();
      expect(result.approvedAt).toBeDefined();
    });

    it('should update reasoning if provided', async () => {
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(
        mockModerationAction as any,
      );

      const updatedAction = {
        ...mockApprovedAction,
        reasoning: 'Updated reasoning for the action',
      };
      vi.mocked(prismaService.moderationAction.update).mockResolvedValue(updatedAction as any);

      const request: ApproveActionRequest = {
        modifiedReasoning: 'Updated reasoning for the action',
      };
      const result = await service.approveAction('action-1', 'moderator-1', request);

      expect(result.reasoning).toBe('Updated reasoning for the action');
    });

    it('should throw NotFoundException for non-existent action', async () => {
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(null);

      await expect(service.approveAction('non-existent', 'moderator-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if action is not PENDING', async () => {
      const activeAction = {
        ...mockModerationAction,
        status: 'ACTIVE',
      };
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(activeAction as any);

      await expect(service.approveAction('action-1', 'moderator-1')).rejects.toThrow(
        new BadRequestException(
          'Action must be in PENDING status to approve, current status: ACTIVE',
        ),
      );
    });

    it('should throw BadRequestException for non-punitive actions', async () => {
      const nonPunitiveAction = {
        ...mockModerationAction,
        actionType: 'EDUCATE',
        severity: 'NON_PUNITIVE',
      };
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(
        nonPunitiveAction as any,
      );

      await expect(service.approveAction('action-1', 'moderator-1')).rejects.toThrow(
        new BadRequestException('Non-punitive actions cannot be explicitly approved'),
      );
    });
  });

  describe('rejectAction', () => {
    it('should reject a pending moderation action', async () => {
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(
        mockModerationAction as any,
      );
      vi.mocked(prismaService.moderationAction.update).mockResolvedValue({
        ...mockModerationAction,
        status: 'REJECTED',
      } as any);

      const request: RejectActionRequest = {
        rejectReasoning: 'Insufficient evidence for this action',
      };

      await expect(service.rejectAction('action-1', request)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException for non-existent action', async () => {
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(null);

      const request: RejectActionRequest = {
        rejectReasoning: 'Invalid action',
      };

      await expect(service.rejectAction('non-existent', request)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if action is not PENDING', async () => {
      const activeAction = {
        ...mockModerationAction,
        status: 'ACTIVE',
      };
      vi.mocked(prismaService.moderationAction.findUnique).mockResolvedValue(activeAction as any);

      const request: RejectActionRequest = {
        rejectReasoning: 'Cannot reject active action',
      };

      await expect(service.rejectAction('action-1', request)).rejects.toThrow(
        new BadRequestException(
          'Action must be in PENDING status to reject, current status: ACTIVE',
        ),
      );
    });
  });

  describe('getUserActions', () => {
    it('should retrieve all moderation actions for a user', async () => {
      const userActions = [mockModerationAction, { ...mockModerationAction, id: 'action-2' }];
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(2);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue(userActions as any);

      const result = await service.getUserActions('user-1');

      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].id).toBe('action-1');
      expect(result.actions[1].id).toBe('action-2');
      expect(result.totalCount).toBe(2);
    });

    it('should return empty array for user with no actions', async () => {
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(0);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue([] as any);

      const result = await service.getUserActions('user-no-actions');

      expect(result.actions).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should order actions by most recent first', async () => {
      const olderAction = {
        ...mockModerationAction,
        id: 'action-1',
        createdAt: new Date('2026-01-10'),
      };
      const newerAction = {
        ...mockModerationAction,
        id: 'action-2',
        createdAt: new Date('2026-01-20'),
      };
      vi.mocked(prismaService.moderationAction.count).mockResolvedValue(2);
      vi.mocked(prismaService.moderationAction.findMany).mockResolvedValue([
        newerAction,
        olderAction,
      ] as any);

      const result = await service.getUserActions('user-1');

      expect(result.actions[0].id).toBe('action-2');
      expect(result.actions[1].id).toBe('action-1');
    });
  });

  describe('sendCoolingOffPrompt', () => {
    it('should send cooling-off prompt to one user', async () => {
      const result = await service.sendCoolingOffPrompt(
        ['user-1'],
        'topic-1',
        'Take a break and cool off',
      );

      expect(result).toBeDefined();
      expect(result.sent).toBe(1);
    });

    it('should send cooling-off prompt to multiple users', async () => {
      const result = await service.sendCoolingOffPrompt(
        ['user-1', 'user-2', 'user-3'],
        'topic-1',
        'All participants, please take a break',
      );

      expect(result).toBeDefined();
      expect(result.sent).toBe(3);
    });

    it('should handle empty user list', async () => {
      const result = await service.sendCoolingOffPrompt([], 'topic-1', 'Message');

      expect(result.sent).toBe(0);
    });
  });
});
