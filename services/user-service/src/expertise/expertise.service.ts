/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExpertiseCalculatorService } from './expertise-calculator.service.js';
import { TopicExpertiseDto } from './dto/topic-expertise.dto.js';
import { DEFAULT_EXPERTISE_LEADERBOARD_OPTIONS } from './dto/expertise-leaderboard-options.dto.js';
import type { ExpertiseLeaderboardOptions } from './dto/expertise-leaderboard-options.dto.js';
import { QUERY_LIMITS } from '../constants/index.js';

/**
 * ExpertiseService - Orchestration layer for domain expertise management
 *
 * Coordinates between PrismaService (database) and ExpertiseCalculatorService (scoring logic)
 * to provide CRUD operations for TopicExpertise records.
 *
 * @remarks
 * - Provides methods to query expertise for users and tags
 * - Supports leaderboard queries with pagination and filtering
 * - Recalculates expertise scores based on response metrics and credentials
 */
@Injectable()
export class ExpertiseService {
  private readonly logger = new Logger(ExpertiseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expertiseCalculator: ExpertiseCalculatorService,
  ) {}

  /**
   * Find a user's expertise for a specific topic tag.
   *
   * @param userId - The user's unique identifier
   * @param tagId - The topic tag's unique identifier
   * @returns TopicExpertiseDto if found, null if no expertise record exists
   */
  async findUserExpertise(userId: string, tagId: string): Promise<TopicExpertiseDto | null> {
    const expertise = await this.prisma.topicExpertise.findFirst({
      where: { userId, tagId },
      include: { tag: true },
    });

    if (!expertise) {
      return null;
    }

    return this.toTopicExpertiseDto(expertise);
  }

  /**
   * Get all expertise records for a user, ordered by score descending
   *
   * @param userId - The user's unique identifier
   * @returns Array of TopicExpertiseDto for all topics the user has expertise in
   */
  async getAllUserExpertise(userId: string): Promise<TopicExpertiseDto[]> {
    const expertises = await this.prisma.topicExpertise.findMany({
      where: { userId },
      include: { tag: true },
      orderBy: { expertiseScore: 'desc' },
      take: QUERY_LIMITS.EXPERTISE_USERS,
    });

    return expertises.map((expertise) => this.toTopicExpertiseDto(expertise));
  }

  /**
   * Get the expertise leaderboard for a specific topic tag
   *
   * @param tagId - The topic tag's unique identifier
   * @param options - Pagination and filtering options
   * @returns Array of TopicExpertiseDto sorted by expertise score descending
   */
  async getExpertiseLeaderboard(
    tagId: string,
    options: ExpertiseLeaderboardOptions = {},
  ): Promise<TopicExpertiseDto[]> {
    const {
      limit = DEFAULT_EXPERTISE_LEADERBOARD_OPTIONS.limit,
      offset = DEFAULT_EXPERTISE_LEADERBOARD_OPTIONS.offset,
      expertiseLevel,
      activeWithinDays,
    } = options;

    // Build where clause
    const where: Prisma.TopicExpertiseWhereInput = { tagId };

    if (expertiseLevel) {
      where.expertiseLevel = expertiseLevel;
    }

    if (activeWithinDays) {
      const cutoffDate = new Date(Date.now() - activeWithinDays * 24 * 60 * 60 * 1000);
      where.lastActive = { gte: cutoffDate };
    }

    const expertises = await this.prisma.topicExpertise.findMany({
      where,
      include: { tag: true },
      orderBy: { expertiseScore: 'desc' },
      take: limit,
      skip: offset,
    });

    return expertises.map((expertise) => this.toTopicExpertiseDto(expertise));
  }

  /**
   * Recalculate and update a user's expertise for a specific topic tag
   *
   * Gathers response metrics and credential boosts, calculates the new expertise score,
   * and persists the updated record.
   *
   * @param userId - The user's unique identifier
   * @param tagId - The topic tag's unique identifier
   * @returns TopicExpertiseDto with the newly calculated expertise information
   * @throws NotFoundException if the user or tag does not exist
   */
  async recalculateExpertise(userId: string, tagId: string): Promise<TopicExpertiseDto> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify tag exists
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${tagId} not found`);
    }

    // Get response count for this user in topics with this tag
    const responseCount = await this.getResponseCountForTag(userId, tagId);

    // Get average quality score and first response date
    const responseMetrics = await this.getResponseMetricsForTag(userId, tagId);

    // Get credential boosts
    const credentialBoostTotal = await this.getCredentialBoostTotal(userId, tagId);

    // Calculate days since first response
    const daysSinceFirstResponse = responseMetrics.firstResponseDate
      ? this.calculateDaysSince(responseMetrics.firstResponseDate)
      : 0;

    // Calculate expertise score using the calculator
    const expertiseScore = this.expertiseCalculator.calculateExpertiseScore({
      categoryResponseCount: responseCount,
      avgQualityScore: responseMetrics.avgQualityScore,
      credentialBoostTotal,
      daysSinceFirstResponse,
    });

    // Determine expertise level
    const expertiseLevel = this.expertiseCalculator.determineExpertiseLevel(expertiseScore);

    // Upsert the expertise record
    const now = new Date();
    const updatedExpertise = await this.prisma.topicExpertise.upsert({
      where: {
        userId_tagId: {
          userId,
          tagId,
        },
      },
      create: {
        userId,
        tagId,
        expertiseScore: new Prisma.Decimal(expertiseScore),
        expertiseLevel,
        responseCount,
        avgQualityScore: new Prisma.Decimal(responseMetrics.avgQualityScore),
        credentialBoost: new Prisma.Decimal(credentialBoostTotal),
        lastActive: now,
      },
      update: {
        expertiseScore: new Prisma.Decimal(expertiseScore),
        expertiseLevel,
        responseCount,
        avgQualityScore: new Prisma.Decimal(responseMetrics.avgQualityScore),
        credentialBoost: new Prisma.Decimal(credentialBoostTotal),
        lastActive: now,
      },
      include: { tag: true },
    });

    this.logger.log(
      `Recalculated expertise for user ${userId} in tag ${tag.name}: ` +
        `level=${expertiseLevel}, score=${expertiseScore.toFixed(3)}`,
    );

    return this.toTopicExpertiseDto(updatedExpertise);
  }

  /**
   * Get the count of responses by a user in topics with a specific tag
   */
  private async getResponseCountForTag(userId: string, tagId: string): Promise<number> {
    // Count responses where the topic has this tag
    const count = await this.prisma.response.count({
      where: {
        authorId: userId,
        topic: {
          tags: {
            some: { tagId },
          },
        },
      },
    });

    return count;
  }

  /**
   * Get aggregate response metrics for a user in topics with a specific tag
   */
  private async getResponseMetricsForTag(
    userId: string,
    tagId: string,
  ): Promise<{ avgQualityScore: number; firstResponseDate: Date | null }> {
    // Match this user's responses in topics carrying the given tag. This filter
    // is applied through the `response` relation in the aggregations below so
    // the database performs the join, instead of pulling up to
    // QUERY_LIMITS.EXPERTISE_METRICS (10k) response IDs into the app and
    // shipping them back as a SQL IN-list.
    const responseWhere: Prisma.ResponseWhereInput = {
      authorId: userId,
      topic: {
        tags: {
          some: { tagId },
        },
      },
    };

    // The earliest response date only needs one indexed row, and the quality
    // score aggregates set-based over the same filter — both run in parallel.
    const [firstResponse, avgQualityScore] = await Promise.all([
      this.prisma.response.findFirst({
        where: responseWhere,
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.calculateQualityScore(responseWhere),
    ]);

    if (!firstResponse) {
      return {
        avgQualityScore: 0.5, // Neutral default for users with no responses
        firstResponseDate: null,
      };
    }

    return {
      avgQualityScore,
      firstResponseDate: firstResponse.createdAt,
    };
  }

  /**
   * Calculate quality score from votes and feedback for a set of responses.
   *
   * The quality score is calculated as a weighted combination of:
   * - Vote ratio: upvotes / (upvotes + downvotes) - weight 0.6
   * - Feedback helpfulness: helpful / (helpful + not_helpful) - weight 0.4
   *
   * If no data is available for a signal, it defaults to 0.5 (neutral).
   *
   * @param responseWhere - Filter selecting the responses to score, applied
   *   through the `response` relation so the aggregation joins in the database
   * @returns Quality score between 0 and 1
   */
  private async calculateQualityScore(responseWhere: Prisma.ResponseWhereInput): Promise<number> {
    // Run vote and feedback aggregations in parallel, joining to the matching
    // responses via the relation filter. Empty groups fall through to the
    // neutral 0.5 defaults below.
    const [voteCounts, feedbackCounts] = await Promise.all([
      this.prisma.vote.groupBy({
        by: ['voteType'],
        where: {
          response: responseWhere,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.feedback.groupBy({
        by: ['userHelpfulRating'],
        where: {
          response: responseWhere,
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
   * Get total credential boost for a user in a specific tag
   */
  private async getCredentialBoostTotal(userId: string, tagId: string): Promise<number> {
    const credentials = await this.prisma.domainCredential.findMany({
      where: {
        userId,
        tagId,
        status: 'VERIFIED',
      },
      select: { boostValue: true },
      take: QUERY_LIMITS.EXPERTISE_TOPICS,
    });

    return credentials.reduce((total, cred) => {
      const boost = this.decimalToNumber(cred.boostValue);
      return total + boost;
    }, 0);
  }

  /**
   * Calculate days since a given date
   */
  private calculateDaysSince(date: Date): number {
    const ageMs = Date.now() - date.getTime();
    return ageMs / (1000 * 60 * 60 * 24);
  }

  /**
   * Convert database TopicExpertise to TopicExpertiseDto
   */
  private toTopicExpertiseDto(expertise: {
    userId: string;
    tagId: string;
    expertiseScore: Prisma.Decimal | { toNumber: () => number };
    expertiseLevel: string;
    responseCount: number;
    avgQualityScore: Prisma.Decimal | { toNumber: () => number };
    credentialBoost: Prisma.Decimal | { toNumber: () => number };
    lastActive: Date | null;
    tag?: { name: string } | null;
  }): TopicExpertiseDto {
    const expertiseScore = this.decimalToNumber(expertise.expertiseScore);
    const avgQualityScore = this.decimalToNumber(expertise.avgQualityScore);
    const credentialBoost = this.decimalToNumber(expertise.credentialBoost);

    return new TopicExpertiseDto({
      userId: expertise.userId,
      tagId: expertise.tagId,
      tagName: expertise.tag?.name ?? 'Unknown',
      expertiseScore,
      expertiseLevel: expertise.expertiseLevel as import('@prisma/client').ExpertiseLevel,
      responseCount: expertise.responseCount,
      avgQualityScore,
      credentialBoost,
      lastActive: expertise.lastActive,
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
