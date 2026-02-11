/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagsController } from './tags.controller.js';

const createMockTagsService = () => ({
  getTags: vi.fn(),
  getTagById: vi.fn(),
  getTagBySlug: vi.fn(),
  searchTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  mergeTags: vi.fn(),
  getTagStatistics: vi.fn(),
});

describe('TagsController', () => {
  let controller: TagsController;
  let mockService: ReturnType<typeof createMockTagsService>;

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
    mockService = createMockTagsService();
    controller = new TagsController(mockService as any);
  });

  describe('getTags', () => {
    it('should call service.getTags with query params', async () => {
      const query = { search: 'tech', limit: 20 };
      mockService.getTags.mockResolvedValue({
        tags: [mockTag],
        total: 1,
        limit: 20,
        offset: 0,
      });

      const result = await controller.getTags(query);

      expect(mockService.getTags).toHaveBeenCalledWith(query);
      expect(result.tags).toHaveLength(1);
    });
  });

  describe('searchTags', () => {
    it('should call service.searchTags with query', async () => {
      const query = { query: 'tech', limit: 5 };
      mockService.searchTags.mockResolvedValue([mockTag]);

      const result = await controller.searchTags(query);

      expect(mockService.searchTags).toHaveBeenCalledWith(query);
      expect(result).toHaveLength(1);
    });
  });

  describe('getTagById', () => {
    it('should call service.getTagById with id', async () => {
      mockService.getTagById.mockResolvedValue(mockTag);

      const result = await controller.getTagById(mockTag.id);

      expect(mockService.getTagById).toHaveBeenCalledWith(mockTag.id);
      expect(result.id).toBe(mockTag.id);
    });
  });

  describe('getTagBySlug', () => {
    it('should call service.getTagBySlug with slug', async () => {
      mockService.getTagBySlug.mockResolvedValue(mockTag);

      const result = await controller.getTagBySlug('technology');

      expect(mockService.getTagBySlug).toHaveBeenCalledWith('technology');
      expect(result.slug).toBe('technology');
    });
  });

  describe('getTagStatistics', () => {
    it('should call service.getTagStatistics with id', async () => {
      const stats = {
        ...mockTag,
        topicCount: 5,
        recentTopics: [],
        relatedTags: [],
      };
      mockService.getTagStatistics.mockResolvedValue(stats);

      const result = await controller.getTagStatistics(mockTag.id);

      expect(mockService.getTagStatistics).toHaveBeenCalledWith(mockTag.id);
      expect(result.topicCount).toBe(5);
    });
  });

  describe('createTag', () => {
    it('should call service.createTag with dto', async () => {
      const dto = { name: 'New Tag', aiSynonyms: ['alias'] };
      mockService.createTag.mockResolvedValue({
        ...mockTag,
        name: 'new tag',
        slug: 'new-tag',
      });

      const result = await controller.createTag(dto);

      expect(mockService.createTag).toHaveBeenCalledWith(dto);
      expect(result.name).toBe('new tag');
    });
  });

  describe('updateTag', () => {
    it('should call service.updateTag with id and dto', async () => {
      const dto = { name: 'Updated Tag' };
      mockService.updateTag.mockResolvedValue({
        ...mockTag,
        name: 'updated tag',
        slug: 'updated-tag',
      });

      const result = await controller.updateTag(mockTag.id, dto);

      expect(mockService.updateTag).toHaveBeenCalledWith(mockTag.id, dto);
      expect(result.name).toBe('updated tag');
    });
  });

  describe('deleteTag', () => {
    it('should call service.deleteTag with id', async () => {
      mockService.deleteTag.mockResolvedValue(undefined);

      await controller.deleteTag(mockTag.id);

      expect(mockService.deleteTag).toHaveBeenCalledWith(mockTag.id);
    });
  });

  describe('mergeTags', () => {
    it('should call service.mergeTags with dto', async () => {
      const dto = { sourceTagId: 'source-id', targetTagId: 'target-id' };
      mockService.mergeTags.mockResolvedValue(mockTag);

      const result = await controller.mergeTags(dto);

      expect(mockService.mergeTags).toHaveBeenCalledWith(dto);
    });
  });
});
