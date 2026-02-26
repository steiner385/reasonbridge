/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChildContentController } from '../child-content.controller.js';
import type { ChildScreeningResult } from '../../services/content-screening.service.js';

const createMockContentScreeningService = () => ({
  screenContentForChildren: vi.fn(),
});

describe('ChildContentController', () => {
  let controller: ChildContentController;
  let mockContentScreeningService: ReturnType<typeof createMockContentScreeningService>;

  const mockBaseScreeningResult = {
    id: 'screening_test_123',
    contentId: 'test_123',
    toneAnalysis: {
      isInflammatory: false,
      confidence: 0.1,
      indicators: [],
      intensity: 'low' as const,
    },
    fallacyDetection: {
      fallacies_found: [],
      total_fallacies: 0,
    },
    claimExtraction: {
      claims: [],
      needs_fact_check: false,
    },
    responsePattern: {
      system1_indicators: [],
      system2_indicators: [],
      predominant_system: 'mixed' as const,
      emotional_charge: 0,
    },
    overallRiskScore: 0,
    screened_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContentScreeningService = createMockContentScreeningService();
    controller = new ChildContentController(mockContentScreeningService as any);
  });

  describe('screenContent', () => {
    it('should return safe result for clean content', async () => {
      const mockResult: ChildScreeningResult = {
        ...mockBaseScreeningResult,
        childSafetyRisk: 'none',
        groomingDetection: {
          detected: false,
          confidence: 0,
          patternType: null,
          flaggedPhrases: [],
          recommendedAction: 'ALLOW',
          explanation: 'No grooming patterns detected.',
        },
      };

      mockContentScreeningService.screenContentForChildren.mockResolvedValue(mockResult);

      const result = await controller.screenContent({
        content: 'Hello, this is a friendly message.',
      });

      expect(result.childSafetyRisk).toBe('none');
      expect(result.groomingDetection?.detected).toBe(false);
      expect(result.groomingDetection?.recommendedAction).toBe('ALLOW');
      expect(mockContentScreeningService.screenContentForChildren).toHaveBeenCalledWith(
        expect.stringMatching(/^screen_\d+_\w+$/),
        'Hello, this is a friendly message.',
      );
    });

    it('should return critical risk for severe grooming patterns', async () => {
      const mockResult: ChildScreeningResult = {
        ...mockBaseScreeningResult,
        childSafetyRisk: 'critical',
        groomingDetection: {
          detected: true,
          confidence: 0.95,
          patternType: 'inappropriate_contact',
          flaggedPhrases: ['meet me alone', 'dont tell anyone'],
          recommendedAction: 'BLOCK',
          explanation: 'Severe grooming patterns detected.',
        },
      };

      mockContentScreeningService.screenContentForChildren.mockResolvedValue(mockResult);

      const result = await controller.screenContent({
        content: "Meet me alone, don't tell anyone about this.",
      });

      expect(result.childSafetyRisk).toBe('critical');
      expect(result.groomingDetection?.detected).toBe(true);
      expect(result.groomingDetection?.recommendedAction).toBe('BLOCK');
      expect(result.groomingDetection?.patternType).toBe('inappropriate_contact');
    });

    it('should return high risk for moderate grooming patterns', async () => {
      const mockResult: ChildScreeningResult = {
        ...mockBaseScreeningResult,
        childSafetyRisk: 'high',
        groomingDetection: {
          detected: true,
          confidence: 0.75,
          patternType: 'secrecy_request',
          flaggedPhrases: ["don't tell your parents"],
          recommendedAction: 'REVIEW',
          explanation: 'Potential secrecy request detected.',
        },
      };

      mockContentScreeningService.screenContentForChildren.mockResolvedValue(mockResult);

      const result = await controller.screenContent({
        content: "This is our secret, don't tell your parents.",
      });

      expect(result.childSafetyRisk).toBe('high');
      expect(result.groomingDetection?.detected).toBe(true);
      expect(result.groomingDetection?.recommendedAction).toBe('REVIEW');
    });

    it('should return medium risk for flagged content', async () => {
      const mockResult: ChildScreeningResult = {
        ...mockBaseScreeningResult,
        childSafetyRisk: 'medium',
        groomingDetection: {
          detected: true,
          confidence: 0.5,
          patternType: 'age_probing',
          flaggedPhrases: ['how old are you'],
          recommendedAction: 'FLAG',
          explanation: 'Age probing question detected.',
        },
      };

      mockContentScreeningService.screenContentForChildren.mockResolvedValue(mockResult);

      const result = await controller.screenContent({
        content: 'Hey, how old are you?',
      });

      expect(result.childSafetyRisk).toBe('medium');
      expect(result.groomingDetection?.recommendedAction).toBe('FLAG');
    });

    it('should return safe default for empty content', async () => {
      const result = await controller.screenContent({ content: '' });

      expect(result.childSafetyRisk).toBe('none');
      expect(mockContentScreeningService.screenContentForChildren).not.toHaveBeenCalled();
    });

    it('should return safe default for invalid content type', async () => {
      const result = await controller.screenContent({ content: null as unknown as string });

      expect(result.childSafetyRisk).toBe('none');
      expect(mockContentScreeningService.screenContentForChildren).not.toHaveBeenCalled();
    });

    it('should return safe default on service error', async () => {
      mockContentScreeningService.screenContentForChildren.mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await controller.screenContent({ content: 'Test content' });

      expect(result.childSafetyRisk).toBe('none');
    });

    it('should include all grooming detection fields in response', async () => {
      const mockResult: ChildScreeningResult = {
        ...mockBaseScreeningResult,
        childSafetyRisk: 'high',
        groomingDetection: {
          detected: true,
          confidence: 0.85,
          patternType: 'isolation_attempt',
          flaggedPhrases: ['just between us', "don't tell anyone"],
          recommendedAction: 'REVIEW',
          explanation: 'Isolation attempt detected with secrecy requests.',
        },
      };

      mockContentScreeningService.screenContentForChildren.mockResolvedValue(mockResult);

      const result = await controller.screenContent({
        content: "This is just between us, don't tell anyone.",
      });

      expect(result.groomingDetection).toEqual({
        detected: true,
        confidence: 0.85,
        patternType: 'isolation_attempt',
        flaggedPhrases: ['just between us', "don't tell anyone"],
        recommendedAction: 'REVIEW',
        explanation: 'Isolation attempt detected with secrecy requests.',
      });
    });

    it('should not include groomingDetection if not present in result', async () => {
      const mockResult: ChildScreeningResult = {
        ...mockBaseScreeningResult,
        childSafetyRisk: 'none',
        // groomingDetection is undefined
      };

      mockContentScreeningService.screenContentForChildren.mockResolvedValue(mockResult);

      const result = await controller.screenContent({ content: 'Clean content' });

      expect(result.childSafetyRisk).toBe('none');
      expect(result.groomingDetection).toBeUndefined();
    });
  });
});
