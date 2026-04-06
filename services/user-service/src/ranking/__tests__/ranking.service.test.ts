/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for RankingService
 *
 * Tests the orchestration layer that manages user rankings using
 * PrismaService, RankingCalculatorService, and TrustScoreCalculator.
 *
 * @see services/user-service/src/ranking/ranking.service.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// Mock Prisma before importing services
// Vitest 4.x requires function syntax for mock constructors
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
    toString(): string {
      return this.value.toString();
    }
  }

  return {
    Prisma: { Decimal: MockDecimal },
    TierLevel: {
      NEWCOMER: 'NEWCOMER',
      CONTRIBUTOR: 'CONTRIBUTOR',
      TRUSTED: 'TRUSTED',
      LEADER: 'LEADER',
      EXPERT: 'EXPERT',
    },
    // PrismaClient mock required for PrismaService which extends it
    PrismaClient: vi.fn(function (this: any) {
      this.$connect = vi.fn();
      this.$disconnect = vi.fn();
    }),
  };
});

// Import after mocking
import { RankingService } from '../ranking.service.js';
import { RankingCalculatorService } from '../ranking-calculator.service.js';
import { TrustScoreCalculator } from '../../services/trust-score.calculator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TierLevel } from '@prisma/client';

/**
 * Mock User type matching essential Prisma fields
 */
interface MockUser {
  id: string;
  email: string;
  displayName: string | null;
  cognitoSub: string;
  verificationLevel: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  trustScoreAbility: { toNumber: () => number };
  trustScoreBenevolence: { toNumber: () => number };
  trustScoreIntegrity: { toNumber: () => number };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mock UserRank type matching Prisma fields
 */
interface MockUserRank {
  id: string;
  userId: string;
  tierLevel: TierLevel;
  compositeScore: { toNumber: () => number };
  engagementScore: { toNumber: () => number };
  qualityScore: { toNumber: () => number };
  tenureBonus: { toNumber: () => number };
  nextTierThreshold: { toNumber: () => number };
  badges: string[];
  lastCalculated: Date;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: MockUser;
}

/**
 * Helper to create a mock User
 */
const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  cognitoSub: 'cognito-sub-123',
  verificationLevel: 'BASIC',
  status: 'ACTIVE',
  trustScoreAbility: { toNumber: () => 0.6 },
  trustScoreBenevolence: { toNumber: () => 0.55 },
  trustScoreIntegrity: { toNumber: () => 0.65 },
  createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Helper to create a mock UserRank
 */
const createMockUserRank = (overrides: Partial<MockUserRank> = {}): MockUserRank => ({
  id: 'rank-123',
  userId: 'user-123',
  tierLevel: TierLevel.TRUSTED,
  compositeScore: { toNumber: () => 0.45 },
  engagementScore: { toNumber: () => 0.4 },
  qualityScore: { toNumber: () => 0.5 },
  tenureBonus: { toNumber: () => 0.27 },
  nextTierThreshold: { toNumber: () => 0.6 },
  badges: ['first-response', 'quality-contributor'],
  lastCalculated: new Date(),
  lastActivityAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('RankingService', () => {
  let service: RankingService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    userRank: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    response: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    vote: { groupBy: ReturnType<typeof vi.fn> };
    feedback: { groupBy: ReturnType<typeof vi.fn> };
  };
  let mockRankingCalculator: RankingCalculatorService;
  let mockTrustScoreCalculator: TrustScoreCalculator;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Prisma service
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      userRank: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      response: {
        count: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      vote: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      feedback: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
    };

    // Create real instances of calculator services
    mockRankingCalculator = new RankingCalculatorService();
    mockTrustScoreCalculator = new TrustScoreCalculator();

    // Instantiate the service
    service = new RankingService(
      mockPrisma as unknown as PrismaService,
      mockRankingCalculator,
      mockTrustScoreCalculator,
    );
  });

  describe('getUserRank', () => {
    it('should return cached rank when recent (less than 24 hours old)', async () => {
      const mockUser = createMockUser();
      const recentRank = createMockUserRank({
        lastCalculated: new Date(), // Just now
        user: mockUser,
      });

      mockPrisma.userRank.findUnique.mockResolvedValue(recentRank);

      const result = await service.getUserRank('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.tierLevel).toBe(TierLevel.TRUSTED);
      expect(result.compositeScore).toBeCloseTo(0.45, 2);
      // Should NOT call upsert since rank is recent
      expect(mockPrisma.userRank.upsert).not.toHaveBeenCalled();
    });

    it('should recalculate rank when stale (more than 24 hours old)', async () => {
      const mockUser = createMockUser();
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const staleRank = createMockUserRank({
        lastCalculated: twoDaysAgo,
        user: mockUser,
      });

      mockPrisma.userRank.findUnique.mockResolvedValue(staleRank);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.userRank.upsert.mockResolvedValue(
        createMockUserRank({
          lastCalculated: new Date(),
          user: mockUser,
        }),
      );

      const result = await service.getUserRank('user-123');

      expect(result.userId).toBe('user-123');
      // Should call upsert to recalculate
      expect(mockPrisma.userRank.upsert).toHaveBeenCalled();
    });

    it('should calculate new rank when none exists', async () => {
      const mockUser = createMockUser();

      mockPrisma.userRank.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(5);
      mockPrisma.userRank.upsert.mockResolvedValue(
        createMockUserRank({
          user: mockUser,
        }),
      );

      const result = await service.getUserRank('user-123');

      expect(result.userId).toBe('user-123');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(mockPrisma.userRank.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.userRank.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserRank('nonexistent-user')).rejects.toThrow(NotFoundException);
    });

    it('should include user displayName in the result', async () => {
      const mockUser = createMockUser({ displayName: 'Jane Doe' });
      const mockRank = createMockUserRank({ user: mockUser });

      mockPrisma.userRank.findUnique.mockResolvedValue(mockRank);

      const result = await service.getUserRank('user-123');

      expect(result.displayName).toBe('Jane Doe');
    });
  });

  describe('recalculateUserRank', () => {
    it('should calculate trust average from user trust scores', async () => {
      const mockUser = createMockUser({
        trustScoreAbility: { toNumber: () => 0.7 },
        trustScoreBenevolence: { toNumber: () => 0.6 },
        trustScoreIntegrity: { toNumber: () => 0.8 },
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(20);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          compositeScore: args.create.compositeScore,
          tierLevel: args.create.tierLevel,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      expect(result.userId).toBe('user-123');
      // With trust average of 0.7, decent engagement, and tenure, should be at least TRUSTED
      expect(['TRUSTED', 'LEADER', 'EXPERT']).toContain(result.tierLevel);
    });

    it('should use TrustScoreCalculator when user has no trust scores', async () => {
      // User with null/undefined trust scores
      const mockUser = createMockUser({
        trustScoreAbility: { toNumber: () => 0 },
        trustScoreBenevolence: { toNumber: () => 0 },
        trustScoreIntegrity: { toNumber: () => 0 },
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          compositeScore: args.create.compositeScore,
          tierLevel: args.create.tierLevel,
          user: mockUser,
        };
      });

      // Should not throw - uses calculator to determine scores
      const result = await service.recalculateUserRank('user-123');

      expect(result.userId).toBe('user-123');
      expect(mockPrisma.userRank.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.recalculateUserRank('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate engagement score based on response count', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(50); // High activity
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          engagementScore: args.create.engagementScore,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // Higher response count should lead to higher engagement score
      expect(result.engagementScore).toBeGreaterThan(0);
    });

    it('should calculate tenure bonus based on account age', async () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const mockUser = createMockUser({
        createdAt: oneYearAgo,
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          tenureBonus: args.create.tenureBonus,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // 1 year old account should have max tenure bonus (1.0)
      expect(result.tenureBonus).toBeCloseTo(1.0, 1);
    });

    it('should persist the updated rank in the database', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.userRank.upsert.mockResolvedValue(
        createMockUserRank({
          user: mockUser,
        }),
      );

      await service.recalculateUserRank('user-123');

      expect(mockPrisma.userRank.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          create: expect.objectContaining({
            userId: 'user-123',
          }),
          update: expect.objectContaining({
            compositeScore: expect.any(Object), // Prisma.Decimal
            tierLevel: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('getLeaderboard', () => {
    it('should return top users by composite score', async () => {
      const mockRanks = [
        createMockUserRank({
          userId: 'user-1',
          compositeScore: { toNumber: () => 0.9 },
          tierLevel: TierLevel.EXPERT,
          user: createMockUser({ id: 'user-1', displayName: 'Expert User' }),
        }),
        createMockUserRank({
          userId: 'user-2',
          compositeScore: { toNumber: () => 0.7 },
          tierLevel: TierLevel.LEADER,
          user: createMockUser({ id: 'user-2', displayName: 'Leader User' }),
        }),
        createMockUserRank({
          userId: 'user-3',
          compositeScore: { toNumber: () => 0.5 },
          tierLevel: TierLevel.TRUSTED,
          user: createMockUser({ id: 'user-3', displayName: 'Trusted User' }),
        }),
      ];

      mockPrisma.userRank.findMany.mockResolvedValue(mockRanks);

      const result = await service.getLeaderboard();

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].compositeScore).toBe(0.9);
      expect(result[1].userId).toBe('user-2');
      expect(result[2].userId).toBe('user-3');
    });

    it('should support limit option', async () => {
      mockPrisma.userRank.findMany.mockResolvedValue([
        createMockUserRank({
          userId: 'user-1',
          user: createMockUser({ id: 'user-1' }),
        }),
      ]);

      await service.getLeaderboard({ limit: 5 });

      expect(mockPrisma.userRank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should support offset option for pagination', async () => {
      mockPrisma.userRank.findMany.mockResolvedValue([]);

      await service.getLeaderboard({ limit: 10, offset: 20 });

      expect(mockPrisma.userRank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should support filtering by tier level', async () => {
      mockPrisma.userRank.findMany.mockResolvedValue([]);

      await service.getLeaderboard({ tierLevel: TierLevel.EXPERT });

      expect(mockPrisma.userRank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tierLevel: TierLevel.EXPERT,
          }),
        }),
      );
    });

    it('should return empty array when no users found', async () => {
      mockPrisma.userRank.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard();

      expect(result).toEqual([]);
    });

    it('should order results by composite score descending', async () => {
      mockPrisma.userRank.findMany.mockResolvedValue([]);

      await service.getLeaderboard();

      expect(mockPrisma.userRank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { compositeScore: 'desc' },
        }),
      );
    });

    it('should use default limit of 10 when not specified', async () => {
      mockPrisma.userRank.findMany.mockResolvedValue([]);

      await service.getLeaderboard();

      expect(mockPrisma.userRank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should filter by activity within days when specified', async () => {
      mockPrisma.userRank.findMany.mockResolvedValue([]);

      await service.getLeaderboard({ activeWithinDays: 30 });

      expect(mockPrisma.userRank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastActivityAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('UserRankDto transformation', () => {
    it('should calculate progress to next tier correctly', async () => {
      const mockUser = createMockUser();
      // Score of 0.45 with next threshold 0.6 (TRUSTED tier, range 0.4-0.6)
      // Progress = (0.45 - 0.4) / (0.6 - 0.4) = 0.05 / 0.2 = 25%
      const mockRank = createMockUserRank({
        compositeScore: { toNumber: () => 0.45 },
        tierLevel: TierLevel.TRUSTED,
        nextTierThreshold: { toNumber: () => 0.6 },
        user: mockUser,
      });

      mockPrisma.userRank.findUnique.mockResolvedValue(mockRank);

      const result = await service.getUserRank('user-123');

      expect(result.progressToNextTier).toBe(25);
    });

    it('should return 100% progress for EXPERT tier', async () => {
      const mockUser = createMockUser();
      const mockRank = createMockUserRank({
        compositeScore: { toNumber: () => 0.95 },
        tierLevel: TierLevel.EXPERT,
        nextTierThreshold: { toNumber: () => 1.0 },
        user: mockUser,
      });

      mockPrisma.userRank.findUnique.mockResolvedValue(mockRank);

      const result = await service.getUserRank('user-123');

      expect(result.progressToNextTier).toBe(100);
    });

    it('should include badges in the result', async () => {
      const mockUser = createMockUser();
      const mockRank = createMockUserRank({
        badges: ['first-response', 'verified-human', 'top-contributor'],
        user: mockUser,
      });

      mockPrisma.userRank.findUnique.mockResolvedValue(mockRank);

      const result = await service.getUserRank('user-123');

      expect(result.badges).toEqual(['first-response', 'verified-human', 'top-contributor']);
    });
  });

  describe('quality score calculation', () => {
    it('should return 0.5 (neutral) when user has no responses', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(0);
      mockPrisma.response.findMany.mockResolvedValue([]);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          qualityScore: args.create.qualityScore,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // With no responses, quality score should be 0.5 (neutral)
      expect(result.qualityScore).toBe(0.5);
    });

    it('should calculate quality score from upvotes and downvotes', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.response.findMany.mockResolvedValue([{ id: 'response-1' }, { id: 'response-2' }]);
      // 80 upvotes, 20 downvotes = 80% vote ratio
      mockPrisma.vote.groupBy.mockResolvedValue([
        { voteType: 'UPVOTE', _count: { id: 80 } },
        { voteType: 'DOWNVOTE', _count: { id: 20 } },
      ]);
      // No feedback = 0.5 default
      mockPrisma.feedback.groupBy.mockResolvedValue([]);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          qualityScore: args.create.qualityScore,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // Expected: 0.8 * 0.6 + 0.5 * 0.4 = 0.48 + 0.2 = 0.68
      expect(result.qualityScore).toBeCloseTo(0.68, 2);
    });

    it('should calculate quality score from feedback helpfulness ratings', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.response.findMany.mockResolvedValue([{ id: 'response-1' }, { id: 'response-2' }]);
      // No votes = 0.5 default
      mockPrisma.vote.groupBy.mockResolvedValue([]);
      // 90 helpful, 10 not helpful = 90% feedback ratio
      mockPrisma.feedback.groupBy.mockResolvedValue([
        { userHelpfulRating: 'HELPFUL', _count: { id: 90 } },
        { userHelpfulRating: 'NOT_HELPFUL', _count: { id: 10 } },
      ]);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          qualityScore: args.create.qualityScore,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // Expected: 0.5 * 0.6 + 0.9 * 0.4 = 0.3 + 0.36 = 0.66
      expect(result.qualityScore).toBeCloseTo(0.66, 2);
    });

    it('should combine votes and feedback for quality score', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.response.findMany.mockResolvedValue([{ id: 'response-1' }, { id: 'response-2' }]);
      // 60 upvotes, 40 downvotes = 60% vote ratio
      mockPrisma.vote.groupBy.mockResolvedValue([
        { voteType: 'UPVOTE', _count: { id: 60 } },
        { voteType: 'DOWNVOTE', _count: { id: 40 } },
      ]);
      // 70 helpful, 30 not helpful = 70% feedback ratio
      mockPrisma.feedback.groupBy.mockResolvedValue([
        { userHelpfulRating: 'HELPFUL', _count: { id: 70 } },
        { userHelpfulRating: 'NOT_HELPFUL', _count: { id: 30 } },
      ]);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          qualityScore: args.create.qualityScore,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // Expected: 0.6 * 0.6 + 0.7 * 0.4 = 0.36 + 0.28 = 0.64
      expect(result.qualityScore).toBeCloseTo(0.64, 2);
    });

    it('should handle all negative votes correctly', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.response.findMany.mockResolvedValue([{ id: 'response-1' }]);
      // 0 upvotes, 100 downvotes = 0% vote ratio
      mockPrisma.vote.groupBy.mockResolvedValue([{ voteType: 'DOWNVOTE', _count: { id: 100 } }]);
      // 0 helpful, 100 not helpful = 0% feedback ratio
      mockPrisma.feedback.groupBy.mockResolvedValue([
        { userHelpfulRating: 'NOT_HELPFUL', _count: { id: 100 } },
      ]);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          qualityScore: args.create.qualityScore,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // Expected: 0 * 0.6 + 0 * 0.4 = 0
      expect(result.qualityScore).toBe(0);
    });

    it('should handle perfect quality score correctly', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.response.count.mockResolvedValue(10);
      mockPrisma.response.findMany.mockResolvedValue([{ id: 'response-1' }]);
      // 100 upvotes, 0 downvotes = 100% vote ratio
      mockPrisma.vote.groupBy.mockResolvedValue([{ voteType: 'UPVOTE', _count: { id: 100 } }]);
      // 100 helpful, 0 not helpful = 100% feedback ratio
      mockPrisma.feedback.groupBy.mockResolvedValue([
        { userHelpfulRating: 'HELPFUL', _count: { id: 100 } },
      ]);
      mockPrisma.userRank.upsert.mockImplementation(async (args) => {
        return {
          ...createMockUserRank(),
          qualityScore: args.create.qualityScore,
          user: mockUser,
        };
      });

      const result = await service.recalculateUserRank('user-123');

      // Expected: 1.0 * 0.6 + 1.0 * 0.4 = 1.0
      expect(result.qualityScore).toBe(1);
    });
  });
});
