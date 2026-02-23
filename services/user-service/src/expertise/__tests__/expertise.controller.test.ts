/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ExpertiseController
 *
 * Tests the REST API endpoints for the expertise system:
 * - GET /users/:id/expertise - Get all domain expertise for user
 * - GET /users/:id/expertise/:tagId - Get expertise in specific category
 * - GET /users/leaderboard/:tagId - Top experts in category
 *
 * @see services/user-service/src/expertise/expertise.controller.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ExpertiseController } from '../expertise.controller.js';
import { ExpertiseLevel } from '@prisma/client';
import { TopicExpertiseDto } from '../dto/topic-expertise.dto.js';

// Mock Prisma client for ExpertiseLevel enum
vi.mock('@prisma/client', () => ({
  ExpertiseLevel: {
    NOVICE: 'NOVICE',
    FAMILIAR: 'FAMILIAR',
    KNOWLEDGEABLE: 'KNOWLEDGEABLE',
    EXPERT: 'EXPERT',
  },
}));

/**
 * Helper to create a mock TopicExpertiseDto
 */
const createMockTopicExpertiseDto = (
  overrides: Partial<{
    userId: string;
    tagId: string;
    tagName: string;
    expertiseScore: number;
    expertiseLevel: ExpertiseLevel;
    responseCount: number;
    avgQualityScore: number;
    credentialBoost: number;
    lastActive: Date | null;
  }> = {},
): TopicExpertiseDto => {
  const data = {
    userId: 'user-123',
    tagId: 'tag-456',
    tagName: 'Science',
    expertiseScore: 0.65,
    expertiseLevel: ExpertiseLevel.KNOWLEDGEABLE,
    responseCount: 42,
    avgQualityScore: 0.7,
    credentialBoost: 0.1,
    lastActive: new Date(),
    ...overrides,
  };
  return new TopicExpertiseDto(data);
};

/**
 * Factory to create a mock ExpertiseService
 */
const createMockExpertiseService = () => ({
  getAllUserExpertise: vi.fn(),
  getUserExpertise: vi.fn(),
  getExpertiseLeaderboard: vi.fn(),
  recalculateExpertise: vi.fn(),
});

describe('ExpertiseController', () => {
  let controller: ExpertiseController;
  let mockExpertiseService: ReturnType<typeof createMockExpertiseService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExpertiseService = createMockExpertiseService();
    controller = new ExpertiseController(mockExpertiseService as any);
  });

  describe('GET /users/:id/expertise', () => {
    it('should return all expertise for a valid user ID', async () => {
      const mockExpertises = [
        createMockTopicExpertiseDto({ tagId: 'tag-1', tagName: 'Science' }),
        createMockTopicExpertiseDto({ tagId: 'tag-2', tagName: 'Technology' }),
        createMockTopicExpertiseDto({ tagId: 'tag-3', tagName: 'Philosophy' }),
      ];
      mockExpertiseService.getAllUserExpertise.mockResolvedValue(mockExpertises);

      const result = await controller.getUserExpertise('user-123');

      expect(result).toHaveLength(3);
      expect(result[0].tagName).toBe('Science');
      expect(result[1].tagName).toBe('Technology');
      expect(result[2].tagName).toBe('Philosophy');
      expect(mockExpertiseService.getAllUserExpertise).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when user has no expertise', async () => {
      mockExpertiseService.getAllUserExpertise.mockResolvedValue([]);

      const result = await controller.getUserExpertise('user-new');

      expect(result).toEqual([]);
      expect(mockExpertiseService.getAllUserExpertise).toHaveBeenCalledWith('user-new');
    });

    it('should return expertise with scores and levels', async () => {
      const mockExpertises = [
        createMockTopicExpertiseDto({
          expertiseScore: 0.85,
          expertiseLevel: ExpertiseLevel.EXPERT,
        }),
      ];
      mockExpertiseService.getAllUserExpertise.mockResolvedValue(mockExpertises);

      const result = await controller.getUserExpertise('user-123');

      expect(result[0].expertiseScore).toBe(0.85);
      expect(result[0].expertiseLevel).toBe(ExpertiseLevel.EXPERT);
    });

    it('should propagate service errors', async () => {
      mockExpertiseService.getAllUserExpertise.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getUserExpertise('user-123')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('GET /users/:id/expertise/:tagId', () => {
    it('should return expertise for specific user and tag', async () => {
      const mockExpertise = createMockTopicExpertiseDto({
        userId: 'user-456',
        tagId: 'tag-789',
        tagName: 'Machine Learning',
        expertiseScore: 0.72,
      });
      mockExpertiseService.getUserExpertise.mockResolvedValue(mockExpertise);

      const result = await controller.getUserExpertiseByTag('user-456', 'tag-789');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-456');
      expect(result.tagId).toBe('tag-789');
      expect(result.tagName).toBe('Machine Learning');
      expect(result.expertiseScore).toBe(0.72);
      expect(mockExpertiseService.getUserExpertise).toHaveBeenCalledWith('user-456', 'tag-789');
    });

    it('should return 404 when expertise not found', async () => {
      mockExpertiseService.getUserExpertise.mockResolvedValue(null);

      await expect(controller.getUserExpertiseByTag('user-123', 'nonexistent-tag')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return full expertise details including response count and quality', async () => {
      const mockExpertise = createMockTopicExpertiseDto({
        responseCount: 150,
        avgQualityScore: 0.85,
        credentialBoost: 0.2,
      });
      mockExpertiseService.getUserExpertise.mockResolvedValue(mockExpertise);

      const result = await controller.getUserExpertiseByTag('user-123', 'tag-456');

      expect(result.responseCount).toBe(150);
      expect(result.avgQualityScore).toBe(0.85);
      expect(result.credentialBoost).toBe(0.2);
    });

    it('should propagate service errors', async () => {
      mockExpertiseService.getUserExpertise.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.getUserExpertiseByTag('user-123', 'tag-456')).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('GET /users/leaderboard/:tagId', () => {
    it('should return list of top experts for a tag', async () => {
      const mockLeaderboard = [
        createMockTopicExpertiseDto({
          userId: 'user-1',
          expertiseScore: 0.95,
          expertiseLevel: ExpertiseLevel.EXPERT,
        }),
        createMockTopicExpertiseDto({
          userId: 'user-2',
          expertiseScore: 0.88,
          expertiseLevel: ExpertiseLevel.EXPERT,
        }),
        createMockTopicExpertiseDto({
          userId: 'user-3',
          expertiseScore: 0.72,
          expertiseLevel: ExpertiseLevel.KNOWLEDGEABLE,
        }),
      ];
      mockExpertiseService.getExpertiseLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getExpertiseLeaderboard('tag-science');

      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].expertiseScore).toBe(0.95);
      expect(result[1].userId).toBe('user-2');
      expect(result[2].userId).toBe('user-3');
      expect(mockExpertiseService.getExpertiseLeaderboard).toHaveBeenCalledWith('tag-science', {
        limit: undefined,
        offset: undefined,
      });
    });

    it('should support limit query parameter', async () => {
      mockExpertiseService.getExpertiseLeaderboard.mockResolvedValue([]);

      await controller.getExpertiseLeaderboard('tag-123', '25');

      expect(mockExpertiseService.getExpertiseLeaderboard).toHaveBeenCalledWith('tag-123', {
        limit: 25,
        offset: undefined,
      });
    });

    it('should support offset query parameter for pagination', async () => {
      mockExpertiseService.getExpertiseLeaderboard.mockResolvedValue([]);

      await controller.getExpertiseLeaderboard('tag-123', '10', '50');

      expect(mockExpertiseService.getExpertiseLeaderboard).toHaveBeenCalledWith('tag-123', {
        limit: 10,
        offset: 50,
      });
    });

    it('should use default values when query params are not provided', async () => {
      mockExpertiseService.getExpertiseLeaderboard.mockResolvedValue([]);

      await controller.getExpertiseLeaderboard('tag-123');

      expect(mockExpertiseService.getExpertiseLeaderboard).toHaveBeenCalledWith('tag-123', {
        limit: undefined,
        offset: undefined,
      });
    });

    it('should handle invalid limit gracefully (NaN)', async () => {
      mockExpertiseService.getExpertiseLeaderboard.mockResolvedValue([]);

      await controller.getExpertiseLeaderboard('tag-123', 'invalid');

      // parseInt('invalid', 10) returns NaN, which should be handled
      expect(mockExpertiseService.getExpertiseLeaderboard).toHaveBeenCalledWith(
        'tag-123',
        expect.objectContaining({
          limit: NaN,
        }),
      );
    });

    it('should return empty array when no experts found', async () => {
      mockExpertiseService.getExpertiseLeaderboard.mockResolvedValue([]);

      const result = await controller.getExpertiseLeaderboard('tag-empty');

      expect(result).toEqual([]);
    });

    it('should return users with their expertise levels and scores', async () => {
      const mockLeaderboard = [
        createMockTopicExpertiseDto({
          userId: 'expert-user',
          expertiseLevel: ExpertiseLevel.EXPERT,
          expertiseScore: 0.92,
        }),
        createMockTopicExpertiseDto({
          userId: 'knowledgeable-user',
          expertiseLevel: ExpertiseLevel.KNOWLEDGEABLE,
          expertiseScore: 0.68,
        }),
      ];
      mockExpertiseService.getExpertiseLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getExpertiseLeaderboard('tag-123');

      expect(result[0].expertiseLevel).toBe(ExpertiseLevel.EXPERT);
      expect(result[0].expertiseScore).toBe(0.92);
      expect(result[1].expertiseLevel).toBe(ExpertiseLevel.KNOWLEDGEABLE);
      expect(result[1].expertiseScore).toBe(0.68);
    });

    it('should propagate service errors', async () => {
      mockExpertiseService.getExpertiseLeaderboard.mockRejectedValue(new Error('Database error'));

      await expect(controller.getExpertiseLeaderboard('tag-123')).rejects.toThrow('Database error');
    });
  });

  describe('Error handling', () => {
    it('should propagate NotFoundException with correct message for missing expertise', async () => {
      mockExpertiseService.getUserExpertise.mockResolvedValue(null);

      try {
        await controller.getUserExpertiseByTag('user-123', 'missing-tag');
        expect.fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toContain('Expertise not found');
      }
    });

    it('should handle concurrent requests gracefully', async () => {
      const mockExpertise = createMockTopicExpertiseDto();
      mockExpertiseService.getUserExpertise.mockResolvedValue(mockExpertise);

      // Simulate concurrent requests
      const promises = [
        controller.getUserExpertiseByTag('user-1', 'tag-1'),
        controller.getUserExpertiseByTag('user-2', 'tag-2'),
        controller.getUserExpertiseByTag('user-3', 'tag-3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockExpertiseService.getUserExpertise).toHaveBeenCalledTimes(3);
    });
  });
});
