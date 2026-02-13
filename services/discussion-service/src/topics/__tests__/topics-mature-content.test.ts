/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for TopicsService mature content filtering (Phase 3)
 * Tests the excludeMatureContent filter functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TopicsService } from '../topics.service.js';

// Mock topic data factory
const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  description: 'A test topic',
  creatorId: 'user-1',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  slug: 'test-topic',
  evidenceStandards: 'STANDARD',
  minimumDiversityScore: { toNumber: () => 0.5 },
  currentDiversityScore: { toNumber: () => 0.6 },
  participantCount: 5,
  responseCount: 10,
  crossCuttingThemes: [],
  createdAt: new Date(),
  activatedAt: new Date(),
  archivedAt: null,
  isMatureContent: false,
  tags: [],
  ...overrides,
});

// Create mock services
const createMockPrismaService = () => ({
  discussionTopic: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  discussion: {
    create: vi.fn(),
  },
  tag: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

const createMockCacheManager = () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  stores: {
    keys: vi.fn().mockResolvedValue([]),
  },
});

const createMockSearchService = () => ({
  fullTextSearch: vi.fn(),
  isUniqueEnough: vi.fn(),
});

const createMockSlugGenerator = () => ({
  generateUniqueSlug: vi.fn(),
});

const createMockEditService = () => ({
  createEditRecord: vi.fn(),
  getTopicEditHistory: vi.fn(),
});

const createMockPropositionsService = () => ({
  createInitialPropositions: vi.fn().mockResolvedValue([]),
});

const createMockActivityClient = () => ({
  createEvent: vi.fn().mockResolvedValue(undefined),
});

describe('TopicsService - Mature Content Filtering', () => {
  let service: TopicsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCache: ReturnType<typeof createMockCacheManager>;
  let mockSearchService: ReturnType<typeof createMockSearchService>;
  let mockSlugGenerator: ReturnType<typeof createMockSlugGenerator>;
  let mockEditService: ReturnType<typeof createMockEditService>;
  let mockPropositionsService: ReturnType<typeof createMockPropositionsService>;
  let mockActivityClient: ReturnType<typeof createMockActivityClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCache = createMockCacheManager();
    mockSearchService = createMockSearchService();
    mockSlugGenerator = createMockSlugGenerator();
    mockEditService = createMockEditService();
    mockPropositionsService = createMockPropositionsService();
    mockActivityClient = createMockActivityClient();

    service = new TopicsService(
      mockPrisma as any,
      mockCache as any,
      mockSearchService as any,
      mockSlugGenerator as any,
      mockEditService as any,
      mockPropositionsService as any,
      mockActivityClient as any,
    );
  });

  describe('getTopics with excludeMatureContent', () => {
    it('should include mature content topics when excludeMatureContent is not set', async () => {
      const matureTopic = createMockTopic({ id: 'topic-mature', isMatureContent: true });
      const normalTopic = createMockTopic({ id: 'topic-normal', isMatureContent: false });

      mockCache.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([matureTopic, normalTopic]);
      mockPrisma.discussionTopic.count.mockResolvedValue(2);

      const result = await service.getTopics({});

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      // Verify where clause doesn't include isMatureContent filter
      const findManyCall = mockPrisma.discussionTopic.findMany.mock.calls[0][0];
      expect(findManyCall.where).not.toHaveProperty('isMatureContent');
    });

    it('should exclude mature content topics when excludeMatureContent is true', async () => {
      const normalTopic = createMockTopic({ id: 'topic-normal', isMatureContent: false });

      mockCache.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([normalTopic]);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      const result = await service.getTopics({ excludeMatureContent: true });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].isMatureContent).toBe(false);
      // Verify where clause includes isMatureContent: false
      const findManyCall = mockPrisma.discussionTopic.findMany.mock.calls[0][0];
      expect(findManyCall.where.isMatureContent).toBe(false);
    });

    it('should combine excludeMatureContent with other filters', async () => {
      const normalTopic = createMockTopic({ isMatureContent: false, status: 'ACTIVE' });

      mockCache.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([normalTopic]);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      await service.getTopics({
        excludeMatureContent: true,
        status: 'ACTIVE',
        visibility: 'PUBLIC',
      });

      const findManyCall = mockPrisma.discussionTopic.findMany.mock.calls[0][0];
      expect(findManyCall.where).toEqual(
        expect.objectContaining({
          isMatureContent: false,
          status: 'ACTIVE',
          visibility: 'PUBLIC',
        }),
      );
    });

    it('should use cache when available', async () => {
      const cachedResult = {
        data: [{ id: 'topic-1', isMatureContent: false }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockCache.get.mockResolvedValue(cachedResult);

      const result = await service.getTopics({ excludeMatureContent: true });

      expect(result).toEqual(cachedResult);
      expect(mockPrisma.discussionTopic.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createTopic with isMatureContent', () => {
    it('should create topic with isMatureContent=false when not specified', async () => {
      mockSearchService.isUniqueEnough.mockResolvedValue({ isUnique: true, suggestions: [] });
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('new-topic');
      mockPrisma.tag.findFirst.mockResolvedValue({ id: 'tag-1', name: 'test' });
      mockPrisma.tag.update.mockResolvedValue({ id: 'tag-1' });

      const createdTopic = createMockTopic({
        id: 'new-topic-id',
        title: 'New Topic',
        isMatureContent: false,
      });
      mockPrisma.discussionTopic.create.mockResolvedValue(createdTopic);
      mockPrisma.discussion.create.mockResolvedValue({});

      const result = await service.createTopic('user-1', {
        title: 'New Topic',
        description: 'A new topic',
        tags: ['test'],
      });

      expect(result.isMatureContent).toBe(false);
      const createCall = mockPrisma.discussionTopic.create.mock.calls[0][0];
      expect(createCall.data.isMatureContent).toBe(false);
    });

    it('should create topic with isMatureContent=true when specified', async () => {
      mockSearchService.isUniqueEnough.mockResolvedValue({ isUnique: true, suggestions: [] });
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('mature-topic');
      mockPrisma.tag.findFirst.mockResolvedValue({ id: 'tag-1', name: 'test' });
      mockPrisma.tag.update.mockResolvedValue({ id: 'tag-1' });

      const createdTopic = createMockTopic({
        id: 'mature-topic-id',
        title: 'Mature Topic',
        isMatureContent: true,
      });
      mockPrisma.discussionTopic.create.mockResolvedValue(createdTopic);
      mockPrisma.discussion.create.mockResolvedValue({});

      const result = await service.createTopic('user-1', {
        title: 'Mature Topic',
        description: 'A mature topic',
        tags: ['test'],
        isMatureContent: true,
      });

      expect(result.isMatureContent).toBe(true);
      const createCall = mockPrisma.discussionTopic.create.mock.calls[0][0];
      expect(createCall.data.isMatureContent).toBe(true);
    });
  });

  describe('getTopicById returns isMatureContent', () => {
    it('should include isMatureContent in topic response', async () => {
      const matureTopic = createMockTopic({ id: 'topic-1', isMatureContent: true });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(matureTopic);

      const result = await service.getTopicById('topic-1');

      expect(result.isMatureContent).toBe(true);
    });

    it('should return false for non-mature topic', async () => {
      const normalTopic = createMockTopic({ id: 'topic-2', isMatureContent: false });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(normalTopic);

      const result = await service.getTopicById('topic-2');

      expect(result.isMatureContent).toBe(false);
    });
  });
});
