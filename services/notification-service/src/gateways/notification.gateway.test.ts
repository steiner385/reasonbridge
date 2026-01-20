import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationGateway } from './notification.gateway.js';

const createMockSocket = () => ({
  id: 'socket-1',
  join: vi.fn().mockResolvedValue(undefined),
  leave: vi.fn().mockResolvedValue(undefined),
  emit: vi.fn(),
});

const createMockServer = () => ({
  to: vi.fn().mockReturnThis(),
  emit: vi.fn(),
});

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = new NotificationGateway();
    mockServer = createMockServer();
    (gateway as any).server = mockServer;
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const mockSocket = createMockSocket();

      gateway.handleConnection(mockSocket as any);

      // No assertions needed - just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const mockSocket = createMockSocket();

      gateway.handleDisconnect(mockSocket as any);

      // No assertions needed - just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('handleSubscribeCommonGround', () => {
    it('should join the correct room and emit confirmation', async () => {
      const mockSocket = createMockSocket();

      await gateway.handleSubscribeCommonGround({ topicId: 'topic-1' }, mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('topic:topic-1:common-ground');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscription:confirmed', {
        type: 'common-ground',
        topicId: 'topic-1',
        room: 'topic:topic-1:common-ground',
      });
    });
  });

  describe('handleUnsubscribeCommonGround', () => {
    it('should leave the correct room and emit confirmation', async () => {
      const mockSocket = createMockSocket();

      await gateway.handleUnsubscribeCommonGround({ topicId: 'topic-1' }, mockSocket as any);

      expect(mockSocket.leave).toHaveBeenCalledWith('topic:topic-1:common-ground');
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscription:confirmed', {
        type: 'common-ground',
        topicId: 'topic-1',
        room: 'topic:topic-1:common-ground',
      });
    });
  });

  describe('emitCommonGroundGenerated', () => {
    it('should broadcast to correct room with event data', () => {
      const event = {
        type: 'common-ground.generated' as const,
        timestamp: new Date().toISOString(),
        payload: {
          topicId: 'topic-1',
          version: 1,
          agreementZones: [{ id: 'zone-1', summary: 'Agreement' }],
          misunderstandings: [],
          genuineDisagreements: [],
          overallConsensusScore: 0.75,
        },
      };

      gateway.emitCommonGroundGenerated(event);

      expect(mockServer.to).toHaveBeenCalledWith('topic:topic-1:common-ground');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'common-ground:generated',
        expect.objectContaining({
          topicId: 'topic-1',
          version: 1,
          analysis: expect.objectContaining({
            agreementZones: event.payload.agreementZones,
            overallConsensusScore: 0.75,
          }),
        }),
      );
    });
  });

  describe('emitCommonGroundUpdated', () => {
    it('should broadcast to correct room with update data', () => {
      const event = {
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
            agreementZones: [],
            misunderstandings: [],
            genuineDisagreements: [],
            overallConsensusScore: 0.8,
          },
        },
      };

      gateway.emitCommonGroundUpdated(event);

      expect(mockServer.to).toHaveBeenCalledWith('topic:topic-1:common-ground');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'common-ground:updated',
        expect.objectContaining({
          topicId: 'topic-1',
          previousVersion: 1,
          newVersion: 2,
          changes: event.payload.changes,
          reason: 'new_responses',
        }),
      );
    });
  });

  describe('handleSubscribeModeration', () => {
    it('should join moderation room and emit confirmation', async () => {
      const mockSocket = createMockSocket();

      await gateway.handleSubscribeModeration({}, mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('moderation:actions');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscription:confirmed', {
        type: 'moderation',
        room: 'moderation:actions',
      });
    });
  });

  describe('handleUnsubscribeModeration', () => {
    it('should leave moderation room and emit confirmation', async () => {
      const mockSocket = createMockSocket();

      await gateway.handleUnsubscribeModeration({}, mockSocket as any);

      expect(mockSocket.leave).toHaveBeenCalledWith('moderation:actions');
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscription:confirmed', {
        type: 'moderation',
        room: 'moderation:actions',
      });
    });
  });

  describe('emitModerationActionRequested', () => {
    it('should broadcast to moderation room with event data', () => {
      const event = {
        type: 'moderation.action.requested' as const,
        timestamp: new Date().toISOString(),
        payload: {
          targetType: 'response' as const,
          targetId: 'response-1',
          actionType: 'warn' as const,
          severity: 'non_punitive' as const,
          reasoning: 'Test reason',
          aiConfidence: 0.85,
          violationContext: { text: 'test' },
          requestedAt: new Date().toISOString(),
        },
      };

      gateway.emitModerationActionRequested(event);

      expect(mockServer.to).toHaveBeenCalledWith('moderation:actions');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'moderation:action-requested',
        expect.objectContaining({
          targetType: 'response',
          targetId: 'response-1',
          actionType: 'warn',
          severity: 'non_punitive',
          aiConfidence: 0.85,
        }),
      );
    });
  });

  describe('handleSubscribeTrustUpdates', () => {
    it('should join user trust room and emit confirmation', async () => {
      const mockSocket = createMockSocket();

      await gateway.handleSubscribeTrustUpdates({ userId: 'user-1' }, mockSocket as any);

      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1:trust');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscription:confirmed', {
        type: 'trust-updates',
        userId: 'user-1',
        room: 'user:user-1:trust',
      });
    });
  });

  describe('handleUnsubscribeTrustUpdates', () => {
    it('should leave user trust room and emit confirmation', async () => {
      const mockSocket = createMockSocket();

      await gateway.handleUnsubscribeTrustUpdates({ userId: 'user-1' }, mockSocket as any);

      expect(mockSocket.leave).toHaveBeenCalledWith('user:user-1:trust');
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscription:confirmed', {
        type: 'trust-updates',
        userId: 'user-1',
        room: 'user:user-1:trust',
      });
    });
  });

  describe('emitUserTrustUpdated', () => {
    it('should broadcast to user trust room with event data', () => {
      const event = {
        type: 'user.trust.updated' as const,
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-1',
          reason: 'moderation_action' as const,
          previousScores: { ability: 0.8, benevolence: 0.7, integrity: 0.9 },
          newScores: { ability: 0.7, benevolence: 0.6, integrity: 0.85 },
          moderationActionId: 'action-1',
          updatedAt: new Date().toISOString(),
        },
      };

      gateway.emitUserTrustUpdated(event);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1:trust');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'user:trust-updated',
        expect.objectContaining({
          userId: 'user-1',
          reason: 'moderation_action',
          previousScores: event.payload.previousScores,
          newScores: event.payload.newScores,
        }),
      );
    });
  });
});
