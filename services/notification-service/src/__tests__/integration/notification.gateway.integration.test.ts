/**
 * Integration tests for NotificationGateway
 * Tests WebSocket real-time updates for common ground analysis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { NotificationGateway } from '../../gateways/notification.gateway.js';
import {
  testTopicId,
  testCreatorId,
  mockCommonGroundGeneratedEvent,
  mockCommonGroundUpdatedEvent,
} from '../fixtures/test-data.js';

describe('NotificationGateway Integration Tests', () => {
  let gateway: NotificationGateway;
  const logger = new Logger();

  beforeEach(() => {
    // Create a mock server for Socket.io
    const mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      in: vi.fn().mockReturnThis(),
    };

    gateway = new NotificationGateway();
    // Manually set the server on the gateway since NestJS doesn't handle it in tests
    gateway['server'] = mockServer as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Broadcast Events', () => {
    it('should broadcast common-ground:generated event to the correct room', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      // Verify the room was called correctly
      expect(mockServer.to).toHaveBeenCalledWith(`topic:${testTopicId}:common-ground`);

      // Verify the event was emitted
      expect(mockServer.emit).toHaveBeenCalled();
      const emitCall = mockServer.emit.mock.calls[0];
      expect(emitCall[0]).toBe('common-ground:generated');
      expect(emitCall[1].topicId).toBe(testTopicId);
      expect(emitCall[1].version).toBe(1);
    });

    it('should broadcast common-ground:updated event to the correct room', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundUpdated(mockCommonGroundUpdatedEvent);

      // Verify the room was called correctly
      expect(mockServer.to).toHaveBeenCalledWith(`topic:${testTopicId}:common-ground`);

      // Verify the event was emitted
      expect(mockServer.emit).toHaveBeenCalled();
      const emitCall = mockServer.emit.mock.calls[0];
      expect(emitCall[0]).toBe('common-ground:updated');
      expect(emitCall[1].topicId).toBe(testTopicId);
      expect(emitCall[1].newVersion).toBe(2);
    });

    it('should include all analysis data in generated event payload', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1];

      expect(payload).toHaveProperty('topicId');
      expect(payload).toHaveProperty('version');
      expect(payload).toHaveProperty('analysis');
      expect(payload).toHaveProperty('timestamp');

      expect(payload.analysis).toHaveProperty('agreementZones');
      expect(payload.analysis).toHaveProperty('misunderstandings');
      expect(payload.analysis).toHaveProperty('genuineDisagreements');
      expect(payload.analysis).toHaveProperty('overallConsensusScore');

      expect(Array.isArray(payload.analysis.agreementZones)).toBe(true);
      expect(Array.isArray(payload.analysis.misunderstandings)).toBe(true);
      expect(Array.isArray(payload.analysis.genuineDisagreements)).toBe(true);
    });

    it('should include all change information in updated event payload', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundUpdated(mockCommonGroundUpdatedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1];

      expect(payload).toHaveProperty('topicId');
      expect(payload).toHaveProperty('previousVersion');
      expect(payload).toHaveProperty('newVersion');
      expect(payload).toHaveProperty('changes');
      expect(payload).toHaveProperty('analysis');
      expect(payload).toHaveProperty('reason');
      expect(payload).toHaveProperty('timestamp');

      expect(payload.changes).toHaveProperty('newAgreementZones');
      expect(payload.changes).toHaveProperty('resolvedMisunderstandings');
      expect(payload.changes).toHaveProperty('newMisunderstandings');
      expect(payload.changes).toHaveProperty('newDisagreements');
      expect(payload.changes).toHaveProperty('consensusScoreChange');
    });
  });

  describe('Event Payload Transformation', () => {
    it('should correctly structure generated event with agreement zones', () => {
      const mockServer = gateway['server'];

      const testEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          agreementZones: [
            { description: 'Agreement 1', propositions: ['prop1', 'prop2'] },
            { description: 'Agreement 2', propositions: ['prop3'] },
          ],
        },
      };

      gateway.emitCommonGroundGenerated(testEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1];

      expect(payload.analysis.agreementZones).toHaveLength(2);
      expect(payload.analysis.agreementZones[0].description).toBe('Agreement 1');
      expect(Array.isArray(payload.analysis.agreementZones[0].propositions)).toBe(true);
    });

    it('should correctly structure updated event with change information', () => {
      const mockServer = gateway['server'];

      const testEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          changes: {
            newAgreementZones: 2,
            resolvedMisunderstandings: 1,
            newMisunderstandings: 0,
            newDisagreements: 0,
            consensusScoreChange: 0.08,
          },
        },
      };

      gateway.emitCommonGroundUpdated(testEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1];

      expect(payload.changes.newAgreementZones).toBe(2);
      expect(payload.changes.resolvedMisunderstandings).toBe(1);
      expect(payload.changes.consensusScoreChange).toBe(0.08);
    });

    it('should preserve consensus score in analysis data', () => {
      const mockServer = gateway['server'];

      const testEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          overallConsensusScore: 0.92,
        },
      };

      gateway.emitCommonGroundGenerated(testEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const payload = emitCall[1];

      expect(payload.analysis.overallConsensusScore).toBe(0.92);
    });
  });

  describe('Room Targeting', () => {
    it('should target correct room for topic', () => {
      const mockServer = gateway['server'];

      const topicId = 'test-topic-123';
      const testEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          topicId,
        },
      };

      gateway.emitCommonGroundGenerated(testEvent);

      expect(mockServer.to).toHaveBeenCalledWith(`topic:${topicId}:common-ground`);
    });

    it('should emit to different rooms for different topics', () => {
      const mockServer = gateway['server'];

      const topic1Event = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          topicId: 'topic-1',
        },
      };

      const topic2Event = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          topicId: 'topic-2',
        },
      };

      gateway.emitCommonGroundGenerated(topic1Event);
      gateway.emitCommonGroundGenerated(topic2Event);

      expect(mockServer.to).toHaveBeenNthCalledWith(1, 'topic:topic-1:common-ground');
      expect(mockServer.to).toHaveBeenNthCalledWith(2, 'topic:topic-2:common-ground');
    });
  });

  describe('Event Versioning', () => {
    it('should preserve version number in generated event', () => {
      const mockServer = gateway['server'];

      const versionedEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          version: 5,
        },
      };

      gateway.emitCommonGroundGenerated(versionedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      expect(emitCall[1].version).toBe(5);
    });

    it('should track version progression in updated events', () => {
      const mockServer = gateway['server'];

      const updatedEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          previousVersion: 3,
          newVersion: 4,
        },
      };

      gateway.emitCommonGroundUpdated(updatedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      expect(emitCall[1].previousVersion).toBe(3);
      expect(emitCall[1].newVersion).toBe(4);
    });
  });

  describe('Change Reasons', () => {
    it('should include reason for analysis update', () => {
      const mockServer = gateway['server'];

      const thresholdReachedEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          reason: 'threshold_reached' as const,
        },
      };

      gateway.emitCommonGroundUpdated(thresholdReachedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      expect(emitCall[1].reason).toBe('threshold_reached');
    });

    it('should handle time-based update reason', () => {
      const mockServer = gateway['server'];

      const timeBasedEvent = {
        ...mockCommonGroundUpdatedEvent,
        payload: {
          ...mockCommonGroundUpdatedEvent.payload,
          reason: 'time_elapsed' as const,
        },
      };

      gateway.emitCommonGroundUpdated(timeBasedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      expect(emitCall[1].reason).toBe('time_elapsed');
    });
  });

  describe('Timestamp Handling', () => {
    it('should include ISO timestamp in generated event', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const timestamp = emitCall[1].timestamp;

      expect(typeof timestamp).toBe('string');
      // Check it's a valid ISO string
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should include ISO timestamp in updated event', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundUpdated(mockCommonGroundUpdatedEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const timestamp = emitCall[1].timestamp;

      expect(typeof timestamp).toBe('string');
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('Broadcast Frequency', () => {
    it('should emit multiple events without interference', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);
      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);
      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      expect(mockServer.emit).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed event types', () => {
      const mockServer = gateway['server'];

      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);
      gateway.emitCommonGroundUpdated(mockCommonGroundUpdatedEvent);
      gateway.emitCommonGroundGenerated(mockCommonGroundGeneratedEvent);

      expect(mockServer.emit).toHaveBeenCalledTimes(3);
      expect(mockServer.emit.mock.calls[0][0]).toBe('common-ground:generated');
      expect(mockServer.emit.mock.calls[1][0]).toBe('common-ground:updated');
      expect(mockServer.emit.mock.calls[2][0]).toBe('common-ground:generated');
    });
  });

  describe('Analysis Data Preservation', () => {
    it('should preserve all agreement zone properties', () => {
      const mockServer = gateway['server'];

      const complexEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          agreementZones: [
            {
              description: 'Both parties support renewable energy',
              propositions: ['Wind power', 'Solar energy', 'Hydroelectric'],
            },
          ],
        },
      };

      gateway.emitCommonGroundGenerated(complexEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const zone = emitCall[1].analysis.agreementZones[0];

      expect(zone.description).toBe('Both parties support renewable energy');
      expect(zone.propositions).toContain('Wind power');
      expect(zone.propositions).toContain('Solar energy');
      expect(zone.propositions).toContain('Hydroelectric');
    });

    it('should preserve all misunderstanding properties', () => {
      const mockServer = gateway['server'];

      const complexEvent = {
        ...mockCommonGroundGeneratedEvent,
        payload: {
          ...mockCommonGroundGeneratedEvent.payload,
          misunderstandings: [
            {
              description: 'Different views on implementation timeline',
              participants: ['participant-1', 'participant-2'],
            },
          ],
        },
      };

      gateway.emitCommonGroundGenerated(complexEvent);

      const emitCall = mockServer.emit.mock.calls[0];
      const misunderstanding = emitCall[1].analysis.misunderstandings[0];

      expect(misunderstanding.description).toBe('Different views on implementation timeline');
      expect(misunderstanding.participants).toContain('participant-1');
    });
  });
});
