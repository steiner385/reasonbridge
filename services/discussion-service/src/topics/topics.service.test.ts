import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TopicsService } from './topics.service.js';
import { NotFoundException } from '@nestjs/common';

// Mock Prisma models with Decimal conversion
const createMockPrismaService = () => ({
  discussionTopic: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  commonGroundAnalysis: {
    findFirst: vi.fn(),
  },
});

// Mock Cache Manager
const createMockCacheManager = () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
});

const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  description: 'Test Description',
  creatorId: 'user-1',
  status: 'ACTIVE',
  evidenceStandards: 'STANDARD',
  minimumDiversityScore: { toNumber: () => 0.5 },
  currentDiversityScore: { toNumber: () => 0.7 },
  participantCount: 10,
  responseCount: 25,
  crossCuttingThemes: ['theme1', 'theme2'],
  createdAt: new Date('2026-01-01'),
  activatedAt: new Date('2026-01-02'),
  archivedAt: null,
  tags: [{ tag: { id: 'tag-1', name: 'Politics', slug: 'politics' } }],
  ...overrides,
});

describe('TopicsService', () => {
  let service: TopicsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCacheManager = createMockCacheManager();
    service = new TopicsService(mockPrisma as any, mockCacheManager as any);
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
    it('should search topics by query string', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(0);

      await service.searchTopics({ q: 'climate' });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'climate', mode: 'insensitive' } },
              { description: { contains: 'climate', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should handle pagination in search', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
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
});
