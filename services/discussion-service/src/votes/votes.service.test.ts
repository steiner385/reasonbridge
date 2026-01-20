import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VotesService } from './votes.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const createMockPrismaService = () => ({
  response: {
    findUnique: vi.fn(),
  },
  vote: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

const createMockVote = (overrides = {}) => ({
  id: 'vote-1',
  userId: 'user-1',
  responseId: 'response-1',
  voteType: 'UPVOTE',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('VotesService', () => {
  let service: VotesService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new VotesService(mockPrisma as any);
  });

  describe('voteOnResponse', () => {
    const createVoteDto = { voteType: 'UPVOTE' as const };

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(service.voteOnResponse('nonexistent', 'user-1', createVoteDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user votes on their own response', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        authorId: 'user-1',
      });

      await expect(service.voteOnResponse('response-1', 'user-1', createVoteDto)).rejects.toThrow(
        'Cannot vote on your own response',
      );
    });

    it('should create new vote if no existing vote', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        authorId: 'user-2',
      });
      mockPrisma.vote.findUnique.mockResolvedValue(null);
      mockPrisma.vote.create.mockResolvedValue(createMockVote());

      const result = await service.voteOnResponse('response-1', 'user-1', createVoteDto);

      expect(mockPrisma.vote.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          responseId: 'response-1',
          voteType: 'UPVOTE',
        },
      });
      expect(result).not.toBeNull();
      expect(result?.voteType).toBe('UPVOTE');
    });

    it('should toggle off vote when same type is voted again', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        authorId: 'user-2',
      });
      mockPrisma.vote.findUnique.mockResolvedValue(createMockVote({ voteType: 'UPVOTE' }));
      mockPrisma.vote.delete.mockResolvedValue(undefined);

      const result = await service.voteOnResponse('response-1', 'user-1', createVoteDto);

      expect(mockPrisma.vote.delete).toHaveBeenCalledWith({
        where: { id: 'vote-1' },
      });
      expect(result).toBeNull();
    });

    it('should update vote when different type is voted', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        authorId: 'user-2',
      });
      mockPrisma.vote.findUnique.mockResolvedValue(createMockVote({ voteType: 'DOWNVOTE' }));
      mockPrisma.vote.update.mockResolvedValue(createMockVote({ voteType: 'UPVOTE' }));

      const result = await service.voteOnResponse('response-1', 'user-1', createVoteDto);

      expect(mockPrisma.vote.update).toHaveBeenCalledWith({
        where: { id: 'vote-1' },
        data: { voteType: 'UPVOTE' },
      });
      expect(result?.voteType).toBe('UPVOTE');
    });

    it('should create downvote correctly', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        authorId: 'user-2',
      });
      mockPrisma.vote.findUnique.mockResolvedValue(null);
      mockPrisma.vote.create.mockResolvedValue(createMockVote({ voteType: 'DOWNVOTE' }));

      const result = await service.voteOnResponse('response-1', 'user-1', {
        voteType: 'DOWNVOTE',
      });

      expect(result?.voteType).toBe('DOWNVOTE');
    });
  });

  describe('getVoteSummary', () => {
    it('should return empty summary for response with no votes', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([]);

      const result = await service.getVoteSummary('response-1');

      expect(result).toEqual({
        upvotes: 0,
        downvotes: 0,
        score: 0,
        userVote: null,
      });
    });

    it('should calculate vote counts correctly', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([
        { voteType: 'UPVOTE', userId: 'user-1' },
        { voteType: 'UPVOTE', userId: 'user-2' },
        { voteType: 'UPVOTE', userId: 'user-3' },
        { voteType: 'DOWNVOTE', userId: 'user-4' },
      ]);

      const result = await service.getVoteSummary('response-1');

      expect(result.upvotes).toBe(3);
      expect(result.downvotes).toBe(1);
      expect(result.score).toBe(2);
    });

    it('should return userVote when userId is provided and user voted', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([
        { voteType: 'UPVOTE', userId: 'user-1' },
        { voteType: 'DOWNVOTE', userId: 'user-2' },
      ]);

      const result = await service.getVoteSummary('response-1', 'user-2');

      expect(result.userVote).toBe('DOWNVOTE');
    });

    it('should return null userVote when user has not voted', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([{ voteType: 'UPVOTE', userId: 'user-1' }]);

      const result = await service.getVoteSummary('response-1', 'user-2');

      expect(result.userVote).toBeNull();
    });

    it('should handle negative score correctly', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([
        { voteType: 'DOWNVOTE', userId: 'user-1' },
        { voteType: 'DOWNVOTE', userId: 'user-2' },
        { voteType: 'DOWNVOTE', userId: 'user-3' },
        { voteType: 'UPVOTE', userId: 'user-4' },
      ]);

      const result = await service.getVoteSummary('response-1');

      expect(result.score).toBe(-2);
    });
  });

  describe('getVoteSummaries', () => {
    it('should return summaries for multiple responses', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([
        { responseId: 'response-1', voteType: 'UPVOTE', userId: 'user-1' },
        { responseId: 'response-1', voteType: 'UPVOTE', userId: 'user-2' },
        { responseId: 'response-2', voteType: 'DOWNVOTE', userId: 'user-1' },
      ]);

      const result = await service.getVoteSummaries(['response-1', 'response-2']);

      expect(result.get('response-1')).toEqual({
        upvotes: 2,
        downvotes: 0,
        score: 2,
        userVote: null,
      });
      expect(result.get('response-2')).toEqual({
        upvotes: 0,
        downvotes: 1,
        score: -1,
        userVote: null,
      });
    });

    it('should include userVote for each response when userId provided', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([
        { responseId: 'response-1', voteType: 'UPVOTE', userId: 'user-1' },
        { responseId: 'response-2', voteType: 'DOWNVOTE', userId: 'user-1' },
      ]);

      const result = await service.getVoteSummaries(['response-1', 'response-2'], 'user-1');

      expect(result.get('response-1')?.userVote).toBe('UPVOTE');
      expect(result.get('response-2')?.userVote).toBe('DOWNVOTE');
    });

    it('should initialize summary for responses with no votes', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([]);

      const result = await service.getVoteSummaries(['response-1', 'response-2']);

      expect(result.get('response-1')).toEqual({
        upvotes: 0,
        downvotes: 0,
        score: 0,
        userVote: null,
      });
      expect(result.get('response-2')).toEqual({
        upvotes: 0,
        downvotes: 0,
        score: 0,
        userVote: null,
      });
    });

    it('should handle mixed responses with and without votes', async () => {
      mockPrisma.vote.findMany.mockResolvedValue([
        { responseId: 'response-1', voteType: 'UPVOTE', userId: 'user-1' },
      ]);

      const result = await service.getVoteSummaries(['response-1', 'response-2', 'response-3']);

      expect(result.get('response-1')?.score).toBe(1);
      expect(result.get('response-2')?.score).toBe(0);
      expect(result.get('response-3')?.score).toBe(0);
    });
  });

  describe('removeVote', () => {
    it('should throw NotFoundException if vote does not exist', async () => {
      mockPrisma.vote.findUnique.mockResolvedValue(null);

      await expect(service.removeVote('response-1', 'user-1')).rejects.toThrow('Vote not found');
    });

    it('should delete vote successfully', async () => {
      mockPrisma.vote.findUnique.mockResolvedValue(createMockVote());
      mockPrisma.vote.delete.mockResolvedValue(undefined);

      await service.removeVote('response-1', 'user-1');

      expect(mockPrisma.vote.delete).toHaveBeenCalledWith({
        where: { id: 'vote-1' },
      });
    });

    it('should query with correct composite key', async () => {
      mockPrisma.vote.findUnique.mockResolvedValue(createMockVote());
      mockPrisma.vote.delete.mockResolvedValue(undefined);

      await service.removeVote('response-1', 'user-1');

      expect(mockPrisma.vote.findUnique).toHaveBeenCalledWith({
        where: {
          userId_responseId: {
            userId: 'user-1',
            responseId: 'response-1',
          },
        },
      });
    });
  });
});
