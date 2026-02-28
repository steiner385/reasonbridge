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

  describe('getReactions', () => {
    const responseId = 'response-1';

    it('should return grouped reactions with counts', async () => {
      const createdAt = new Date();
      mockPrisma.responseReaction.findMany.mockResolvedValue([
        {
          id: 'reaction-1',
          responseId,
          userId: 'user-1',
          emoji: '👍',
          createdAt,
          user: { id: 'user-1', displayName: 'Alice' },
        },
        {
          id: 'reaction-2',
          responseId,
          userId: 'user-2',
          emoji: '👍',
          createdAt,
          user: { id: 'user-2', displayName: 'Bob' },
        },
        {
          id: 'reaction-3',
          responseId,
          userId: 'user-3',
          emoji: '❤️',
          createdAt,
          user: { id: 'user-3', displayName: 'Charlie' },
        },
      ]);

      const result = await service.getReactions(responseId);

      expect(mockPrisma.responseReaction.findMany).toHaveBeenCalledWith({
        where: { responseId },
        include: {
          user: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
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
      const createdAt = new Date();
      mockPrisma.responseReaction.findMany.mockResolvedValue([
        {
          id: 'reaction-1',
          responseId,
          userId: 'user-1',
          emoji: '👍',
          createdAt,
          user: { id: 'user-1', displayName: 'Alice' },
        },
        {
          id: 'reaction-2',
          responseId,
          userId: 'user-2',
          emoji: '❤️',
          createdAt,
          user: { id: 'user-2', displayName: 'Bob' },
        },
      ]);

      const result = await service.getReactions(responseId, 'user-1');

      const thumbsUpReaction = result.reactions.find((r) => r.emoji === '👍');
      expect(thumbsUpReaction?.userReacted).toBe(true);

      const heartReaction = result.reactions.find((r) => r.emoji === '❤️');
      expect(heartReaction?.userReacted).toBe(false);
    });

    it('should indicate userReacted as false when no userId provided', async () => {
      const createdAt = new Date();
      mockPrisma.responseReaction.findMany.mockResolvedValue([
        {
          id: 'reaction-1',
          responseId,
          userId: 'user-1',
          emoji: '👍',
          createdAt,
          user: { id: 'user-1', displayName: 'Alice' },
        },
      ]);

      const result = await service.getReactions(responseId);

      expect(result.reactions[0]?.userReacted).toBe(false);
    });

    it('should return empty reactions for response with no reactions', async () => {
      mockPrisma.responseReaction.findMany.mockResolvedValue([]);

      const result = await service.getReactions(responseId);

      expect(result.totalCount).toBe(0);
      expect(result.reactions).toHaveLength(0);
    });

    it('should limit users list to first 10 users per emoji', async () => {
      const createdAt = new Date();
      const manyReactions = Array.from({ length: 15 }, (_, i) => ({
        id: `reaction-${i}`,
        responseId,
        userId: `user-${i}`,
        emoji: '👍',
        createdAt,
        user: { id: `user-${i}`, displayName: `User ${i}` },
      }));
      mockPrisma.responseReaction.findMany.mockResolvedValue(manyReactions);

      const result = await service.getReactions(responseId);

      expect(result.totalCount).toBe(15);
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0]?.count).toBe(15);
      expect(result.reactions[0]?.users).toHaveLength(10);
    });

    it('should handle users with null displayName', async () => {
      const createdAt = new Date();
      mockPrisma.responseReaction.findMany.mockResolvedValue([
        {
          id: 'reaction-1',
          responseId,
          userId: 'user-1',
          emoji: '👍',
          createdAt,
          user: { id: 'user-1', displayName: null },
        },
      ]);

      const result = await service.getReactions(responseId);

      expect(result.reactions[0]?.users[0]?.displayName).toBe('Anonymous');
    });
  });

  describe('getReactionSummaries', () => {
    const responseIds = ['response-1', 'response-2', 'response-3'];

    it('should return empty summaries for all requested responses when no reactions exist', async () => {
      mockPrisma.responseReaction.findMany.mockResolvedValue([]);

      const result = await service.getReactionSummaries(responseIds);

      expect(result.size).toBe(3);
      for (const responseId of responseIds) {
        const summary = result.get(responseId);
        expect(summary?.reactions).toHaveLength(0);
        expect(summary?.totalCount).toBe(0);
      }
    });

    it('should return grouped reactions for multiple responses', async () => {
      const createdAt = new Date();
      mockPrisma.responseReaction.findMany.mockResolvedValue([
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
      ]);

      const result = await service.getReactionSummaries(responseIds, 'user-1');

      expect(mockPrisma.responseReaction.findMany).toHaveBeenCalledWith({
        where: {
          responseId: {
            in: responseIds,
          },
        },
        include: {
          user: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'asc' },
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
