/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import type {
  CreateTagDto,
  UpdateTagDto,
  GetTagsQueryDto,
  SearchTagsDto,
  MergeTagsDto,
  TagResponseDto,
  TagListResponseDto,
  TagStatisticsDto,
  TagSortBy,
  SortDirection,
} from './dto/tag.dto.js';

/**
 * Service for tag management operations
 * Feature 016: Topic Management (T216)
 *
 * Provides CRUD operations for tags including:
 * - Creating, updating, and deleting tags
 * - Tag search and autocomplete
 * - Tag merging for deduplication
 * - Tag statistics and analytics
 */
@Injectable()
export class TagsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  /**
   * Generate a URL-friendly slug from a tag name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Get all tags with filtering and pagination
   */
  async getTags(query: GetTagsQueryDto): Promise<TagListResponseDto> {
    const {
      search,
      parentThemeId,
      rootTagsOnly,
      sortBy = 'name' as TagSortBy,
      sortDirection = 'asc' as SortDirection,
      limit = 50,
      offset = 0,
    } = query;

    const where: Prisma.TagWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { aiSynonyms: { has: search.toLowerCase() } },
      ];
    }

    if (parentThemeId) {
      where.parentThemeId = parentThemeId;
    }

    if (rootTagsOnly) {
      where.parentThemeId = null;
    }

    const orderBy: Prisma.TagOrderByWithRelationInput = {
      [sortBy]: sortDirection,
    };

    const [tags, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          parentTheme: {
            select: { id: true, name: true, slug: true },
          },
          childThemes: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.tag.count({ where }),
    ]);

    return {
      tags: tags.map((tag) => this.mapToResponseDto(tag)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single tag by ID
   */
  async getTagById(id: string): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        parentTheme: {
          select: { id: true, name: true, slug: true },
        },
        childThemes: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return this.mapToResponseDto(tag);
  }

  /**
   * Get a tag by slug
   */
  async getTagBySlug(slug: string): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findUnique({
      where: { slug },
      include: {
        parentTheme: {
          select: { id: true, name: true, slug: true },
        },
        childThemes: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with slug "${slug}" not found`);
    }

    return this.mapToResponseDto(tag);
  }

  /**
   * Search tags for autocomplete
   */
  async searchTags(dto: SearchTagsDto): Promise<TagResponseDto[]> {
    const { query, limit = 10 } = dto;
    const searchLower = query.toLowerCase();

    const tags = await this.prisma.tag.findMany({
      where: {
        OR: [
          { name: { contains: searchLower, mode: 'insensitive' } },
          { slug: { contains: searchLower, mode: 'insensitive' } },
          { aiSynonyms: { has: searchLower } },
        ],
      },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
      take: limit,
      include: {
        parentTheme: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return tags.map((tag) => this.mapToResponseDto(tag));
  }

  /**
   * Create a new tag
   */
  async createTag(dto: CreateTagDto): Promise<TagResponseDto> {
    const { name, aiSynonyms = [], parentThemeId } = dto;
    const slug = this.generateSlug(name);

    // Check for existing tag with same name or slug
    const existing = await this.prisma.tag.findFirst({
      where: {
        OR: [{ name: name.toLowerCase() }, { slug }],
      },
    });

    if (existing) {
      throw new ConflictException(`Tag with name "${name}" or slug "${slug}" already exists`);
    }

    // Validate parent theme exists if provided
    if (parentThemeId) {
      const parentExists = await this.prisma.tag.findUnique({
        where: { id: parentThemeId },
      });
      if (!parentExists) {
        throw new BadRequestException(`Parent theme with ID ${parentThemeId} not found`);
      }
    }

    const tag = await this.prisma.tag.create({
      data: {
        name: name.toLowerCase(),
        slug,
        aiSynonyms,
        parentThemeId,
      },
      include: {
        parentTheme: {
          select: { id: true, name: true, slug: true },
        },
        childThemes: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return this.mapToResponseDto(tag);
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, dto: UpdateTagDto): Promise<TagResponseDto> {
    const existing = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    const updateData: Prisma.TagUpdateInput = {};

    if (dto.name !== undefined) {
      const newName = dto.name.toLowerCase();
      const newSlug = this.generateSlug(dto.name);

      // Check for conflicts with other tags
      const conflict = await this.prisma.tag.findFirst({
        where: {
          AND: [{ id: { not: id } }, { OR: [{ name: newName }, { slug: newSlug }] }],
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Another tag with name "${dto.name}" or slug "${newSlug}" already exists`,
        );
      }

      updateData.name = newName;
      updateData.slug = newSlug;
    }

    if (dto.aiSynonyms !== undefined) {
      updateData.aiSynonyms = dto.aiSynonyms;
    }

    if (dto.parentThemeId !== undefined) {
      if (dto.parentThemeId === null) {
        updateData.parentTheme = { disconnect: true };
      } else {
        // Prevent circular references
        if (dto.parentThemeId === id) {
          throw new BadRequestException('A tag cannot be its own parent');
        }

        const parentExists = await this.prisma.tag.findUnique({
          where: { id: dto.parentThemeId },
        });
        if (!parentExists) {
          throw new BadRequestException(`Parent theme with ID ${dto.parentThemeId} not found`);
        }

        updateData.parentTheme = { connect: { id: dto.parentThemeId } };
      }
    }

    const tag = await this.prisma.tag.update({
      where: { id },
      data: updateData,
      include: {
        parentTheme: {
          select: { id: true, name: true, slug: true },
        },
        childThemes: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return this.mapToResponseDto(tag);
  }

  /**
   * Delete a tag
   * This will remove all topic associations (TopicTag entries)
   */
  async deleteTag(id: string): Promise<void> {
    const existing = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        childThemes: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Check if tag has child themes
    if (existing.childThemes.length > 0) {
      throw new BadRequestException(
        `Cannot delete tag with child themes. Please reassign or delete child themes first.`,
      );
    }

    // Delete tag (TopicTag entries will be cascade deleted due to schema)
    await this.prisma.tag.delete({
      where: { id },
    });
  }

  /**
   * Merge two tags - moves all topic associations from source to target
   */
  async mergeTags(dto: MergeTagsDto): Promise<TagResponseDto> {
    const { sourceTagId, targetTagId } = dto;

    if (sourceTagId === targetTagId) {
      throw new BadRequestException('Cannot merge a tag with itself');
    }

    const [sourceTag, targetTag] = await Promise.all([
      this.prisma.tag.findUnique({
        where: { id: sourceTagId },
        include: { topics: true, childThemes: true },
      }),
      this.prisma.tag.findUnique({
        where: { id: targetTagId },
      }),
    ]);

    if (!sourceTag) {
      throw new NotFoundException(`Source tag with ID ${sourceTagId} not found`);
    }
    if (!targetTag) {
      throw new NotFoundException(`Target tag with ID ${targetTagId} not found`);
    }

    // Perform merge in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Move child themes to target
      if (sourceTag.childThemes.length > 0) {
        await tx.tag.updateMany({
          where: { parentThemeId: sourceTagId },
          data: { parentThemeId: targetTagId },
        });
      }

      // Get topic associations that need to be moved
      const sourceTopicTags = sourceTag.topics;

      for (const topicTag of sourceTopicTags) {
        // Check if target already has this topic association
        const existingAssoc = await tx.topicTag.findUnique({
          where: {
            topicId_tagId: {
              topicId: topicTag.topicId,
              tagId: targetTagId,
            },
          },
        });

        if (!existingAssoc) {
          // Move the association to target tag
          await tx.topicTag.update({
            where: {
              topicId_tagId: {
                topicId: topicTag.topicId,
                tagId: sourceTagId,
              },
            },
            data: { tagId: targetTagId },
          });
        } else {
          // Delete the source association (target already has it)
          await tx.topicTag.delete({
            where: {
              topicId_tagId: {
                topicId: topicTag.topicId,
                tagId: sourceTagId,
              },
            },
          });
        }
      }

      // Merge synonyms
      const mergedSynonyms = [
        ...new Set([
          ...targetTag.aiSynonyms,
          ...sourceTag.aiSynonyms,
          sourceTag.name, // Add source name as synonym
        ]),
      ];

      // Update target tag with merged data
      const updatedTarget = await tx.tag.update({
        where: { id: targetTagId },
        data: {
          aiSynonyms: mergedSynonyms,
          usageCount: { increment: sourceTag.usageCount },
        },
        include: {
          parentTheme: {
            select: { id: true, name: true, slug: true },
          },
          childThemes: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      // Delete source tag
      await tx.tag.delete({
        where: { id: sourceTagId },
      });

      return updatedTarget;
    });

    return this.mapToResponseDto(result);
  }

  /**
   * Get tag statistics
   */
  async getTagStatistics(id: string): Promise<TagStatisticsDto> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        topics: {
          include: {
            topic: {
              select: {
                id: true,
                title: true,
                createdAt: true,
                tags: {
                  include: {
                    tag: {
                      select: { id: true, name: true, slug: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // Calculate co-occurring tags
    const coOccurrenceMap = new Map<string, { tag: any; count: number }>();

    for (const topicTag of tag.topics) {
      for (const otherTag of topicTag.topic.tags) {
        if (otherTag.tagId !== id) {
          const existing = coOccurrenceMap.get(otherTag.tagId);
          if (existing) {
            existing.count++;
          } else {
            coOccurrenceMap.set(otherTag.tagId, {
              tag: otherTag.tag,
              count: 1,
            });
          }
        }
      }
    }

    const relatedTags = Array.from(coOccurrenceMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ tag: relatedTag, count }) => ({
        id: relatedTag.id,
        name: relatedTag.name,
        slug: relatedTag.slug,
        coOccurrenceCount: count,
      }));

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      usageCount: tag.usageCount,
      topicCount: tag.topics.length,
      recentTopics: tag.topics.map((tt) => ({
        id: tt.topic.id,
        title: tt.topic.title,
        createdAt: tt.topic.createdAt,
      })),
      relatedTags,
    };
  }

  /**
   * Map database tag to response DTO
   */
  private mapToResponseDto(tag: any): TagResponseDto {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      usageCount: tag.usageCount,
      aiSynonyms: tag.aiSynonyms,
      parentThemeId: tag.parentThemeId,
      parentTheme: tag.parentTheme || null,
      childThemes: tag.childThemes || [],
      createdAt: tag.createdAt,
    };
  }
}
