import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommonGroundNotificationHandler } from './common-ground-notification.handler.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
  },
  notification: {
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ id: `notif-${Math.random().toString(36).slice(2)}` }),
      ),
  },
  response: {
    findMany: vi.fn().mockResolvedValue([]),
  },
});

const createMockNotificationGateway = () => ({
  emitCommonGroundGenerated: vi.fn(),
  emitCommonGroundUpdated: vi.fn(),
});

const createMockDeliveryService = () => ({
  deliverNotification: vi.fn().mockResolvedValue(undefined),
});

describe('CommonGroundNotificationHandler', () => {
  let handler: CommonGroundNotificationHandler;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockGateway: ReturnType<typeof createMockNotificationGateway>;
  let mockDeliveryService: ReturnType<typeof createMockDeliveryService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockGateway = createMockNotificationGateway();
    mockDeliveryService = createMockDeliveryService();
    handler = new CommonGroundNotificationHandler(
      mockPrisma as any,
      mockGateway as any,
      mockDeliveryService as any,
    );
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

  describe('participant tracking', () => {
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

    it('should notify all topic participants including creator', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 3,
      });

      // Other participants (not the creator)
      mockPrisma.response.findMany.mockResolvedValue([
        { authorId: 'user-2' },
        { authorId: 'user-3' },
      ]);

      await handler.handleCommonGroundGenerated(createEvent());

      // Should query for participants excluding creator
      expect(mockPrisma.response.findMany).toHaveBeenCalledWith({
        where: {
          topicId: 'topic-1',
          authorId: { not: 'user-1' },
        },
        select: { authorId: true },
        distinct: ['authorId'],
      });

      // Should create 3 notifications (1 creator + 2 other participants)
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(3);
    });

    it('should notify only creator when no other participants', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 1,
      });

      // No other participants
      mockPrisma.response.findMany.mockResolvedValue([]);

      await handler.handleCommonGroundGenerated(createEvent());

      // Should create 1 notification (just creator)
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    });

    it('should deliver notifications to all participants', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'Test Topic',
        creatorId: 'user-1',
        participantCount: 2,
      });

      mockPrisma.response.findMany.mockResolvedValue([{ authorId: 'user-2' }]);

      await handler.handleCommonGroundGenerated(createEvent());

      // Should deliver to both creator and participant
      expect(mockDeliveryService.deliverNotification).toHaveBeenCalledTimes(2);
      expect(mockDeliveryService.deliverNotification).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ type: 'common_ground' }),
      );
      expect(mockDeliveryService.deliverNotification).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({ type: 'common_ground' }),
      );
    });
  });
});
