/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MentionNotificationHandler } from './mention-notification.handler.js';
import type { ResponseCreatedEvent } from '@reason-bridge/event-schemas/discussion';

const createMockPrismaService = () => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  discussionTopic: {
    findUnique: vi.fn(),
  },
  notification: {
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
});

const createMockNotificationGateway = () => ({
  emitToUser: vi.fn(),
});

describe('MentionNotificationHandler', () => {
  let handler: MentionNotificationHandler;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockGateway: ReturnType<typeof createMockNotificationGateway>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockGateway = createMockNotificationGateway();
    handler = new MentionNotificationHandler(mockPrisma as any, mockGateway as any);
  });

  describe('parseMentions', () => {
    it('should parse single mention', () => {
      const content = 'Hey @[John Doe](user-123), what do you think?';
      const mentions = handler.parseMentions(content);

      expect(mentions).toEqual([{ displayName: 'John Doe', userId: 'user-123' }]);
    });

    it('should parse multiple mentions', () => {
      const content = '@[Alice](user-1) and @[Bob](user-2), please review this.';
      const mentions = handler.parseMentions(content);

      expect(mentions).toEqual([
        { displayName: 'Alice', userId: 'user-1' },
        { displayName: 'Bob', userId: 'user-2' },
      ]);
    });

    it('should return empty array for no mentions', () => {
      const content = 'This is a regular comment without any mentions.';
      const mentions = handler.parseMentions(content);

      expect(mentions).toEqual([]);
    });

    it('should handle mentions with special characters in display name', () => {
      const content = "@[Jane O'Brien](user-456) mentioned you";
      const mentions = handler.parseMentions(content);

      expect(mentions).toEqual([{ displayName: "Jane O'Brien", userId: 'user-456' }]);
    });

    it('should handle UUID user IDs', () => {
      const content = '@[Test User](550e8400-e29b-41d4-a716-446655440000) said hello';
      const mentions = handler.parseMentions(content);

      expect(mentions).toEqual([
        {
          displayName: 'Test User',
          userId: '550e8400-e29b-41d4-a716-446655440000',
        },
      ]);
    });
  });

  describe('handleResponseCreated', () => {
    const createEvent = (
      overrides: Partial<ResponseCreatedEvent['payload']> = {},
    ): ResponseCreatedEvent => ({
      type: 'response.created',
      timestamp: new Date().toISOString(),
      payload: {
        responseId: 'response-123',
        topicId: 'topic-456',
        authorId: 'author-789',
        content: 'Hello @[John Doe](user-123)!',
        citedSources: [],
        containsOpinion: false,
        createdAt: new Date().toISOString(),
        ...overrides,
      },
    });

    it('should create notifications for mentioned users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'author-789',
        displayName: 'Author Name',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-456',
        title: 'Test Topic',
        slug: 'test-topic',
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-123' }]);

      await handler.handleResponseCreated(createEvent());

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user-123'] },
          accountStatus: 'ACTIVE',
        },
        select: { id: true },
      });

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-123',
        'notification:mention',
        expect.objectContaining({
          type: 'mention',
          title: 'You were mentioned',
          body: 'Author Name mentioned you in "Test Topic"',
          responseId: 'response-123',
          topicId: 'topic-456',
        }),
      );
    });

    it('should skip notification if no mentions in content', async () => {
      await handler.handleResponseCreated(createEvent({ content: 'No mentions here' }));

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should skip self-mentions', async () => {
      await handler.handleResponseCreated(
        createEvent({
          content: '@[Author Name](author-789) replying to myself',
          authorId: 'author-789',
        }),
      );

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should deduplicate multiple mentions of same user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'author-789',
        displayName: 'Author',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-456',
        title: 'Test Topic',
        slug: 'test-topic',
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-123' }]);

      await handler.handleResponseCreated(
        createEvent({
          content: '@[John](user-123) and @[John](user-123) again',
        }),
      );

      // Should only emit once despite two mentions
      expect(mockGateway.emitToUser).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple different users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'author-789',
        displayName: 'Author',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-456',
        title: 'Test Topic',
        slug: 'test-topic',
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      await handler.handleResponseCreated(
        createEvent({
          content: '@[Alice](user-1) and @[Bob](user-2), thoughts?',
        }),
      );

      expect(mockGateway.emitToUser).toHaveBeenCalledTimes(2);
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'notification:mention',
        expect.any(Object),
      );
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-2',
        'notification:mention',
        expect.any(Object),
      );
    });

    it('should skip if author not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await handler.handleResponseCreated(createEvent());

      expect(mockGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should skip if topic not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'author-789',
        displayName: 'Author',
      });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await handler.handleResponseCreated(createEvent());

      expect(mockGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should skip inactive users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'author-789',
        displayName: 'Author',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-456',
        title: 'Test Topic',
        slug: 'test-topic',
      });

      // No active users found
      mockPrisma.user.findMany.mockResolvedValue([]);

      await handler.handleResponseCreated(createEvent());

      expect(mockGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should use fallback name if author has no display name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'author-789',
        displayName: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-456',
        title: 'Test Topic',
        slug: 'test-topic',
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-123' }]);

      await handler.handleResponseCreated(createEvent());

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-123',
        'notification:mention',
        expect.objectContaining({
          body: 'Someone mentioned you in "Test Topic"',
          authorName: 'Someone',
        }),
      );
    });

    it('should include correct action URL with response anchor', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'author-789',
        displayName: 'Author',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue({
        id: 'topic-456',
        title: 'Test Topic',
        slug: 'my-test-topic',
      });

      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-123' }]);

      await handler.handleResponseCreated(createEvent());

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-123',
        'notification:mention',
        expect.objectContaining({
          actionUrl: '/topics/my-test-topic?response=response-123',
        }),
      );
    });
  });
});
