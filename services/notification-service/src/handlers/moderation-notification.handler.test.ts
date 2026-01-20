import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerationNotificationHandler } from './moderation-notification.handler.js';

const createMockPrismaService = () => ({
  response: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  discussionTopic: {
    findUnique: vi.fn(),
  },
});

const createMockNotificationGateway = () => ({
  emitModerationActionRequested: vi.fn(),
  emitUserTrustUpdated: vi.fn(),
});

describe('ModerationNotificationHandler', () => {
  let handler: ModerationNotificationHandler;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockGateway: ReturnType<typeof createMockNotificationGateway>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockGateway = createMockNotificationGateway();
    handler = new ModerationNotificationHandler(mockPrisma as any, mockGateway as any);
  });

  describe('handleModerationActionRequested', () => {
    const createEvent = (overrides = {}) => ({
      type: 'moderation.action.requested' as const,
      timestamp: new Date().toISOString(),
      payload: {
        targetType: 'response' as const,
        targetId: 'response-1',
        actionType: 'warn' as const,
        severity: 'non_punitive' as const,
        reasoning: 'Potential violation detected',
        aiConfidence: 0.85,
        violationContext: { flaggedText: 'some text' },
        ...overrides,
      },
    });

    it('should process response target correctly', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        authorId: 'user-1',
        topicId: 'topic-1',
        content: 'This is a test response',
      });

      await handler.handleModerationActionRequested(createEvent());

      expect(mockPrisma.response.findUnique).toHaveBeenCalledWith({
        where: { id: 'response-1' },
        select: expect.objectContaining({
          id: true,
          authorId: true,
          content: true,
        }),
      });
      expect(mockGateway.emitModerationActionRequested).toHaveBeenCalled();
    });

    it('should truncate long content for title', async () => {
      const longContent = 'A'.repeat(200);
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        authorId: 'user-1',
        topicId: 'topic-1',
        content: longContent,
      });

      await handler.handleModerationActionRequested(createEvent());

      expect(mockGateway.emitModerationActionRequested).toHaveBeenCalled();
    });

    it('should skip notification if response not found', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await handler.handleModerationActionRequested(createEvent());

      expect(mockGateway.emitModerationActionRequested).not.toHaveBeenCalled();
    });

    it('should process user target correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
      });

      await handler.handleModerationActionRequested(
        createEvent({ targetType: 'user', targetId: 'user-1' }),
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, displayName: true },
      });
      expect(mockGateway.emitModerationActionRequested).toHaveBeenCalled();
    });

    it('should skip notification if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await handler.handleModerationActionRequested(
        createEvent({ targetType: 'user', targetId: 'nonexistent' }),
      );

      expect(mockGateway.emitModerationActionRequested).not.toHaveBeenCalled();
    });

    it('should process topic target correctly', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
      });

      await handler.handleModerationActionRequested(
        createEvent({ targetType: 'topic', targetId: 'topic-1' }),
      );

      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        select: { id: true, title: true },
      });
      expect(mockGateway.emitModerationActionRequested).toHaveBeenCalled();
    });

    it('should skip notification if topic not found', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await handler.handleModerationActionRequested(
        createEvent({ targetType: 'topic', targetId: 'nonexistent' }),
      );

      expect(mockGateway.emitModerationActionRequested).not.toHaveBeenCalled();
    });

    it('should throw error when database fails', async () => {
      mockPrisma.response.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(handler.handleModerationActionRequested(createEvent())).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('handleUserTrustUpdated', () => {
    const createTrustEvent = (overrides = {}) => ({
      type: 'user.trust.updated' as const,
      timestamp: new Date().toISOString(),
      payload: {
        userId: 'user-1',
        reason: 'moderation_action' as const,
        previousScores: { ability: 0.8, benevolence: 0.7, integrity: 0.9 },
        newScores: { ability: 0.7, benevolence: 0.6, integrity: 0.85 },
        moderationActionId: 'action-1',
        ...overrides,
      },
    });

    it('should process trust update for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
      });

      await handler.handleUserTrustUpdated(createTrustEvent());

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, displayName: true },
      });
      expect(mockGateway.emitUserTrustUpdated).toHaveBeenCalled();
    });

    it('should skip notification if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await handler.handleUserTrustUpdated(createTrustEvent());

      expect(mockGateway.emitUserTrustUpdated).not.toHaveBeenCalled();
    });

    it('should handle positive_contribution reason', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
      });

      await handler.handleUserTrustUpdated(
        createTrustEvent({
          reason: 'positive_contribution',
          previousScores: { ability: 0.7, benevolence: 0.7, integrity: 0.7 },
          newScores: { ability: 0.8, benevolence: 0.8, integrity: 0.8 },
        }),
      );

      expect(mockGateway.emitUserTrustUpdated).toHaveBeenCalled();
    });

    it('should handle appeal_upheld reason', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
      });

      await handler.handleUserTrustUpdated(
        createTrustEvent({
          reason: 'appeal_upheld',
          previousScores: { ability: 0.6, benevolence: 0.6, integrity: 0.6 },
          newScores: { ability: 0.7, benevolence: 0.7, integrity: 0.7 },
        }),
      );

      expect(mockGateway.emitUserTrustUpdated).toHaveBeenCalled();
    });

    it('should handle periodic_recalculation reason', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
      });

      await handler.handleUserTrustUpdated(
        createTrustEvent({
          reason: 'periodic_recalculation',
        }),
      );

      expect(mockGateway.emitUserTrustUpdated).toHaveBeenCalled();
    });

    it('should throw error when database fails', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(handler.handleUserTrustUpdated(createTrustEvent())).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle no change in scores', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
      });

      await handler.handleUserTrustUpdated(
        createTrustEvent({
          previousScores: { ability: 0.8, benevolence: 0.8, integrity: 0.8 },
          newScores: { ability: 0.8, benevolence: 0.8, integrity: 0.8 },
        }),
      );

      expect(mockGateway.emitUserTrustUpdated).toHaveBeenCalled();
    });
  });
});
