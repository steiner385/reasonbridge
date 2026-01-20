import { VotesService } from '../votes/votes.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VotesService', () => {
  let service: VotesService;
  let mockPrisma: any;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      response: {
        findUnique: async (_args: any) => null,
      },
      vote: {
        findUnique: async (_args: any) => null,
        findMany: async (_args: any) => [],
        create: async (_args: any) => null,
        update: async (_args: any) => null,
        delete: async (_args: any) => null,
      },
    };

    service = new VotesService(mockPrisma);
  });

  describe('voteOnResponse', () => {
    const userId = 'user-123';
    const responseId = 'response-456';
    const authorId = 'author-789';

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique = async () => null;

      await expect(
        service.voteOnResponse(responseId, userId, { voteType: 'UPVOTE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user tries to vote on their own response', async () => {
      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        authorId: userId, // Same as voting user
      });

      await expect(
        service.voteOnResponse(responseId, userId, { voteType: 'UPVOTE' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new vote when user has not voted before', async () => {
      const now = new Date();
      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        authorId: authorId,
      });
      mockPrisma.vote.findUnique = async () => null;
      mockPrisma.vote.create = async (args: any) => ({
        id: 'vote-001',
        userId: args.data.userId,
        responseId: args.data.responseId,
        voteType: args.data.voteType,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.voteOnResponse(responseId, userId, { voteType: 'UPVOTE' });

      expect(result).toEqual({
        id: 'vote-001',
        userId,
        responseId,
        voteType: 'UPVOTE',
        createdAt: now,
        updatedAt: now,
      });
    });

    it('should toggle off (remove) vote when user votes the same type again', async () => {
      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        authorId: authorId,
      });
      mockPrisma.vote.findUnique = async () => ({
        id: 'vote-001',
        userId,
        responseId,
        voteType: 'UPVOTE',
      });
      let deleteWasCalled = false;
      mockPrisma.vote.delete = async () => {
        deleteWasCalled = true;
        return null;
      };

      const result = await service.voteOnResponse(responseId, userId, { voteType: 'UPVOTE' });

      expect(result).toBeNull();
      expect(deleteWasCalled).toBe(true);
    });

    it('should update vote when user changes from UPVOTE to DOWNVOTE', async () => {
      const now = new Date();
      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        authorId: authorId,
      });
      mockPrisma.vote.findUnique = async () => ({
        id: 'vote-001',
        userId,
        responseId,
        voteType: 'UPVOTE',
      });
      mockPrisma.vote.update = async (args: any) => ({
        id: 'vote-001',
        userId,
        responseId,
        voteType: args.data.voteType,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.voteOnResponse(responseId, userId, { voteType: 'DOWNVOTE' });

      expect(result).toEqual({
        id: 'vote-001',
        userId,
        responseId,
        voteType: 'DOWNVOTE',
        createdAt: now,
        updatedAt: now,
      });
    });

    it('should update vote when user changes from DOWNVOTE to UPVOTE', async () => {
      const now = new Date();
      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        authorId: authorId,
      });
      mockPrisma.vote.findUnique = async () => ({
        id: 'vote-001',
        userId,
        responseId,
        voteType: 'DOWNVOTE',
      });
      mockPrisma.vote.update = async (args: any) => ({
        id: 'vote-001',
        userId,
        responseId,
        voteType: args.data.voteType,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.voteOnResponse(responseId, userId, { voteType: 'UPVOTE' });

      expect(result).toEqual({
        id: 'vote-001',
        userId,
        responseId,
        voteType: 'UPVOTE',
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  describe('getVoteSummary', () => {
    const responseId = 'response-456';

    it('should return zero counts for response with no votes', async () => {
      mockPrisma.vote.findMany = async () => [];

      const result = await service.getVoteSummary(responseId);

      expect(result).toEqual({
        upvotes: 0,
        downvotes: 0,
        score: 0,
        userVote: null,
      });
    });

    it('should correctly count upvotes and downvotes', async () => {
      mockPrisma.vote.findMany = async () => [
        { userId: 'user-1', voteType: 'UPVOTE' },
        { userId: 'user-2', voteType: 'UPVOTE' },
        { userId: 'user-3', voteType: 'UPVOTE' },
        { userId: 'user-4', voteType: 'DOWNVOTE' },
      ];

      const result = await service.getVoteSummary(responseId);

      expect(result).toEqual({
        upvotes: 3,
        downvotes: 1,
        score: 2,
        userVote: null,
      });
    });

    it('should return userVote when userId is provided and user has voted', async () => {
      const userId = 'user-2';
      mockPrisma.vote.findMany = async () => [
        { userId: 'user-1', voteType: 'UPVOTE' },
        { userId: 'user-2', voteType: 'DOWNVOTE' },
        { userId: 'user-3', voteType: 'UPVOTE' },
      ];

      const result = await service.getVoteSummary(responseId, userId);

      expect(result).toEqual({
        upvotes: 2,
        downvotes: 1,
        score: 1,
        userVote: 'DOWNVOTE',
      });
    });

    it('should return userVote as null when userId is provided but user has not voted', async () => {
      const userId = 'user-4';
      mockPrisma.vote.findMany = async () => [
        { userId: 'user-1', voteType: 'UPVOTE' },
        { userId: 'user-2', voteType: 'UPVOTE' },
      ];

      const result = await service.getVoteSummary(responseId, userId);

      expect(result).toEqual({
        upvotes: 2,
        downvotes: 0,
        score: 2,
        userVote: null,
      });
    });

    it('should handle all downvotes scenario', async () => {
      mockPrisma.vote.findMany = async () => [
        { userId: 'user-1', voteType: 'DOWNVOTE' },
        { userId: 'user-2', voteType: 'DOWNVOTE' },
        { userId: 'user-3', voteType: 'DOWNVOTE' },
      ];

      const result = await service.getVoteSummary(responseId);

      expect(result).toEqual({
        upvotes: 0,
        downvotes: 3,
        score: -3,
        userVote: null,
      });
    });
  });

  describe('getVoteSummaries', () => {
    it('should return summaries for multiple responses', async () => {
      const responseIds = ['response-1', 'response-2', 'response-3'];
      mockPrisma.vote.findMany = async () => [
        { responseId: 'response-1', userId: 'user-1', voteType: 'UPVOTE' },
        { responseId: 'response-1', userId: 'user-2', voteType: 'UPVOTE' },
        { responseId: 'response-2', userId: 'user-1', voteType: 'DOWNVOTE' },
        { responseId: 'response-3', userId: 'user-1', voteType: 'UPVOTE' },
        { responseId: 'response-3', userId: 'user-2', voteType: 'DOWNVOTE' },
        { responseId: 'response-3', userId: 'user-3', voteType: 'UPVOTE' },
      ];

      const result = await service.getVoteSummaries(responseIds);

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
      expect(result.get('response-3')).toEqual({
        upvotes: 2,
        downvotes: 1,
        score: 1,
        userVote: null,
      });
    });

    it('should include userVote for each response when userId is provided', async () => {
      const responseIds = ['response-1', 'response-2'];
      const userId = 'user-1';
      mockPrisma.vote.findMany = async () => [
        { responseId: 'response-1', userId: 'user-1', voteType: 'UPVOTE' },
        { responseId: 'response-1', userId: 'user-2', voteType: 'DOWNVOTE' },
        { responseId: 'response-2', userId: 'user-2', voteType: 'UPVOTE' },
      ];

      const result = await service.getVoteSummaries(responseIds, userId);

      expect(result.get('response-1')).toEqual({
        upvotes: 1,
        downvotes: 1,
        score: 0,
        userVote: 'UPVOTE',
      });
      expect(result.get('response-2')).toEqual({
        upvotes: 1,
        downvotes: 0,
        score: 1,
        userVote: null,
      });
    });

    it('should return empty summaries for responses with no votes', async () => {
      const responseIds = ['response-1', 'response-2'];
      mockPrisma.vote.findMany = async () => [];

      const result = await service.getVoteSummaries(responseIds);

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

    it('should handle empty responseIds array', async () => {
      const result = await service.getVoteSummaries([]);

      expect(result.size).toBe(0);
    });
  });

  describe('removeVote', () => {
    const responseId = 'response-456';
    const userId = 'user-123';

    it('should throw NotFoundException if vote does not exist', async () => {
      mockPrisma.vote.findUnique = async () => null;

      await expect(service.removeVote(responseId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should delete vote successfully when it exists', async () => {
      let deleteWasCalled = false;
      mockPrisma.vote.findUnique = async () => ({
        id: 'vote-001',
        userId,
        responseId,
        voteType: 'UPVOTE',
      });
      mockPrisma.vote.delete = async () => {
        deleteWasCalled = true;
        return null;
      };

      await service.removeVote(responseId, userId);

      expect(deleteWasCalled).toBe(true);
    });
  });

  describe('mapToVoteDto (private method - tested through public methods)', () => {
    it('should correctly map vote data to VoteDto', async () => {
      const now = new Date();
      const userId = 'user-123';
      const responseId = 'response-456';
      const authorId = 'author-789';

      mockPrisma.response.findUnique = async () => ({
        id: responseId,
        authorId: authorId,
      });
      mockPrisma.vote.findUnique = async () => null;
      mockPrisma.vote.create = async (args: any) => ({
        id: 'vote-001',
        userId: args.data.userId,
        responseId: args.data.responseId,
        voteType: args.data.voteType,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.voteOnResponse(responseId, userId, { voteType: 'DOWNVOTE' });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('responseId', responseId);
      expect(result).toHaveProperty('voteType', 'DOWNVOTE');
      expect(result).toHaveProperty('createdAt', now);
      expect(result).toHaveProperty('updatedAt', now);
    });
  });
});
