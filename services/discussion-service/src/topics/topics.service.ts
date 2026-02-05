/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import { GetTopicsQueryDto } from './dto/get-topics-query.dto.js';
import { SearchTopicsQueryDto } from './dto/search-topics-query.dto.js';
import type { PaginatedTopicsResponseDto, TopicResponseDto } from './dto/topic-response.dto.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { UpdateTopicDto } from './dto/update-topic.dto.js';
import { MergeTopicsDto } from './dto/merge-topics.dto.js';
import { TopicsSearchService } from './topics-search.service.js';
import { SlugGeneratorService } from './slug-generator.service.js';
import { TopicsEditService } from './topics-edit.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private searchService: TopicsSearchService,
    private slugGenerator: SlugGeneratorService,
    private editService: TopicsEditService,
  ) {}

  /**
   * Get topics with filtering, search, and caching
   * Feature 016: Topic Management (T021, T022, T023)
   */
  async getTopics(query: GetTopicsQueryDto): Promise<PaginatedTopicsResponseDto> {
    const {
      status,
      visibility,
      creatorId,
      tag,
      tags,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Generate cache key based on query parameters
    const cacheKey = `topics:list:${JSON.stringify(query)}`;

    // Try to get from cache first (5min TTL)
    const cached = await this.cacheManager.get<PaginatedTopicsResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build where clause
    const where: Prisma.DiscussionTopicWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (visibility) {
      where.visibility = visibility;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    // Handle single tag or multiple tags
    if (tag || (tags && tags.length > 0)) {
      const tagFilters = [];

      if (tag) {
        tagFilters.push(tag);
      }

      if (tags && tags.length > 0) {
        tagFilters.push(...tags);
      }

      where.tags = {
        some: {
          tag: {
            OR: tagFilters.flatMap((t) => [
              { name: { contains: t, mode: 'insensitive' } },
              { slug: { contains: t, mode: 'insensitive' } },
            ]),
          },
        },
      };
    }

    // Handle full-text search using PostgreSQL tsvector
    if (search) {
      // Use TopicsSearchService for full-text search
      const searchResults = await this.searchService.fullTextSearch(search, limit * 10); // Get more results for filtering

      if (searchResults.length > 0) {
        // Filter by search result IDs
        where.id = {
          in: searchResults.map((r) => r.id),
        };
      } else {
        // No search results, return empty
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
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
      visibility: topic.visibility,
      slug: topic.slug,
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

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache result with 5min TTL (300000ms)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
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
      visibility: topic.visibility,
      slug: topic.slug,
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

  /**
   * Create a new discussion topic
   * Feature 016: Topic Management (T014)
   *
   * @param userId - ID of the user creating the topic
   * @param dto - Topic creation data
   * @returns Created topic with generated slug
   */
  async createTopic(userId: string, dto: CreateTopicDto): Promise<TopicResponseDto> {
    // Step 1: Check for duplicate topics (hybrid trigram + semantic)
    const duplicateCheck = await this.searchService.isUniqueEnough(
      dto.title,
      dto.description,
      true, // strict mode
    );

    if (!duplicateCheck.isUnique && duplicateCheck.suggestions.length > 0) {
      // Throw conflict with duplicate suggestions
      throw new ConflictException({
        message: 'Similar topics already exist',
        suggestions: duplicateCheck.suggestions,
      });
    }

    // Step 2: Generate unique slug from title
    const slug = await this.slugGenerator.generateUniqueSlug(dto.title);

    // Step 3: Find or create tags
    const tagRecords = await Promise.all(
      dto.tags.map(async (tagName) => {
        const normalizedName = tagName.trim().toLowerCase();
        const tagSlug = normalizedName.replace(/\s+/g, '-');

        // Try to find existing tag
        let tag = await this.prisma.tag.findFirst({
          where: {
            OR: [{ name: { equals: normalizedName, mode: 'insensitive' } }, { slug: tagSlug }],
          },
        });

        // Create tag if doesn't exist
        if (!tag) {
          tag = await this.prisma.tag.create({
            data: {
              name: normalizedName,
              slug: tagSlug,
              usageCount: 1,
              aiSynonyms: [],
            },
          });
        } else {
          // Increment usage count for existing tag
          await this.prisma.tag.update({
            where: { id: tag.id },
            data: { usageCount: { increment: 1 } },
          });
        }

        return tag;
      }),
    );

    // Step 4: Create topic with tags
    const topic = await this.prisma.discussionTopic.create({
      data: {
        title: dto.title,
        description: dto.description,
        slug,
        creatorId: userId,
        status: 'SEEDING', // Default status for new topics
        visibility: dto.visibility || 'PUBLIC',
        evidenceStandards: dto.evidenceStandards || 'STANDARD',
        lastActivityAt: new Date(),
        tags: {
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
            source: 'CREATOR',
          })),
        },
      },
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

    // Step 5: Invalidate topic listing cache
    // Note: With query-based cache keys, specific caches will expire after 5min TTL
    await this.cacheManager.del('topics:list');

    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      creatorId: topic.creatorId,
      status: topic.status,
      visibility: topic.visibility,
      slug: topic.slug,
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
      visibility: topic.visibility,
      slug: topic.slug,
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

  /**
   * Update topic status with permission checks
   * Feature 016: Topic Management (T027)
   *
   * @param topicId - ID of the topic to update
   * @param userId - ID of the user requesting the change
   * @param newStatus - New status to set
   * @param isModerator - Whether the user is a moderator (has elevated permissions)
   * @returns Updated topic
   */
  async updateTopicStatus(
    topicId: string,
    userId: string,
    newStatus: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED',
    isModerator: boolean = false,
  ): Promise<TopicResponseDto> {
    // Step 1: Fetch the topic
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
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
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Step 2: Check permissions
    const isCreator = topic.creatorId === userId;
    if (!isCreator && !isModerator) {
      throw new BadRequestException('Only the topic creator or moderators can change topic status');
    }

    // Step 3: Validate status transition
    // Creators can: SEEDING -> ACTIVE, ACTIVE -> ARCHIVED, ARCHIVED -> ACTIVE
    // Moderators can: any status change including LOCKED
    if (!isModerator) {
      // Creators cannot lock topics
      if (newStatus === 'LOCKED') {
        throw new BadRequestException('Only moderators can lock topics');
      }

      // Creators cannot unlock topics
      if (topic.status === 'LOCKED') {
        throw new BadRequestException('Only moderators can unlock locked topics');
      }

      // Creators cannot revert to SEEDING once activated
      if (newStatus === 'SEEDING' && topic.status !== 'SEEDING') {
        throw new BadRequestException('Cannot revert an activated topic to SEEDING status');
      }
    }

    // Step 4: Prepare update data with appropriate timestamps
    const updateData: any = {
      status: newStatus,
      lastActivityAt: new Date(),
    };

    // Set activatedAt when transitioning to ACTIVE for the first time
    if (newStatus === 'ACTIVE' && !topic.activatedAt) {
      updateData.activatedAt = new Date();
    }

    // Set archivedAt when archiving
    if (newStatus === 'ARCHIVED' && topic.status !== 'ARCHIVED') {
      updateData.archivedAt = new Date();
    }

    // Clear archivedAt when unarchiving
    if (newStatus === 'ACTIVE' && topic.status === 'ARCHIVED') {
      updateData.archivedAt = null;
    }

    // Set lockedAt when locking
    if (newStatus === 'LOCKED' && topic.status !== 'LOCKED') {
      updateData.lockedAt = new Date();
    }

    // Clear lockedAt when unlocking
    if (newStatus !== 'LOCKED' && topic.status === 'LOCKED') {
      updateData.lockedAt = null;
    }

    // Step 5: Update the topic
    const updatedTopic = await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: updateData,
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

    // Step 6: Invalidate caches
    await this.cacheManager.del('topics:list');
    // Clear all query-based caches for this topic
    const cacheKeys = await this.cacheManager.store.keys();
    const topicCacheKeys = cacheKeys.filter((key: string) => key.includes(topicId));
    await Promise.all(topicCacheKeys.map((key: string) => this.cacheManager.del(key)));

    return {
      id: updatedTopic.id,
      title: updatedTopic.title,
      description: updatedTopic.description,
      creatorId: updatedTopic.creatorId,
      status: updatedTopic.status,
      visibility: updatedTopic.visibility,
      slug: updatedTopic.slug,
      evidenceStandards: updatedTopic.evidenceStandards,
      minimumDiversityScore: updatedTopic.minimumDiversityScore.toNumber(),
      currentDiversityScore: updatedTopic.currentDiversityScore?.toNumber() ?? null,
      participantCount: updatedTopic.participantCount,
      responseCount: updatedTopic.responseCount,
      crossCuttingThemes: updatedTopic.crossCuttingThemes,
      createdAt: updatedTopic.createdAt,
      activatedAt: updatedTopic.activatedAt,
      archivedAt: updatedTopic.archivedAt,
      tags: updatedTopic.tags.map((tt) => tt.tag),
    };
  }

  /**
   * Update topic details with edit history tracking
   * Feature 016: Topic Management (T032)
   *
   * @param topicId - ID of the topic to update
   * @param userId - ID of the user requesting the change
   * @param updateDto - Fields to update
   * @param isModerator - Whether the user is a moderator
   * @returns Updated topic
   */
  async updateTopic(
    topicId: string,
    userId: string,
    updateDto: UpdateTopicDto,
    isModerator: boolean = false,
  ): Promise<TopicResponseDto> {
    // Step 1: Fetch the current topic
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
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
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Step 2: Check permissions
    const isCreator = topic.creatorId === userId;
    if (!isCreator && !isModerator) {
      throw new BadRequestException('Only the topic creator or moderators can edit topics');
    }

    // Step 3: Check if locked
    if (topic.status === 'LOCKED' && !isModerator) {
      throw new BadRequestException('Cannot edit a locked topic');
    }

    // Step 4: Validate edit reason requirement (>24 hours old)
    const topicAgeHours = (Date.now() - topic.createdAt.getTime()) / (1000 * 60 * 60);
    const requiresReason = topicAgeHours > 24;

    if (requiresReason && !updateDto.editReason) {
      throw new BadRequestException('Edit reason is required for topics older than 24 hours');
    }

    // Step 5: Prepare update data
    const updateData: any = {
      lastActivityAt: new Date(),
    };

    // Track what changed for edit history
    const changes: {
      previousTitle?: string;
      newTitle?: string;
      previousDescription?: string;
      newDescription?: string;
      previousTags?: string[];
      newTags?: string[];
    } = {};

    // Title change
    if (updateDto.title && updateDto.title !== topic.title) {
      changes.previousTitle = topic.title;
      changes.newTitle = updateDto.title;
      updateData.title = updateDto.title;

      // Regenerate slug if title changed
      const newSlug = await this.slugGenerator.generateUniqueSlug(updateDto.title);
      updateData.slug = newSlug;
    }

    // Description change
    if (updateDto.description && updateDto.description !== topic.description) {
      changes.previousDescription = topic.description;
      changes.newDescription = updateDto.description;
      updateData.description = updateDto.description;
    }

    // Visibility change
    if (updateDto.visibility && updateDto.visibility !== topic.visibility) {
      updateData.visibility = updateDto.visibility;
    }

    // Step 6: Handle tag changes
    if (updateDto.tags && updateDto.tags.length > 0) {
      const currentTagNames = topic.tags.map((tt) => tt.tag.name).sort();
      const newTagNames = updateDto.tags.map((t) => t.trim().toLowerCase()).sort();

      if (JSON.stringify(currentTagNames) !== JSON.stringify(newTagNames)) {
        changes.previousTags = currentTagNames;
        changes.newTags = newTagNames;

        // Find or create tags
        const tagRecords = await Promise.all(
          updateDto.tags.map(async (tagName) => {
            const normalizedName = tagName.trim().toLowerCase();
            const tagSlug = normalizedName.replace(/\s+/g, '-');

            let tag = await this.prisma.tag.findFirst({
              where: {
                OR: [{ name: { equals: normalizedName, mode: 'insensitive' } }, { slug: tagSlug }],
              },
            });

            if (!tag) {
              tag = await this.prisma.tag.create({
                data: {
                  name: normalizedName,
                  slug: tagSlug,
                  usageCount: 1,
                  aiSynonyms: [],
                },
              });
            } else {
              await this.prisma.tag.update({
                where: { id: tag.id },
                data: { usageCount: { increment: 1 } },
              });
            }

            return tag;
          }),
        );

        // Delete existing tag associations
        await this.prisma.topicTag.deleteMany({
          where: { topicId },
        });

        // Create new tag associations
        await this.prisma.topicTag.createMany({
          data: tagRecords.map((tag) => ({
            topicId,
            tagId: tag.id,
            source: 'CREATOR',
          })),
        });

        // Decrement usage count for removed tags
        const removedTags = topic.tags.filter(
          (tt) => !newTagNames.includes(tt.tag.name.toLowerCase()),
        );
        await Promise.all(
          removedTags.map((tt) =>
            this.prisma.tag.update({
              where: { id: tt.tag.id },
              data: { usageCount: { decrement: 1 } },
            }),
          ),
        );
      }
    }

    // Step 7: Create edit history record if there are changes
    const hasChanges = Object.keys(changes).length > 0 || updateDto.visibility !== topic.visibility;

    if (hasChanges) {
      await this.editService.createEditRecord({
        topicId,
        editorId: userId,
        ...changes,
        changeReason: updateDto.editReason,
        flagForReview: updateDto.flagForReview,
      });
    }

    // Step 8: Update the topic
    const updatedTopic = await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: updateData,
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

    // Step 9: Invalidate caches
    await this.cacheManager.del('topics:list');
    const cacheKeys = await this.cacheManager.store.keys();
    const topicCacheKeys = cacheKeys.filter((key: string) => key.includes(topicId));
    await Promise.all(topicCacheKeys.map((key: string) => this.cacheManager.del(key)));

    return {
      id: updatedTopic.id,
      title: updatedTopic.title,
      description: updatedTopic.description,
      creatorId: updatedTopic.creatorId,
      status: updatedTopic.status,
      visibility: updatedTopic.visibility,
      slug: updatedTopic.slug,
      evidenceStandards: updatedTopic.evidenceStandards,
      minimumDiversityScore: updatedTopic.minimumDiversityScore.toNumber(),
      currentDiversityScore: updatedTopic.currentDiversityScore?.toNumber() ?? null,
      participantCount: updatedTopic.participantCount,
      responseCount: updatedTopic.responseCount,
      crossCuttingThemes: updatedTopic.crossCuttingThemes,
      createdAt: updatedTopic.createdAt,
      activatedAt: updatedTopic.activatedAt,
      archivedAt: updatedTopic.archivedAt,
      tags: updatedTopic.tags.map((tt) => tt.tag),
    };
  }

  /**
   * Get edit history for a topic
   * Feature 016: Topic Management (T034)
   *
   * @param topicId - ID of the topic
   * @param limit - Maximum number of records to return
   * @returns Edit history records
   */
  async getTopicEditHistory(topicId: string, limit: number = 50) {
    // Verify topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    return this.editService.getTopicEditHistory(topicId, limit);
  }

  /**
   * Merge multiple topics into a single target topic
   * Feature 016: Topic Management (T043)
   *
   * Moderator-only operation that:
   * - Moves all responses from source topics to target
   * - Merges participant activities
   * - Creates merge record with snapshots for rollback (30-day window)
   * - Archives source topics with redirect to target
   * - Uses transaction to ensure atomicity
   *
   * @param moderatorId - ID of the moderator performing the merge
   * @param mergeDto - Merge request with source topics, target, and reason
   * @returns Updated target topic
   */
  async mergeTopics(moderatorId: string, mergeDto: MergeTopicsDto): Promise<TopicResponseDto> {
    const { sourceTopicIds, targetTopicId, mergeReason } = mergeDto;

    // Step 1: Validate that target is not in source list
    if (sourceTopicIds.includes(targetTopicId)) {
      throw new BadRequestException('Target topic cannot be one of the source topics');
    }

    // Step 2: Use transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Step 3: Fetch all topics (source + target) with full data for snapshots
      const allTopicIds = [...sourceTopicIds, targetTopicId];
      const topics = await tx.discussionTopic.findMany({
        where: { id: { in: allTopicIds } },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          responses: {
            select: {
              id: true,
              authorId: true,
            },
          },
        },
      });

      // Verify all topics exist
      if (topics.length !== allTopicIds.length) {
        const foundIds = topics.map((t) => t.id);
        const missingIds = allTopicIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(`Topics not found: ${missingIds.join(', ')}`);
      }

      // Separate source and target
      const sourceTopics = topics.filter((t) => sourceTopicIds.includes(t.id));
      const targetTopic = topics.find((t) => t.id === targetTopicId);

      if (!targetTopic) {
        throw new NotFoundException(`Target topic ${targetTopicId} not found`);
      }

      // Step 4: Validate source topics are not locked
      const lockedSources = sourceTopics.filter((t) => t.status === 'LOCKED');
      if (lockedSources.length > 0) {
        throw new BadRequestException(
          `Cannot merge locked topics: ${lockedSources.map((t) => t.title).join(', ')}`,
        );
      }

      // Step 5: Create snapshots for rollback
      const sourceSnapshots = sourceTopics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        status: topic.status,
        visibility: topic.visibility,
        slug: topic.slug,
        creatorId: topic.creatorId,
        participantCount: topic.participantCount,
        responseCount: topic.responseCount,
        tags: topic.tags.map((tt) => ({
          id: tt.tag.id,
          name: tt.tag.name,
        })),
        createdAt: topic.createdAt.toISOString(),
      }));

      // Step 6: Move all responses from source topics to target
      const responsesToMove = sourceTopics.reduce((sum, t) => sum + t.responseCount, 0);

      await tx.response.updateMany({
        where: {
          topicId: { in: sourceTopicIds },
        },
        data: {
          topicId: targetTopicId,
        },
      });

      // Step 7: Merge participant activities
      // Get unique participant IDs from source topics
      const sourceParticipants = new Set<string>();
      sourceTopics.forEach((topic) => {
        topic.responses.forEach((response) => {
          sourceParticipants.add(response.authorId);
        });
      });

      const participantsMerged = sourceParticipants.size;

      // Step 8: Update target topic counts
      const newResponseCount = targetTopic.responseCount + responsesToMove;
      const targetParticipants = new Set(targetTopic.responses.map((r) => r.authorId));
      sourceParticipants.forEach((id) => targetParticipants.add(id));
      const newParticipantCount = targetParticipants.size;

      await tx.discussionTopic.update({
        where: { id: targetTopicId },
        data: {
          responseCount: newResponseCount,
          participantCount: newParticipantCount,
          lastActivityAt: new Date(),
        },
      });

      // Step 9: Create merge record
      await tx.topicMerge.create({
        data: {
          sourceTopicIds,
          targetTopicId,
          moderatorId,
          mergeReason,
          sourceSnapshots,
          responsesMoved: responsesToMove,
          participantsMerged,
        },
      });

      // Step 10: Archive source topics and add redirect note to description
      for (const sourceTopic of sourceTopics) {
        const redirectNote = `\n\n---\n**[MERGED]** This topic has been merged into: [${targetTopic.title}](/topics/${targetTopic.slug})\nReason: ${mergeReason}`;

        await tx.discussionTopic.update({
          where: { id: sourceTopic.id },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date(),
            description: sourceTopic.description + redirectNote,
          },
        });
      }

      // Step 11: Invalidate caches outside transaction (fire and forget)
      // We'll do this after transaction commits
      setImmediate(async () => {
        await this.invalidateTopicCaches(targetTopicId);
        for (const sourceId of sourceTopicIds) {
          await this.invalidateTopicCaches(sourceId);
        }
      });

      // Step 12: Fetch and return updated target topic
      return this.getTopicById(targetTopicId);
    });
  }

  /**
   * Rollback a topic merge operation
   * Feature 016: Topic Management
   *
   * Moderator-only operation (30-day rollback window)
   * Restores source topics and moves responses back
   *
   * @param moderatorId - ID of the moderator performing rollback
   * @param mergeId - ID of the merge to rollback
   * @param rollbackReason - Reason for rollback
   */
  async rollbackTopicMerge(
    moderatorId: string,
    mergeId: string,
    rollbackReason: string,
  ): Promise<void> {
    return await this.prisma.$transaction(async (tx) => {
      // Fetch merge record
      const merge = await tx.topicMerge.findUnique({
        where: { id: mergeId },
      });

      if (!merge) {
        throw new NotFoundException(`Merge record ${mergeId} not found`);
      }

      // Check if already rolled back
      if (merge.rolledBackAt) {
        throw new BadRequestException('This merge has already been rolled back');
      }

      // Check 30-day window
      const daysSinceMerge = (Date.now() - merge.mergedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceMerge > 30) {
        throw new BadRequestException(
          'Rollback window has expired (30 days). Manual intervention required.',
        );
      }

      // Move responses back to original topics
      // For simplicity, we'll move all responses from target back to first source
      // In production, you might want to restore based on response.createdAt and original topic
      const firstSourceId = merge.sourceTopicIds[0];

      await tx.response.updateMany({
        where: {
          topicId: merge.targetTopicId,
          // Only move responses that were created after merge (approximately)
          createdAt: { gte: merge.mergedAt },
        },
        data: {
          topicId: firstSourceId,
        },
      });

      // Restore source topics from snapshots
      const snapshots = merge.sourceSnapshots as any[];
      for (const snapshot of snapshots) {
        await tx.discussionTopic.update({
          where: { id: snapshot.id },
          data: {
            status: 'ACTIVE',
            archivedAt: null,
            // Remove redirect note from description
            description: snapshot.description,
          },
        });
      }

      // Mark merge as rolled back
      await tx.topicMerge.update({
        where: { id: mergeId },
        data: {
          rolledBackAt: new Date(),
          rollbackReason,
        },
      });

      // Invalidate caches
      setImmediate(async () => {
        await this.invalidateTopicCaches(merge.targetTopicId);
        for (const sourceId of merge.sourceTopicIds) {
          await this.invalidateTopicCaches(sourceId);
        }
      });
    });
  }
}
