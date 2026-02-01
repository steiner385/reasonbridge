// @ts-nocheck
/**
 * Integration tests for Flag-to-Action Flow
 *
 * Tests the complete moderation workflow:
 * 1. AI Recommendation Flow: AI flags content → Creates PENDING action → Moderator approves → ACTIVE
 * 2. Direct Moderator Action: Moderator creates action → Immediately ACTIVE
 * 3. Appeal Workflow: User appeals → Review → Upheld (REVERSED) or Denied
 *
 * These tests verify the service layer interactions and event publishing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModerationActionsService } from '../../services/moderation-actions.service.js';
import { AIReviewService } from '../../services/ai-review.service.js';
import { ContentScreeningService } from '../../services/content-screening.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueueService } from '../../queue/queue.service.js';
import {
  testResponseId,
  testUserId,
  testModeratorId,
  testModerationActionId,
  testAppealId,
  mockAiRecommendationRequest,
  mockCreateActionRequest,
  mockCreateAppealRequest,
  mockReviewAppealUpheldRequest,
  mockReviewAppealDeniedRequest,
  mockModerator,
  createMockModerationAction,
  createMockAppeal,
} from '../fixtures/test-data.js';

describe('Flag-to-Action Integration Tests', () => {
  let moderationActionsService: ModerationActionsService;
  let aiReviewService: AIReviewService;
  let mockPrisma: any;
  let mockQueueService: any;
  let mockContentScreeningService: any;

  beforeEach(() => {
    // Mock QueueService
    mockQueueService = {
      publishEvent: vi.fn().mockResolvedValue('message-id-123'),
      initialize: vi.fn().mockResolvedValue(undefined),
      startConsuming: vi.fn().mockResolvedValue(undefined),
      stopConsuming: vi.fn().mockResolvedValue(undefined),
      getHealthStatus: vi.fn().mockReturnValue({ publisherReady: true }),
    };

    // Mock ContentScreeningService
    mockContentScreeningService = {
      screenContent: vi.fn().mockResolvedValue({
        riskScore: 0.75,
        toneScore: 0.3,
        fallacies: ['ad_hominem'],
        recommendation: 'review',
      }),
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
      },
    };

    // Create service instances with mocked dependencies
    moderationActionsService = new ModerationActionsService(
      mockPrisma as unknown as PrismaService,
      mockQueueService as unknown as QueueService,
    );

    aiReviewService = new AIReviewService(
      mockPrisma as unknown as PrismaService,
      mockContentScreeningService as unknown as ContentScreeningService,
      mockQueueService as unknown as QueueService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AI Recommendation to Action Flow', () => {
    it('should create PENDING moderation action from AI recommendation', async () => {
      const pendingAction = createMockModerationAction({
        status: 'PENDING',
        aiRecommended: true,
        aiConfidence: mockAiRecommendationRequest.confidence,
      });

      mockPrisma.moderationAction.create.mockResolvedValue(pendingAction);

      const result = await aiReviewService.submitAiRecommendation(mockAiRecommendationRequest);

      // Verify action created with PENDING status
      // Note: 'warn' is NON_PUNITIVE (educate, warn are non-punitive; hide, remove, suspend, ban are consequential)
      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetType: 'RESPONSE',
          targetId: testResponseId,
          actionType: 'WARN',
          severity: 'NON_PUNITIVE',
          status: 'PENDING',
          aiRecommended: true,
          aiConfidence: mockAiRecommendationRequest.confidence,
        }),
      });

      // Verify event published
      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'moderation.action.requested',
          payload: expect.objectContaining({
            targetType: 'response',
            targetId: testResponseId,
            actionType: 'warn',
            aiConfidence: mockAiRecommendationRequest.confidence,
          }),
        }),
      );

      expect(result.status).toBe('PENDING');
      expect(result.aiRecommended).toBe(true);
    });

    it('should approve PENDING action and transition to ACTIVE', async () => {
      const pendingAction = createMockModerationAction({
        status: 'PENDING',
        severity: 'CONSEQUENTIAL',
      });
      const approvedAction = {
        ...pendingAction,
        status: 'ACTIVE',
        approvedById: testModeratorId,
        approvedAt: new Date(),
        executedAt: new Date(),
        approvedBy: mockModerator,
      };

      mockPrisma.moderationAction.findUnique.mockResolvedValue(pendingAction);
      mockPrisma.moderationAction.update.mockResolvedValue(approvedAction);

      const result = await moderationActionsService.approveAction(
        testModerationActionId,
        testModeratorId,
      );

      // Verify status updated to ACTIVE
      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: testModerationActionId },
        data: expect.objectContaining({
          status: 'ACTIVE',
          approvedById: testModeratorId,
        }),
        include: expect.any(Object),
      });

      expect(result.status).toBe('active');
      expect(result.approvedBy).toEqual({
        id: mockModerator.id,
        displayName: mockModerator.displayName,
      });
    });

    it('should reject non-PENDING action approval attempt', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);

      await expect(
        moderationActionsService.approveAction(testModerationActionId, testModeratorId),
      ).rejects.toThrow('Action must be in PENDING status to approve');
    });

    it('should reject non-punitive action approval attempt', async () => {
      const nonPunitiveAction = createMockModerationAction({
        status: 'PENDING',
        severity: 'NON_PUNITIVE',
        actionType: 'EDUCATE',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(nonPunitiveAction);

      await expect(
        moderationActionsService.approveAction(testModerationActionId, testModeratorId),
      ).rejects.toThrow('Non-punitive actions cannot be explicitly approved');
    });

    it('should reject PENDING action and set status to REVERSED', async () => {
      const pendingAction = createMockModerationAction({
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(pendingAction);
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...pendingAction,
        status: 'REVERSED',
      });

      await moderationActionsService.rejectAction(testModerationActionId, {
        reason: 'False positive - content does not violate guidelines',
      });

      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: testModerationActionId },
        data: expect.objectContaining({
          status: 'REVERSED',
          reasoning: expect.stringContaining('[REJECTED BY MODERATOR:'),
        }),
      });
    });
  });

  describe('Direct Moderator Action Flow', () => {
    it('should create immediately ACTIVE action for moderator-initiated action', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
        aiRecommended: false,
        actionType: 'REMOVE',
        severity: 'CONSEQUENTIAL',
        approvedById: testModeratorId,
        approvedAt: new Date(),
        executedAt: new Date(),
        approvedBy: mockModerator,
      });

      mockPrisma.moderationAction.create.mockResolvedValue(activeAction);

      const result = await moderationActionsService.createAction(
        mockCreateActionRequest,
        testModeratorId,
      );

      // Verify action created with ACTIVE status immediately
      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'ACTIVE',
          aiRecommended: false,
          approvedById: testModeratorId,
        }),
        include: expect.any(Object),
      });

      // Verify event published
      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'moderation.action.requested',
          payload: expect.objectContaining({
            targetType: 'response',
            targetId: testResponseId,
            actionType: 'remove',
            aiConfidence: 1.0, // Moderator actions have full confidence
          }),
        }),
      );

      expect(result.status).toBe('active');
      expect(result.aiRecommended).toBe(false);
    });

    it('should reject action with insufficient reasoning', async () => {
      const shortReasonRequest = {
        ...mockCreateActionRequest,
        reasoning: 'Too short',
      };

      await expect(
        moderationActionsService.createAction(shortReasonRequest, testModeratorId),
      ).rejects.toThrow('Reasoning must be at least 20 characters long');
    });

    it('should correctly map action types to severity levels', async () => {
      // Non-punitive actions: educate, warn
      const educateAction = createMockModerationAction({
        actionType: 'EDUCATE',
        severity: 'NON_PUNITIVE',
        status: 'ACTIVE',
        aiRecommended: false,
        approvedBy: mockModerator,
      });

      mockPrisma.moderationAction.create.mockResolvedValue(educateAction);

      await moderationActionsService.createAction(
        { ...mockCreateActionRequest, actionType: 'educate' },
        testModeratorId,
      );

      expect(mockPrisma.moderationAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'NON_PUNITIVE',
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('Appeal Workflow', () => {
    it('should create appeal and transition action to APPEALED status', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
      });
      const newAppeal = createMockAppeal({
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);
      mockPrisma.appeal.findUnique.mockResolvedValue(null); // No existing appeal
      mockPrisma.appeal.create.mockResolvedValue(newAppeal);
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...activeAction,
        status: 'APPEALED',
      });

      const result = await moderationActionsService.createAppeal(
        testModerationActionId,
        testUserId,
        mockCreateAppealRequest,
      );

      // Verify appeal created
      expect(mockPrisma.appeal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          moderationActionId: testModerationActionId,
          appellantId: testUserId,
          reason: mockCreateAppealRequest.reason,
          status: 'PENDING',
        }),
      });

      // Verify action status updated to APPEALED
      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: testModerationActionId },
        data: { status: 'APPEALED' },
      });

      expect(result.status).toBe('pending');
    });

    it('should uphold appeal and reverse moderation action', async () => {
      const pendingAppeal = createMockAppeal({
        status: 'PENDING',
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      });
      const upheldAppeal = {
        ...pendingAppeal,
        status: 'UPHELD',
        reviewerId: testModeratorId,
        decisionReasoning: mockReviewAppealUpheldRequest.reasoning,
        resolvedAt: new Date(),
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.appeal.update.mockResolvedValue(upheldAppeal);
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...pendingAppeal.moderationAction,
        status: 'REVERSED',
      });

      const result = await moderationActionsService.reviewAppeal(
        testAppealId,
        testModeratorId,
        mockReviewAppealUpheldRequest,
      );

      // Verify appeal updated to UPHELD
      expect(mockPrisma.appeal.update).toHaveBeenCalledWith({
        where: { id: testAppealId },
        data: expect.objectContaining({
          status: 'UPHELD',
          reviewerId: testModeratorId,
          decisionReasoning: mockReviewAppealUpheldRequest.reasoning,
        }),
      });

      // Verify action reversed
      expect(mockPrisma.moderationAction.update).toHaveBeenCalledWith({
        where: { id: testModerationActionId },
        data: expect.objectContaining({
          status: 'REVERSED',
          reasoning: expect.stringContaining('[APPEAL UPHELD:'),
        }),
      });

      // Verify trust update event published
      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.trust.updated',
          payload: expect.objectContaining({
            userId: testUserId,
            reason: 'appeal_upheld',
          }),
        }),
      );

      expect(result.status).toBe('upheld');
    });

    it('should deny appeal and keep action status unchanged', async () => {
      const pendingAppeal = createMockAppeal({
        status: 'PENDING',
        moderationAction: createMockModerationAction({ status: 'APPEALED' }),
      });
      const deniedAppeal = {
        ...pendingAppeal,
        status: 'DENIED',
        reviewerId: testModeratorId,
        decisionReasoning: mockReviewAppealDeniedRequest.reasoning,
        resolvedAt: new Date(),
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(pendingAppeal);
      mockPrisma.appeal.update.mockResolvedValue(deniedAppeal);

      const result = await moderationActionsService.reviewAppeal(
        testAppealId,
        testModeratorId,
        mockReviewAppealDeniedRequest,
      );

      // Verify appeal updated to DENIED
      expect(mockPrisma.appeal.update).toHaveBeenCalledWith({
        where: { id: testAppealId },
        data: expect.objectContaining({
          status: 'DENIED',
          reviewerId: testModeratorId,
        }),
      });

      // Verify action NOT updated (appeal denied)
      expect(mockPrisma.moderationAction.update).not.toHaveBeenCalled();

      // Verify no trust update event published
      expect(mockQueueService.publishEvent).not.toHaveBeenCalled();

      expect(result.status).toBe('denied');
    });

    it('should reject appeal for already reversed action', async () => {
      const reversedAction = createMockModerationAction({
        status: 'REVERSED',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(reversedAction);

      await expect(
        moderationActionsService.createAppeal(
          testModerationActionId,
          testUserId,
          mockCreateAppealRequest,
        ),
      ).rejects.toThrow('Cannot appeal a moderation action that has already been reversed');
    });

    it('should reject duplicate pending appeal', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
      });
      const existingAppeal = createMockAppeal({
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue(activeAction);
      mockPrisma.appeal.findUnique.mockResolvedValue(existingAppeal);

      await expect(
        moderationActionsService.createAppeal(
          testModerationActionId,
          testUserId,
          mockCreateAppealRequest,
        ),
      ).rejects.toThrow('An appeal for this moderation action is already pending review');
    });

    it('should reject appeal with insufficient reason', async () => {
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
  });

  describe('Event Publishing', () => {
    it('should continue action creation even if event publishing fails', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
        aiRecommended: false,
        approvedBy: mockModerator,
      });

      mockPrisma.moderationAction.create.mockResolvedValue(activeAction);
      mockQueueService.publishEvent.mockRejectedValue(new Error('SNS connection failed'));

      // Should not throw - action is still created
      const result = await moderationActionsService.createAction(
        mockCreateActionRequest,
        testModeratorId,
      );

      expect(result.status).toBe('active');
      expect(mockQueueService.publishEvent).toHaveBeenCalled();
    });

    it('should publish correct event structure for moderation action', async () => {
      const activeAction = createMockModerationAction({
        status: 'ACTIVE',
        aiRecommended: false,
        approvedBy: mockModerator,
      });

      mockPrisma.moderationAction.create.mockResolvedValue(activeAction);

      await moderationActionsService.createAction(mockCreateActionRequest, testModeratorId);

      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          type: 'moderation.action.requested',
          timestamp: expect.any(String),
          version: 1,
          payload: expect.objectContaining({
            targetType: 'response',
            targetId: testResponseId,
            actionType: 'remove',
            severity: 'consequential',
            reasoning: mockCreateActionRequest.reasoning,
            requestedAt: expect.any(String),
          }),
          metadata: expect.objectContaining({
            source: 'moderation-service',
            userId: testModeratorId,
          }),
        }),
      );
    });
  });

  describe('Complete End-to-End Flow', () => {
    it('should complete full AI flag → approval → appeal → upheld flow', async () => {
      // Step 1: AI creates PENDING recommendation
      const pendingAction = createMockModerationAction({
        id: 'flow-action-id',
        status: 'PENDING',
        aiRecommended: true,
        aiConfidence: 0.87,
      });

      mockPrisma.moderationAction.create.mockResolvedValue(pendingAction);

      const aiResult = await aiReviewService.submitAiRecommendation(mockAiRecommendationRequest);
      expect(aiResult.status).toBe('PENDING');
      expect(aiResult.aiRecommended).toBe(true);

      // Step 2: Moderator approves
      const approvedAction = {
        ...pendingAction,
        status: 'ACTIVE',
        approvedById: testModeratorId,
        approvedAt: new Date(),
        executedAt: new Date(),
        approvedBy: mockModerator,
      };

      mockPrisma.moderationAction.findUnique.mockResolvedValue({
        ...pendingAction,
        severity: 'CONSEQUENTIAL',
      });
      mockPrisma.moderationAction.update.mockResolvedValue(approvedAction);

      const approveResult = await moderationActionsService.approveAction(
        'flow-action-id',
        testModeratorId,
      );
      expect(approveResult.status).toBe('active');

      // Step 3: User appeals
      const appeal = createMockAppeal({
        id: 'flow-appeal-id',
        moderationActionId: 'flow-action-id',
        status: 'PENDING',
      });

      mockPrisma.moderationAction.findUnique.mockResolvedValue({
        ...approvedAction,
        status: 'ACTIVE',
      });
      mockPrisma.appeal.findUnique.mockResolvedValue(null);
      mockPrisma.appeal.create.mockResolvedValue(appeal);

      const appealResult = await moderationActionsService.createAppeal(
        'flow-action-id',
        testUserId,
        mockCreateAppealRequest,
      );
      expect(appealResult.status).toBe('pending');

      // Step 4: Appeal upheld
      const appealWithAction = {
        ...appeal,
        moderationAction: { ...approvedAction, id: 'flow-action-id', status: 'APPEALED' },
      };
      const upheldAppeal = {
        ...appealWithAction,
        status: 'UPHELD',
        reviewerId: testModeratorId,
        decisionReasoning: mockReviewAppealUpheldRequest.reasoning,
        resolvedAt: new Date(),
      };

      mockPrisma.appeal.findUnique.mockResolvedValue(appealWithAction);
      mockPrisma.appeal.update.mockResolvedValue(upheldAppeal);
      mockPrisma.moderationAction.update.mockResolvedValue({
        ...approvedAction,
        status: 'REVERSED',
      });

      mockQueueService.publishEvent.mockClear();

      const reviewResult = await moderationActionsService.reviewAppeal(
        'flow-appeal-id',
        testModeratorId,
        mockReviewAppealUpheldRequest,
      );

      expect(reviewResult.status).toBe('upheld');

      // Verify trust update event was published
      expect(mockQueueService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.trust.updated',
          payload: expect.objectContaining({
            userId: testUserId,
            reason: 'appeal_upheld',
            moderationActionId: 'flow-action-id',
          }),
        }),
      );
    });
  });
});
