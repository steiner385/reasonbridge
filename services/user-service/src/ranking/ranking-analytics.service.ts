/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { TierLevel, TierAppealStatus, CredentialStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RankingService } from './ranking.service.js';
import {
  RankingAnalyticsDto,
  TierDistributionDto,
  AppealsAnalyticsDto,
  CredentialsAnalyticsDto,
  CredentialTypeCountDto,
  SystemHealthDto,
} from './dto/ranking-analytics.dto.js';

/**
 * All tier levels in order for iteration
 */
const ALL_TIER_LEVELS: TierLevel[] = [
  TierLevel.NEWCOMER,
  TierLevel.CONTRIBUTOR,
  TierLevel.TRUSTED,
  TierLevel.LEADER,
  TierLevel.EXPERT,
];

/**
 * RankingAnalyticsService - Provides analytics data for admin dashboard
 *
 * Aggregates metrics about the ranking system including:
 * - Tier distribution across all users
 * - Appeals statistics and resolution times
 * - Credential verification status
 * - System health metrics (score statistics)
 * - Top contributors
 *
 * @remarks
 * This service is designed for admin use only and should be protected
 * by AdminGuard in the controller layer.
 */
@Injectable()
export class RankingAnalyticsService {
  private readonly logger = new Logger(RankingAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
  ) {}

  /**
   * Get distribution of users across tier levels
   *
   * @returns Array of tier distribution data with counts and percentages
   */
  async getTierDistribution(): Promise<TierDistributionDto[]> {
    // Group users by tier level
    const tierCounts = await this.prisma.userRank.groupBy({
      by: ['tierLevel'],
      _count: { _all: true },
    });

    // Calculate total users
    const totalUsers = tierCounts.reduce((sum, tier) => sum + tier._count._all, 0);

    // Create a map for quick lookup
    const countMap = new Map<TierLevel, number>();
    for (const tier of tierCounts) {
      countMap.set(tier.tierLevel, tier._count._all);
    }

    // Build result including all tiers (even those with 0 users)
    const distribution: TierDistributionDto[] = ALL_TIER_LEVELS.map((tierLevel) => {
      const count = countMap.get(tierLevel) ?? 0;
      const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;

      return new TierDistributionDto({
        tier: tierLevel,
        count,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      });
    });

    return distribution;
  }

  /**
   * Get analytics about tier appeals
   *
   * @returns Appeals statistics including counts by status and average resolution time
   */
  async getAppealsAnalytics(): Promise<AppealsAnalyticsDto> {
    // Get counts by status
    const statusCounts = await this.prisma.tierAppeal.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    // Create a map for quick lookup
    const countMap = new Map<TierAppealStatus, number>();
    for (const status of statusCounts) {
      countMap.set(status.status, status._count._all);
    }

    // Get resolved appeals to calculate average resolution time
    const resolvedAppeals = await this.prisma.tierAppeal.findMany({
      where: {
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { resolvedAt: 'desc' },
      take: 1000, // Limit to most recent for average calculation
    });

    // Calculate average resolution time in hours
    let avgResolutionHours: number | null = null;
    if (resolvedAppeals.length > 0) {
      const totalHours = resolvedAppeals.reduce((sum, appeal) => {
        const createdAt = appeal.createdAt.getTime();
        const resolvedAt = appeal.resolvedAt!.getTime();
        const hours = (resolvedAt - createdAt) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedAppeals.length);
    }

    return new AppealsAnalyticsDto({
      pending: countMap.get(TierAppealStatus.PENDING) ?? 0,
      approved: countMap.get(TierAppealStatus.APPROVED) ?? 0,
      denied: countMap.get(TierAppealStatus.DENIED) ?? 0,
      avgResolutionHours,
    });
  }

  /**
   * Get analytics about domain credentials
   *
   * @returns Credentials statistics including counts by status and type
   */
  async getCredentialsAnalytics(): Promise<CredentialsAnalyticsDto> {
    // Get counts by status
    const statusCounts = await this.prisma.domainCredential.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    // Create a map for quick lookup
    const statusMap = new Map<CredentialStatus, number>();
    for (const status of statusCounts) {
      statusMap.set(status.status, status._count._all);
    }

    // Get counts by type
    const typeCounts = await this.prisma.domainCredential.groupBy({
      by: ['type'],
      _count: { _all: true },
    });

    const byType: CredentialTypeCountDto[] = typeCounts.map(
      (tc) =>
        new CredentialTypeCountDto({
          type: tc.type,
          count: tc._count._all,
        }),
    );

    return new CredentialsAnalyticsDto({
      pending: statusMap.get(CredentialStatus.PENDING) ?? 0,
      verified: statusMap.get(CredentialStatus.VERIFIED) ?? 0,
      rejected: statusMap.get(CredentialStatus.REJECTED) ?? 0,
      byType,
    });
  }

  /**
   * Get system health metrics for the ranking system
   *
   * @returns Score statistics and last recalculation timestamp
   */
  async getSystemHealth(): Promise<SystemHealthDto> {
    // Get aggregate statistics
    const aggregates = await this.prisma.userRank.aggregate({
      _avg: { compositeScore: true },
      _min: { compositeScore: true },
      _max: { compositeScore: true },
    });

    // Get total count for median calculation
    const totalCount = await this.prisma.userRank.count();

    // Calculate median
    let medianScore = 0;
    if (totalCount > 0) {
      // Get scores ordered for median calculation (limited for performance)
      const scores = await this.prisma.userRank.findMany({
        select: { compositeScore: true },
        orderBy: { compositeScore: 'asc' },
        take: 10000, // Limit to prevent unbounded results; approximates median for large datasets
      });

      if (scores.length > 0) {
        const midIndex = Math.floor(scores.length / 2);
        if (scores.length % 2 === 0) {
          // Even number - average of two middle values
          const lowerScore = scores[midIndex - 1];
          const upperScore = scores[midIndex];
          if (lowerScore && upperScore) {
            const lower = this.decimalToNumber(lowerScore.compositeScore);
            const upper = this.decimalToNumber(upperScore.compositeScore);
            medianScore = (lower + upper) / 2;
          }
        } else {
          // Odd number - middle value
          const midScore = scores[midIndex];
          if (midScore) {
            medianScore = this.decimalToNumber(midScore.compositeScore);
          }
        }
      }
    }

    // Get last recalculation timestamp
    const lastRank = await this.prisma.userRank.findFirst({
      orderBy: { lastCalculated: 'desc' },
      select: { lastCalculated: true },
    });

    return new SystemHealthDto({
      lastRecalculation: lastRank?.lastCalculated?.toISOString() ?? null,
      avgCompositeScore: this.decimalToNumber(aggregates._avg.compositeScore),
      minScore: this.decimalToNumber(aggregates._min.compositeScore),
      maxScore: this.decimalToNumber(aggregates._max.compositeScore),
      medianScore,
    });
  }

  /**
   * Get combined analytics data for admin dashboard
   *
   * @returns Complete analytics including tier distribution, appeals, credentials, health, and top contributors
   */
  async getAnalytics(): Promise<RankingAnalyticsDto> {
    this.logger.debug('Fetching ranking analytics');

    // Fetch all analytics in parallel
    const [tierDistribution, totalUsers, appeals, credentials, systemHealth, topContributors] =
      await Promise.all([
        this.getTierDistribution(),
        this.prisma.userRank.count(),
        this.getAppealsAnalytics(),
        this.getCredentialsAnalytics(),
        this.getSystemHealth(),
        this.rankingService.getLeaderboard({ limit: 10 }),
      ]);

    // Map top contributors to simpler format
    const mappedContributors = topContributors.map((c) => ({
      userId: c.userId,
      displayName: c.displayName,
      compositeScore: c.compositeScore,
      tierLevel: c.tierLevel,
    }));

    this.logger.debug(`Analytics fetched: ${totalUsers} total users`);

    return new RankingAnalyticsDto({
      tierDistribution,
      totalUsers,
      appeals,
      credentials,
      systemHealth,
      topContributors: mappedContributors,
    });
  }

  /**
   * Convert Prisma Decimal to number safely
   */
  private decimalToNumber(
    value: Prisma.Decimal | { toNumber: () => number } | number | null,
  ): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    if ('toNumber' in value && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    return 0;
  }
}
