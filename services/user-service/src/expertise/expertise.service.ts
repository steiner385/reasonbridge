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
   * Get a user's expertise for a specific topic tag
   *
   * @param userId - The user's unique identifier
   * @param tagId - The topic tag's unique identifier
   * @returns TopicExpertiseDto or null if no expertise record exists
   */
  async getUserExpertise(userId: string, tagId: string): Promise<TopicExpertiseDto | null> {
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
    // Note: Response model doesn't have a qualityScore field directly.
    // For now, we use a placeholder approach. In a real implementation,
    // this would come from feedback scores, endorsements, or AI analysis.
    // For this implementation, we'll query and calculate based on available data.

    const firstResponse = await this.prisma.response.findFirst({
      where: {
        authorId: userId,
        topic: {
          tags: {
            some: { tagId },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    // Calculate average quality score from feedback if available
    // For now, default to 0.5 (neutral) as a placeholder
    // TODO: Implement actual quality score calculation from response feedback
    const avgQualityScore = 0.5;

    return {
      avgQualityScore,
      firstResponseDate: firstResponse?.createdAt ?? null,
    };
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
