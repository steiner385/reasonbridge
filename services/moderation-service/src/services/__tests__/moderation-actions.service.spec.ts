import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerationActionsService } from '../moderation-actions.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * ModerationActionsService Unit Tests
 *
 * Tests focus on business logic, validation, and service interface.
 * Covers:
 * - Action listing and filtering
 * - Action creation and lifecycle management
 * - Appeal workflows and decision-making
 * - Temporary ban functionality
 * - Error handling and validation
 */
describe('ModerationActionsService', () => {
  let service: ModerationActionsService;
  let prismaService: any;
  let queueService: any;

  beforeEach(() => {
    // Create mock services
    prismaService = {
      moderationAction: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      appeal: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    queueService = {
      publishEvent: vi.fn().mockResolvedValue(undefined),
    };

    service = new ModerationActionsService(prismaService, queueService);
  });

  describe('Service Instantiation', () => {
    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(ModerationActionsService);
    });

    it('should have all required methods', () => {
      const methods = [
        'listActions',
        'createAction',
        'getAction',
        'approveAction',
        'rejectAction',
        'getUserActions',
        'sendCoolingOffPrompt',
        'createAppeal',
        'getPendingAppeals',
        'reviewAppeal',
        'createTemporaryBan',
        'autoLiftExpiredBans',
        'getUserBanStatus',
      ];

      for (const method of methods) {
        expect(typeof (service as any)[method]).toBe('function');
      }
    });
  });

  describe('listActions', () => {
    it('should list all actions without filters', async () => {
      const mockActions = [
        {
          id: 'action-1',
          targetType: 'RESPONSE',
          targetId: 'response-1',
          actionType: 'WARN',
          severity: 'NON_PUNITIVE',
          reasoning: 'Tone violation',
          aiRecommended: false,
          status: 'ACTIVE',
          createdAt: new Date(),
          approvedAt: new Date(),
          approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
        },
      ];

      prismaService.moderationAction.count.mockResolvedValue(1);
      prismaService.moderationAction.findMany.mockResolvedValue(mockActions);

      const result = await service.listActions();

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]?.actionType).toBe('warn');
      expect(result.totalCount).toBe(1);
      expect(prismaService.moderationAction.findMany).toHaveBeenCalled();
    });

    it('should filter actions by target type', async () => {
      prismaService.moderationAction.count.mockResolvedValue(1);
      prismaService.moderationAction.findMany.mockResolvedValue([
        {
          id: 'action-1',
          targetType: 'USER',
          targetId: 'user-1',
          actionType: 'BAN',
          severity: 'CONSEQUENTIAL',
          reasoning: 'Ban violation',
          status: 'ACTIVE',
          createdAt: new Date(),
          approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
        },
      ]);

      await service.listActions('USER');

      expect(prismaService.moderationAction.findMany).toHaveBeenCalled();
      const callArgs = prismaService.moderationAction.findMany.mock.calls[0][0];
      expect(callArgs.where.targetType).toBe('USER');
    });

    it('should filter actions by status', async () => {
      prismaService.moderationAction.count.mockResolvedValue(1);
      prismaService.moderationAction.findMany.mockResolvedValue([]);

      await service.listActions(undefined, 'PENDING');

      const callArgs = prismaService.moderationAction.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe('PENDING');
    });

    it('should filter actions by severity', async () => {
      prismaService.moderationAction.count.mockResolvedValue(1);
      prismaService.moderationAction.findMany.mockResolvedValue([]);

      await service.listActions(undefined, undefined, 'CONSEQUENTIAL');

      const callArgs = prismaService.moderationAction.findMany.mock.calls[0][0];
      expect(callArgs.where.severity).toBe('CONSEQUENTIAL');
    });

    it('should handle pagination with cursor', async () => {
      const mockActions = Array.from({ length: 20 }, (_, i) => ({
        id: `action-${i}`,
        targetType: 'RESPONSE',
        targetId: `response-${i}`,
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'Test',
        status: 'ACTIVE',
        createdAt: new Date(),
        approvedBy: null,
      }));

      prismaService.moderationAction.count.mockResolvedValue(50);
      prismaService.moderationAction.findMany.mockResolvedValue(mockActions);

      const result = await service.listActions(undefined, undefined, undefined, 20, 'action-0');

      expect(result.actions).toHaveLength(20);
      expect(result.nextCursor).toBe('action-19');
      expect(prismaService.moderationAction.findMany).toHaveBeenCalled();
    });
  });

  describe('createAction', () => {
    it('should create a moderator-initiated action', async () => {
      const request = {
        targetType: 'response',
        targetId: 'response-1',
        actionType: 'warn',
        reasoning: 'This is a minimum twenty character reason',
      };

      const mockAction = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: request.reasoning,
        aiRecommended: false,
        aiConfidence: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        approvedAt: new Date(),
        approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
      };

      prismaService.moderationAction.create.mockResolvedValue(mockAction);

      const result = await service.createAction(request as any, 'mod-1');

      expect(result.actionType).toBe('warn');
      expect(result.status).toBe('active');
      expect(result.severity).toBe('non_punitive');
      expect(queueService.publishEvent).toHaveBeenCalled();
    });

    it('should throw error if reasoning is too short', async () => {
      const request = {
        targetType: 'response' as const,
        targetId: 'response-1',
        actionType: 'warn' as const,
        reasoning: 'Short',
      };

      await expect(service.createAction(request, 'mod-1')).rejects.toThrow(BadRequestException);
    });

    it('should map action type to correct severity level', async () => {
      const createTests = [
        { actionType: 'educate' as const, expectedSeverity: 'NON_PUNITIVE' },
        { actionType: 'warn' as const, expectedSeverity: 'NON_PUNITIVE' },
        { actionType: 'hide', expectedSeverity: 'CONSEQUENTIAL' },
        { actionType: 'remove', expectedSeverity: 'CONSEQUENTIAL' },
        { actionType: 'suspend', expectedSeverity: 'CONSEQUENTIAL' },
        { actionType: 'ban' as const, expectedSeverity: 'CONSEQUENTIAL' },
      ];

      for (const testCase of createTests) {
        prismaService.moderationAction.create.mockResolvedValue({
          id: 'action-1',
          targetType: 'RESPONSE',
          targetId: 'response-1',
          actionType: testCase.actionType.toUpperCase(),
          severity: testCase.expectedSeverity,
          reasoning: 'This is a minimum twenty character reason',
          status: 'ACTIVE',
          createdAt: new Date(),
          approvedBy: null,
        });

        const request = {
          targetType: 'response' as const,
          targetId: 'response-1',
          actionType: testCase.actionType,
          reasoning: 'This is a minimum twenty character reason',
        };

        const result = await service.createAction(request as any, 'mod-1');

        expect(result.severity).toBe(testCase.expectedSeverity.toLowerCase());
      }
    });

    it('should handle event publishing failure gracefully', async () => {
      const request = {
        targetType: 'response' as const,
        targetId: 'response-1',
        actionType: 'warn' as const,
        reasoning: 'This is a minimum twenty character reason',
      };

      const mockAction = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: request.reasoning,
        status: 'ACTIVE',
        createdAt: new Date(),
        approvedBy: null,
      };

      prismaService.moderationAction.create.mockResolvedValue(mockAction);
      queueService.publishEvent.mockRejectedValue(new Error('Queue unavailable'));

      // Should not throw, even though publishing failed
      const result = await service.createAction(request as any, 'mod-1');
      expect(result.id).toBe('action-1');
    });
  });

  describe('getAction', () => {
    it('should retrieve action with appeals', async () => {
      const mockAction = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'WARN',
        severity: 'NON_PUNITIVE',
        reasoning: 'Test reason',
        status: 'APPEALED',
        createdAt: new Date(),
        approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
        appeals: [
          {
            id: 'appeal-1',
            reason: 'I disagree',
            status: 'PENDING',
            createdAt: new Date(),
          },
        ],
      };

      prismaService.moderationAction.findUnique.mockResolvedValue(mockAction);

      const result = await service.getAction('action-1');

      expect(result.id).toBe('action-1');
      expect(result.appeal).toBeDefined();
      expect(result.appeal?.['id']).toBe('appeal-1');
    });

    it('should throw NotFoundException if action not found', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue(null);

      await expect(service.getAction('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveAction', () => {
    it('should approve a pending consequential action', async () => {
      const mockAction = {
        id: 'action-1',
        targetType: 'RESPONSE',
        targetId: 'response-1',
        actionType: 'HIDE',
        severity: 'CONSEQUENTIAL',
        reasoning: 'Misinformation detected',
        status: 'PENDING',
        createdAt: new Date(),
        approvedBy: null,
      };

      prismaService.moderationAction.findUnique.mockResolvedValue(mockAction);
      prismaService.moderationAction.update.mockResolvedValue({
        ...mockAction,
        status: 'ACTIVE',
        approvedAt: new Date(),
      });

      const result = await service.approveAction('action-1', 'mod-1');

      expect(result.status).toBe('active');
      expect(prismaService.moderationAction.update).toHaveBeenCalled();
    });

    it('should throw error if action is not PENDING', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'ACTIVE',
        severity: 'CONSEQUENTIAL',
      });

      await expect(service.approveAction('action-1', 'mod-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if action is NON_PUNITIVE', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'PENDING',
        severity: 'NON_PUNITIVE',
      });

      await expect(service.approveAction('action-1', 'mod-1')).rejects.toThrow(BadRequestException);
    });

    it('should allow optional modified reasoning', async () => {
      const mockAction = {
        id: 'action-1',
        status: 'PENDING',
        severity: 'CONSEQUENTIAL',
        reasoning: 'Original reason',
        targetType: 'RESPONSE',
        actionType: 'HIDE',
        createdAt: new Date(),
        approvedBy: null,
      };

      prismaService.moderationAction.findUnique.mockResolvedValue(mockAction);
      prismaService.moderationAction.update.mockResolvedValue({
        ...mockAction,
        status: 'ACTIVE',
        reasoning: 'Modified reason',
        approvedAt: new Date(),
      });

      await service.approveAction('action-1', 'mod-1', {
        modifiedReasoning: 'Modified reason',
      });

      const updateCall = prismaService.moderationAction.update.mock.calls[0][0];
      expect(updateCall.data.reasoning).toBe('Modified reason');
    });
  });

  describe('rejectAction', () => {
    it('should reject a pending action', async () => {
      const mockAction = {
        id: 'action-1',
        status: 'PENDING',
        reasoning: 'Original reason',
      };

      prismaService.moderationAction.findUnique.mockResolvedValue(mockAction);
      prismaService.moderationAction.update.mockResolvedValue({
        ...mockAction,
        status: 'REVERSED',
      });

      await service.rejectAction('action-1', { reason: 'Insufficient evidence' });

      expect(prismaService.moderationAction.update).toHaveBeenCalled();
      const updateCall = prismaService.moderationAction.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('REVERSED');
      expect(updateCall.data.reasoning).toContain('REJECTED BY MODERATOR');
    });

    it('should throw error if action is not PENDING', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'ACTIVE',
      });

      await expect(service.rejectAction('action-1', { reason: 'Not appropriate' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUserActions', () => {
    it('should retrieve user moderation history', async () => {
      const mockActions = [
        {
          id: 'action-1',
          targetType: 'USER',
          targetId: 'user-1',
          actionType: 'WARN',
          severity: 'NON_PUNITIVE',
          status: 'ACTIVE',
          createdAt: new Date(),
          approvedBy: null,
        },
      ];

      prismaService.moderationAction.count.mockResolvedValue(1);
      prismaService.moderationAction.findMany.mockResolvedValue(mockActions);

      const result = await service.getUserActions('user-1');

      expect(result.actions).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      const callArgs = prismaService.moderationAction.findMany.mock.calls[0][0];
      expect(callArgs.where.targetId).toBe('user-1');
      expect(callArgs.where.targetType).toBe('USER');
    });
  });

  describe('sendCoolingOffPrompt', () => {
    it('should send cooling-off prompt to users', async () => {
      const userIds = ['user-1', 'user-2'];
      const topicId = 'topic-1';
      const prompt = 'Consider taking a break from this discussion';

      const result = await service.sendCoolingOffPrompt(userIds, topicId, prompt);

      expect(result.sent).toBe(2);
    });
  });

  describe('createAppeal', () => {
    it('should create an appeal against a moderation action', async () => {
      const mockAction = {
        id: 'action-1',
        status: 'ACTIVE',
      };

      const mockAppeal = {
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'I believe this decision was unfair and unjustified',
        status: 'PENDING',
        createdAt: new Date(),
      };

      prismaService.moderationAction.findUnique.mockResolvedValue(mockAction);
      prismaService.appeal.findUnique.mockResolvedValue(null);
      prismaService.appeal.create.mockResolvedValue(mockAppeal);
      prismaService.moderationAction.update.mockResolvedValue({
        ...mockAction,
        status: 'APPEALED',
      });

      const result = await service.createAppeal('action-1', 'user-1', {
        reason: 'I believe this decision was unfair and unjustified',
      });

      expect(result.status).toBe('pending');
      expect(result.reason).toBe('I believe this decision was unfair and unjustified');
      expect(prismaService.appeal.create).toHaveBeenCalled();
    });

    it('should throw error if reason is missing', async () => {
      await expect(service.createAppeal('action-1', 'user-1', { reason: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if reason is too short', async () => {
      await expect(service.createAppeal('action-1', 'user-1', { reason: 'Short' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if reason exceeds max length', async () => {
      const longReason = 'a'.repeat(5001);

      await expect(
        service.createAppeal('action-1', 'user-1', { reason: longReason }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if action not found', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue(null);

      await expect(
        service.createAppeal('non-existent', 'user-1', {
          reason: 'This is a minimum twenty character reason',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if action already reversed', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'REVERSED',
      });

      await expect(
        service.createAppeal('action-1', 'user-1', {
          reason: 'This is a minimum twenty character reason',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate pending appeals', async () => {
      prismaService.moderationAction.findUnique.mockResolvedValue({
        id: 'action-1',
        status: 'ACTIVE',
      });

      prismaService.appeal.findUnique.mockResolvedValue({
        id: 'existing-appeal',
        status: 'PENDING',
      });

      await expect(
        service.createAppeal('action-1', 'user-1', {
          reason: 'This is a minimum twenty character reason',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingAppeals', () => {
    it('should retrieve pending appeals', async () => {
      const mockAppeals = [
        {
          id: 'appeal-1',
          moderationActionId: 'action-1',
          appellantId: 'user-1',
          reason: 'I disagree',
          status: 'PENDING',
          createdAt: new Date(),
          moderationAction: {
            id: 'action-1',
            targetType: 'RESPONSE',
            targetId: 'response-1',
            actionType: 'HIDE',
            severity: 'CONSEQUENTIAL',
            status: 'APPEALED',
            createdAt: new Date(),
            approvedBy: null,
          },
        },
      ];

      prismaService.appeal.count.mockResolvedValue(1);
      prismaService.appeal.findMany.mockResolvedValue(mockAppeals);

      const result = await service.getPendingAppeals();

      expect(result.appeals).toHaveLength(1);
      expect(result.appeals[0]?.status).toBe('pending');
      expect(result.totalCount).toBe(1);
    });
  });

  describe('reviewAppeal', () => {
    it('should uphold an appeal and reverse the action', async () => {
      const mockAppeal = {
        id: 'appeal-1',
        status: 'PENDING',
        appellantId: 'user-1',
        moderationActionId: 'action-1',
        reason: 'I disagree',
        createdAt: new Date(),
        moderationAction: {
          id: 'action-1',
          reasoning: 'Original reason',
        },
      };

      prismaService.appeal.findUnique.mockResolvedValue(mockAppeal);
      prismaService.appeal.update.mockResolvedValue({
        ...mockAppeal,
        status: 'UPHELD',
        createdAt: new Date(),
        resolvedAt: new Date(),
      });
      prismaService.moderationAction.update.mockResolvedValue({
        id: 'action-1',
        status: 'REVERSED',
      });

      const result = await service.reviewAppeal('appeal-1', 'mod-1', {
        decision: 'upheld',
        reasoning: 'Upon review, we agree with the appellant justification provided',
      });

      expect(result.status).toBe('upheld');
      expect(queueService.publishEvent).toHaveBeenCalled();
    });

    it('should deny an appeal and keep action active', async () => {
      const mockAppeal = {
        id: 'appeal-1',
        status: 'PENDING',
        appellantId: 'user-1',
        moderationActionId: 'action-1',
        reason: 'I disagree',
        createdAt: new Date(),
        moderationAction: { id: 'action-1' },
      };

      prismaService.appeal.findUnique.mockResolvedValue(mockAppeal);
      prismaService.appeal.update.mockResolvedValue({
        ...mockAppeal,
        status: 'DENIED',
        createdAt: new Date(),
        resolvedAt: new Date(),
      });

      const result = await service.reviewAppeal('appeal-1', 'mod-1', {
        decision: 'denied',
        reasoning: 'The original moderation action was appropriate and justified',
      });

      expect(result.status).toBe('denied');
      // Event should not be published for denied appeals
      expect(queueService.publishEvent).not.toHaveBeenCalled();
    });

    it('should throw error if reasoning is too short', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
      });

      await expect(
        service.reviewAppeal('appeal-1', 'mod-1', {
          decision: 'upheld',
          reasoning: 'Too short',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if reasoning exceeds max length', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'PENDING',
      });

      const longReasoning = 'a'.repeat(2001);

      await expect(
        service.reviewAppeal('appeal-1', 'mod-1', {
          decision: 'upheld',
          reasoning: longReasoning,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if appeal is not PENDING', async () => {
      prismaService.appeal.findUnique.mockResolvedValue({
        id: 'appeal-1',
        status: 'UPHELD',
      });

      await expect(
        service.reviewAppeal('appeal-1', 'mod-1', {
          decision: 'upheld',
          reasoning: 'This is a minimum twenty character reasoning',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTemporaryBan', () => {
    it('should create a temporary ban', async () => {
      const mockAction = {
        id: 'ban-1',
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'BAN',
        severity: 'CONSEQUENTIAL',
        isTemporary: true,
        banDurationDays: 7,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        createdAt: new Date(),
        approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
      };

      prismaService.moderationAction.create.mockResolvedValue(mockAction);

      const result = await service.createTemporaryBan('user-1', 7, 'Repeated violations', 'mod-1');

      expect(result.isTemporary).toBe(true);
      expect(result.banDurationDays).toBe(7);
      expect(queueService.publishEvent).toHaveBeenCalled();
    });

    it('should reject ban duration <= 0', async () => {
      await expect(service.createTemporaryBan('user-1', 0, 'Reason', 'mod-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject ban duration > 365', async () => {
      await expect(service.createTemporaryBan('user-1', 366, 'Reason', 'mod-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle durations at boundaries', async () => {
      const mockAction = {
        id: 'ban-1',
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'BAN',
        severity: 'CONSEQUENTIAL',
        isTemporary: true,
        banDurationDays: 365,
        status: 'ACTIVE',
        createdAt: new Date(),
        approvedBy: null,
      };

      prismaService.moderationAction.create.mockResolvedValue(mockAction);

      const result = await service.createTemporaryBan(
        'user-1',
        365,
        'Maximum duration ban',
        'mod-1',
      );

      expect(result.banDurationDays).toBe(365);
    });
  });

  describe('autoLiftExpiredBans', () => {
    it('should lift expired temporary bans', async () => {
      const expiredBans = [
        {
          id: 'ban-1',
          reasoning: 'Temporary ban for 7 days',
        },
        {
          id: 'ban-2',
          reasoning: 'Another temporary ban',
        },
      ];

      prismaService.moderationAction.findMany.mockResolvedValue(expiredBans);
      prismaService.moderationAction.updateMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.autoLiftExpiredBans();

      expect(result.lifted).toBe(2);
      expect(prismaService.moderationAction.updateMany).toHaveBeenCalled();
    });

    it('should return 0 if no bans are expired', async () => {
      prismaService.moderationAction.findMany.mockResolvedValue([]);

      const result = await service.autoLiftExpiredBans();

      expect(result.lifted).toBe(0);
    });
  });

  describe('getUserBanStatus', () => {
    it('should return banned status for user with active ban', async () => {
      const mockBan = {
        id: 'ban-1',
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'BAN',
        severity: 'CONSEQUENTIAL',
        isTemporary: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        createdAt: new Date(),
        approvedBy: { id: 'mod-1', displayName: 'Moderator 1' },
      };

      prismaService.moderationAction.findFirst.mockResolvedValue(mockBan);

      const result = await service.getUserBanStatus('user-1');

      expect(result.isBanned).toBe(true);
      expect(result.isTemporaryBan).toBe(true);
      expect(result.expiresAt).toBeDefined();
    });

    it('should return not banned if no active ban exists', async () => {
      prismaService.moderationAction.findFirst.mockResolvedValue(null);

      const result = await service.getUserBanStatus('user-1');

      expect(result.isBanned).toBe(false);
      expect(result.action).toBeNull();
    });

    it('should detect expired temporary bans', async () => {
      const mockBan = {
        id: 'ban-1',
        targetType: 'USER',
        targetId: 'user-1',
        actionType: 'BAN',
        severity: 'CONSEQUENTIAL',
        isTemporary: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: 'ACTIVE',
        createdAt: new Date(),
        approvedBy: null,
      };

      prismaService.moderationAction.findFirst.mockResolvedValue(mockBan);

      const result = await service.getUserBanStatus('user-1');

      expect(result.isBanned).toBe(false);
      expect(result.isTemporaryBan).toBe(true);
    });
  });

  describe('Request/Response Interfaces', () => {
    it('should validate moderation action response structure', () => {
      const response = {
        id: 'action-1',
        targetType: 'response' as const,
        targetId: 'response-1',
        actionType: 'warn' as const,
        severity: 'non_punitive',
        reasoning: 'Test reason',
        aiRecommended: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        approvedBy: {
          id: 'mod-1',
          displayName: 'Moderator 1',
        },
      };

      expect(response.actionType).toBe('warn');
      expect(response.severity).toBe('non_punitive');
      expect(typeof response.reasoning).toBe('string');
      expect(response.createdAt).toBeDefined();
    });

    it('should validate appeal response structure', () => {
      const response = {
        id: 'appeal-1',
        moderationActionId: 'action-1',
        appellantId: 'user-1',
        reason: 'I disagree with this decision',
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewerId: null,
        decisionReasoning: null,
        resolvedAt: null,
      };

      expect(response.status).toBe('pending');
      expect(response.reason).toBeDefined();
      expect(typeof response.createdAt).toBe('string');
    });

    it('should validate all valid action types', () => {
      const validActions = ['educate', 'warn', 'hide', 'remove', 'suspend', 'ban'];

      for (const actionType of validActions) {
        const request = {
          targetType: 'response' as const,
          targetId: 'response-1',
          actionType,
          reasoning: 'This is a minimum twenty character reason',
        };

        expect(validActions).toContain(request.actionType);
      }
    });

    it('should validate all valid target types', () => {
      const validTargets = ['response', 'user', 'topic'];

      for (const targetType of validTargets) {
        const request = {
          targetType,
          targetId: 'id-1',
          actionType: 'warn' as const,
          reasoning: 'This is a minimum twenty character reason',
        };

        expect(validTargets).toContain(request.targetType);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      prismaService.moderationAction.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.listActions()).rejects.toThrow('Database connection failed');
    });

    it('should handle missing required fields', async () => {
      const invalidRequest = {
        targetType: 'response' as const,
        targetId: 'response-1',
        actionType: 'warn' as const,
        reasoning: '',
      };

      await expect(service.createAction(invalidRequest as any, 'mod-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
