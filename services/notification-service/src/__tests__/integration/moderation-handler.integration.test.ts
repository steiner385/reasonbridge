/**
 * Integration tests for ModerationNotificationHandler
 * Tests event-driven notification creation and WebSocket broadcasting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { ModerationNotificationHandler } from '../../handlers/moderation-notification.handler.js';
import { NotificationGateway } from '../../gateways/notification.gateway.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  testResponseId,
  testUserId1,
  testModerationActionId,
  mockResponse,
  mockUser,
  mockModerationActionRequestedEvent,
  mockUserTrustUpdatedEvent,
} from '../fixtures/test-data.js';

describe('ModerationNotificationHandler Integration Tests', () => {
  let handler: ModerationNotificationHandler;
  let gateway: NotificationGateway;
  let mockPrisma: any;

  beforeEach(() => {
    const logger = new Logger();

    // Mock Prisma
    mockPrisma = {
      response: {
        findUnique: vi.fn().mockResolvedValue(mockResponse),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(mockUser),
      },
      discussionTopic: {
        findUnique: vi.fn(),
      },
    };

    // Create mocked gateway
    gateway = {
      server: {
        to: vi.fn(() => ({
          emit: vi.fn(),
        })),
      },
      emitModerationActionRequested: vi.fn(),
      emitUserTrustUpdated: vi.fn(),
      handleConnection: vi.fn(),
      handleDisconnect: vi.fn(),
      handleSubscribeModeration: vi.fn(),
      handleUnsubscribeModeration: vi.fn(),
      handleSubscribeTrustUpdates: vi.fn(),
      handleUnsubscribeTrustUpdates: vi.fn(),
    } as any;

    // Create handler with injected dependencies
    handler = new ModerationNotificationHandler(mockPrisma as PrismaService, gateway);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleModerationActionRequested', () => {
    it('should handle moderation.action.requested event for response successfully', async () => {
      await handler.handleModerationActionRequested(mockModerationActionRequestedEvent);

      // Verify response was fetched
      expect(mockPrisma.response.findUnique).toHaveBeenCalledWith({
        where: { id: testResponseId },
        select: {
          id: true,
          authorId: true,
          topicId: true,
          content: true,
        },
      });

      // Verify WebSocket event was emitted
      expect(gateway.emitModerationActionRequested).toHaveBeenCalledWith(
        mockModerationActionRequestedEvent,
      );
    });

    it('should handle moderation.action.requested event for user', async () => {
      const userActionEvent = {
        ...mockModerationActionRequestedEvent,
        payload: {
          ...mockModerationActionRequestedEvent.payload,
          targetType: 'user' as const,
          targetId: testUserId1,
        },
      };

      await handler.handleModerationActionRequested(userActionEvent);

      // Verify user was fetched
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUserId1 },
        select: { id: true, displayName: true },
      });

      // Verify WebSocket event was emitted
      expect(gateway.emitModerationActionRequested).toHaveBeenCalledWith(userActionEvent);
    });

    it('should skip notification if response not found', async () => {
      mockPrisma.response.findUnique.mockResolvedValueOnce(null);

      // Should not throw
      await handler.handleModerationActionRequested(mockModerationActionRequestedEvent);

      // Should not emit WebSocket event
      expect(gateway.emitModerationActionRequested).not.toHaveBeenCalled();
    });

    it('should skip notification if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const userActionEvent = {
        ...mockModerationActionRequestedEvent,
        payload: {
          ...mockModerationActionRequestedEvent.payload,
          targetType: 'user' as const,
          targetId: testUserId1,
        },
      };

      await handler.handleModerationActionRequested(userActionEvent);

      // Should not emit WebSocket event
      expect(gateway.emitModerationActionRequested).not.toHaveBeenCalled();
    });

    it('should handle different action types', async () => {
      const actionTypes = ['educate', 'warn', 'hide', 'remove', 'suspend', 'ban'];

      for (const actionType of actionTypes) {
        mockPrisma.response.findUnique.mockResolvedValueOnce(mockResponse);
        gateway.emitModerationActionRequested.mockClear();

        const event = {
          ...mockModerationActionRequestedEvent,
          payload: {
            ...mockModerationActionRequestedEvent.payload,
            actionType: actionType as any,
          },
        };

        await handler.handleModerationActionRequested(event);

        expect(gateway.emitModerationActionRequested).toHaveBeenCalled();
      }
    });

    it('should handle different severity levels', async () => {
      const severities = ['non_punitive', 'consequential'];

      for (const severity of severities) {
        mockPrisma.response.findUnique.mockResolvedValueOnce(mockResponse);
        gateway.emitModerationActionRequested.mockClear();

        const event = {
          ...mockModerationActionRequestedEvent,
          payload: {
            ...mockModerationActionRequestedEvent.payload,
            severity: severity as any,
          },
        };

        await handler.handleModerationActionRequested(event);

        expect(gateway.emitModerationActionRequested).toHaveBeenCalled();
      }
    });
  });

  describe('handleUserTrustUpdated', () => {
    it('should handle user.trust.updated event successfully', async () => {
      await handler.handleUserTrustUpdated(mockUserTrustUpdatedEvent);

      // Verify user was fetched
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUserId1 },
        select: { id: true, displayName: true },
      });

      // Verify WebSocket event was emitted
      expect(gateway.emitUserTrustUpdated).toHaveBeenCalledWith(mockUserTrustUpdatedEvent);
    });

    it('should skip notification if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      // Should not throw
      await handler.handleUserTrustUpdated(mockUserTrustUpdatedEvent);

      // Should not emit WebSocket event
      expect(gateway.emitUserTrustUpdated).not.toHaveBeenCalled();
    });

    it('should handle different trust update reasons', async () => {
      const reasons = ['moderation_action', 'positive_contribution', 'appeal_upheld', 'periodic_recalculation'];

      for (const reason of reasons) {
        mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
        gateway.emitUserTrustUpdated.mockClear();

        const event = {
          ...mockUserTrustUpdatedEvent,
          payload: {
            ...mockUserTrustUpdatedEvent.payload,
            reason: reason as any,
          },
        };

        await handler.handleUserTrustUpdated(event);

        expect(gateway.emitUserTrustUpdated).toHaveBeenCalled();
      }
    });

    it('should calculate trust score changes correctly', async () => {
      const testEvent = {
        ...mockUserTrustUpdatedEvent,
        payload: {
          ...mockUserTrustUpdatedEvent.payload,
          previousScores: { ability: 0.5, benevolence: 0.6, integrity: 0.7 },
          newScores: { ability: 0.6, benevolence: 0.7, integrity: 0.8 },
        },
      };

      await handler.handleUserTrustUpdated(testEvent);

      expect(gateway.emitUserTrustUpdated).toHaveBeenCalledWith(testEvent);
    });
  });

  describe('Error handling', () => {
    it('should log and rethrow errors from handleModerationActionRequested', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.response.findUnique.mockRejectedValueOnce(error);

      await expect(handler.handleModerationActionRequested(mockModerationActionRequestedEvent)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should log and rethrow errors from handleUserTrustUpdated', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.user.findUnique.mockRejectedValueOnce(error);

      await expect(handler.handleUserTrustUpdated(mockUserTrustUpdatedEvent)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
