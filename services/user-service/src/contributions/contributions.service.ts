/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ContributionType,
  ContributionItemDto,
  ContributionStatsDto,
  ContributionsResponseDto,
} from './dto/contribution.dto.js';

/**
 * Query parameters for fetching contributions
 */
export interface ContributionsQueryParams {
  page?: number;
  limit?: number;
  type?: ContributionType;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Service for fetching user contributions (topics, responses, votes, propositions)
 */
@Injectable()
export class ContributionsService {
  private readonly logger = new Logger(ContributionsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Get paginated contributions for a user
   */
  async getContributions(
    userId: string,
    params: ContributionsQueryParams = {},
  ): Promise<ContributionsResponseDto> {
    const { page = 1, limit = 20, type, sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;
    const orderBy = sortOrder === 'asc' ? 'asc' : 'desc';

    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Build contribution items based on type filter
    const contributions: ContributionItemDto[] = [];
    let totalItems = 0;

    if (!type || type === 'TOPIC') {
      const [topics, topicCount] = await this.fetchTopics(userId, skip, limit, orderBy, !type);
      contributions.push(...topics);
      totalItems += topicCount;
    }

    if (!type || type === 'RESPONSE') {
      const [responses, responseCount] = await this.fetchResponses(
        userId,
        skip,
        limit,
        orderBy,
        !type,
      );
      contributions.push(...responses);
      totalItems += responseCount;
    }

    if (!type || type === 'VOTE') {
      const [votes, voteCount] = await this.fetchVotes(userId, skip, limit, orderBy, !type);
      contributions.push(...votes);
      totalItems += voteCount;
    }

    if (!type || type === 'PROPOSITION') {
      const [propositions, propositionCount] = await this.fetchPropositions(
        userId,
        skip,
        limit,
        orderBy,
        !type,
      );
      contributions.push(...propositions);
      totalItems += propositionCount;
    }

    // Sort all contributions by date if no specific type filter
    if (!type) {
      contributions.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return orderBy === 'desc' ? dateB - dateA : dateA - dateB;
      });
      // Apply pagination after sorting
      const paginatedData = contributions.slice(0, limit);

      const totalPages = Math.ceil(totalItems / limit);
      return {
        data: paginatedData,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }

    // For specific type, totalItems is already correct
    const totalPages = Math.ceil(totalItems / limit);
    return {
      data: contributions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get contribution statistics for a user
   */
  async getContributionStats(userId: string): Promise<ContributionStatsDto> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const [topicCount, responseCount, voteCount, propositionCount] = await Promise.all([
      this.prisma.discussionTopic.count({ where: { creatorId: userId } }),
      this.prisma.response.count({ where: { authorId: userId, deletedAt: null } }),
      this.prisma.vote.count({ where: { userId } }),
      this.prisma.proposition.count({ where: { creatorId: userId } }),
    ]);

    return {
      topicCount,
      responseCount,
      voteCount,
      propositionCount,
    };
  }

  /**
   * Fetch topics created by user
   */
  private async fetchTopics(
    userId: string,
    skip: number,
    take: number,
    orderBy: 'asc' | 'desc',
    countOnly: boolean,
  ): Promise<[ContributionItemDto[], number]> {
    const count = await this.prisma.discussionTopic.count({ where: { creatorId: userId } });

    if (countOnly && skip > 0) {
      return [[], count];
    }

    const topics = await this.prisma.discussionTopic.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: orderBy },
      skip: countOnly ? 0 : skip,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        responseCount: true,
      },
    });

    const items: ContributionItemDto[] = topics.map((topic) => ({
      id: topic.id,
      type: 'TOPIC' as const,
      createdAt: topic.createdAt,
      contentPreview: topic.description.substring(0, 200),
      topic: {
        id: topic.id,
        title: topic.title,
        status: topic.status,
      },
      replyCount: topic.responseCount,
    }));

    return [items, count];
  }

  /**
   * Fetch responses authored by user
   */
  private async fetchResponses(
    userId: string,
    skip: number,
    take: number,
    orderBy: 'asc' | 'desc',
    countOnly: boolean,
  ): Promise<[ContributionItemDto[], number]> {
    const count = await this.prisma.response.count({
      where: { authorId: userId, deletedAt: null },
    });

    if (countOnly && skip > 0) {
      return [[], count];
    }

    const responses = await this.prisma.response.findMany({
      where: { authorId: userId, deletedAt: null },
      orderBy: { createdAt: orderBy },
      skip: countOnly ? 0 : skip,
      take,
      select: {
        id: true,
        content: true,
        createdAt: true,
        topic: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Get vote counts for responses
    const responseIds = responses.map((r) => r.id);
    const voteCounts = await this.getVoteCountsForResponses(responseIds);

    const items: ContributionItemDto[] = responses.map((response) => ({
      id: response.id,
      type: 'RESPONSE' as const,
      createdAt: response.createdAt,
      contentPreview: response.content.substring(0, 200),
      topic: response.topic
        ? {
            id: response.topic.id,
            title: response.topic.title,
            status: response.topic.status,
          }
        : undefined,
      replyCount: response._count.replies,
      upvoteCount: voteCounts.get(response.id)?.upvotes ?? 0,
      downvoteCount: voteCounts.get(response.id)?.downvotes ?? 0,
    }));

    return [items, count];
  }

  /**
   * Fetch votes cast by user
   */
  private async fetchVotes(
    userId: string,
    skip: number,
    take: number,
    orderBy: 'asc' | 'desc',
    countOnly: boolean,
  ): Promise<[ContributionItemDto[], number]> {
    const count = await this.prisma.vote.count({ where: { userId } });

    if (countOnly && skip > 0) {
      return [[], count];
    }

    const votes = await this.prisma.vote.findMany({
      where: { userId },
      orderBy: { createdAt: orderBy },
      skip: countOnly ? 0 : skip,
      take,
      select: {
        id: true,
        voteType: true,
        createdAt: true,
        responseId: true,
        response: {
          select: {
            content: true,
            topic: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const items: ContributionItemDto[] = votes.map((vote) => ({
      id: vote.id,
      type: 'VOTE' as const,
      createdAt: vote.createdAt,
      responseId: vote.responseId,
      voteDirection: vote.voteType === 'UPVOTE' ? 'UP' : 'DOWN',
      contentPreview: vote.response.content.substring(0, 200),
      topic: vote.response.topic
        ? {
            id: vote.response.topic.id,
            title: vote.response.topic.title,
            status: vote.response.topic.status,
          }
        : undefined,
    }));

    return [items, count];
  }

  /**
   * Fetch propositions created by user
   */
  private async fetchPropositions(
    userId: string,
    skip: number,
    take: number,
    orderBy: 'asc' | 'desc',
    countOnly: boolean,
  ): Promise<[ContributionItemDto[], number]> {
    const count = await this.prisma.proposition.count({ where: { creatorId: userId } });

    if (countOnly && skip > 0) {
      return [[], count];
    }

    const propositions = await this.prisma.proposition.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: orderBy },
      skip: countOnly ? 0 : skip,
      take,
      select: {
        id: true,
        statement: true,
        createdAt: true,
        supportCount: true,
        opposeCount: true,
        topic: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    const items: ContributionItemDto[] = propositions.map((prop) => ({
      id: prop.id,
      type: 'PROPOSITION' as const,
      createdAt: prop.createdAt,
      propositionText: prop.statement,
      contentPreview: prop.statement.substring(0, 200),
      topic: {
        id: prop.topic.id,
        title: prop.topic.title,
        status: prop.topic.status,
      },
      upvoteCount: prop.supportCount,
      downvoteCount: prop.opposeCount,
    }));

    return [items, count];
  }

  /**
   * Get vote counts for a list of response IDs
   */
  private async getVoteCountsForResponses(
    responseIds: string[],
  ): Promise<Map<string, { upvotes: number; downvotes: number }>> {
    if (responseIds.length === 0) {
      return new Map();
    }

    const votes = await this.prisma.vote.groupBy({
      by: ['responseId', 'voteType'],
      where: { responseId: { in: responseIds } },
      _count: true,
    });

    const result = new Map<string, { upvotes: number; downvotes: number }>();
    for (const vote of votes) {
      const current = result.get(vote.responseId) ?? { upvotes: 0, downvotes: 0 };
      if (vote.voteType === 'UPVOTE') {
        current.upvotes = vote._count;
      } else {
        current.downvotes = vote._count;
      }
      result.set(vote.responseId, current);
    }

    return result;
  }
}
