/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for RankingController
 *
 * Tests the REST API endpoints for the ranking system:
 * - GET /users/:id/ranking - Get user's global tier and score
 * - GET /users/me/ranking/breakdown - Detailed score breakdown (authenticated)
 * - GET /users/leaderboard - Top users by composite score
 *
 * @see services/user-service/src/ranking/ranking.controller.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RankingController } from '../ranking.controller.js';
import { TierLevel } from '@prisma/client';
import { UserRankDto } from '../dto/user-rank.dto.js';

// Mock Prisma client for TierLevel enum
vi.mock('@prisma/client', () => ({
  TierLevel: {
    NEWCOMER: 'NEWCOMER',
    CONTRIBUTOR: 'CONTRIBUTOR',
    TRUSTED: 'TRUSTED',
    LEADER: 'LEADER',
    EXPERT: 'EXPERT',
  },
}));

/**
 * Helper to create a mock UserRankDto
 */
const createMockUserRankDto = (overrides: Partial<UserRankDto> = {}): UserRankDto => {
  const data = {
    userId: 'user-123',
    displayName: 'Test User',
    compositeScore: 0.45,
    tierLevel: TierLevel.TRUSTED,
    nextTierThreshold: 0.6,
    engagementScore: 0.4,
    qualityScore: 0.5,
    tenureBonus: 0.27,
    badges: ['first-response'],
    lastCalculated: new Date(),
    lastActivityAt: new Date(),
    ...overrides,
  };
  return new UserRankDto(data);
};

/**
 * Factory to create a mock RankingService
 */
const createMockRankingService = () => ({
  getUserRank: vi.fn(),
  recalculateUserRank: vi.fn(),
  getLeaderboard: vi.fn(),
});

describe('RankingController', () => {
  let controller: RankingController;
  let mockRankingService: ReturnType<typeof createMockRankingService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRankingService = createMockRankingService();
    controller = new RankingController(mockRankingService as any);
  });

  describe('GET /users/:id/ranking', () => {
    it('should return user rank for a valid user ID', async () => {
      const mockRank = createMockUserRankDto({ userId: 'user-456' });
      mockRankingService.getUserRank.mockResolvedValue(mockRank);

      const result = await controller.getUserRanking('user-456');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-456');
      expect(result.tierLevel).toBe(TierLevel.TRUSTED);
      expect(mockRankingService.getUserRank).toHaveBeenCalledWith('user-456');
    });

    it('should return tier level and composite score', async () => {
      const mockRank = createMockUserRankDto({
        compositeScore: 0.75,
        tierLevel: TierLevel.LEADER,
      });
      mockRankingService.getUserRank.mockResolvedValue(mockRank);

      const result = await controller.getUserRanking('user-123');

      expect(result.compositeScore).toBe(0.75);
      expect(result.tierLevel).toBe(TierLevel.LEADER);
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      mockRankingService.getUserRank.mockRejectedValue(
        new NotFoundException('User with ID nonexistent-user not found'),
      );

      await expect(controller.getUserRanking('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getUserRanking('nonexistent-user')).rejects.toThrow(
        'User with ID nonexistent-user not found',
      );
    });

    it('should propagate other service errors', async () => {
      mockRankingService.getUserRank.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getUserRanking('user-123')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('GET /users/me/ranking/breakdown', () => {
    it('should return current user rank breakdown when authenticated', async () => {
      const mockRank = createMockUserRankDto({
        userId: 'current-user-id',
        displayName: 'Current User',
        compositeScore: 0.65,
        tierLevel: TierLevel.TRUSTED,
        engagementScore: 0.5,
        qualityScore: 0.6,
        tenureBonus: 0.4,
      });
      mockRankingService.getUserRank.mockResolvedValue(mockRank);

      // In unit tests, we call the controller method directly, passing the JWT payload
      // (not wrapped in a request object, since the decorator extracts it from request.user)
      const jwtPayload = { sub: 'current-user-id', email: 'current@example.com' };

      const result = await controller.getMyRankingBreakdown(jwtPayload as any);

      expect(result).toBeDefined();
      expect(result.userId).toBe('current-user-id');
      expect(result.engagementScore).toBe(0.5);
      expect(result.qualityScore).toBe(0.6);
      expect(result.tenureBonus).toBe(0.4);
      expect(mockRankingService.getUserRank).toHaveBeenCalledWith('current-user-id');
    });

    it('should use sub from JWT payload to identify current user', async () => {
      const mockRank = createMockUserRankDto({ userId: 'jwt-user-id' });
      mockRankingService.getUserRank.mockResolvedValue(mockRank);

      const jwtPayload = { sub: 'jwt-user-id' };

      await controller.getMyRankingBreakdown(jwtPayload as any);

      expect(mockRankingService.getUserRank).toHaveBeenCalledWith('jwt-user-id');
    });

    it('should return all score breakdown components', async () => {
      // Create a mock that will result in 75% progress - TRUSTED tier with score of 0.55
      // (TRUSTED is 0.4-0.6 range, so 0.55 is (0.55-0.4)/(0.6-0.4) = 0.15/0.2 = 75%)
      const mockRank = createMockUserRankDto({
        compositeScore: 0.55,
        tierLevel: TierLevel.TRUSTED,
        nextTierThreshold: 0.6,
        engagementScore: 0.8,
        qualityScore: 0.7,
        tenureBonus: 0.5,
        badges: ['verified-human', 'top-contributor'],
      });
      mockRankingService.getUserRank.mockResolvedValue(mockRank);

      const jwtPayload = { sub: 'user-123' };

      const result = await controller.getMyRankingBreakdown(jwtPayload as any);

      expect(result.engagementScore).toBe(0.8);
      expect(result.qualityScore).toBe(0.7);
      expect(result.tenureBonus).toBe(0.5);
      expect(result.badges).toEqual(['verified-human', 'top-contributor']);
      expect(result.progressToNextTier).toBe(75);
    });

    it('should propagate error when service fails', async () => {
      mockRankingService.getUserRank.mockRejectedValue(new Error('Service unavailable'));

      const jwtPayload = { sub: 'user-123' };

      await expect(controller.getMyRankingBreakdown(jwtPayload as any)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('GET /users/leaderboard', () => {
    it('should return list of top users', async () => {
      const mockLeaderboard = [
        createMockUserRankDto({
          userId: 'user-1',
          displayName: 'Top User',
          compositeScore: 0.95,
          tierLevel: TierLevel.EXPERT,
        }),
        createMockUserRankDto({
          userId: 'user-2',
          displayName: 'Second User',
          compositeScore: 0.85,
          tierLevel: TierLevel.LEADER,
        }),
        createMockUserRankDto({
          userId: 'user-3',
          displayName: 'Third User',
          compositeScore: 0.75,
          tierLevel: TierLevel.LEADER,
        }),
      ];
      mockRankingService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard();

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].compositeScore).toBe(0.95);
      expect(result[1].userId).toBe('user-2');
      expect(result[2].userId).toBe('user-3');
    });

    it('should support limit query parameter', async () => {
      mockRankingService.getLeaderboard.mockResolvedValue([]);

      await controller.getLeaderboard('25');

      expect(mockRankingService.getLeaderboard).toHaveBeenCalledWith({
        limit: 25,
        offset: undefined,
      });
    });

    it('should support offset query parameter for pagination', async () => {
      mockRankingService.getLeaderboard.mockResolvedValue([]);

      await controller.getLeaderboard('10', '50');

      expect(mockRankingService.getLeaderboard).toHaveBeenCalledWith({
        limit: 10,
        offset: 50,
      });
    });

    it('should use default values when query params are not provided', async () => {
      mockRankingService.getLeaderboard.mockResolvedValue([]);

      await controller.getLeaderboard();

      expect(mockRankingService.getLeaderboard).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
      });
    });

    it('should handle invalid limit gracefully (NaN)', async () => {
      mockRankingService.getLeaderboard.mockResolvedValue([]);

      await controller.getLeaderboard('invalid');

      // parseInt('invalid', 10) returns NaN, which should be handled
      expect(mockRankingService.getLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: NaN,
        }),
      );
    });

    it('should return empty array when no users found', async () => {
      mockRankingService.getLeaderboard.mockResolvedValue([]);

      const result = await controller.getLeaderboard();

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockRankingService.getLeaderboard.mockRejectedValue(new Error('Database error'));

      await expect(controller.getLeaderboard()).rejects.toThrow('Database error');
    });

    it('should return users with their tier levels and scores', async () => {
      const mockLeaderboard = [
        createMockUserRankDto({
          userId: 'expert-user',
          tierLevel: TierLevel.EXPERT,
          compositeScore: 0.92,
        }),
        createMockUserRankDto({
          userId: 'leader-user',
          tierLevel: TierLevel.LEADER,
          compositeScore: 0.78,
        }),
      ];
      mockRankingService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard();

      expect(result[0].tierLevel).toBe(TierLevel.EXPERT);
      expect(result[0].compositeScore).toBe(0.92);
      expect(result[1].tierLevel).toBe(TierLevel.LEADER);
      expect(result[1].compositeScore).toBe(0.78);
    });
  });

  describe('Error handling', () => {
    it('should propagate NotFoundException with correct message', async () => {
      const userId = 'nonexistent-user-id';
      mockRankingService.getUserRank.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      try {
        await controller.getUserRanking(userId);
        expect.fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toBe(`User with ID ${userId} not found`);
      }
    });
  });
});
