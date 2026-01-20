import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonGroundNotificationHandler } from './common-ground-notification.handler.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
  },
});

const createMockNotificationGateway = () => ({
  emitCommonGroundGenerated: vi.fn(),
  emitCommonGroundUpdated: vi.fn(),
});

describe('CommonGroundNotificationHandler', () => {
  let handler: CommonGroundNotificationHandler;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockGateway: ReturnType<typeof createMockNotificationGateway>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockGateway = createMockNotificationGateway();
    handler = new CommonGroundNotificationHandler(mockPrisma as any, mockGateway as any);
  });

  describe('handleCommonGroundGenerated', () => {
    const createEvent = (overrides = {}) => ({
      type: 'common-ground.generated' as const,
      timestamp: new Date().toISOString(),
      payload: {
        topicId: 'topic-1',
        version: 1,
        agreementZones: [{ id: 'zone-1', summary: 'Agreement on X' }],
        misunderstandings: [],
        genuineDisagreements: [],
        overallConsensusScore: 0.75,
        ...overrides,
      },
    });

    it('should process event for existing topic', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundGenerated(createEvent());

      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        select: expect.objectContaining({
          id: true,
          title: true,
          creatorId: true,
        }),
      });
      expect(mockGateway.emitCommonGroundGenerated).toHaveBeenCalled();
    });

    it('should skip notification if topic not found', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await handler.handleCommonGroundGenerated(createEvent());

      expect(mockGateway.emitCommonGroundGenerated).not.toHaveBeenCalled();
    });

    it('should handle event with misunderstandings', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundGenerated(
        createEvent({
          agreementZones: [],
          misunderstandings: [{ id: 'mis-1', summary: 'Confusion about Y' }],
        }),
      );

      expect(mockGateway.emitCommonGroundGenerated).toHaveBeenCalled();
    });

    it('should handle event with genuine disagreements', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundGenerated(
        createEvent({
          agreementZones: [],
          genuineDisagreements: [{ id: 'dis-1', summary: 'Disagree on Z' }],
        }),
      );

      expect(mockGateway.emitCommonGroundGenerated).toHaveBeenCalled();
    });

    it('should handle event with multiple zones', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundGenerated(
        createEvent({
          agreementZones: [
            { id: 'zone-1', summary: 'Agreement 1' },
            { id: 'zone-2', summary: 'Agreement 2' },
          ],
          misunderstandings: [{ id: 'mis-1', summary: 'Misunderstanding 1' }],
          genuineDisagreements: [{ id: 'dis-1', summary: 'Disagreement 1' }],
        }),
      );

      expect(mockGateway.emitCommonGroundGenerated).toHaveBeenCalled();
    });

    it('should throw error when database fails', async () => {
      mockPrisma.discussionTopic.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(handler.handleCommonGroundGenerated(createEvent())).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle event without consensus score', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundGenerated(
        createEvent({
          overallConsensusScore: undefined,
        }),
      );

      expect(mockGateway.emitCommonGroundGenerated).toHaveBeenCalled();
    });
  });

  describe('handleCommonGroundUpdated', () => {
    const createUpdateEvent = (overrides = {}) => ({
      type: 'common-ground.updated' as const,
      timestamp: new Date().toISOString(),
      payload: {
        topicId: 'topic-1',
        previousVersion: 1,
        newVersion: 2,
        reason: 'new_responses' as const,
        changes: {
          newAgreementZones: 1,
          resolvedMisunderstandings: 0,
          newMisunderstandings: 0,
          newDisagreements: 0,
          consensusScoreChange: 0.05,
        },
        newAnalysis: {
          agreementZones: [{ id: 'zone-1', summary: 'Agreement' }],
          misunderstandings: [],
          genuineDisagreements: [],
          overallConsensusScore: 0.8,
        },
        ...overrides,
      },
    });

    it('should process update event for existing topic', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundUpdated(createUpdateEvent());

      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        select: expect.objectContaining({
          id: true,
          title: true,
          creatorId: true,
        }),
      });
      expect(mockGateway.emitCommonGroundUpdated).toHaveBeenCalled();
    });

    it('should skip notification if topic not found', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await handler.handleCommonGroundUpdated(createUpdateEvent());

      expect(mockGateway.emitCommonGroundUpdated).not.toHaveBeenCalled();
    });

    it('should handle resolved misunderstandings', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundUpdated(
        createUpdateEvent({
          changes: {
            newAgreementZones: 0,
            resolvedMisunderstandings: 2,
            newMisunderstandings: 0,
            newDisagreements: 0,
            consensusScoreChange: 0.1,
          },
        }),
      );

      expect(mockGateway.emitCommonGroundUpdated).toHaveBeenCalled();
    });

    it('should handle negative consensus change', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundUpdated(
        createUpdateEvent({
          changes: {
            newAgreementZones: 0,
            resolvedMisunderstandings: 0,
            newMisunderstandings: 1,
            newDisagreements: 0,
            consensusScoreChange: -0.1,
          },
        }),
      );

      expect(mockGateway.emitCommonGroundUpdated).toHaveBeenCalled();
    });

    it('should handle new disagreements only', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundUpdated(
        createUpdateEvent({
          changes: {
            newAgreementZones: 0,
            resolvedMisunderstandings: 0,
            newMisunderstandings: 0,
            newDisagreements: 2,
            consensusScoreChange: 0,
          },
        }),
      );

      expect(mockGateway.emitCommonGroundUpdated).toHaveBeenCalled();
    });

    it('should handle no significant changes', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundUpdated(
        createUpdateEvent({
          changes: {
            newAgreementZones: 0,
            resolvedMisunderstandings: 0,
            newMisunderstandings: 0,
            newDisagreements: 0,
            consensusScoreChange: 0,
          },
        }),
      );

      expect(mockGateway.emitCommonGroundUpdated).toHaveBeenCalled();
    });

    it('should throw error when database fails', async () => {
      mockPrisma.discussionTopic.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(handler.handleCommonGroundUpdated(createUpdateEvent())).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle different update reasons', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 5,
      });

      await handler.handleCommonGroundUpdated(
        createUpdateEvent({
          reason: 'alignment_change',
        }),
      );

      expect(mockGateway.emitCommonGroundUpdated).toHaveBeenCalled();
    });
  });
});
