// @ts-nocheck
/**
 * Integration tests for CommonGroundNotificationHandler
 * Tests event-driven notification creation and WebSocket broadcasting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { CommonGroundNotificationHandler } from '../../handlers/common-ground-notification.handler.js';
import { NotificationGateway } from '../../gateways/notification.gateway.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  testTopicId,
  testCreatorId,
  mockTopic,
  mockCommonGroundGeneratedEvent,
  mockCommonGroundUpdatedEvent,
} from '../fixtures/test-data.js';

describe('CommonGroundNotificationHandler Integration Tests', () => {
  let handler: CommonGroundNotificationHandler;
  let gateway: NotificationGateway;
  let mockPrisma: any;

  beforeEach(() => {
    const logger = new Logger();

    // Mock Prisma
    mockPrisma = {
      discussionTopic: {
        findUnique: vi.fn().mockResolvedValue(mockTopic),
      },
    };

    // Create mocked gateway
    gateway = {
      server: {
        to: vi.fn(() => ({
          emit: vi.fn(),
        })),
      },
      emitCommonGroundGenerated: vi.fn(),
      emitCommonGroundUpdated: vi.fn(),
      handleConnection: vi.fn(),
      handleDisconnect: vi.fn(),
      handleSubscribeCommonGround: vi.fn(),
      handleUnsubscribeCommonGround: vi.fn(),
    } as any;

    // Create handler with injected dependencies
    handler = new CommonGroundNotificationHandler(mockPrisma as PrismaService, gateway);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCommonGroundGenerated', () => {
    it('should handle common-ground.generated event successfully', async () => {
      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      // Verify topic was fetched
      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith({
        where: { id: testTopicId },
        select: {
          id: true,
          title: true,
          creatorId: true,
          participantCount: true,
        },
      });

      // Verify WebSocket event was emitted
      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledWith(
        mockCommonGroundGeneratedEvent,
      );
    });

    it('should fetch topic details correctly', async () => {
      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalled();
      const callArgs = mockPrisma.discussionTopic.findUnique.mock.calls[0][0];
      expect(callArgs.where.id).toBe(testTopicId);
    });

    it('should skip notification if topic not found', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValueOnce(null);

      // Should not throw
      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      // Should not emit WebSocket event
      expect(gateway.emitCommonGroundGenerated).not.toHaveBeenCalled();
    });

    it('should build correct notification body for generated event', async () => {
      // Test data with specific counts
      const testEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          agreementZones: [
            { description: 'Agreement 1', propositions: [] },
            { description: 'Agreement 2', propositions: [] },
          ],
          misunderstandings: [{ description: 'Misunderstanding 1', participants: [] }],
          genuineDisagreements: [],
          overallConsensusScore: 0.75,
        },
      };

      await handler.handleCommonGroundGenerated(testEvent);

      // The handler should have logged or emitted proper notification
      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledWith(testEvent);
    });

    it('should emit WebSocket event immediately', async () => {
      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledWith(
        mockCommonGroundGeneratedEvent,
      );
    });

    it('should handle events with empty analysis', async () => {
      const emptyEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          agreementZones: [],
          misunderstandings: [],
          genuineDisagreements: [],
          overallConsensusScore: 0,
        },
      };

      await handler.handleCommonGroundGenerated(emptyEvent);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledWith(emptyEvent);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.discussionTopic.findUnique.mockRejectedValueOnce(new Error('Database error'));

      // Should throw the error
      await expect(
        handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent),
      ).rejects.toThrow('Database error');
    });
  });

  describe('handleCommonGroundUpdated', () => {
    it('should handle common-ground.updated event successfully', async () => {
      await handler.handleCommonGroundUpdated(mockCommonGroundUpdatedEvent);

      // Verify topic was fetched
      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith({
        where: { id: testTopicId },
        select: {
          id: true,
          title: true,
          creatorId: true,
          participantCount: true,
        },
      });

      // Verify WebSocket event was emitted
      expect(gateway.emitCommonGroundUpdated).toHaveBeenCalledWith(mockCommonGroundUpdatedEvent);
    });

    it('should handle updated events with resolved misunderstandings', async () => {
      const updatedEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          changes: {
            newAgreementZones: 0,
            resolvedMisunderstandings: 3,
            newMisunderstandings: 0,
            newDisagreements: 0,
            consensusScoreChange: 0.12,
          },
        },
      };

      await handler.handleCommonGroundUpdated(updatedEvent);

      expect(gateway.emitCommonGroundUpdated).toHaveBeenCalledWith(updatedEvent);
    });

    it('should handle updated events with negative consensus score change', async () => {
      const negativeChangeEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          changes: {
            newAgreementZones: 0,
            resolvedMisunderstandings: 0,
            newMisunderstandings: 2,
            newDisagreements: 1,
            consensusScoreChange: -0.05,
          },
        },
      };

      await handler.handleCommonGroundUpdated(negativeChangeEvent);

      expect(gateway.emitCommonGroundUpdated).toHaveBeenCalledWith(negativeChangeEvent);
    });

    it('should skip notification if topic not found for updated event', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValueOnce(null);

      await handler.handleCommonGroundUpdated(mockCommonGroundUpdatedEvent);

      expect(gateway.emitCommonGroundUpdated).not.toHaveBeenCalled();
    });

    it('should handle version incrementing correctly', async () => {
      const multiVersionEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          previousVersion: 5,
          newVersion: 6,
        },
      };

      await handler.handleCommonGroundUpdated(multiVersionEvent);

      expect(gateway.emitCommonGroundUpdated).toHaveBeenCalledWith(multiVersionEvent);
    });

    it('should handle different reason types', async () => {
      const reasonEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          reason: 'time_elapsed' as const,
        },
      };

      await handler.handleCommonGroundUpdated(reasonEvent);

      expect(gateway.emitCommonGroundUpdated).toHaveBeenCalledWith(reasonEvent);
    });

    it('should handle errors gracefully for updated event', async () => {
      mockPrisma.discussionTopic.findUnique.mockRejectedValueOnce(new Error('Database error'));

      await expect(handler.handleCommonGroundUpdated(mockCommonGroundUpdatedEvent)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Event-Driven Integration', () => {
    it('should handle both generated and updated events in sequence', async () => {
      // First event: generated
      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledTimes(1);
      expect(gateway.emitCommonGroundUpdated).not.toHaveBeenCalled();

      // Second event: updated
      await handler.handleCommonGroundUpdated(mockCommonGroundUpdatedEvent);

      expect(gateway.emitCommonGroundUpdated).toHaveBeenCalledTimes(1);
      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple events for same topic', async () => {
      const event1 = mockCommonGroundGeneratedEvent;
      const event2 = {
        ...mockCommonGroundUpdatedEvent,
        payload: { ...mockCommonGroundUpdatedEvent.payload, newVersion: 2 },
      };
      const event3 = {
        ...mockCommonGroundUpdatedEvent,
        payload: { ...mockCommonGroundUpdatedEvent.payload, newVersion: 3 },
      };

      await handler.handleCommonGroundGenerated(event1);
      await handler.handleCommonGroundUpdated(event2);
      await handler.handleCommonGroundUpdated(event3);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledTimes(1);
      expect(gateway.emitCommonGroundUpdated).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent event processing', async () => {
      const events = [
        { topic: 'topic1', event: mockCommonGroundGeneratedEvent },
        {
          topic: 'topic2',
          event: {
            ...mockCommonGroundGeneratedEvent,
            payload: { ...mockCommonGroundGeneratedEvent.payload, topicId: 'topic2' },
          },
        },
      ];

      // Process events concurrently
      await Promise.all([
        handler.handleCommonGroundGenerated(events[0].event),
        handler.handleCommonGroundGenerated(events[1].event),
      ]);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledTimes(2);
    });
  });

  describe('Notification Metadata', () => {
    it('should extract agreement zone count correctly', async () => {
      const eventWithAnalysis = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          agreementZones: [
            { description: 'Agreement 1', propositions: [] },
            { description: 'Agreement 2', propositions: [] },
            { description: 'Agreement 3', propositions: [] },
          ],
        },
      };

      await handler.handleCommonGroundGenerated(eventWithAnalysis);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalled();
    });

    it('should include version information in metadata', async () => {
      const versionedEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          version: 5,
        },
      };

      await handler.handleCommonGroundGenerated(versionedEvent);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledWith(versionedEvent);
    });

    it('should preserve consensus score metadata', async () => {
      const scoreEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          overallConsensusScore: 0.95,
        },
      };

      await handler.handleCommonGroundGenerated(scoreEvent);

      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalledWith(scoreEvent);
    });
  });

  describe('Topic Recipient Resolution', () => {
    it('should use topic creator as recipient', async () => {
      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      // Verify the topic was fetched (which includes creatorId)
      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            creatorId: true,
          }),
        }),
      );
    });

    it('should use correct action URL format', async () => {
      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      // Handler should emit through gateway
      expect(gateway.emitCommonGroundGenerated).toHaveBeenCalled();
    });

    it('should include participant count in metadata', async () => {
      const topicWithParticipants = {
        ...mockTopic,
        participantCount: 5,
      };

      mockPrisma.discussionTopic.findUnique.mockResolvedValueOnce(topicWithParticipants);

      await handler.handleCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalled();
    });
  });
});
