/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactionsService } from './reactions.service.js';
import { NotFoundException, ConflictException } from '@nestjs/common';

// Mock PrismaService
const createMockPrismaService = () => ({
  response: {
    findUnique: vi.fn(),
  },
  responseReaction: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
});

describe('ReactionsService', () => {
  let service: ReactionsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new ReactionsService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('addReaction', () => {
    const responseId = 'response-1';
    const userId = 'user-1';
    const dto = { emoji: '👍' };

    it('should create a reaction when response exists and no duplicate', async () => {
      const createdAt = new Date();
      mockPrisma.response.findUnique.mockResolvedValue({
        id: responseId,
        content: 'Test response',
      });
      mockPrisma.responseReaction.findUnique.mockResolvedValue(null);
      mockPrisma.responseReaction.create.mockResolvedValue({
        id: 'reaction-1',
        responseId,
        userId,
        emoji: dto.emoji,
        createdAt,
        user: {
          id: userId,
          displayName: 'Test User',
        },
      });

      const result = await service.addReaction(responseId, userId, dto);

      expect(mockPrisma.response.findUnique).toHaveBeenCalledWith({
        where: { id: responseId },
      });
      expect(mockPrisma.responseReaction.findUnique).toHaveBeenCalledWith({
        where: {
          responseId_userId_emoji: {
            responseId,
            userId,
            emoji: dto.emoji,
          },
        },
      });
      expect(mockPrisma.responseReaction.create).toHaveBeenCalledWith({
        data: {
          responseId,
          userId,
          emoji: dto.emoji,
        },
        include: {
          user: {
            select: { id: true, displayName: true },
          },
        },
      });
      expect(result.id).toBe('reaction-1');
      expect(result.responseId).toBe(responseId);
      expect(result.userId).toBe(userId);
      expect(result.emoji).toBe(dto.emoji);
      expect(result.userName).toBe('Test User');
    });

    it('should use Anonymous for user without displayName', async () => {
      const createdAt = new Date();
      mockPrisma.response.findUnique.mockResolvedValue({
        id: responseId,
        content: 'Test response',
      });
      mockPrisma.responseReaction.findUnique.mockResolvedValue(null);
      mockPrisma.responseReaction.create.mockResolvedValue({
        id: 'reaction-1',
        responseId,
        userId,
        emoji: dto.emoji,
        createdAt,
        user: {
          id: userId,
          displayName: null,
        },
      });

      const result = await service.addReaction(responseId, userId, dto);

      expect(result.userName).toBe('Anonymous');
    });

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.addReaction(responseId, userId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.addReaction(responseId, userId, dto)).rejects.toThrow(
        `Response with ID ${responseId} not found`,
      );
    });

    it('should throw ConflictException if reaction already exists', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: responseId,
        content: 'Test response',
      });
      mockPrisma.responseReaction.findUnique.mockResolvedValue({
        id: 'existing-reaction',
        responseId,
        userId,
        emoji: dto.emoji,
      });

      await expect(service.addReaction(responseId, userId, dto)).rejects.toThrow(ConflictException);
      await expect(service.addReaction(responseId, userId, dto)).rejects.toThrow(
        'Reaction already exists',
      );
    });
  });

  describe('removeReaction', () => {
    const responseId = 'response-1';
    const userId = 'user-1';
    const emoji = '👍';

    it('should delete a reaction when it exists', async () => {
      mockPrisma.responseReaction.findUnique.mockResolvedValue({
        id: 'reaction-1',
        responseId,
        userId,
        emoji,
        response: { topicId: 'topic-1' },
      });
      mockPrisma.responseReaction.delete.mockResolvedValue({
        id: 'reaction-1',
      });

      await service.removeReaction(responseId, userId, emoji);

      expect(mockPrisma.responseReaction.findUnique).toHaveBeenCalledWith({
        where: {
          responseId_userId_emoji: {
            responseId,
            userId,
            emoji,
          },
        },
        include: {
          response: {
            select: { topicId: true },
          },
        },
      });
      expect(mockPrisma.responseReaction.delete).toHaveBeenCalledWith({
        where: { id: 'reaction-1' },
      });
    });

    it('should throw NotFoundException if reaction does not exist', async () => {
      mockPrisma.responseReaction.findUnique.mockResolvedValue(null);

      await expect(service.removeReaction(responseId, userId, emoji)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeReaction(responseId, userId, emoji)).rejects.toThrow(
        'Reaction not found',
      );
    });
  });

  // Route the two distinct findMany shapes the service issues: the preview
  // fetch uses `include: { user }`, the caller's-own-reactions fetch uses
  // `select`.
  const mockReactionQueries = (opts: {
    grouped?: unknown[];
    preview?: unknown[];
    userReactions?: unknown[];
  }) => {
    mockPrisma.responseReaction.groupBy.mockResolvedValue(opts.grouped ?? []);
    mockPrisma.responseReaction.findMany.mockImplementation((args: any) => {
      if (args?.select) {
        return Promise.resolve(opts.userReactions ?? []);
      }
      return Promise.resolve(opts.preview ?? []);
    });
  };

  const previewRow = (emoji: string, userId: string, displayName: string | null) => ({
    id: `reaction-${userId}`,
    responseId: 'response-1',
    userId,
    emoji,
    createdAt: new Date(),
    user: { id: userId, displayName },
  });

  describe('getReactions', () => {
    const responseId = 'response-1';

    it('should return grouped reactions with counts', async () => {
      mockReactionQueries({
        grouped: [
          { emoji: '👍', _count: { _all: 2 } },
          { emoji: '❤️', _count: { _all: 1 } },
        ],
        preview: [
          previewRow('👍', 'user-1', 'Alice'),
          previewRow('👍', 'user-2', 'Bob'),
          previewRow('❤️', 'user-3', 'Charlie'),
        ],
      });

      const result = await service.getReactions(responseId);

      expect(mockPrisma.responseReaction.groupBy).toHaveBeenCalledWith({
        by: ['emoji'],
        where: { responseId },
        _count: { _all: true },
      });
      expect(result.totalCount).toBe(3);
      expect(result.reactions).toHaveLength(2);

      const thumbsUpReaction = result.reactions.find((r) => r.emoji === '👍');
      expect(thumbsUpReaction?.count).toBe(2);
      expect(thumbsUpReaction?.users).toHaveLength(2);

      const heartReaction = result.reactions.find((r) => r.emoji === '❤️');
      expect(heartReaction?.count).toBe(1);
      expect(heartReaction?.users).toHaveLength(1);
    });

    it('should indicate userReacted correctly when user has reacted', async () => {
      mockReactionQueries({
        grouped: [
          { emoji: '👍', _count: { _all: 1 } },
          { emoji: '❤️', _count: { _all: 1 } },
        ],
        preview: [previewRow('👍', 'user-1', 'Alice'), previewRow('❤️', 'user-2', 'Bob')],
        userReactions: [{ emoji: '👍' }],
      });

      const result = await service.getReactions(responseId, 'user-1');

      const thumbsUpReaction = result.reactions.find((r) => r.emoji === '👍');
      expect(thumbsUpReaction?.userReacted).toBe(true);

      const heartReaction = result.reactions.find((r) => r.emoji === '❤️');
      expect(heartReaction?.userReacted).toBe(false);
    });

    it('should indicate userReacted as false when no userId provided', async () => {
      mockReactionQueries({
        grouped: [{ emoji: '👍', _count: { _all: 1 } }],
        preview: [previewRow('👍', 'user-1', 'Alice')],
      });

      const result = await service.getReactions(responseId);

      expect(result.reactions[0]?.userReacted).toBe(false);
    });

    it('should return empty reactions for response with no reactions', async () => {
      mockReactionQueries({ grouped: [], preview: [] });

      const result = await service.getReactions(responseId);

      expect(result.totalCount).toBe(0);
      expect(result.reactions).toHaveLength(0);
    });

    it('should limit users list to first 10 users per emoji', async () => {
      const manyReactions = Array.from({ length: 15 }, (_, i) =>
        previewRow('👍', `user-${i}`, `User ${i}`),
      );
      mockReactionQueries({
        grouped: [{ emoji: '👍', _count: { _all: 15 } }],
        preview: manyReactions,
      });

      const result = await service.getReactions(responseId);

      expect(result.totalCount).toBe(15);
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0]?.count).toBe(15);
      expect(result.reactions[0]?.users).toHaveLength(10);
    });

    it('should handle users with null displayName', async () => {
      mockReactionQueries({
        grouped: [{ emoji: '👍', _count: { _all: 1 } }],
        preview: [previewRow('👍', 'user-1', null)],
      });

      const result = await service.getReactions(responseId);

      expect(result.reactions[0]?.users[0]?.displayName).toBe('Anonymous');
    });
  });

  describe('getReactionSummaries', () => {
    const responseIds = ['response-1', 'response-2', 'response-3'];

    it('should return empty summaries for all requested responses when no reactions exist', async () => {
      mockReactionQueries({ grouped: [], preview: [] });

      const result = await service.getReactionSummaries(responseIds);

      expect(result.size).toBe(3);
      for (const responseId of responseIds) {
        const summary = result.get(responseId);
        expect(summary?.reactions).toHaveLength(0);
        expect(summary?.totalCount).toBe(0);
      }
    });

    it('should return an empty map without querying for an empty id list', async () => {
      const result = await service.getReactionSummaries([]);

      expect(result.size).toBe(0);
      expect(mockPrisma.responseReaction.groupBy).not.toHaveBeenCalled();
    });

    it('should return grouped reactions for multiple responses', async () => {
      const createdAt = new Date();
      mockReactionQueries({
        grouped: [
          { responseId: 'response-1', emoji: '👍', _count: { _all: 2 } },
          { responseId: 'response-2', emoji: '❤️', _count: { _all: 1 } },
        ],
        preview: [
          {
            id: 'r1',
            responseId: 'response-1',
            userId: 'user-1',
            emoji: '👍',
            createdAt,
            user: { id: 'user-1', displayName: 'Alice' },
          },
          {
            id: 'r2',
            responseId: 'response-1',
            userId: 'user-2',
            emoji: '👍',
            createdAt,
            user: { id: 'user-2', displayName: 'Bob' },
          },
          {
            id: 'r3',
            responseId: 'response-2',
            userId: 'user-1',
            emoji: '❤️',
            createdAt,
            user: { id: 'user-1', displayName: 'Alice' },
          },
        ],
        userReactions: [
          { responseId: 'response-1', emoji: '👍' },
          { responseId: 'response-2', emoji: '❤️' },
        ],
      });

      const result = await service.getReactionSummaries(responseIds, 'user-1');

      expect(mockPrisma.responseReaction.groupBy).toHaveBeenCalledWith({
        by: ['responseId', 'emoji'],
        where: { responseId: { in: responseIds } },
        _count: { _all: true },
      });

      const response1Summary = result.get('response-1');
      expect(response1Summary?.totalCount).toBe(2);
      expect(response1Summary?.reactions[0]?.emoji).toBe('👍');
      expect(response1Summary?.reactions[0]?.count).toBe(2);
      expect(response1Summary?.reactions[0]?.userReacted).toBe(true);

      const response2Summary = result.get('response-2');
      expect(response2Summary?.totalCount).toBe(1);
      expect(response2Summary?.reactions[0]?.emoji).toBe('❤️');
      expect(response2Summary?.reactions[0]?.userReacted).toBe(true);

      const response3Summary = result.get('response-3');
      expect(response3Summary?.totalCount).toBe(0);
      expect(response3Summary?.reactions).toHaveLength(0);
    });
  });
});
