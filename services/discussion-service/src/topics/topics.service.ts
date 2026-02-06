/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetTopicsQueryDto } from './dto/get-topics-query.dto.js';
import { SearchTopicsQueryDto } from './dto/search-topics-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getTopics(query: GetTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    const {
      status,
      creatorId,
      tag,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: Prisma.DiscussionTopicWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            OR: [
              { name: { contains: tag, mode: 'insensitive' } },
              { slug: { contains: tag, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    // Build orderBy clause
    const orderBy: Prisma.DiscussionTopicOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [topics, total] = await Promise.all([
      this.prisma.discussionTopic.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.discussionTopic.count({ where }),
    ]);

    // Map to DTOs
    const data: TopicResponseDto[] = topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      creatorId: topic.creatorId,
      status: topic.status,
      evidenceStandards: topic.evidenceStandards,
      minimumDiversityScore: topic.minimumDiversityScore.toNumber(),
      currentDiversityScore: topic.currentDiversityScore?.toNumber() ?? null,
      participantCount: topic.participantCount,
      responseCount: topic.responseCount,
      crossCuttingThemes: topic.crossCuttingThemes,
      createdAt: topic.createdAt,
      activatedAt: topic.activatedAt,
      archivedAt: topic.archivedAt,
      tags: topic.tags.map((tt) => tt.tag),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTopicById(id: string): Promise<TopicResponseDto> {
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      creatorId: topic.creatorId,
      status: topic.status,
      evidenceStandards: topic.evidenceStandards,
      minimumDiversityScore: topic.minimumDiversityScore.toNumber(),
      currentDiversityScore: topic.currentDiversityScore?.toNumber() ?? null,
      participantCount: topic.participantCount,
      responseCount: topic.responseCount,
      crossCuttingThemes: topic.crossCuttingThemes,
      createdAt: topic.createdAt,
      activatedAt: topic.activatedAt,
      archivedAt: topic.archivedAt,
      tags: topic.tags.map((tt) => tt.tag),
    };
  }

  async searchTopics(query: SearchTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    const { q, page = 1, limit = 20 } = query;

    // Build where clause for search
    const where: Prisma.DiscussionTopicWhereInput = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [topics, total] = await Promise.all([
      this.prisma.discussionTopic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.discussionTopic.count({ where }),
    ]);

    // Map to DTOs
    const data: TopicResponseDto[] = topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      creatorId: topic.creatorId,
      status: topic.status,
      evidenceStandards: topic.evidenceStandards,
      minimumDiversityScore: topic.minimumDiversityScore.toNumber(),
      currentDiversityScore: topic.currentDiversityScore?.toNumber() ?? null,
      participantCount: topic.participantCount,
      responseCount: topic.responseCount,
      crossCuttingThemes: topic.crossCuttingThemes,
      createdAt: topic.createdAt,
      activatedAt: topic.activatedAt,
      archivedAt: topic.archivedAt,
      tags: topic.tags.map((tt) => tt.tag),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCommonGroundAnalysis(
    topicId: string,
    version?: number,
  ): Promise<CommonGroundResponseDto> {
    // Generate cache key based on whether a specific version is requested
    const cacheKey = version
      ? `common-ground:topic:${topicId}:v${version}`
      : `common-ground:topic:${topicId}:latest`;

    // Try to get from cache first
    const cached = await this.cacheManager.get<CommonGroundResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // First verify the topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Fetch the analysis - either specific version or latest
    const where = version ? { topicId, version } : { topicId };
    const orderBy = version ? {} : { version: 'desc' as const };

    const analysis = await this.prisma.commonGroundAnalysis.findFirst({
      where,
      orderBy,
    });

    if (!analysis) {
      throw new NotFoundException(
        version
          ? `Common ground analysis version ${version} not found for topic ${topicId}`
          : `No common ground analysis found for topic ${topicId}`,
      );
    }

    // Map database model to DTO
    const result: CommonGroundResponseDto = {
      id: analysis.id,
      version: analysis.version,
      agreementZones: analysis.agreementZones as any,
      misunderstandings: analysis.misunderstandings as any,
      genuineDisagreements: analysis.genuineDisagreements as any,
      overallConsensusScore: analysis.overallConsensusScore?.toNumber() ?? 0,
      participantCountAtGeneration: analysis.participantCountAtGeneration,
      responseCountAtGeneration: analysis.responseCountAtGeneration,
      generatedAt: analysis.createdAt,
    };

    // Cache the result with a 1-hour TTL
    await this.cacheManager.set(cacheKey, result, 3600000);

    return result;
  }

  /**
   * Invalidate common ground cache for a specific topic
   * Called when new analysis is generated
   */
  async invalidateCommonGroundCache(topicId: string): Promise<void> {
    const latestKey = `common-ground:topic:${topicId}:latest`;
    await this.cacheManager.del(latestKey);
    // Note: Versioned caches remain valid as analysis versions are immutable
  }
}
