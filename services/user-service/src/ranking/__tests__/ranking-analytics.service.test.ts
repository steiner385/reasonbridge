/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for RankingAnalyticsService
 *
 * Tests the analytics service that provides admin dashboard metrics
 * for the ranking system including tier distribution, appeals, credentials,
 * and system health statistics.
 *
 * @see services/user-service/src/ranking/ranking-analytics.service.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma before importing services
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
    TierAppealStatus: {
      PENDING: 'PENDING',
      APPROVED: 'APPROVED',
      DENIED: 'DENIED',
    },
    CredentialStatus: {
      PENDING: 'PENDING',
      VERIFIED: 'VERIFIED',
      REJECTED: 'REJECTED',
      EXPIRED: 'EXPIRED',
    },
    CredentialType: {
      ACADEMIC_DOCTORATE: 'ACADEMIC_DOCTORATE',
      ACADEMIC_MASTERS: 'ACADEMIC_MASTERS',
      ACADEMIC_BACHELORS: 'ACADEMIC_BACHELORS',
      PROFESSIONAL_LICENSE: 'PROFESSIONAL_LICENSE',
      INDUSTRY_CERTIFICATION: 'INDUSTRY_CERTIFICATION',
      PUBLICATION: 'PUBLICATION',
    },
    // PrismaClient mock required for PrismaService which extends it
    PrismaClient: vi.fn(function (this: any) {
      this.$connect = vi.fn();
      this.$disconnect = vi.fn();
    }),
  };
});

// Import after mocking
import { RankingAnalyticsService } from '../ranking-analytics.service.js';
import { RankingService } from '../ranking.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TierLevel, CredentialType } from '@prisma/client';

/**
 * Mock PrismaService type for testing
 */
interface MockPrismaService {
  userRank: {
    groupBy: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  tierAppeal: {
    groupBy: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  domainCredential: {
    groupBy: ReturnType<typeof vi.fn>;
  };
}

/**
 * Mock RankingService type for testing
 */
interface MockRankingService {
  getLeaderboard: ReturnType<typeof vi.fn>;
}

describe('RankingAnalyticsService', () => {
  let service: RankingAnalyticsService;
  let mockPrisma: MockPrismaService;
  let mockRankingService: MockRankingService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Prisma service
    mockPrisma = {
      userRank: {
        groupBy: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      tierAppeal: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      domainCredential: {
        groupBy: vi.fn(),
      },
    };

    // Create mock RankingService
    mockRankingService = {
      getLeaderboard: vi.fn(),
    };

    // Instantiate the service
    service = new RankingAnalyticsService(
      mockPrisma as unknown as PrismaService,
      mockRankingService as unknown as RankingService,
    );
  });

  describe('getTierDistribution', () => {
    it('should return tier counts with percentages', async () => {
      // Setup: 100 total users distributed across tiers
      mockPrisma.userRank.groupBy.mockResolvedValue([
        { tierLevel: TierLevel.NEWCOMER, _count: { _all: 30 } },
        { tierLevel: TierLevel.CONTRIBUTOR, _count: { _all: 25 } },
        { tierLevel: TierLevel.TRUSTED, _count: { _all: 25 } },
        { tierLevel: TierLevel.LEADER, _count: { _all: 15 } },
        { tierLevel: TierLevel.EXPERT, _count: { _all: 5 } },
      ]);

      const result = await service.getTierDistribution();

      expect(result).toHaveLength(5);
      expect(result.find((t) => t.tier === TierLevel.NEWCOMER)?.count).toBe(30);
      expect(result.find((t) => t.tier === TierLevel.NEWCOMER)?.percentage).toBe(30);
      expect(result.find((t) => t.tier === TierLevel.EXPERT)?.count).toBe(5);
      expect(result.find((t) => t.tier === TierLevel.EXPERT)?.percentage).toBe(5);
    });

    it('should return all tiers with zero counts when no users exist', async () => {
      mockPrisma.userRank.groupBy.mockResolvedValue([]);

      const result = await service.getTierDistribution();

      // Should return all 5 tiers with count 0
      expect(result).toHaveLength(5);
      result.forEach((tier) => {
        expect(tier.count).toBe(0);
        expect(tier.percentage).toBe(0);
      });
    });

    it('should include tiers with zero users alongside tiers with users', async () => {
      // Only newcomers exist
      mockPrisma.userRank.groupBy.mockResolvedValue([
        { tierLevel: TierLevel.NEWCOMER, _count: { _all: 10 } },
      ]);

      const result = await service.getTierDistribution();

      expect(result).toHaveLength(5);
      expect(result.find((t) => t.tier === TierLevel.NEWCOMER)?.count).toBe(10);
      expect(result.find((t) => t.tier === TierLevel.NEWCOMER)?.percentage).toBe(100);
      expect(result.find((t) => t.tier === TierLevel.EXPERT)?.count).toBe(0);
      expect(result.find((t) => t.tier === TierLevel.EXPERT)?.percentage).toBe(0);
    });

    it('should handle decimal percentages by rounding', async () => {
      // 3 users - percentages will be 33.33%, 33.33%, 33.33%
      mockPrisma.userRank.groupBy.mockResolvedValue([
        { tierLevel: TierLevel.NEWCOMER, _count: { _all: 1 } },
        { tierLevel: TierLevel.CONTRIBUTOR, _count: { _all: 1 } },
        { tierLevel: TierLevel.TRUSTED, _count: { _all: 1 } },
      ]);

      const result = await service.getTierDistribution();

      // Should round to reasonable precision
      const newcomer = result.find((t) => t.tier === TierLevel.NEWCOMER);
      expect(newcomer?.percentage).toBeCloseTo(33.33, 1);
    });
  });

  describe('getAppealsAnalytics', () => {
    it('should return counts by appeal status', async () => {
      mockPrisma.tierAppeal.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { _all: 5 } },
        { status: 'APPROVED', _count: { _all: 10 } },
        { status: 'DENIED', _count: { _all: 3 } },
      ]);

      // Mock resolved appeals for avg resolution time
      mockPrisma.tierAppeal.findMany.mockResolvedValue([
        {
          createdAt: new Date('2025-01-01T10:00:00Z'),
          resolvedAt: new Date('2025-01-01T22:00:00Z'), // 12 hours
        },
        {
          createdAt: new Date('2025-01-02T08:00:00Z'),
          resolvedAt: new Date('2025-01-03T08:00:00Z'), // 24 hours
        },
      ]);

      const result = await service.getAppealsAnalytics();

      expect(result.pending).toBe(5);
      expect(result.approved).toBe(10);
      expect(result.denied).toBe(3);
      expect(result.avgResolutionHours).toBe(18); // (12 + 24) / 2 = 18
    });

    it('should return null avgResolutionHours when no resolved appeals', async () => {
      mockPrisma.tierAppeal.groupBy.mockResolvedValue([{ status: 'PENDING', _count: { _all: 5 } }]);
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);

      const result = await service.getAppealsAnalytics();

      expect(result.pending).toBe(5);
      expect(result.approved).toBe(0);
      expect(result.denied).toBe(0);
      expect(result.avgResolutionHours).toBeNull();
    });

    it('should return zeros when no appeals exist', async () => {
      mockPrisma.tierAppeal.groupBy.mockResolvedValue([]);
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);

      const result = await service.getAppealsAnalytics();

      expect(result.pending).toBe(0);
      expect(result.approved).toBe(0);
      expect(result.denied).toBe(0);
      expect(result.avgResolutionHours).toBeNull();
    });
  });

  describe('getCredentialsAnalytics', () => {
    it('should return counts by credential status and type', async () => {
      // Status counts
      mockPrisma.domainCredential.groupBy
        .mockResolvedValueOnce([
          { status: 'PENDING', _count: { _all: 8 } },
          { status: 'VERIFIED', _count: { _all: 20 } },
          { status: 'REJECTED', _count: { _all: 5 } },
          { status: 'EXPIRED', _count: { _all: 2 } },
        ])
        // Type counts
        .mockResolvedValueOnce([
          { type: CredentialType.ACADEMIC_DOCTORATE, _count: { _all: 10 } },
          { type: CredentialType.PROFESSIONAL_LICENSE, _count: { _all: 15 } },
          { type: CredentialType.PUBLICATION, _count: { _all: 10 } },
        ]);

      const result = await service.getCredentialsAnalytics();

      expect(result.pending).toBe(8);
      expect(result.verified).toBe(20);
      expect(result.rejected).toBe(5);
      expect(result.byType).toHaveLength(3);
      expect(result.byType.find((t) => t.type === CredentialType.ACADEMIC_DOCTORATE)?.count).toBe(
        10,
      );
    });

    it('should return zeros when no credentials exist', async () => {
      mockPrisma.domainCredential.groupBy
        .mockResolvedValueOnce([]) // status counts
        .mockResolvedValueOnce([]); // type counts

      const result = await service.getCredentialsAnalytics();

      expect(result.pending).toBe(0);
      expect(result.verified).toBe(0);
      expect(result.rejected).toBe(0);
      expect(result.byType).toHaveLength(0);
    });
  });

  describe('getSystemHealth', () => {
    it('should return score statistics', async () => {
      mockPrisma.userRank.aggregate.mockResolvedValue({
        _avg: { compositeScore: { toNumber: () => 0.45 } },
        _min: { compositeScore: { toNumber: () => 0.1 } },
        _max: { compositeScore: { toNumber: () => 0.95 } },
      });

      // Mock for median calculation - ordered scores
      mockPrisma.userRank.findMany.mockResolvedValue([
        { compositeScore: { toNumber: () => 0.1 } },
        { compositeScore: { toNumber: () => 0.3 } },
        { compositeScore: { toNumber: () => 0.5 } }, // median
        { compositeScore: { toNumber: () => 0.7 } },
        { compositeScore: { toNumber: () => 0.95 } },
      ]);

      mockPrisma.userRank.count.mockResolvedValue(5);

      // Mock last recalculation
      mockPrisma.userRank.findFirst.mockResolvedValue({
        lastCalculated: new Date('2025-02-22T10:00:00Z'),
      });

      const result = await service.getSystemHealth();

      expect(result.avgCompositeScore).toBeCloseTo(0.45, 2);
      expect(result.minScore).toBeCloseTo(0.1, 2);
      expect(result.maxScore).toBeCloseTo(0.95, 2);
      expect(result.medianScore).toBeCloseTo(0.5, 2);
      expect(result.lastRecalculation).toBe('2025-02-22T10:00:00.000Z');
    });

    it('should return zeros when no users exist', async () => {
      mockPrisma.userRank.aggregate.mockResolvedValue({
        _avg: { compositeScore: null },
        _min: { compositeScore: null },
        _max: { compositeScore: null },
      });
      mockPrisma.userRank.findMany.mockResolvedValue([]);
      mockPrisma.userRank.count.mockResolvedValue(0);
      mockPrisma.userRank.findFirst.mockResolvedValue(null);

      const result = await service.getSystemHealth();

      expect(result.avgCompositeScore).toBe(0);
      expect(result.minScore).toBe(0);
      expect(result.maxScore).toBe(0);
      expect(result.medianScore).toBe(0);
      expect(result.lastRecalculation).toBeNull();
    });

    it('should calculate median correctly for even number of users', async () => {
      mockPrisma.userRank.aggregate.mockResolvedValue({
        _avg: { compositeScore: { toNumber: () => 0.4 } },
        _min: { compositeScore: { toNumber: () => 0.2 } },
        _max: { compositeScore: { toNumber: () => 0.6 } },
      });

      // 4 users - median is average of 2nd and 3rd
      mockPrisma.userRank.findMany.mockResolvedValue([
        { compositeScore: { toNumber: () => 0.2 } },
        { compositeScore: { toNumber: () => 0.3 } }, // middle
        { compositeScore: { toNumber: () => 0.5 } }, // middle
        { compositeScore: { toNumber: () => 0.6 } },
      ]);

      mockPrisma.userRank.count.mockResolvedValue(4);
      mockPrisma.userRank.findFirst.mockResolvedValue({
        lastCalculated: new Date(),
      });

      const result = await service.getSystemHealth();

      expect(result.medianScore).toBeCloseTo(0.4, 2); // (0.3 + 0.5) / 2 = 0.4
    });
  });

  describe('getAnalytics', () => {
    it('should combine all analytics data', async () => {
      // Mock tier distribution
      mockPrisma.userRank.groupBy.mockResolvedValue([
        { tierLevel: TierLevel.NEWCOMER, _count: { _all: 50 } },
        { tierLevel: TierLevel.CONTRIBUTOR, _count: { _all: 30 } },
        { tierLevel: TierLevel.TRUSTED, _count: { _all: 15 } },
        { tierLevel: TierLevel.LEADER, _count: { _all: 4 } },
        { tierLevel: TierLevel.EXPERT, _count: { _all: 1 } },
      ]);

      // Mock total users
      mockPrisma.userRank.count.mockResolvedValue(100);

      // Mock appeals
      mockPrisma.tierAppeal.groupBy.mockResolvedValue([{ status: 'PENDING', _count: { _all: 3 } }]);
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);

      // Mock credentials
      mockPrisma.domainCredential.groupBy
        .mockResolvedValueOnce([{ status: 'PENDING', _count: { _all: 5 } }])
        .mockResolvedValueOnce([]);

      // Mock system health
      mockPrisma.userRank.aggregate.mockResolvedValue({
        _avg: { compositeScore: { toNumber: () => 0.35 } },
        _min: { compositeScore: { toNumber: () => 0.05 } },
        _max: { compositeScore: { toNumber: () => 0.92 } },
      });
      mockPrisma.userRank.findMany.mockResolvedValue([
        { compositeScore: { toNumber: () => 0.35 } },
      ]);
      mockPrisma.userRank.findFirst.mockResolvedValue({
        lastCalculated: new Date('2025-02-22T08:00:00Z'),
      });

      // Mock top contributors from RankingService
      mockRankingService.getLeaderboard.mockResolvedValue([
        {
          userId: 'user-1',
          displayName: 'Top User',
          compositeScore: 0.92,
          tierLevel: TierLevel.EXPERT,
        },
        {
          userId: 'user-2',
          displayName: 'Second User',
          compositeScore: 0.85,
          tierLevel: TierLevel.EXPERT,
        },
      ]);

      const result = await service.getAnalytics();

      // Verify structure
      expect(result.tierDistribution).toHaveLength(5);
      expect(result.totalUsers).toBe(100);
      expect(result.appeals.pending).toBe(3);
      expect(result.credentials.pending).toBe(5);
      expect(result.systemHealth.avgCompositeScore).toBeCloseTo(0.35, 2);
      expect(result.topContributors).toHaveLength(2);
      expect(result.topContributors[0].userId).toBe('user-1');
    });

    it('should request top 10 contributors', async () => {
      // Setup minimal mocks
      mockPrisma.userRank.groupBy.mockResolvedValue([]);
      mockPrisma.userRank.count.mockResolvedValue(0);
      mockPrisma.tierAppeal.groupBy.mockResolvedValue([]);
      mockPrisma.tierAppeal.findMany.mockResolvedValue([]);
      mockPrisma.domainCredential.groupBy.mockResolvedValue([]);
      mockPrisma.userRank.aggregate.mockResolvedValue({
        _avg: { compositeScore: null },
        _min: { compositeScore: null },
        _max: { compositeScore: null },
      });
      mockPrisma.userRank.findMany.mockResolvedValue([]);
      mockPrisma.userRank.findFirst.mockResolvedValue(null);
      mockRankingService.getLeaderboard.mockResolvedValue([]);

      await service.getAnalytics();

      expect(mockRankingService.getLeaderboard).toHaveBeenCalledWith({ limit: 10 });
    });
  });
});
