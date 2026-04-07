/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TopicCommonGroundService } from './topic-common-ground.service.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
  },
  commonGroundAnalysis: {
    findFirst: vi.fn(),
  },
});

const createMockCacheManager = () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
});

const createMockAnalysis = (overrides = {}) => ({
  id: 'analysis-1',
  topicId: 'topic-1',
  version: 1,
  agreementZones: [{ theme: 'Test', confidence: 0.8 }],
  misunderstandings: [],
  genuineDisagreements: [],
  overallConsensusScore: { toNumber: () => 0.75 },
  participantCountAtGeneration: 10,
  responseCountAtGeneration: 50,
  createdAt: new Date(),
  ...overrides,
});

describe('TopicCommonGroundService', () => {
  let service: TopicCommonGroundService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCacheManager = createMockCacheManager();
    service = new TopicCommonGroundService(mockPrisma as any, mockCacheManager as any);
  });

  describe('getAnalysis', () => {
    it('should return cached analysis when available', async () => {
      const cachedAnalysis = {
        id: 'analysis-1',
        version: 1,
        overallConsensusScore: 0.75,
      };
      mockCacheManager.get.mockResolvedValue(cachedAnalysis);

      const result = await service.getAnalysis('topic-1');

      expect(result).toEqual(cachedAnalysis);
      expect(mockPrisma.discussionTopic.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.getAnalysis('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no analysis exists', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(null);

      await expect(service.getAnalysis('topic-1')).rejects.toThrow(NotFoundException);
    });

    it('should fetch and cache analysis from database', async () => {
      const analysis = createMockAnalysis();

      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(analysis);

      const result = await service.getAnalysis('topic-1');

      expect(result.id).toBe('analysis-1');
      expect(result.overallConsensusScore).toBe(0.75);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should fetch specific version when requested', async () => {
      const analysis = createMockAnalysis({ version: 2 });

      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(analysis);

      await service.getAnalysis('topic-1', 2);

      expect(mockPrisma.commonGroundAnalysis.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { topicId: 'topic-1', version: 2 },
        }),
      );
    });

    it('should use version-specific cache key when version is provided', async () => {
      const cachedAnalysis = {
        id: 'analysis-1',
        version: 2,
        overallConsensusScore: 0.75,
      };
      mockCacheManager.get.mockResolvedValue(cachedAnalysis);

      await service.getAnalysis('topic-1', 2);

      expect(mockCacheManager.get).toHaveBeenCalledWith('common-ground:topic:topic-1:v2');
    });

    it('should use latest cache key when no version is provided', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(createMockAnalysis());

      await service.getAnalysis('topic-1');

      expect(mockCacheManager.get).toHaveBeenCalledWith('common-ground:topic:topic-1:latest');
    });

    it('should order by version descending when fetching latest', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(createMockAnalysis());

      await service.getAnalysis('topic-1');

      expect(mockPrisma.commonGroundAnalysis.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { version: 'desc' },
        }),
      );
    });

    it('should map database fields to DTO correctly', async () => {
      const createdAt = new Date('2025-01-15T10:00:00Z');
      const analysis = createMockAnalysis({
        createdAt,
        agreementZones: [
          { description: 'Zone 1', confidence: 0.9, propositionIds: [], participantPercentage: 80 },
        ],
        misunderstandings: [
          { term: 'Term A', description: 'Desc', definitions: [], affectedPropositions: [] },
        ],
        genuineDisagreements: [
          {
            description: 'Disagree 1',
            underlyingValues: [],
            moralFoundations: [],
            propositionIds: [],
          },
        ],
      });

      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(analysis);

      const result = await service.getAnalysis('topic-1');

      expect(result).toMatchObject({
        id: 'analysis-1',
        version: 1,
        overallConsensusScore: 0.75,
        participantCountAtGeneration: 10,
        responseCountAtGeneration: 50,
        generatedAt: createdAt,
      });
      expect(result.agreementZones).toHaveLength(1);
      expect(result.misunderstandings).toHaveLength(1);
      expect(result.genuineDisagreements).toHaveLength(1);
    });

    it('should handle null overallConsensusScore', async () => {
      const analysis = createMockAnalysis({
        overallConsensusScore: null,
      });

      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(analysis);

      const result = await service.getAnalysis('topic-1');

      expect(result.overallConsensusScore).toBe(0);
    });
  });

  describe('invalidateCache', () => {
    it('should delete the latest cache key', async () => {
      await service.invalidateCache('topic-1');

      expect(mockCacheManager.del).toHaveBeenCalledWith('common-ground:topic:topic-1:latest');
    });
  });
});
