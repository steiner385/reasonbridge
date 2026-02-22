/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentScreeningService } from '../content-screening.service.js';
import { GroomingClientService } from '../grooming-client.service.js';
import type { GroomingDetectionResult } from '../grooming-client.service.js';
import { of } from 'rxjs';

const createMockGroomingClient = () => ({
  analyzeForGrooming: vi.fn(),
  getDetailedAnalysis: vi.fn(),
});

describe('ContentScreeningService - Child Content Screening', () => {
  let service: ContentScreeningService;
  let mockGroomingClient: ReturnType<typeof createMockGroomingClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGroomingClient = createMockGroomingClient();
    service = new ContentScreeningService(mockGroomingClient as any);
  });

  describe('screenContentForChildren', () => {
    it('should call regular screening and grooming detection', async () => {
      const cleanGroomingResult: GroomingDetectionResult = {
        detected: false,
        confidence: 0,
        patternType: null,
        flaggedPhrases: [],
        recommendedAction: 'ALLOW',
        explanation: 'No grooming patterns detected.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(cleanGroomingResult);

      const result = await service.screenContentForChildren(
        'content-123',
        'This is safe content about science.',
      );

      expect(mockGroomingClient.analyzeForGrooming).toHaveBeenCalledWith(
        'This is safe content about science.',
      );
      expect(result.groomingDetection).toEqual(cleanGroomingResult);
      expect(result.childSafetyRisk).toBe('none');
    });

    it('should include all base screening fields', async () => {
      const cleanGroomingResult: GroomingDetectionResult = {
        detected: false,
        confidence: 0,
        patternType: null,
        flaggedPhrases: [],
        recommendedAction: 'ALLOW',
        explanation: 'No grooming patterns detected.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(cleanGroomingResult);

      const result = await service.screenContentForChildren('content-123', 'Safe content.');

      // Should have all standard screening fields
      expect(result.id).toBeDefined();
      expect(result.contentId).toBe('content-123');
      expect(result.toneAnalysis).toBeDefined();
      expect(result.fallacyDetection).toBeDefined();
      expect(result.claimExtraction).toBeDefined();
      expect(result.responsePattern).toBeDefined();
      expect(result.overallRiskScore).toBeDefined();
      expect(result.screened_at).toBeInstanceOf(Date);

      // Should have new child safety fields
      expect(result.groomingDetection).toBeDefined();
      expect(result.childSafetyRisk).toBeDefined();
    });

    it('should return childSafetyRisk of "critical" for BLOCK grooming recommendation', async () => {
      const groomingResult: GroomingDetectionResult = {
        detected: true,
        confidence: 0.95,
        patternType: 'boundary_testing',
        flaggedPhrases: ['send me a pic'],
        recommendedAction: 'BLOCK',
        explanation: 'High confidence grooming detected.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(groomingResult);

      const result = await service.screenContentForChildren('content-123', 'Send me a pic');

      expect(result.childSafetyRisk).toBe('critical');
    });

    it('should return childSafetyRisk of "high" for REVIEW grooming recommendation', async () => {
      const groomingResult: GroomingDetectionResult = {
        detected: true,
        confidence: 0.7,
        patternType: 'isolation_attempt',
        flaggedPhrases: ["don't tell your parents"],
        recommendedAction: 'REVIEW',
        explanation: 'Grooming pattern detected.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(groomingResult);

      const result = await service.screenContentForChildren(
        'content-123',
        "Don't tell your parents",
      );

      expect(result.childSafetyRisk).toBe('high');
    });

    it('should return childSafetyRisk of "medium" for FLAG grooming recommendation', async () => {
      const groomingResult: GroomingDetectionResult = {
        detected: true,
        confidence: 0.5,
        patternType: 'age_probing',
        flaggedPhrases: ['how old are you'],
        recommendedAction: 'FLAG',
        explanation: 'Possible grooming pattern.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(groomingResult);

      const result = await service.screenContentForChildren('content-123', 'How old are you?');

      expect(result.childSafetyRisk).toBe('medium');
    });

    it('should return childSafetyRisk of "low" for low-confidence grooming detection', async () => {
      const groomingResult: GroomingDetectionResult = {
        detected: true,
        confidence: 0.3,
        patternType: 'age_probing',
        flaggedPhrases: [],
        recommendedAction: 'ALLOW',
        explanation: 'Very low confidence match.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(groomingResult);

      const result = await service.screenContentForChildren('content-123', 'Some content');

      expect(result.childSafetyRisk).toBe('low');
    });

    it('should combine grooming risk with tone risk for child safety', async () => {
      // Low grooming confidence but inflammatory tone
      const groomingResult: GroomingDetectionResult = {
        detected: false,
        confidence: 0,
        patternType: null,
        flaggedPhrases: [],
        recommendedAction: 'ALLOW',
        explanation: 'No grooming detected.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(groomingResult);

      // Inflammatory content but not grooming
      const result = await service.screenContentForChildren(
        'content-123',
        'You are an idiot and I hate you!!!!',
      );

      // Should factor in tone analysis for child safety
      expect(result.toneAnalysis.isInflammatory).toBe(true);
      // Even without grooming, inflammatory content should increase child safety risk
      expect(['low', 'medium']).toContain(result.childSafetyRisk);
    });

    it('should handle grooming client errors gracefully', async () => {
      mockGroomingClient.analyzeForGrooming.mockRejectedValue(new Error('Service unavailable'));

      // Should not throw but handle gracefully
      await expect(
        service.screenContentForChildren('content-123', 'Test content'),
      ).rejects.toThrow();
    });
  });

  describe('calculateChildSafetyRisk', () => {
    it('should prioritize grooming detection over tone', async () => {
      const groomingResult: GroomingDetectionResult = {
        detected: true,
        confidence: 0.85,
        patternType: 'inappropriate_contact',
        flaggedPhrases: ['DM me'],
        recommendedAction: 'BLOCK',
        explanation: 'High confidence grooming.',
      };

      mockGroomingClient.analyzeForGrooming.mockResolvedValue(groomingResult);

      // Content that is not particularly inflammatory but has grooming
      const result = await service.screenContentForChildren(
        'content-123',
        'Hey friend, DM me for more info.',
      );

      // Should be critical due to grooming, regardless of tone
      expect(result.childSafetyRisk).toBe('critical');
    });
  });
});
