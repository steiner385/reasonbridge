/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContributionsService - Fetches user contributions across discussion entities
 *
 * Aggregates topics, responses, votes, and propositions created by a user
 * with pagination and filtering support.
 */

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { createPaginationMeta, PaginatedResponseDto } from '../dto/pagination.dto.js';
import { ContributionType, GetContributionsDto } from './dto/get-contributions.dto.js';
import { ContributionItemDto, ContributionStatsDto } from './dto/contribution-item.dto.js';

/** Maximum length for content previews */
const PREVIEW_MAX_LENGTH = 200;

/**
 * Truncate content to a preview length
 */
function truncateContent(content: string, maxLength: number = PREVIEW_MAX_LENGTH): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength - 3) + '...';
}

@Injectable()
export class ContributionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Get paginated contributions for a user
   * @param userId - The user's ID
   * @param query - Pagination and filter parameters
   * @returns Paginated list of contributions
   */
  async getContributions(
    userId: string,
    query: GetContributionsDto,
  ): Promise<PaginatedResponseDto<ContributionItemDto>> {
    const { page = 1, limit = 50, type, topicId, sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    // If type filter specified, only fetch that type
    if (type) {
      return this.getContributionsByType(userId, type, { page, limit, topicId, sortOrder });
    }

    // Otherwise, fetch all types and merge/sort
    const [topics, responses, votes, propositions] = await Promise.all([
      this.fetchTopics(userId, topicId),
      this.fetchResponses(userId, topicId),
      this.fetchVotes(userId, topicId),
      this.fetchPropositions(userId, topicId),
    ]);

    // Merge all contributions
    const allContributions = [...topics, ...responses, ...votes, ...propositions];

    // Sort by createdAt
    allContributions.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Apply pagination
    const totalItems = allContributions.length;
    const paginatedData = allContributions.slice(skip, skip + limit);

    return {
      data: paginatedData,
      pagination: createPaginationMeta(page, limit, totalItems),
    };
  }

  /**
   * Get contributions filtered by a specific type
   */
  private async getContributionsByType(
    userId: string,
    type: ContributionType,
    options: { page: number; limit: number; topicId?: string; sortOrder: 'asc' | 'desc' },
  ): Promise<PaginatedResponseDto<ContributionItemDto>> {
    const { page, limit, topicId, sortOrder } = options;
    const skip = (page - 1) * limit;

    let data: ContributionItemDto[] = [];
    let totalItems = 0;

    switch (type) {
      case ContributionType.TOPIC:
        data = await this.fetchTopics(userId, topicId, skip, limit, sortOrder);
        totalItems = await this.prisma.discussionTopic.count({ where: { creatorId: userId } });
        break;
      case ContributionType.RESPONSE:
        data = await this.fetchResponses(userId, topicId, skip, limit, sortOrder);
        totalItems = await this.prisma.response.count({
          where: { authorId: userId, ...(topicId ? { topicId } : {}) },
        });
        break;
      case ContributionType.VOTE:
        data = await this.fetchVotes(userId, topicId, skip, limit, sortOrder);
        totalItems = await this.prisma.vote.count({ where: { userId } });
        break;
      case ContributionType.PROPOSITION:
        data = await this.fetchPropositions(userId, topicId, skip, limit, sortOrder);
        totalItems = await this.prisma.proposition.count({ where: { creatorId: userId } });
        break;
    }

    return {
      data,
      pagination: createPaginationMeta(page, limit, totalItems),
    };
  }

  /**
   * Fetch topics created by user
   */
  private async fetchTopics(
    userId: string,
    _topicId?: string,
    skip?: number,
    take?: number,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<ContributionItemDto[]> {
    const topics = await this.prisma.discussionTopic.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { createdAt: sortOrder },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });

    return topics.map(
      (topic: {
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        _count: { responses: number };
      }) => ({
        id: topic.id,
        type: ContributionType.TOPIC,
        createdAt: topic.createdAt,
        contentPreview: truncateContent(topic.title),
        topic: {
          id: topic.id,
          title: topic.title,
          status: topic.status,
        },
        replyCount: topic._count.responses,
      }),
    );
  }

  /**
   * Fetch responses posted by user
   */
  private async fetchResponses(
    userId: string,
    topicId?: string,
    skip?: number,
    take?: number,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<ContributionItemDto[]> {
    const responses = await this.prisma.response.findMany({
      where: {
        authorId: userId,
        ...(topicId ? { topicId } : {}),
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        topic: {
          select: { id: true, title: true, status: true },
        },
        votes: {
          select: { voteType: true },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: sortOrder },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });

    return responses.map((response) => {
      const upvoteCount = response.votes.filter((v) => v.voteType === 'UPVOTE').length;
      const downvoteCount = response.votes.filter((v) => v.voteType === 'DOWNVOTE').length;
      return {
        id: response.id,
        type: ContributionType.RESPONSE,
        createdAt: response.createdAt,
        contentPreview: truncateContent(response.content),
        topic: {
          id: response.topic.id,
          title: response.topic.title,
          status: response.topic.status,
        },
        upvoteCount,
        downvoteCount,
        replyCount: response._count.replies,
      };
    });
  }

  /**
   * Fetch votes cast by user
   */
  private async fetchVotes(
    userId: string,
    topicId?: string,
    skip?: number,
    take?: number,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<ContributionItemDto[]> {
    const votes = await this.prisma.vote.findMany({
      where: {
        userId,
        ...(topicId
          ? {
              response: { topicId },
            }
          : {}),
      },
      select: {
        id: true,
        voteType: true,
        createdAt: true,
        responseId: true,
        response: {
          select: {
            content: true,
            topic: {
              select: { id: true, title: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: sortOrder },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });

    return votes.map((vote) => ({
      id: vote.id,
      type: ContributionType.VOTE,
      createdAt: vote.createdAt,
      responseId: vote.responseId,
      voteDirection: vote.voteType === 'UPVOTE' ? 'UP' : 'DOWN',
      contentPreview: truncateContent(vote.response.content),
      topic: {
        id: vote.response.topic.id,
        title: vote.response.topic.title,
        status: vote.response.topic.status,
      },
    }));
  }

  /**
   * Fetch propositions made by user
   */
  private async fetchPropositions(
    userId: string,
    topicId?: string,
    skip?: number,
    take?: number,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<ContributionItemDto[]> {
    const propositions = await this.prisma.proposition.findMany({
      where: {
        creatorId: userId,
        ...(topicId ? { topicId } : {}),
      },
      select: {
        id: true,
        statement: true,
        createdAt: true,
        topic: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: sortOrder },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    });

    return propositions.map((prop) => ({
      id: prop.id,
      type: ContributionType.PROPOSITION,
      createdAt: prop.createdAt,
      // responseId is undefined for propositions (optional field in DTO)
      propositionText: prop.statement,
      contentPreview: truncateContent(prop.statement),
      topic: {
        id: prop.topic.id,
        title: prop.topic.title,
        status: prop.topic.status,
      },
    }));
  }

  /**
   * Get contribution statistics for a user
   * @param userId - The user's ID
   * @returns Count of each contribution type
   */
  async getContributionStats(userId: string): Promise<ContributionStatsDto> {
    const [topicCount, responseCount, voteCount, propositionCount] = await Promise.all([
      this.prisma.discussionTopic.count({ where: { creatorId: userId } }),
      this.prisma.response.count({ where: { authorId: userId } }),
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
}
