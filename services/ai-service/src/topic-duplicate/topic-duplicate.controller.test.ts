/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TopicDuplicateController } from './topic-duplicate.controller.js';
import type { CheckDuplicatesDto } from './dto/topic-duplicate.dto.js';

const createMockDuplicateDetectorService = () => ({
  analyzeCandidates: vi.fn(),
  isSemanticAnalysisAvailable: vi.fn(),
});

describe('TopicDuplicateController', () => {
  let controller: TopicDuplicateController;
  let mockService: ReturnType<typeof createMockDuplicateDetectorService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockDuplicateDetectorService();
    controller = new TopicDuplicateController(mockService as any);
  });

  describe('analyzeDuplicates', () => {
    it('should call service with correct parameters', async () => {
      const dto: CheckDuplicatesDto = {
        title: 'New Topic',
        description: 'New description',
        candidates: [
          {
            id: 'topic-1',
            title: 'Existing Topic',
            description: 'Existing description',
            trigramScore: 0.75,
          },
        ],
      };

      mockService.analyzeCandidates.mockResolvedValue({
        hasDuplicates: false,
        results: [],
        threshold: 0.8,
        analysisMethod: 'semantic',
      });

      await controller.analyzeDuplicates(dto);

      expect(mockService.analyzeCandidates).toHaveBeenCalledWith(
        'New Topic',
        'New description',
        dto.candidates,
      );
    });

    it('should return service response', async () => {
      const expectedResponse = {
        hasDuplicates: true,
        results: [
          {
            id: 'topic-1',
            title: 'Similar Topic',
            description: 'Similar description',
            trigramScore: 0.85,
            semanticScore: 0.9,
            combinedScore: 0.88,
            matchType: 'semantic' as const,
          },
        ],
        threshold: 0.8,
        analysisMethod: 'semantic' as const,
      };

      mockService.analyzeCandidates.mockResolvedValue(expectedResponse);

      const result = await controller.analyzeDuplicates({
        title: 'Test',
        description: 'Test',
        candidates: [],
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('checkAvailability', () => {
    it('should return available true when service is ready', async () => {
      mockService.isSemanticAnalysisAvailable.mockResolvedValue(true);

      const result = await controller.checkAvailability();

      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return available false with reason when service is not ready', async () => {
      mockService.isSemanticAnalysisAvailable.mockResolvedValue(false);

      const result = await controller.checkAvailability();

      expect(result.available).toBe(false);
      expect(result.reason).toBe('OpenAI API key not configured');
    });
  });
});
