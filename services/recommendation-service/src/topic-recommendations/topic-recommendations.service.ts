/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  GetTopicRecommendationsDto,
  GetSimilarTopicsDto,
  GetTrendingTopicsDto,
  TopicRecommendationsResponseDto,
  TopicRecommendationDto,
  SimilarTopicsResponseDto,
  SimilarTopicDto,
  TrendingTopicsResponseDto,
  TrendingTopicDto,
  TagInfo,
} from './dto/topic-recommendation.dto.js';

/**
 * Service for generating topic recommendations for creators.
 * Helps users discover similar topics, trending discussions, and
 * relevant content when creating new topics.
 */
@Injectable()
export class TopicRecommendationsService {
  private readonly logger = new Logger(TopicRecommendationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get topic recommendations based on query and tags.
   * Useful when a creator is drafting a new topic.
   */
  async getRecommendations(
    dto: GetTopicRecommendationsDto,
  ): Promise<TopicRecommendationsResponseDto> {
    const { query, tags, limit = 10 } = dto;

    // Build the where clause
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      visibility: 'PUBLIC',
    };

    // Text search on title and description
    if (query) {
      where['OR'] = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      where['tags'] = {
        some: {
          tag: {
            OR: [
              { name: { in: tags.map((t) => t.toLowerCase()) } },
              { slug: { in: tags.map((t) => t.toLowerCase()) } },
            ],
          },
        },
      };
    }

    // Get matching topics
    const [topics, total] = await Promise.all([
      this.prisma.discussionTopic.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: [
          { responseCount: 'desc' },
          { participantCount: 'desc' },
          { lastActivityAt: 'desc' },
        ],
        take: limit,
      }),
      this.prisma.discussionTopic.count({ where }),
    ]);

    // Calculate scores and format recommendations
    const recommendations: TopicRecommendationDto[] = topics.map((topic, index) => {
      const score = this.calculateRecommendationScore(topic, query, tags);
      const reason = this.generateRecommendationReason(topic, query, tags);

      return {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        participantCount: topic.participantCount,
        responseCount: topic.responseCount,
        activityLevel: topic.activityLevel as 'LOW' | 'MEDIUM' | 'HIGH',
        tags: topic.tags.map((tt) => ({
          id: tt.tag.id,
          name: tt.tag.name,
          slug: tt.tag.slug,
        })),
        score,
        reason,
        createdAt: topic.createdAt.toISOString(),
        lastActivityAt: topic.lastActivityAt.toISOString(),
      };
    });

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    return {
      recommendations,
      total,
      query,
      tags,
    };
  }

  /**
   * Find topics similar to a given topic.
   * Useful for detecting potential duplicates or related discussions.
   */
  async getSimilarTopics(dto: GetSimilarTopicsDto): Promise<SimilarTopicsResponseDto> {
    const { topicId, limit = 5 } = dto;

    // Get the source topic
    const sourceTopic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!sourceTopic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    const sourceTagIds = sourceTopic.tags.map((tt) => tt.tag.id);
    const sourceTagNames = sourceTopic.tags.map((tt) => tt.tag.name);

    // Find topics with overlapping tags (excluding the source topic)
    const similarTopics = await this.prisma.discussionTopic.findMany({
      where: {
        id: { not: topicId },
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        tags: {
          some: {
            tagId: { in: sourceTagIds },
          },
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ responseCount: 'desc' }, { lastActivityAt: 'desc' }],
      take: limit * 2, // Get more to filter and rank
    });

    // Calculate similarity scores
    const scoredTopics: SimilarTopicDto[] = similarTopics.map((topic) => {
      const topicTagNames = topic.tags.map((tt) => tt.tag.name);
      const sharedTags = topicTagNames.filter((name) => sourceTagNames.includes(name));
      const similarityScore = this.calculateTagSimilarity(sourceTagNames, topicTagNames);

      return {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        tags: topic.tags.map((tt) => ({
          id: tt.tag.id,
          name: tt.tag.name,
          slug: tt.tag.slug,
        })),
        similarityScore,
        sharedTags,
      };
    });

    // Sort by similarity and take top results
    scoredTopics.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      sourceTopicId: topicId,
      similarTopics: scoredTopics.slice(0, limit),
    };
  }

  /**
   * Get trending topics within a time window.
   * Useful for showing creators what's popular.
   */
  async getTrendingTopics(dto: GetTrendingTopicsDto): Promise<TrendingTopicsResponseDto> {
    const { hours = 24, limit = 10, tags } = dto;

    const timeWindowStart = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      lastActivityAt: { gte: timeWindowStart },
    };

    if (tags && tags.length > 0) {
      where['tags'] = {
        some: {
          tag: {
            OR: [
              { name: { in: tags.map((t) => t.toLowerCase()) } },
              { slug: { in: tags.map((t) => t.toLowerCase()) } },
            ],
          },
        },
      };
    }

    // Get topics with recent activity
    const topics = await this.prisma.discussionTopic.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            responses: {
              where: {
                createdAt: { gte: timeWindowStart },
              },
            },
          },
        },
      },
      orderBy: [{ responseCount: 'desc' }, { participantCount: 'desc' }],
      take: limit * 2, // Get more to calculate scores
    });

    // Calculate trending scores
    const trendingTopics: TrendingTopicDto[] = topics.map((topic) => {
      const recentResponseCount = (topic._count as { responses: number }).responses;
      const trendingScore = this.calculateTrendingScore(
        recentResponseCount,
        topic.participantCount,
        topic.lastActivityAt,
        timeWindowStart,
      );

      return {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        tags: topic.tags.map((tt) => ({
          id: tt.tag.id,
          name: tt.tag.name,
          slug: tt.tag.slug,
        })),
        recentResponseCount,
        recentParticipantCount: topic.participantCount,
        trendingScore,
        rank: 0, // Will be set after sorting
      };
    });

    // Sort by trending score and assign ranks
    trendingTopics.sort((a, b) => b.trendingScore - a.trendingScore);
    const rankedTopics = trendingTopics.slice(0, limit).map((topic, index) => ({
      ...topic,
      rank: index + 1,
    }));

    return {
      topics: rankedTopics,
      timeWindowHours: hours,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate a recommendation score for a topic.
   */
  private calculateRecommendationScore(
    topic: { responseCount: number; participantCount: number; activityLevel: string },
    query?: string,
    tags?: string[],
  ): number {
    let score = 0;

    // Base score from engagement
    score += Math.min(topic.responseCount / 100, 0.3); // Max 0.3 from responses
    score += Math.min(topic.participantCount / 50, 0.2); // Max 0.2 from participants

    // Activity level bonus
    if (topic.activityLevel === 'HIGH') score += 0.2;
    else if (topic.activityLevel === 'MEDIUM') score += 0.1;

    // Query match bonus (if query provided)
    if (query) score += 0.15;

    // Tag match bonus (if tags provided)
    if (tags && tags.length > 0) score += 0.15;

    return Math.min(score, 1); // Cap at 1
  }

  /**
   * Generate a human-readable reason for the recommendation.
   */
  private generateRecommendationReason(
    topic: { responseCount: number; participantCount: number; activityLevel: string },
    query?: string,
    tags?: string[],
  ): string {
    const reasons: string[] = [];

    if (query) {
      reasons.push('matches your search');
    }

    if (tags && tags.length > 0) {
      reasons.push(`shares tags: ${tags.slice(0, 3).join(', ')}`);
    }

    if (topic.activityLevel === 'HIGH') {
      reasons.push('highly active discussion');
    } else if (topic.responseCount > 20) {
      reasons.push('active discussion');
    }

    if (topic.participantCount > 10) {
      reasons.push('diverse perspectives');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'relevant to your interests';
  }

  /**
   * Calculate tag-based similarity between two topics.
   * Uses Jaccard similarity coefficient.
   */
  private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 || tags2.length === 0) return 0;

    const set1 = new Set(tags1.map((t) => t.toLowerCase()));
    const set2 = new Set(tags2.map((t) => t.toLowerCase()));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate a trending score based on recent activity.
   */
  private calculateTrendingScore(
    recentResponses: number,
    participantCount: number,
    lastActivity: Date,
    windowStart: Date,
  ): number {
    // Recent activity weight
    const responseScore = Math.log2(recentResponses + 1) * 0.4;

    // Participant diversity weight
    const participantScore = Math.log2(participantCount + 1) * 0.3;

    // Recency weight (more recent = higher score)
    const recencyMs = lastActivity.getTime() - windowStart.getTime();
    const windowMs = Date.now() - windowStart.getTime();
    const recencyScore = (recencyMs / windowMs) * 0.3;

    return responseScore + participantScore + recencyScore;
  }
}
