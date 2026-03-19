import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TopicsService } from './topics.service.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

// Mock Prisma models with Decimal conversion
const createMockPrismaService = () => ({
  discussionTopic: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  commonGroundAnalysis: {
    findFirst: vi.fn(),
  },
  tag: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  topicTag: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  discussion: {
    create: vi.fn(),
  },
  // For dynamic participant/response count queries
  $queryRaw: vi.fn().mockResolvedValue([]),
});

// Mock Search Service (TopicsSearchService)
const createMockSearchService = () => ({
  isUniqueEnough: vi.fn().mockResolvedValue({ isUnique: true, suggestions: [] }),
  fullTextSearch: vi.fn().mockResolvedValue([]),
});

// Mock Slug Generator
const createMockSlugGenerator = () => ({
  generateUniqueSlug: vi.fn().mockResolvedValue('test-topic-slug'),
});

// Mock Edit Service
const createMockEditService = () => ({
  createEditRecord: vi.fn().mockResolvedValue({ id: 'edit-1' }),
});

// Mock Cache Manager
const createMockCacheManager = () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  stores: {
    keys: vi.fn().mockReturnValue([]),
  },
});

// Mock ModuleRef - used for lazy injection of cache manager
const createMockModuleRef = (cacheManager: ReturnType<typeof createMockCacheManager>) => ({
  get: vi.fn().mockReturnValue(cacheManager),
});

// Mock Propositions Service
const createMockPropositionsService = () => ({
  createInitialPropositions: vi.fn().mockResolvedValue([]),
});

// Mock Activity Client Service
const createMockActivityClient = () => ({
  createEvent: vi.fn().mockResolvedValue(undefined),
});

const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  description: 'Test Description',
  creatorId: 'user-1',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  slug: 'test-topic',
  evidenceStandards: 'STANDARD',
  minimumDiversityScore: { toNumber: () => 0.5 },
  currentDiversityScore: { toNumber: () => 0.7 },
  participantCount: 10,
  responseCount: 25,
  crossCuttingThemes: ['theme1', 'theme2'],
  createdAt: new Date('2026-01-01'),
  activatedAt: new Date('2026-01-02'),
  archivedAt: null,
  lastActivityAt: new Date('2026-01-02'),
  isMatureContent: false,
  tags: [{ tag: { id: 'tag-1', name: 'Politics', slug: 'politics' } }],
  ...overrides,
});

describe('TopicsService', () => {
  let service: TopicsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;
  let mockModuleRef: ReturnType<typeof createMockModuleRef>;
  let mockSearchService: ReturnType<typeof createMockSearchService>;
  let mockSlugGenerator: ReturnType<typeof createMockSlugGenerator>;
  let mockEditService: ReturnType<typeof createMockEditService>;
  let mockPropositionsService: ReturnType<typeof createMockPropositionsService>;
  let mockActivityClient: ReturnType<typeof createMockActivityClient>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCacheManager = createMockCacheManager();
    mockModuleRef = createMockModuleRef(mockCacheManager);
    mockSearchService = createMockSearchService();
    mockSlugGenerator = createMockSlugGenerator();
    mockEditService = createMockEditService();
    mockPropositionsService = createMockPropositionsService();
    mockActivityClient = createMockActivityClient();
    service = new TopicsService(
      mockPrisma as any,
      mockModuleRef as any,
      mockSearchService as any,
      mockSlugGenerator as any,
      mockEditService as any,
      mockPropositionsService as any,
      mockActivityClient as any,
    );
    // Initialize cache manager via onModuleInit
    await service.onModuleInit();
  });

  describe('getTopics', () => {
    it('should return paginated topics with default parameters', async () => {
      const mockTopics = [createMockTopic()];
      mockPrisma.discussionTopic.findMany.mockResolvedValue(mockTopics);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      const result = await service.getTopics({});

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(0);

      await service.getTopics({ status: 'ACTIVE' });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should filter by creatorId', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(0);

      await service.getTopics({ creatorId: 'user-123' });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ creatorId: 'user-123' }),
        }),
      );
    });

    it('should filter by tag', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(0);

      await service.getTopics({ tag: 'politics' });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: expect.objectContaining({
              some: expect.any(Object),
            }),
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(100);

      const result = await service.getTopics({ page: 3, limit: 10 });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
      expect(result.meta.totalPages).toBe(10);
    });

    it('should handle sorting', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(0);

      await service.getTopics({ sortBy: 'title', sortOrder: 'asc' });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        }),
      );
    });

    it('should handle null currentDiversityScore', async () => {
      const topicWithNullDiversity = createMockTopic({
        currentDiversityScore: null,
      });
      mockPrisma.discussionTopic.findMany.mockResolvedValue([topicWithNullDiversity]);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      const result = await service.getTopics({});

      expect(result.data[0].currentDiversityScore).toBeNull();
    });
  });

  describe('getTopicById', () => {
    it('should return topic by ID', async () => {
      const mockTopic = createMockTopic();
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(mockTopic);

      const result = await service.getTopicById('topic-1');

      expect(result.id).toBe('topic-1');
      expect(result.title).toBe('Test Topic');
      expect(result.tags).toHaveLength(1);
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.getTopicById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchTopics', () => {
    it('should search topics by query string using fullTextSearch', async () => {
      // fullTextSearch returns topic IDs with ranks
      mockSearchService.fullTextSearch.mockResolvedValue([
        { id: 'topic-1', rank: 0.9 },
        { id: 'topic-2', rank: 0.7 },
      ]);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([
        createMockTopic({ id: 'topic-1' }),
        createMockTopic({ id: 'topic-2' }),
      ]);
      mockPrisma.discussionTopic.count.mockResolvedValue(2);

      await service.searchTopics({ q: 'climate' });

      // Should call fullTextSearch with the query
      expect(mockSearchService.fullTextSearch).toHaveBeenCalledWith('climate', expect.any(Number));
      // Should filter by IDs returned from fullTextSearch
      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['topic-1', 'topic-2'] },
          }),
        }),
      );
    });

    it('should return empty results when no search matches', async () => {
      mockSearchService.fullTextSearch.mockResolvedValue([]);

      const result = await service.searchTopics({ q: 'nonexistent' });

      expect(mockSearchService.fullTextSearch).toHaveBeenCalled();
      expect(mockPrisma.discussionTopic.findMany).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should handle pagination in search', async () => {
      mockSearchService.fullTextSearch.mockResolvedValue([
        { id: 'topic-1', rank: 0.9 },
        { id: 'topic-2', rank: 0.8 },
      ]);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([createMockTopic()]);
      mockPrisma.discussionTopic.count.mockResolvedValue(50);

      const result = await service.searchTopics({ q: 'test', page: 2, limit: 10 });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta.totalPages).toBe(5);
    });

    it('should use defaults when no query params provided', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(0);

      await service.searchTopics({});

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });

  describe('getCommonGroundAnalysis', () => {
    const mockAnalysis = {
      id: 'analysis-1',
      topicId: 'topic-1',
      version: 3,
      agreementZones: [{ id: '1', topic: 'test' }],
      misunderstandings: [],
      genuineDisagreements: [],
      overallConsensusScore: { toNumber: () => 0.75 },
      participantCountAtGeneration: 10,
      responseCountAtGeneration: 50,
      createdAt: new Date('2026-01-15'),
    };

    it('should return cached analysis if available', async () => {
      const cachedResult = { id: 'cached-analysis' };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.getCommonGroundAnalysis('topic-1');

      expect(result).toBe(cachedResult);
      expect(mockPrisma.discussionTopic.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(mockAnalysis);

      const result = await service.getCommonGroundAnalysis('topic-1');

      expect(result.id).toBe('analysis-1');
      expect(result.version).toBe(3);
      expect(result.overallConsensusScore).toBe(0.75);
    });

    it('should cache the result after fetching', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(mockAnalysis);

      await service.getCommonGroundAnalysis('topic-1');

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'common-ground:topic:topic-1:latest',
        expect.any(Object),
        3600000,
      );
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.getCommonGroundAnalysis('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if analysis not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(null);

      await expect(service.getCommonGroundAnalysis('topic-1')).rejects.toThrow(
        'No common ground analysis found for topic topic-1',
      );
    });

    it('should fetch specific version when requested', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(mockAnalysis);

      await service.getCommonGroundAnalysis('topic-1', 2);

      expect(mockPrisma.commonGroundAnalysis.findFirst).toHaveBeenCalledWith({
        where: { topicId: 'topic-1', version: 2 },
        orderBy: {},
      });
    });

    it('should use versioned cache key for specific version', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(mockAnalysis);

      await service.getCommonGroundAnalysis('topic-1', 2);

      expect(mockCacheManager.get).toHaveBeenCalledWith('common-ground:topic:topic-1:v2');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'common-ground:topic:topic-1:v2',
        expect.any(Object),
        3600000,
      );
    });

    it('should throw NotFoundException for missing specific version', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(null);

      await expect(service.getCommonGroundAnalysis('topic-1', 99)).rejects.toThrow(
        'Common ground analysis version 99 not found for topic topic-1',
      );
    });

    it('should handle null overallConsensusScore', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue({
        ...mockAnalysis,
        overallConsensusScore: null,
      });

      const result = await service.getCommonGroundAnalysis('topic-1');

      expect(result.overallConsensusScore).toBe(0);
    });
  });

  describe('invalidateCommonGroundCache', () => {
    it('should delete latest cache key', async () => {
      await service.invalidateCommonGroundCache('topic-1');

      expect(mockCacheManager.del).toHaveBeenCalledWith('common-ground:topic:topic-1:latest');
    });
  });

  describe('createTopic', () => {
    const createTopicDto = {
      title: 'New Discussion Topic',
      description: 'A detailed description of the topic',
      tags: ['environment', 'policy'],
    };

    const createdTopic = {
      id: 'new-topic-1',
      title: 'New Discussion Topic',
      description: 'A detailed description of the topic',
      slug: 'new-discussion-topic',
      creatorId: 'user-1',
      status: 'SEEDING',
      visibility: 'PUBLIC',
      evidenceStandards: 'STANDARD',
      minimumDiversityScore: { toNumber: () => 0.5 },
      currentDiversityScore: null,
      participantCount: 0,
      responseCount: 0,
      crossCuttingThemes: [],
      createdAt: new Date('2026-02-10'),
      activatedAt: null,
      archivedAt: null,
      lastActivityAt: new Date('2026-02-10'),
      tags: [
        { tag: { id: 'tag-1', name: 'environment', slug: 'environment' } },
        { tag: { id: 'tag-2', name: 'policy', slug: 'policy' } },
      ],
    };

    it('should create a topic successfully with new tags', async () => {
      mockSearchService.isUniqueEnough.mockResolvedValue({ isUnique: true, suggestions: [] });
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('new-discussion-topic');
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.create
        .mockResolvedValueOnce({ id: 'tag-1', name: 'environment', slug: 'environment' })
        .mockResolvedValueOnce({ id: 'tag-2', name: 'policy', slug: 'policy' });
      mockPrisma.discussionTopic.create.mockResolvedValue(createdTopic);
      mockPrisma.discussion.create.mockResolvedValue({ id: 'discussion-1' });

      const result = await service.createTopic('user-1', createTopicDto);

      expect(result.id).toBe('new-topic-1');
      expect(result.title).toBe('New Discussion Topic');
      expect(result.status).toBe('SEEDING');
      expect(result.tags).toHaveLength(2);
      expect(mockSearchService.isUniqueEnough).toHaveBeenCalledWith(
        createTopicDto.title,
        createTopicDto.description,
        true,
      );
      expect(mockSlugGenerator.generateUniqueSlug).toHaveBeenCalledWith(createTopicDto.title);
      expect(mockCacheManager.del).toHaveBeenCalledWith('topics:list');
    });

    it('should throw ConflictException when duplicate topics exist', async () => {
      const duplicateSuggestions = [{ id: 'existing-1', title: 'Similar Topic', similarity: 0.85 }];
      mockSearchService.isUniqueEnough.mockResolvedValue({
        isUnique: false,
        suggestions: duplicateSuggestions,
      });

      await expect(service.createTopic('user-1', createTopicDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.discussionTopic.create).not.toHaveBeenCalled();
    });

    it('should reuse existing tags instead of creating new ones', async () => {
      const existingTag = { id: 'existing-tag', name: 'environment', slug: 'environment' };
      mockSearchService.isUniqueEnough.mockResolvedValue({ isUnique: true, suggestions: [] });
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('new-discussion-topic');
      mockPrisma.tag.findFirst.mockResolvedValue(existingTag);
      mockPrisma.discussionTopic.create.mockResolvedValue(createdTopic);
      mockPrisma.discussion.create.mockResolvedValue({ id: 'discussion-1' });

      await service.createTopic('user-1', createTopicDto);

      expect(mockPrisma.tag.create).not.toHaveBeenCalled();
      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: existingTag.id },
        data: { usageCount: { increment: 1 } },
      });
    });

    it('should handle discussion creation failure gracefully', async () => {
      mockSearchService.isUniqueEnough.mockResolvedValue({ isUnique: true, suggestions: [] });
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('new-discussion-topic');
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.create.mockResolvedValue({
        id: 'tag-1',
        name: 'environment',
        slug: 'environment',
      });
      mockPrisma.discussionTopic.create.mockResolvedValue(createdTopic);
      mockPrisma.discussion.create.mockRejectedValue(new Error('Discussion creation failed'));

      // Topic creation should still succeed even if discussion creation fails
      const result = await service.createTopic('user-1', createTopicDto);

      expect(result.id).toBe('new-topic-1');
    });

    it('should invalidate cache after successful creation', async () => {
      mockSearchService.isUniqueEnough.mockResolvedValue({ isUnique: true, suggestions: [] });
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('new-discussion-topic');
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.create.mockResolvedValue({ id: 'tag-1', name: 'test', slug: 'test' });
      mockPrisma.discussionTopic.create.mockResolvedValue(createdTopic);
      mockPrisma.discussion.create.mockResolvedValue({ id: 'discussion-1' });

      await service.createTopic('user-1', createTopicDto);

      expect(mockCacheManager.del).toHaveBeenCalledWith('topics:list');
    });

    it('should use default values when optional fields not provided', async () => {
      mockSearchService.isUniqueEnough.mockResolvedValue({ isUnique: true, suggestions: [] });
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('new-discussion-topic');
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.create.mockResolvedValue({ id: 'tag-1', name: 'test', slug: 'test' });
      mockPrisma.discussionTopic.create.mockResolvedValue(createdTopic);
      mockPrisma.discussion.create.mockResolvedValue({ id: 'discussion-1' });

      await service.createTopic('user-1', createTopicDto);

      expect(mockPrisma.discussionTopic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SEEDING',
            visibility: 'PUBLIC',
            evidenceStandards: 'STANDARD',
          }),
        }),
      );
    });
  });

  describe('updateTopic', () => {
    const updateTopicDto = {
      title: 'Updated Topic Title',
      description: 'Updated description for the topic that is at least 50 characters long',
      editReason: 'Fixing typos and improving clarity',
    };

    it('should update topic title and description', async () => {
      const existingTopic = createMockTopic();
      const updatedTopic = createMockTopic({
        title: 'Updated Topic Title',
        description: 'Updated description for the topic that is at least 50 characters long',
        slug: 'updated-topic-title',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('updated-topic-title');

      const result = await service.updateTopic('topic-1', 'user-1', updateTopicDto, false);

      expect(result.title).toBe('Updated Topic Title');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalled();
      expect(mockEditService.createEditRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          topicId: 'topic-1',
          editorId: 'user-1',
          previousTitle: 'Test Topic',
          newTitle: 'Updated Topic Title',
        }),
      );
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTopic('nonexistent-topic', 'user-1', updateTopicDto, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when non-owner/non-moderator tries to edit', async () => {
      const existingTopic = createMockTopic({ creatorId: 'other-user' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);

      await expect(service.updateTopic('topic-1', 'user-1', updateTopicDto, false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow moderator to edit any topic', async () => {
      const existingTopic = createMockTopic({ creatorId: 'other-user' });
      const updatedTopic = createMockTopic({
        creatorId: 'other-user',
        title: 'Updated Topic Title',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('updated-topic-title');

      const result = await service.updateTopic('topic-1', 'moderator-user', updateTopicDto, true);

      expect(result.title).toBe('Updated Topic Title');
    });

    it('should throw BadRequestException when editing locked topic without moderator role', async () => {
      const lockedTopic = createMockTopic({ status: 'LOCKED' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(lockedTopic);

      await expect(service.updateTopic('topic-1', 'user-1', updateTopicDto, false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow moderator to edit locked topic', async () => {
      const lockedTopic = createMockTopic({ status: 'LOCKED' });
      const updatedTopic = createMockTopic({ status: 'LOCKED', title: 'Updated Topic Title' });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(lockedTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('updated-topic-title');

      const result = await service.updateTopic('topic-1', 'user-1', updateTopicDto, true);

      expect(result.title).toBe('Updated Topic Title');
    });

    it('should require edit reason for topics older than 24 hours', async () => {
      const oldTopic = createMockTopic({
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(oldTopic);

      await expect(
        service.updateTopic('topic-1', 'user-1', { title: 'New Title' }, false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not require edit reason for topics less than 24 hours old', async () => {
      const newTopic = createMockTopic({
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      });
      const updatedTopic = createMockTopic({ title: 'New Title' });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(newTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('new-title');

      const result = await service.updateTopic('topic-1', 'user-1', { title: 'New Title' }, false);

      expect(result.title).toBe('New Title');
    });

    it('should regenerate slug when title changes', async () => {
      const existingTopic = createMockTopic();
      const updatedTopic = createMockTopic({
        title: 'Completely Different Title',
        slug: 'completely-different-title',
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('completely-different-title');

      await service.updateTopic(
        'topic-1',
        'user-1',
        { title: 'Completely Different Title', editReason: 'Changing title' },
        false,
      );

      expect(mockSlugGenerator.generateUniqueSlug).toHaveBeenCalledWith(
        'Completely Different Title',
      );
    });

    it('should update visibility', async () => {
      const existingTopic = createMockTopic();
      const updatedTopic = createMockTopic({ visibility: 'PRIVATE' });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);

      const result = await service.updateTopic(
        'topic-1',
        'user-1',
        { visibility: 'PRIVATE', editReason: 'Making private' },
        false,
      );

      expect(result.visibility).toBe('PRIVATE');
    });

    it('should handle tag updates', async () => {
      const existingTopic = createMockTopic();
      const updatedTopic = createMockTopic({
        tags: [
          { tag: { id: 'tag-2', name: 'science', slug: 'science' } },
          { tag: { id: 'tag-3', name: 'technology', slug: 'technology' } },
        ],
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);
      mockPrisma.tag.findFirst.mockResolvedValue(null);
      mockPrisma.tag.create
        .mockResolvedValueOnce({ id: 'tag-2', name: 'science', slug: 'science' })
        .mockResolvedValueOnce({ id: 'tag-3', name: 'technology', slug: 'technology' });
      mockPrisma.topicTag.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.topicTag.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);

      const result = await service.updateTopic(
        'topic-1',
        'user-1',
        { tags: ['science', 'technology'], editReason: 'Updating tags' },
        false,
      );

      expect(result.tags).toHaveLength(2);
      expect(mockPrisma.topicTag.deleteMany).toHaveBeenCalledWith({
        where: { topicId: 'topic-1' },
      });
    });

    it('should invalidate cache after update', async () => {
      const existingTopic = createMockTopic();
      const updatedTopic = createMockTopic({ title: 'Updated Title' });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);
      mockSlugGenerator.generateUniqueSlug.mockResolvedValue('updated-title');

      await service.updateTopic(
        'topic-1',
        'user-1',
        { title: 'Updated Title', editReason: 'Updating' },
        false,
      );

      expect(mockCacheManager.del).toHaveBeenCalledWith('topics:list');
    });

    it('should not create edit record when no changes are made', async () => {
      const existingTopic = createMockTopic();
      const sameTopic = createMockTopic();

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(existingTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(sameTopic);

      // Explicitly provide same visibility to avoid false-positive change detection
      await service.updateTopic(
        'topic-1',
        'user-1',
        { title: 'Test Topic', visibility: 'PUBLIC', editReason: 'No real changes' },
        false,
      );

      expect(mockEditService.createEditRecord).not.toHaveBeenCalled();
    });
  });

  describe('updateTopicStatus', () => {
    it('should update topic status from SEEDING to ACTIVE as creator', async () => {
      const seedingTopic = createMockTopic({
        status: 'SEEDING',
        activatedAt: null,
      });
      const activeTopic = createMockTopic({
        status: 'ACTIVE',
        activatedAt: new Date(),
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(seedingTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(activeTopic);

      const result = await service.updateTopicStatus('topic-1', 'user-1', 'ACTIVE', false);

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            activatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should update topic status from ACTIVE to ARCHIVED as creator', async () => {
      const activeTopic = createMockTopic({ status: 'ACTIVE' });
      const archivedTopic = createMockTopic({
        status: 'ARCHIVED',
        archivedAt: new Date(),
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(activeTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(archivedTopic);

      const result = await service.updateTopicStatus('topic-1', 'user-1', 'ARCHIVED', false);

      expect(result.status).toBe('ARCHIVED');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ARCHIVED',
            archivedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should update topic status from ARCHIVED to ACTIVE as creator (unarchive)', async () => {
      const archivedTopic = createMockTopic({
        status: 'ARCHIVED',
        archivedAt: new Date(),
      });
      const activeTopic = createMockTopic({
        status: 'ACTIVE',
        archivedAt: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(archivedTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(activeTopic);

      const result = await service.updateTopicStatus('topic-1', 'user-1', 'ACTIVE', false);

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            archivedAt: null,
          }),
        }),
      );
    });

    it('should allow moderator to lock a topic', async () => {
      const activeTopic = createMockTopic({ status: 'ACTIVE' });
      const lockedTopic = createMockTopic({
        status: 'LOCKED',
        lockedAt: new Date(),
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(activeTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(lockedTopic);

      const result = await service.updateTopicStatus('topic-1', 'moderator-1', 'LOCKED', true);

      expect(result.status).toBe('LOCKED');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'LOCKED',
            lockedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should allow moderator to unlock a topic', async () => {
      const lockedTopic = createMockTopic({
        status: 'LOCKED',
        lockedAt: new Date(),
      });
      const activeTopic = createMockTopic({
        status: 'ACTIVE',
        lockedAt: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(lockedTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(activeTopic);

      const result = await service.updateTopicStatus('topic-1', 'moderator-1', 'ACTIVE', true);

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
            lockedAt: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTopicStatus('nonexistent-topic', 'user-1', 'ACTIVE', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when non-creator/non-moderator tries to change status', async () => {
      const topic = createMockTopic({ creatorId: 'user-1' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(
        service.updateTopicStatus('topic-1', 'other-user', 'ARCHIVED', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when creator tries to lock topic', async () => {
      const topic = createMockTopic({ status: 'ACTIVE' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(service.updateTopicStatus('topic-1', 'user-1', 'LOCKED', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when creator tries to unlock locked topic', async () => {
      const lockedTopic = createMockTopic({ status: 'LOCKED' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(lockedTopic);

      await expect(service.updateTopicStatus('topic-1', 'user-1', 'ACTIVE', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when creator tries to revert to SEEDING', async () => {
      const activeTopic = createMockTopic({ status: 'ACTIVE' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(activeTopic);

      await expect(
        service.updateTopicStatus('topic-1', 'user-1', 'SEEDING', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not set activatedAt if topic was already activated before', async () => {
      const archivedTopic = createMockTopic({
        status: 'ARCHIVED',
        activatedAt: new Date('2026-01-01'),
        archivedAt: new Date('2026-01-15'),
      });
      const reactivatedTopic = createMockTopic({
        status: 'ACTIVE',
        activatedAt: new Date('2026-01-01'),
        archivedAt: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(archivedTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(reactivatedTopic);

      await service.updateTopicStatus('topic-1', 'user-1', 'ACTIVE', false);

      // Should NOT include activatedAt since it was already set
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            activatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should invalidate cache after status update', async () => {
      const topic = createMockTopic({ status: 'ACTIVE' });
      const archivedTopic = createMockTopic({ status: 'ARCHIVED' });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockResolvedValue(archivedTopic);

      await service.updateTopicStatus('topic-1', 'user-1', 'ARCHIVED', false);

      expect(mockCacheManager.del).toHaveBeenCalledWith('topics:list');
    });

    it('should allow moderator to make any status transition', async () => {
      const activeTopic = createMockTopic({ status: 'ACTIVE' });
      const seedingTopic = createMockTopic({ status: 'SEEDING' });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(activeTopic);
      mockPrisma.discussionTopic.update.mockResolvedValue(seedingTopic);

      // Moderators can revert to SEEDING (unlike creators)
      const result = await service.updateTopicStatus('topic-1', 'moderator-1', 'SEEDING', true);

      expect(result.status).toBe('SEEDING');
    });
  });
});
