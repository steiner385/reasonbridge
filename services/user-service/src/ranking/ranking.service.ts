/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RankingCalculatorService } from './ranking-calculator.service.js';
import type { CompositeScoreInput } from './ranking-calculator.service.js';
import { TrustScoreCalculator } from '../services/trust-score.calculator.js';
import { UserRankDto } from './dto/user-rank.dto.js';
import { DEFAULT_LEADERBOARD_OPTIONS } from './dto/leaderboard-options.dto.js';
import type { LeaderboardOptions } from './dto/leaderboard-options.dto.js';

/**
 * Maximum age (in hours) before a cached rank is considered stale and needs recalculation
 */
const RANK_CACHE_TTL_HOURS = 24;

/**
 * Maximum responses to count for engagement score (beyond this, score is 1.0)
 */
const MAX_ENGAGEMENT_RESPONSES = 100;

/**
 * RankingService - Orchestration layer for user ranking management
 *
 * Coordinates between PrismaService (database), RankingCalculatorService (scoring logic),
 * and TrustScoreCalculator (trust metrics) to provide a complete ranking system.
 *
 * @remarks
 * - Caches calculated ranks for 24 hours to reduce computation
 * - Automatically recalculates stale ranks on read
 * - Supports leaderboard queries with pagination and filtering
 */
@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingCalculator: RankingCalculatorService,
    private readonly trustScoreCalculator: TrustScoreCalculator,
  ) {}

  /**
   * Get a user's rank, returning cached version if recent or recalculating if stale
   *
   * @param userId - The user's unique identifier
   * @returns UserRankDto with the user's current ranking information
   * @throws NotFoundException if the user does not exist
   */
  async getUserRank(userId: string): Promise<UserRankDto> {
    // Try to get existing rank with user data
    const existingRank = await this.prisma.userRank.findUnique({
      where: { userId },
      include: { user: true },
    });

    // If rank exists and is recent, return cached version
    if (existingRank && this.isRankRecent(existingRank.lastCalculated)) {
      return this.toUserRankDto(existingRank);
    }

    // If no rank or stale, recalculate
    return this.recalculateUserRank(userId);
  }

  /**
   * Force recalculation of a user's rank
   *
   * @param userId - The user's unique identifier
   * @returns UserRankDto with the newly calculated ranking information
   * @throws NotFoundException if the user does not exist
   */
  async recalculateUserRank(userId: string): Promise<UserRankDto> {
    // Fetch user with trust scores
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Calculate trust average
    const trustAverage = this.calculateTrustAverage(user);

    // Get engagement metrics
    const responseCount = await this.prisma.response.count({
      where: { authorId: userId },
    });

    // Calculate engagement score (0-1 scale, maxes out at MAX_ENGAGEMENT_RESPONSES)
    const engagementScore = Math.min(1, responseCount / MAX_ENGAGEMENT_RESPONSES);

    // Calculate quality score from response votes and feedback
    const qualityScore = await this.calculateQualityScore(userId);

    // Calculate account age in days
    const accountAgeDays = this.calculateAccountAgeDays(user.createdAt);

    // Calculate tenure bonus (0-1, scales linearly to 1 year)
    const tenureBonus = Math.min(1, accountAgeDays / 365);

    // Prepare input for composite score calculation
    const input: CompositeScoreInput = {
      trustAverage,
      verificationLevel: user.verificationLevel as 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN',
      engagementScore,
      qualityScore,
      accountAgeDays,
    };

    // Calculate composite score and determine tier
    const compositeScore = this.rankingCalculator.calculateCompositeScore(input);
    const tierLevel = this.rankingCalculator.determineTierLevel(compositeScore);
    const nextTierThreshold = this.rankingCalculator.getNextTierThreshold(tierLevel);

    // Upsert the rank record
    const now = new Date();
    const updatedRank = await this.prisma.userRank.upsert({
      where: { userId },
      create: {
        userId,
        tierLevel,
        compositeScore: new Prisma.Decimal(compositeScore),
        engagementScore: new Prisma.Decimal(engagementScore),
        qualityScore: new Prisma.Decimal(qualityScore),
        tenureBonus: new Prisma.Decimal(tenureBonus),
        nextTierThreshold: new Prisma.Decimal(nextTierThreshold),
        badges: [],
        lastCalculated: now,
        lastActivityAt: now,
      },
      update: {
        tierLevel,
        compositeScore: new Prisma.Decimal(compositeScore),
        engagementScore: new Prisma.Decimal(engagementScore),
        qualityScore: new Prisma.Decimal(qualityScore),
        tenureBonus: new Prisma.Decimal(tenureBonus),
        nextTierThreshold: new Prisma.Decimal(nextTierThreshold),
        lastCalculated: now,
        lastActivityAt: now,
      },
      include: { user: true },
    });

    this.logger.log(
      `Recalculated rank for user ${userId}: tier=${tierLevel}, score=${compositeScore.toFixed(3)}`,
    );

    return this.toUserRankDto(updatedRank);
  }

  /**
   * Get the leaderboard of top users
   *
   * @param options - Pagination and filtering options
   * @returns Array of UserRankDto sorted by composite score descending
   */
  async getLeaderboard(options: LeaderboardOptions = {}): Promise<UserRankDto[]> {
    const {
      limit = DEFAULT_LEADERBOARD_OPTIONS.limit,
      offset = DEFAULT_LEADERBOARD_OPTIONS.offset,
      tierLevel,
      activeWithinDays,
    } = options;

    // Build where clause
    const where: Prisma.UserRankWhereInput = {};

    if (tierLevel) {
      where.tierLevel = tierLevel;
    }

    if (activeWithinDays) {
      const cutoffDate = new Date(Date.now() - activeWithinDays * 24 * 60 * 60 * 1000);
      where.lastActivityAt = { gte: cutoffDate };
    }

    const ranks = await this.prisma.userRank.findMany({
      where,
      include: { user: true },
      orderBy: { compositeScore: 'desc' },
      take: limit,
      skip: offset,
    });

    return ranks.map((rank) => this.toUserRankDto(rank));
  }

  /**
   * Check if a cached rank is still recent (within TTL)
   */
  private isRankRecent(lastCalculated: Date): boolean {
    const ageMs = Date.now() - lastCalculated.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    return ageHours < RANK_CACHE_TTL_HOURS;
  }

  /**
   * Calculate trust average from user's ABI trust scores
   */
  private calculateTrustAverage(user: {
    trustScoreAbility: Prisma.Decimal;
    trustScoreBenevolence: Prisma.Decimal;
    trustScoreIntegrity: Prisma.Decimal;
  }): number {
    const ability = this.trustScoreCalculator.decimalToNumber(user.trustScoreAbility);
    const benevolence = this.trustScoreCalculator.decimalToNumber(user.trustScoreBenevolence);
    const integrity = this.trustScoreCalculator.decimalToNumber(user.trustScoreIntegrity);

    // If all scores are 0, use TrustScoreCalculator to generate initial scores
    if (ability === 0 && benevolence === 0 && integrity === 0) {
      // For users without trust scores, we still want a reasonable baseline
      // Return default value (would be calculated by TrustScoreCalculator in real scenario)
      return 0.5;
    }

    return (ability + benevolence + integrity) / 3;
  }

  /**
   * Calculate account age in days
   */
  private calculateAccountAgeDays(createdAt: Date): number {
    const ageMs = Date.now() - createdAt.getTime();
    return ageMs / (1000 * 60 * 60 * 24);
  }

  /**
   * Calculate quality score from votes and feedback for all user responses.
   *
   * The quality score is calculated as a weighted combination of:
   * - Vote ratio: upvotes / (upvotes + downvotes) - weight 0.6
   * - Feedback helpfulness: helpful / (helpful + not_helpful) - weight 0.4
   *
   * If no data is available for a signal, it defaults to 0.5 (neutral).
   *
   * Uses parallel queries for votes and feedback to reduce latency by ~33%
   * (2 sequential queries instead of 3).
   *
   * @param userId - The user's unique identifier
   * @returns Quality score between 0 and 1
   */
  private async calculateQualityScore(userId: string): Promise<number> {
    // Get response IDs for this user (required for subsequent queries)
    const responses = await this.prisma.response.findMany({
      where: { authorId: userId },
      select: { id: true },
      take: 10000, // Limit to prevent unbounded results while allowing accurate metrics
    });

    if (responses.length === 0) {
      return 0.5; // Neutral default for users with no responses
    }

    const responseIds = responses.map((r) => r.id);

    // Run vote and feedback queries in parallel (both depend on responseIds)
    const [voteCounts, feedbackCounts] = await Promise.all([
      this.prisma.vote.groupBy({
        by: ['voteType'],
        where: {
          responseId: { in: responseIds },
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.feedback.groupBy({
        by: ['userHelpfulRating'],
        where: {
          responseId: { in: responseIds },
          userHelpfulRating: { not: null },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    let upvotes = 0;
    let downvotes = 0;
    for (const vc of voteCounts) {
      if (vc.voteType === 'UPVOTE') {
        upvotes = vc._count.id;
      } else if (vc.voteType === 'DOWNVOTE') {
        downvotes = vc._count.id;
      }
    }

    let helpful = 0;
    let notHelpful = 0;
    for (const fc of feedbackCounts) {
      if (fc.userHelpfulRating === 'HELPFUL') {
        helpful = fc._count.id;
      } else if (fc.userHelpfulRating === 'NOT_HELPFUL') {
        notHelpful = fc._count.id;
      }
    }

    // Calculate vote ratio (0.5 default if no votes)
    const totalVotes = upvotes + downvotes;
    const voteRatio = totalVotes > 0 ? upvotes / totalVotes : 0.5;

    // Calculate feedback ratio (0.5 default if no feedback)
    const totalFeedback = helpful + notHelpful;
    const feedbackRatio = totalFeedback > 0 ? helpful / totalFeedback : 0.5;

    // Weighted combination: votes (60%), feedback (40%)
    // This weights community votes more heavily than AI feedback helpfulness
    const qualityScore = voteRatio * 0.6 + feedbackRatio * 0.4;

    return qualityScore;
  }

  /**
   * Convert database UserRank to UserRankDto
   */
  private toUserRankDto(rank: {
    userId: string;
    tierLevel: string;
    compositeScore: Prisma.Decimal | { toNumber: () => number };
    engagementScore: Prisma.Decimal | { toNumber: () => number };
    qualityScore: Prisma.Decimal | { toNumber: () => number };
    tenureBonus: Prisma.Decimal | { toNumber: () => number };
    nextTierThreshold: Prisma.Decimal | { toNumber: () => number };
    badges: unknown;
    lastCalculated: Date;
    lastActivityAt: Date | null;
    user?: { displayName: string | null } | null;
  }): UserRankDto {
    const compositeScore = this.decimalToNumber(rank.compositeScore);
    const engagementScore = this.decimalToNumber(rank.engagementScore);
    const qualityScore = this.decimalToNumber(rank.qualityScore);
    const tenureBonus = this.decimalToNumber(rank.tenureBonus);
    const nextTierThreshold = this.decimalToNumber(rank.nextTierThreshold);

    // Handle badges - could be string[], JSON, or unknown
    let badges: string[] = [];
    if (Array.isArray(rank.badges)) {
      badges = rank.badges as string[];
    } else if (typeof rank.badges === 'string') {
      try {
        badges = JSON.parse(rank.badges);
      } catch {
        badges = [];
      }
    }

    return new UserRankDto({
      userId: rank.userId,
      displayName: rank.user?.displayName ?? null,
      compositeScore,
      tierLevel: rank.tierLevel as import('@prisma/client').TierLevel,
      nextTierThreshold,
      engagementScore,
      qualityScore,
      tenureBonus,
      badges,
      lastCalculated: rank.lastCalculated,
      lastActivityAt: rank.lastActivityAt,
    });
  }

  /**
   * Convert Prisma Decimal to number
   */
  private decimalToNumber(value: Prisma.Decimal | { toNumber: () => number } | number): number {
    if (typeof value === 'number') {
      return value;
    }
    if ('toNumber' in value && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    return 0;
  }
}
