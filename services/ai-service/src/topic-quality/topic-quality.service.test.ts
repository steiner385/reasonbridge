/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TopicQualityService } from './topic-quality.service.js';
import { TopicQualityIssueType, TopicQualityRating } from './dto/topic-quality.dto.js';

const createMockBedrockService = () => ({
  isReady: vi.fn().mockResolvedValue(true),
  complete: vi.fn(),
});

describe('TopicQualityService', () => {
  let service: TopicQualityService;
  let mockBedrock: ReturnType<typeof createMockBedrockService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBedrock = createMockBedrockService();
    service = new TopicQualityService(mockBedrock as any);
  });

  describe('checkQuality', () => {
    it('should rate excellent topic as excellent', async () => {
      const result = await service.checkQuality({
        title: 'Should renewable energy be prioritized over nuclear power?',
        description:
          'This topic explores the debate between renewable energy sources (solar, wind) and nuclear power as solutions to climate change. Some argue renewables are safer and more sustainable, while others believe nuclear provides more reliable baseload power. What are the trade-offs between these energy sources?',
      });

      expect(result.rating).toBe(TopicQualityRating.EXCELLENT);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.issues.length).toBeLessThanOrEqual(1);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('should detect vague titles', async () => {
      const result = await service.checkQuality({
        title: 'Thoughts on this',
        description:
          'I was thinking about this issue and wanted to get some perspectives on the matter at hand that we should probably talk about sometime soon.',
      });

      expect(result.issues.some((i) => i.type === TopicQualityIssueType.TITLE_TOO_VAGUE)).toBe(
        true,
      );
      // A vague title should prevent an excellent rating
      expect(result.score).toBeLessThan(95);
    });

    it('should detect leading question titles', async () => {
      const result = await service.checkQuality({
        title: "Why don't people understand the obvious truth about climate change?",
        description:
          'This topic discusses climate change and the scientific consensus around it. We will explore different perspectives on environmental policy.',
      });

      expect(result.issues.some((i) => i.type === TopicQualityIssueType.TITLE_TOO_LEADING)).toBe(
        true,
      );
    });

    it('should detect short descriptions', async () => {
      const result = await service.checkQuality({
        title: 'The future of artificial intelligence in healthcare',
        description: 'AI is changing healthcare.',
      });

      expect(
        result.issues.some((i) => i.type === TopicQualityIssueType.DESCRIPTION_TOO_SHORT),
      ).toBe(true);
      expect(
        result.issues.find((i) => i.type === TopicQualityIssueType.DESCRIPTION_TOO_SHORT)?.severity,
      ).toBe('high');
    });

    it('should detect loaded language', async () => {
      const result = await service.checkQuality({
        title: 'Immigration policy reform',
        description:
          'Obviously everyone knows that current immigration policies are completely broken. Studies show that this is indisputably the case and all experts agree.',
      });

      expect(result.issues.some((i) => i.type === TopicQualityIssueType.LOADED_LANGUAGE)).toBe(
        true,
      );
    });

    it('should detect one-sided framing', async () => {
      const result = await service.checkQuality({
        title: 'The problem with social media',
        description:
          'Social media must be stopped because of its negative effects. The only solution is strict regulation. What is wrong with these platforms needs to be addressed.',
      });

      expect(result.issues.some((i) => i.type === TopicQualityIssueType.ONE_SIDED_FRAMING)).toBe(
        true,
      );
    });

    it('should identify balanced framing as a strength', async () => {
      const result = await service.checkQuality({
        title: 'Universal basic income: pros and cons',
        description:
          'Some argue that universal basic income would reduce poverty and provide security, while others believe it would discourage work and be too expensive. There are differing views on how this policy would affect the economy.',
      });

      expect(result.strengths.some((s) => s.includes('balanced'))).toBe(true);
    });

    it('should identify questions in description as a strength', async () => {
      const result = await service.checkQuality({
        title: 'The ethics of genetic engineering',
        description:
          'Genetic engineering raises many ethical questions. What are the potential benefits and risks? How should society regulate this technology? Should there be limits on what modifications are allowed?',
      });

      expect(result.strengths.some((s) => s.includes('questions'))).toBe(true);
    });

    it('should not use AI by default', async () => {
      const result = await service.checkQuality({
        title: 'Test topic',
        description:
          'This is a test description that is long enough to pass the minimum length requirement for topic descriptions.',
      });

      expect(result.usedAI).toBe(false);
      expect(mockBedrock.complete).not.toHaveBeenCalled();
    });

    it('should use AI when requested and available', async () => {
      mockBedrock.complete.mockResolvedValue({
        content: '[]',
      });

      const result = await service.checkQuality({
        title: 'Test topic for AI analysis',
        description:
          'This is a test description that is long enough to pass the minimum length requirement for topic descriptions.',
        useAI: true,
      });

      expect(result.usedAI).toBe(true);
      expect(mockBedrock.complete).toHaveBeenCalled();
    });

    it('should handle AI returning issues', async () => {
      mockBedrock.complete.mockResolvedValue({
        content: JSON.stringify([
          {
            type: 'too_broad',
            severity: 'medium',
            message: 'The topic scope is very broad',
            suggestion: 'Consider narrowing the focus',
            confidenceScore: 0.8,
          },
        ]),
      });

      const result = await service.checkQuality({
        title: 'Everything about everything',
        description:
          'This topic covers all aspects of everything in the entire universe and beyond, including all possible topics.',
        useAI: true,
      });

      expect(result.usedAI).toBe(true);
      expect(result.issues.some((i) => i.type === TopicQualityIssueType.TOO_BROAD)).toBe(true);
    });

    it('should gracefully handle AI failure', async () => {
      mockBedrock.complete.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.checkQuality({
        title: 'Test topic with AI failure',
        description:
          'This is a test description that is long enough to pass the minimum length requirement for topic descriptions.',
        useAI: true,
      });

      // Should still return results from regex analysis
      expect(result.usedAI).toBe(false);
      expect(result.analyzedAt).toBeDefined();
    });

    it('should calculate score correctly based on issues', async () => {
      // Topic with multiple issues
      const poorResult = await service.checkQuality({
        title: 'Stuff',
        description: 'Obviously bad. Must be stopped.',
      });

      // Topic with no issues
      const goodResult = await service.checkQuality({
        title: 'The impact of remote work on urban development',
        description:
          'Remote work has become increasingly common. Some argue it benefits work-life balance, while others believe it harms urban economies. This topic explores the various perspectives on how remote work affects cities, housing, and social connections.',
      });

      expect(poorResult.score).toBeLessThan(goodResult.score);
      expect(poorResult.rating).not.toBe(TopicQualityRating.EXCELLENT);
    });
  });

  describe('without AI service', () => {
    it('should work without BedrockService', async () => {
      const serviceWithoutAI = new TopicQualityService();

      const result = await serviceWithoutAI.checkQuality({
        title: 'Valid topic title for testing purposes',
        description:
          'This is a valid description that provides enough context for a meaningful discussion about the topic at hand.',
        useAI: true, // Even with useAI true, should work
      });

      expect(result.usedAI).toBe(false);
      expect(result.rating).toBeDefined();
      expect(result.score).toBeDefined();
    });
  });
});
