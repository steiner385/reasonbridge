import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VotesController } from './votes.controller.js';

const createMockVotesService = () => ({
  voteOnResponse: vi.fn(),
  removeVote: vi.fn(),
  getVoteSummary: vi.fn(),
});

describe('VotesController', () => {
  let controller: VotesController;
  let mockVotesService: ReturnType<typeof createMockVotesService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVotesService = createMockVotesService();
    controller = new VotesController(mockVotesService as any);
  });

  describe('voteOnResponse', () => {
    it('should create upvote', async () => {
      const createVoteDto = { voteType: 'UPVOTE' };
      const vote = {
        id: 'vote-1',
        responseId: 'response-1',
        userId: 'user-1',
        voteType: 'UPVOTE',
        createdAt: new Date(),
      };
      mockVotesService.voteOnResponse.mockResolvedValue(vote);

      const result = await controller.voteOnResponse('response-1', 'user-1', createVoteDto as any);

      expect(result).toEqual(vote);
      expect(mockVotesService.voteOnResponse).toHaveBeenCalledWith(
        'response-1',
        'user-1',
        createVoteDto,
      );
    });

    it('should create downvote', async () => {
      const createVoteDto = { voteType: 'DOWNVOTE' };
      const vote = {
        id: 'vote-1',
        responseId: 'response-1',
        userId: 'user-1',
        voteType: 'DOWNVOTE',
        createdAt: new Date(),
      };
      mockVotesService.voteOnResponse.mockResolvedValue(vote);

      const result = await controller.voteOnResponse('response-1', 'user-1', createVoteDto as any);

      expect(result).toEqual(vote);
    });

    it('should return vote removed message when same vote type toggles off', async () => {
      const createVoteDto = { voteType: 'UPVOTE' };
      mockVotesService.voteOnResponse.mockResolvedValue(null);

      const result = await controller.voteOnResponse('response-1', 'user-1', createVoteDto as any);

      expect(result).toEqual({ message: 'Vote removed' });
    });

    it('should update vote type when changing from upvote to downvote', async () => {
      const createVoteDto = { voteType: 'DOWNVOTE' };
      const updatedVote = {
        id: 'vote-1',
        voteType: 'DOWNVOTE',
        updatedAt: new Date(),
      };
      mockVotesService.voteOnResponse.mockResolvedValue(updatedVote);

      const result = await controller.voteOnResponse('response-1', 'user-1', createVoteDto as any);

      expect(result).toEqual(updatedVote);
    });
  });

  describe('removeVote', () => {
    it('should remove vote', async () => {
      mockVotesService.removeVote.mockResolvedValue(undefined);

      await controller.removeVote('response-1', 'user-1');

      expect(mockVotesService.removeVote).toHaveBeenCalledWith('response-1', 'user-1');
    });

    it('should not throw when vote does not exist', async () => {
      mockVotesService.removeVote.mockResolvedValue(undefined);

      await expect(controller.removeVote('response-1', 'user-1')).resolves.not.toThrow();
    });
  });

  describe('getVoteSummary', () => {
    it('should return vote summary with user vote', async () => {
      const summary = {
        responseId: 'response-1',
        upvotes: 10,
        downvotes: 2,
        netScore: 8,
        userVote: 'UPVOTE',
      };
      mockVotesService.getVoteSummary.mockResolvedValue(summary);

      const result = await controller.getVoteSummary('response-1', 'user-1');

      expect(result).toEqual(summary);
      expect(mockVotesService.getVoteSummary).toHaveBeenCalledWith('response-1', 'user-1');
    });

    it('should return vote summary without user vote when userId not provided', async () => {
      const summary = {
        responseId: 'response-1',
        upvotes: 10,
        downvotes: 2,
        netScore: 8,
        userVote: null,
      };
      mockVotesService.getVoteSummary.mockResolvedValue(summary);

      const result = await controller.getVoteSummary('response-1', undefined);

      expect(result).toEqual(summary);
      expect(mockVotesService.getVoteSummary).toHaveBeenCalledWith('response-1', undefined);
    });

    it('should return zero counts for response with no votes', async () => {
      const summary = {
        responseId: 'response-1',
        upvotes: 0,
        downvotes: 0,
        netScore: 0,
        userVote: null,
      };
      mockVotesService.getVoteSummary.mockResolvedValue(summary);

      const result = await controller.getVoteSummary('response-1', 'user-1');

      expect(result.upvotes).toBe(0);
      expect(result.downvotes).toBe(0);
      expect(result.netScore).toBe(0);
    });
  });
});
