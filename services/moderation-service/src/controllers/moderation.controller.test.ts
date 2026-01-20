import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerationController } from './moderation.controller.js';
import { BadRequestException } from '@nestjs/common';

const createMockScreeningService = () => ({
  screenContent: vi.fn(),
  getRecommendations: vi.fn(),
});

const createMockAiReviewService = () => ({
  submitAiRecommendation: vi.fn(),
  getPendingRecommendations: vi.fn(),
  getRecommendationStats: vi.fn(),
});

const createMockActionsService = () => ({
  listActions: vi.fn(),
  createAction: vi.fn(),
  getAction: vi.fn(),
  approveAction: vi.fn(),
  rejectAction: vi.fn(),
  getUserActions: vi.fn(),
  sendCoolingOffPrompt: vi.fn(),
  createAppeal: vi.fn(),
  getPendingAppeals: vi.fn(),
  reviewAppeal: vi.fn(),
  createTemporaryBan: vi.fn(),
  getUserBanStatus: vi.fn(),
  autoLiftExpiredBans: vi.fn(),
});

describe('ModerationController', () => {
  let controller: ModerationController;
  let mockScreeningService: ReturnType<typeof createMockScreeningService>;
  let mockAiReviewService: ReturnType<typeof createMockAiReviewService>;
  let mockActionsService: ReturnType<typeof createMockActionsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScreeningService = createMockScreeningService();
    mockAiReviewService = createMockAiReviewService();
    mockActionsService = createMockActionsService();
    controller = new ModerationController(
      mockScreeningService as any,
      mockAiReviewService as any,
      mockActionsService as any,
    );
  });

  describe('screenContent', () => {
    it('should throw BadRequestException if contentId is missing', async () => {
      await expect(
        controller.screenContent({ contentId: '', content: 'test content' }),
      ).rejects.toThrow('contentId and content are required');
    });

    it('should throw BadRequestException if content is empty whitespace', async () => {
      await expect(
        controller.screenContent({ contentId: 'content-1', content: '   ' }),
      ).rejects.toThrow('content cannot be empty');
    });

    it('should throw BadRequestException if content exceeds max length', async () => {
      await expect(
        controller.screenContent({ contentId: 'content-1', content: 'a'.repeat(10001) }),
      ).rejects.toThrow('content exceeds maximum length of 10000');
    });

    it('should return screening result and recommendations', async () => {
      const screeningResult = { severity: 'LOW', issues: [] };
      mockScreeningService.screenContent.mockResolvedValue(screeningResult);
      mockScreeningService.getRecommendations.mockReturnValue(['No action needed']);

      const result = await controller.screenContent({
        contentId: 'content-1',
        content: 'valid content',
      });

      expect(result.screening_result).toEqual(screeningResult);
      expect(result.recommendations).toEqual(['No action needed']);
    });
  });

  describe('submitAiRecommendation', () => {
    const validRequest = {
      targetType: 'response',
      targetId: 'response-1',
      actionType: 'warn',
      reasoning: 'Detected inflammatory content',
      confidence: 0.85,
    };

    it('should throw BadRequestException if targetType is missing', async () => {
      await expect(
        controller.submitAiRecommendation({
          ...validRequest,
          targetType: '',
        }),
      ).rejects.toThrow('targetType, targetId, and actionType are required');
    });

    it('should throw BadRequestException if reasoning is empty', async () => {
      await expect(
        controller.submitAiRecommendation({
          ...validRequest,
          reasoning: '  ',
        }),
      ).rejects.toThrow('reasoning is required');
    });

    it('should throw BadRequestException if confidence is not a number', async () => {
      await expect(
        controller.submitAiRecommendation({
          ...validRequest,
          confidence: undefined as any,
        }),
      ).rejects.toThrow('confidence is required and must be a number');
    });

    it('should throw BadRequestException if confidence is out of range', async () => {
      await expect(
        controller.submitAiRecommendation({
          ...validRequest,
          confidence: 1.5,
        }),
      ).rejects.toThrow('confidence must be between 0 and 1');
    });

    it('should throw BadRequestException for invalid actionType', async () => {
      await expect(
        controller.submitAiRecommendation({
          ...validRequest,
          actionType: 'invalid',
        }),
      ).rejects.toThrow('actionType must be one of');
    });

    it('should throw BadRequestException for invalid targetType', async () => {
      await expect(
        controller.submitAiRecommendation({
          ...validRequest,
          targetType: 'invalid',
        }),
      ).rejects.toThrow('targetType must be one of');
    });

    it('should submit valid AI recommendation', async () => {
      const expectedResponse = { id: 'rec-1', ...validRequest };
      mockAiReviewService.submitAiRecommendation.mockResolvedValue(expectedResponse);

      const result = await controller.submitAiRecommendation(validRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockAiReviewService.submitAiRecommendation).toHaveBeenCalledWith(validRequest);
    });
  });

  describe('getPendingRecommendations', () => {
    it('should return pending recommendations', async () => {
      const recommendations = [{ id: 'rec-1' }, { id: 'rec-2' }];
      mockAiReviewService.getPendingRecommendations.mockResolvedValue(recommendations);

      const result = await controller.getPendingRecommendations();

      expect(result.recommendations).toEqual(recommendations);
      expect(mockAiReviewService.getPendingRecommendations).toHaveBeenCalledWith(20);
    });
  });

  describe('getAiStats', () => {
    it('should return AI stats', async () => {
      const stats = {
        totalPending: 10,
        byActionType: { warn: 5, hide: 5 },
        avgConfidence: 0.75,
        approvalRate: 0.8,
      };
      mockAiReviewService.getRecommendationStats.mockResolvedValue(stats);

      const result = await controller.getAiStats();

      expect(result).toEqual(stats);
    });
  });

  describe('listActions', () => {
    it('should list actions with filters', async () => {
      const actionsResponse = { actions: [], hasMore: false };
      mockActionsService.listActions.mockResolvedValue(actionsResponse);

      const result = await controller.listActions(
        'response',
        'pending',
        'non_punitive',
        10,
        'cursor-1',
      );

      expect(mockActionsService.listActions).toHaveBeenCalledWith(
        'RESPONSE',
        'PENDING',
        'NON_PUNITIVE',
        10,
        'cursor-1',
      );
      expect(result).toEqual(actionsResponse);
    });

    it('should handle undefined filters', async () => {
      const actionsResponse = { actions: [], hasMore: false };
      mockActionsService.listActions.mockResolvedValue(actionsResponse);

      await controller.listActions();

      expect(mockActionsService.listActions).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        20,
        undefined,
      );
    });
  });

  describe('createAction', () => {
    it('should throw BadRequestException if required fields missing', async () => {
      await expect(
        controller.createAction({ targetType: '', targetId: '', actionType: '', reasoning: '' }),
      ).rejects.toThrow('targetType, targetId, and actionType are required');
    });

    it('should throw BadRequestException if reasoning is empty', async () => {
      await expect(
        controller.createAction({
          targetType: 'response',
          targetId: 'response-1',
          actionType: 'warn',
          reasoning: '  ',
        }),
      ).rejects.toThrow('reasoning is required');
    });

    it('should create action successfully', async () => {
      const request = {
        targetType: 'response',
        targetId: 'response-1',
        actionType: 'warn',
        reasoning: 'Inflammatory content',
      };
      const expectedResponse = { id: 'action-1', ...request };
      mockActionsService.createAction.mockResolvedValue(expectedResponse);

      const result = await controller.createAction(request);

      expect(result).toEqual(expectedResponse);
      expect(mockActionsService.createAction).toHaveBeenCalledWith(request, 'system');
    });
  });

  describe('getAction', () => {
    it('should return action details', async () => {
      const actionDetails = { id: 'action-1', targetType: 'response' };
      mockActionsService.getAction.mockResolvedValue(actionDetails);

      const result = await controller.getAction('action-1');

      expect(result).toEqual(actionDetails);
      expect(mockActionsService.getAction).toHaveBeenCalledWith('action-1');
    });
  });

  describe('approveAction', () => {
    it('should approve action', async () => {
      const expectedResponse = { id: 'action-1', status: 'ACTIVE' };
      mockActionsService.approveAction.mockResolvedValue(expectedResponse);

      const result = await controller.approveAction('action-1', { notes: 'Approved' });

      expect(result).toEqual(expectedResponse);
      expect(mockActionsService.approveAction).toHaveBeenCalledWith('action-1', 'system', {
        notes: 'Approved',
      });
    });

    it('should approve action without request body', async () => {
      const expectedResponse = { id: 'action-1', status: 'ACTIVE' };
      mockActionsService.approveAction.mockResolvedValue(expectedResponse);

      const result = await controller.approveAction('action-1');

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('rejectAction', () => {
    it('should throw BadRequestException if reason is empty', async () => {
      await expect(controller.rejectAction('action-1', { reason: '  ' })).rejects.toThrow(
        'reason is required',
      );
    });

    it('should reject action', async () => {
      mockActionsService.rejectAction.mockResolvedValue(undefined);

      await controller.rejectAction('action-1', { reason: 'False positive' });

      expect(mockActionsService.rejectAction).toHaveBeenCalledWith('action-1', {
        reason: 'False positive',
      });
    });
  });

  describe('getUserActions', () => {
    it('should return user actions', async () => {
      const actionsResponse = { actions: [], hasMore: false };
      mockActionsService.getUserActions.mockResolvedValue(actionsResponse);

      const result = await controller.getUserActions('user-1', 10, 'cursor');

      expect(result).toEqual(actionsResponse);
      expect(mockActionsService.getUserActions).toHaveBeenCalledWith('user-1', 10, 'cursor');
    });
  });

  describe('sendCoolingOffPrompt', () => {
    it('should throw BadRequestException if userIds is empty', async () => {
      await expect(
        controller.sendCoolingOffPrompt({ userIds: [], topicId: 'topic-1', prompt: 'Cool down' }),
      ).rejects.toThrow('userIds array is required');
    });

    it('should throw BadRequestException if topicId is missing', async () => {
      await expect(
        controller.sendCoolingOffPrompt({ userIds: ['user-1'], topicId: '', prompt: 'Cool down' }),
      ).rejects.toThrow('topicId is required');
    });

    it('should throw BadRequestException if prompt is empty', async () => {
      await expect(
        controller.sendCoolingOffPrompt({ userIds: ['user-1'], topicId: 'topic-1', prompt: '  ' }),
      ).rejects.toThrow('prompt is required');
    });

    it('should send cooling off prompt', async () => {
      mockActionsService.sendCoolingOffPrompt.mockResolvedValue({ sent: 2 });

      const result = await controller.sendCoolingOffPrompt({
        userIds: ['user-1', 'user-2'],
        topicId: 'topic-1',
        prompt: 'Please take a moment to cool down.',
      });

      expect(result.sent).toBe(2);
    });
  });

  describe('createAppeal', () => {
    it('should throw BadRequestException if reason is empty', async () => {
      await expect(controller.createAppeal('action-1', { reason: '  ' })).rejects.toThrow(
        'reason is required',
      );
    });

    it('should create appeal', async () => {
      const appealResponse = { id: 'appeal-1', status: 'PENDING' };
      mockActionsService.createAppeal.mockResolvedValue(appealResponse);

      const result = await controller.createAppeal('action-1', { reason: 'False positive' });

      expect(result).toEqual(appealResponse);
      expect(mockActionsService.createAppeal).toHaveBeenCalledWith('action-1', 'system', {
        reason: 'False positive',
      });
    });
  });

  describe('getPendingAppeals', () => {
    it('should return pending appeals', async () => {
      const appealsResponse = { appeals: [], hasMore: false };
      mockActionsService.getPendingAppeals.mockResolvedValue(appealsResponse);

      const result = await controller.getPendingAppeals(10, 'cursor');

      expect(result).toEqual(appealsResponse);
      expect(mockActionsService.getPendingAppeals).toHaveBeenCalledWith(10, 'cursor');
    });
  });

  describe('reviewAppeal', () => {
    it('should throw BadRequestException if decision is invalid', async () => {
      await expect(
        controller.reviewAppeal('appeal-1', { decision: 'invalid' as any, reasoning: 'Reason' }),
      ).rejects.toThrow('decision must be either "upheld" or "denied"');
    });

    it('should throw BadRequestException if reasoning is empty', async () => {
      await expect(
        controller.reviewAppeal('appeal-1', { decision: 'upheld', reasoning: '  ' }),
      ).rejects.toThrow('reasoning is required');
    });

    it('should review appeal', async () => {
      const appealResponse = { id: 'appeal-1', decision: 'upheld' };
      mockActionsService.reviewAppeal.mockResolvedValue(appealResponse);

      const result = await controller.reviewAppeal('appeal-1', {
        decision: 'upheld',
        reasoning: 'Appeal is valid',
      });

      expect(result).toEqual(appealResponse);
      expect(mockActionsService.reviewAppeal).toHaveBeenCalledWith('appeal-1', 'system', {
        decision: 'upheld',
        reasoning: 'Appeal is valid',
      });
    });
  });

  describe('createTemporaryBan', () => {
    it('should throw BadRequestException if userId is empty', async () => {
      await expect(
        controller.createTemporaryBan({ userId: '', durationDays: 7, reasoning: 'Reason' }),
      ).rejects.toThrow('userId is required');
    });

    it('should throw BadRequestException if durationDays is 0', async () => {
      await expect(
        controller.createTemporaryBan({ userId: 'user-1', durationDays: 0, reasoning: 'Reason' }),
      ).rejects.toThrow('durationDays must be greater than 0');
    });

    it('should throw BadRequestException if durationDays exceeds 365', async () => {
      await expect(
        controller.createTemporaryBan({ userId: 'user-1', durationDays: 366, reasoning: 'Reason' }),
      ).rejects.toThrow('durationDays cannot exceed 365');
    });

    it('should throw BadRequestException if reasoning is empty', async () => {
      await expect(
        controller.createTemporaryBan({ userId: 'user-1', durationDays: 7, reasoning: '  ' }),
      ).rejects.toThrow('reasoning is required');
    });

    it('should create temporary ban', async () => {
      const banResponse = { id: 'action-1', actionType: 'BAN' };
      mockActionsService.createTemporaryBan.mockResolvedValue(banResponse);

      const result = await controller.createTemporaryBan({
        userId: 'user-1',
        durationDays: 7,
        reasoning: 'Repeated violations',
      });

      expect(result).toEqual(banResponse);
      expect(mockActionsService.createTemporaryBan).toHaveBeenCalledWith(
        'user-1',
        7,
        'Repeated violations',
        'system',
      );
    });
  });

  describe('getUserBanStatus', () => {
    it('should throw BadRequestException if userId is empty', async () => {
      await expect(controller.getUserBanStatus('')).rejects.toThrow('userId is required');
    });

    it('should return user ban status', async () => {
      const banStatus = { isBanned: true, expiresAt: new Date() };
      mockActionsService.getUserBanStatus.mockResolvedValue(banStatus);

      const result = await controller.getUserBanStatus('user-1');

      expect(result).toEqual(banStatus);
      expect(mockActionsService.getUserBanStatus).toHaveBeenCalledWith('user-1');
    });
  });

  describe('autoLiftExpiredBans', () => {
    it('should auto-lift expired bans', async () => {
      const liftResponse = { lifted: 5, failed: 0 };
      mockActionsService.autoLiftExpiredBans.mockResolvedValue(liftResponse);

      const result = await controller.autoLiftExpiredBans();

      expect(result).toEqual(liftResponse);
    });
  });
});
