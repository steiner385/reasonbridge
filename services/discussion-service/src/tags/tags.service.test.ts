/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TagsService } from './tags.service.js';

const createMockPrismaService = () => ({
  tag: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  topicTag: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe('TagsService', () => {
  let service: TagsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  const mockTag = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'technology',
    slug: 'technology',
    usageCount: 10,
    aiSynonyms: ['tech', 'computing'],
    parentThemeId: null,
    parentTheme: null,
    childThemes: [],
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new TagsService(mockPrisma as any);
  });

  describe('getTags', () => {
    it('should return paginated tags list', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag]);
      mockPrisma.tag.count.mockResolvedValue(1);

      const result = await service.getTags({});

      expect(result.tags).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by search query', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag]);
      mockPrisma.tag.count.mockResolvedValue(1);

      await service.getTags({ search: 'tech' });

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ name: { contains: 'tech', mode: 'insensitive' } }]),
          }),
        }),
      );
    });

    it('should filter root tags only', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag]);
      mockPrisma.tag.count.mockResolvedValue(1);

      await service.getTags({ rootTagsOnly: true });

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentThemeId: null,
          }),
        }),
      );
    });
  });

  describe('getTagById', () => {
    it('should return tag when found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);

      const result = await service.getTagById(mockTag.id);

      expect(result.id).toBe(mockTag.id);
      expect(result.name).toBe(mockTag.name);
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.getTagById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTagBySlug', () => {
    it('should return tag when found by slug', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);

      const result = await service.getTagBySlug('technology');

      expect(result.slug).toBe('technology');
    });

    it('should throw NotFoundException when slug not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.getTagBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchTags', () => {
    it('should return tags matching search query', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag]);

      const result = await service.searchTags({ query: 'tech' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
        }),
      );
    });

    it('should respect limit parameter', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag]);

      await service.searchTags({ query: 'tech', limit: 5 });

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.create.mockResolvedValue(mockTag);

      const result = await service.createTag({ name: 'Technology' });

      expect(result.name).toBe('technology');
      expect(mockPrisma.tag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'technology',
            slug: 'technology',
          }),
        }),
      );
    });

    it('should throw ConflictException if tag name exists', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(mockTag);

      await expect(service.createTag({ name: 'Technology' })).rejects.toThrow(ConflictException);
    });

    it('should validate parent theme exists', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(
        service.createTag({ name: 'Subtag', parentThemeId: 'nonexistent' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create tag with parent theme', async () => {
      const parentTag = { ...mockTag, id: 'parent-id' };
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.findUnique.mockResolvedValue(parentTag);
      mockPrisma.tag.create.mockResolvedValue({
        ...mockTag,
        parentThemeId: 'parent-id',
      });

      const result = await service.createTag({
        name: 'Subtag',
        parentThemeId: 'parent-id',
      });

      expect(mockPrisma.tag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentThemeId: 'parent-id',
          }),
        }),
      );
    });
  });

  describe('updateTag', () => {
    it('should update tag name and slug', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.update.mockResolvedValue({
        ...mockTag,
        name: 'updated',
        slug: 'updated',
      });

      const result = await service.updateTag(mockTag.id, { name: 'Updated' });

      expect(result.name).toBe('updated');
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.updateTag('nonexistent', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name conflicts', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.tag.findFirst.mockResolvedValue({ ...mockTag, id: 'other-id' });

      await expect(service.updateTag(mockTag.id, { name: 'Existing' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should prevent circular parent reference', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);

      await expect(service.updateTag(mockTag.id, { parentThemeId: mockTag.id })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update synonyms', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.tag.update.mockResolvedValue({
        ...mockTag,
        aiSynonyms: ['new-synonym'],
      });

      await service.updateTag(mockTag.id, { aiSynonyms: ['new-synonym'] });

      expect(mockPrisma.tag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aiSynonyms: ['new-synonym'],
          }),
        }),
      );
    });
  });

  describe('deleteTag', () => {
    it('should delete tag without children', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({ ...mockTag, childThemes: [] });

      await service.deleteTag(mockTag.id);

      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({
        where: { id: mockTag.id },
      });
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.deleteTag('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if tag has children', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({
        ...mockTag,
        childThemes: [{ id: 'child-id' }],
      });

      await expect(service.deleteTag(mockTag.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('mergeTags', () => {
    it('should throw BadRequestException if merging with self', async () => {
      await expect(
        service.mergeTags({ sourceTagId: mockTag.id, targetTagId: mockTag.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if source tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockTag);

      await expect(
        service.mergeTags({
          sourceTagId: 'nonexistent',
          targetTagId: mockTag.id,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if target tag not found', async () => {
      mockPrisma.tag.findUnique
        .mockResolvedValueOnce({ ...mockTag, topics: [], childThemes: [] })
        .mockResolvedValueOnce(null);

      await expect(
        service.mergeTags({
          sourceTagId: mockTag.id,
          targetTagId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge tags successfully', async () => {
      const sourceTag = {
        ...mockTag,
        id: 'source-id',
        name: 'source',
        topics: [],
        childThemes: [],
      };
      const targetTag = { ...mockTag, id: 'target-id', name: 'target' };

      mockPrisma.tag.findUnique.mockResolvedValueOnce(sourceTag).mockResolvedValueOnce(targetTag);

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          tag: {
            updateMany: vi.fn(),
            update: vi.fn().mockResolvedValue({
              ...targetTag,
              aiSynonyms: [...targetTag.aiSynonyms, 'source'],
            }),
            delete: vi.fn(),
          },
          topicTag: {
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.mergeTags({
        sourceTagId: 'source-id',
        targetTagId: 'target-id',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getTagStatistics', () => {
    it('should return tag statistics', async () => {
      const tagWithTopics = {
        ...mockTag,
        topics: [
          {
            topicId: 'topic-1',
            topic: {
              id: 'topic-1',
              title: 'Test Topic',
              createdAt: new Date(),
              tags: [
                { tagId: mockTag.id, tag: mockTag },
                {
                  tagId: 'other-tag',
                  tag: { id: 'other-tag', name: 'other', slug: 'other' },
                },
              ],
            },
          },
        ],
      };

      mockPrisma.tag.findUnique.mockResolvedValue(tagWithTopics);

      const result = await service.getTagStatistics(mockTag.id);

      expect(result.id).toBe(mockTag.id);
      expect(result.topicCount).toBe(1);
      expect(result.recentTopics).toHaveLength(1);
      expect(result.relatedTags).toHaveLength(1);
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(service.getTagStatistics('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
