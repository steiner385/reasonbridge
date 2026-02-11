/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TopicQualityController } from './topic-quality.controller.js';
import { TopicQualityRating } from './dto/topic-quality.dto.js';

const createMockQualityService = () => ({
  checkQuality: vi.fn(),
});

describe('TopicQualityController', () => {
  let controller: TopicQualityController;
  let mockService: ReturnType<typeof createMockQualityService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockQualityService();
    controller = new TopicQualityController(mockService as any);
  });

  describe('checkQuality', () => {
    it('should call service with DTO and return result', async () => {
      const dto = {
        title: 'Test Topic',
        description: 'Test description for the topic',
      };

      const expectedResult = {
        rating: TopicQualityRating.GOOD,
        score: 75,
        issues: [],
        strengths: ['Good title length'],
        summary: 'This topic is good overall.',
        usedAI: false,
        analyzedAt: new Date(),
      };

      mockService.checkQuality.mockResolvedValue(expectedResult);

      const result = await controller.checkQuality(dto);

      expect(result).toEqual(expectedResult);
      expect(mockService.checkQuality).toHaveBeenCalledWith(dto);
    });

    it('should pass useAI flag to service', async () => {
      const dto = {
        title: 'Test Topic',
        description: 'Test description',
        useAI: true,
      };

      mockService.checkQuality.mockResolvedValue({
        rating: TopicQualityRating.GOOD,
        score: 80,
        issues: [],
        strengths: [],
        summary: 'Good',
        usedAI: true,
        analyzedAt: new Date(),
      });

      await controller.checkQuality(dto);

      expect(mockService.checkQuality).toHaveBeenCalledWith(
        expect.objectContaining({ useAI: true }),
      );
    });

    it('should pass tags to service', async () => {
      const dto = {
        title: 'Test Topic',
        description: 'Test description',
        tags: ['technology', 'innovation'],
      };

      mockService.checkQuality.mockResolvedValue({
        rating: TopicQualityRating.GOOD,
        score: 80,
        issues: [],
        strengths: [],
        summary: 'Good',
        usedAI: false,
        analyzedAt: new Date(),
      });

      await controller.checkQuality(dto);

      expect(mockService.checkQuality).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['technology', 'innovation'] }),
      );
    });
  });
});
