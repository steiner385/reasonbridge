/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the bedrock service module to prevent AWS SDK loading
vi.mock('../../ai/bedrock.service.js', () => ({
  BedrockService: vi.fn(),
}));

import { InsightsGeneratorService } from './insights-generator.service.js';
import type { GenerateInsightsDto } from '../dto/generate-insights.dto.js';
import type { LearningInsights } from '../types/conversation-mode.types.js';

describe('InsightsGeneratorService', () => {
  let service: InsightsGeneratorService;
  let mockBedrockService: {
    isReady: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
  };

  const createValidDto = (overrides: Partial<GenerateInsightsDto> = {}): GenerateInsightsDto => ({
    transcript: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'I believe climate change is primarily caused by human activity.',
        timestamp: '2025-01-15T10:00:00Z',
      },
      {
        id: 'msg-2',
        role: 'persona',
        content: 'What evidence supports that claim?',
        timestamp: '2025-01-15T10:01:00Z',
      },
      {
        id: 'msg-3',
        role: 'user',
        content:
          'Multiple scientific studies show a correlation between CO2 levels and temperature.',
        timestamp: '2025-01-15T10:02:00Z',
      },
      {
        id: 'msg-4',
        role: 'persona',
        content: 'Correlation does not imply causation. Can you address this?',
        timestamp: '2025-01-15T10:03:00Z',
      },
    ],
    mode: 'socratic',
    persona: {
      name: 'The Skeptic',
      position: 'Questions all claims and demands evidence',
      tone: 'analytical',
    },
    ...overrides,
  });

  const createValidAIResponse = (): LearningInsights => ({
    strengths: [
      'Good use of scientific evidence to support claims',
      'Willingness to engage with challenging questions',
    ],
    improvements: [
      'Could distinguish correlation from causation more clearly',
      'Consider addressing counterarguments proactively',
    ],
    fallaciesCommitted: [
      {
        type: 'Correlation implies causation',
        exchange: 3,
        excerpt:
          'Multiple scientific studies show a correlation between CO2 levels and temperature.',
      },
    ],
    recommendedReadings: [
      {
        title: 'The Logic of Scientific Discovery',
        reason: 'Helps understand the difference between correlation and causation',
      },
    ],
    overallAssessment:
      'Good foundation in evidence-based argumentation but needs to strengthen logical connections between evidence and conclusions.',
  });

  beforeEach(() => {
    mockBedrockService = {
      isReady: vi.fn().mockResolvedValue(true),
      complete: vi.fn(),
    };
    service = new InsightsGeneratorService(
      mockBedrockService as unknown as InstanceType<
        typeof import('../../ai/bedrock.service.js').BedrockService
      >,
    );
  });

  describe('generateInsights', () => {
    it('should return valid LearningInsights with all required fields', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      const result = await service.generateInsights(dto);

      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('fallaciesCommitted');
      expect(result).toHaveProperty('recommendedReadings');
      expect(result).toHaveProperty('overallAssessment');

      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.improvements)).toBe(true);
      expect(Array.isArray(result.fallaciesCommitted)).toBe(true);
      expect(Array.isArray(result.recommendedReadings)).toBe(true);
      expect(typeof result.overallAssessment).toBe('string');
    });

    it('should include transcript content in the AI prompt', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      await service.generateInsights(dto);

      expect(mockBedrockService.complete).toHaveBeenCalledTimes(1);
      const callArgs = mockBedrockService.complete.mock.calls[0][0];

      // The prompt should include the transcript messages
      expect(callArgs.messages[0].content).toContain(
        'I believe climate change is primarily caused by human activity.',
      );
      expect(callArgs.messages[0].content).toContain('What evidence supports that claim?');
      expect(callArgs.messages[0].content).toContain('Multiple scientific studies');
    });

    it('should include conversation mode in the prompt', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto({ mode: 'debate' });
      await service.generateInsights(dto);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('debate');
    });

    it('should include persona information in the prompt', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      await service.generateInsights(dto);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('The Skeptic');
    });

    it('should return fallback insights when BedrockService is not ready', async () => {
      mockBedrockService.isReady.mockResolvedValue(false);

      const dto = createValidDto();
      const result = await service.generateInsights(dto);

      expect(result.overallAssessment).toContain('AI service');
      expect(result.strengths).toHaveLength(0);
      expect(result.improvements).toHaveLength(0);
      expect(result.fallaciesCommitted).toHaveLength(0);
      expect(result.recommendedReadings).toHaveLength(0);
      expect(mockBedrockService.complete).not.toHaveBeenCalled();
    });

    it('should parse JSON response correctly from AI', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      const result = await service.generateInsights(dto);

      expect(result.strengths).toEqual(aiResponse.strengths);
      expect(result.improvements).toEqual(aiResponse.improvements);
      expect(result.fallaciesCommitted).toEqual(aiResponse.fallaciesCommitted);
      expect(result.recommendedReadings).toEqual(aiResponse.recommendedReadings);
      expect(result.overallAssessment).toEqual(aiResponse.overallAssessment);
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: '```json\n' + JSON.stringify(aiResponse) + '\n```',
      });

      const dto = createValidDto();
      const result = await service.generateInsights(dto);

      expect(result.strengths).toEqual(aiResponse.strengths);
      expect(result.overallAssessment).toEqual(aiResponse.overallAssessment);
    });

    it('should handle malformed AI responses with fallback', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'This is not valid JSON at all',
      });

      const dto = createValidDto();
      const result = await service.generateInsights(dto);

      // Should return fallback structure
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('fallaciesCommitted');
      expect(result).toHaveProperty('recommendedReadings');
      expect(result).toHaveProperty('overallAssessment');
      expect(result.overallAssessment).toContain('Unable to generate');
    });

    it('should handle BedrockService errors gracefully', async () => {
      mockBedrockService.complete.mockRejectedValue(new Error('API error'));

      const dto = createValidDto();
      const result = await service.generateInsights(dto);

      expect(result.overallAssessment).toContain('AI service');
      expect(result.strengths).toHaveLength(0);
    });

    it('should include topic context when provided', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto({
        topicContext: 'Environmental policy discussion',
      });
      await service.generateInsights(dto);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Environmental policy discussion');
    });

    it('should use low temperature for consistent analysis', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      await service.generateInsights(dto);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      expect(callArgs.temperature).toBeLessThanOrEqual(0.3);
    });

    it('should request appropriate maxTokens for detailed insights', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      await service.generateInsights(dto);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      expect(callArgs.maxTokens).toBeGreaterThanOrEqual(1024);
    });

    it('should handle partial/incomplete JSON responses', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify({
          strengths: ['One strength'],
          // Missing other fields
        }),
      });

      const dto = createValidDto();
      const result = await service.generateInsights(dto);

      // Should provide defaults for missing fields
      expect(result.strengths).toEqual(['One strength']);
      expect(Array.isArray(result.improvements)).toBe(true);
      expect(Array.isArray(result.fallaciesCommitted)).toBe(true);
      expect(Array.isArray(result.recommendedReadings)).toBe(true);
      expect(typeof result.overallAssessment).toBe('string');
    });

    it('should include system prompt instructing JSON output format', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      await service.generateInsights(dto);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain('JSON');
      expect(callArgs.systemPrompt).toContain('strengths');
      expect(callArgs.systemPrompt).toContain('improvements');
      expect(callArgs.systemPrompt).toContain('fallaciesCommitted');
      expect(callArgs.systemPrompt).toContain('recommendedReadings');
      expect(callArgs.systemPrompt).toContain('overallAssessment');
    });

    it('should number transcript exchanges for fallacy reference', async () => {
      const aiResponse = createValidAIResponse();
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify(aiResponse),
      });

      const dto = createValidDto();
      await service.generateInsights(dto);

      const callArgs = mockBedrockService.complete.mock.calls[0][0];
      // Should include numbered exchanges for reference
      expect(callArgs.messages[0].content).toMatch(/Exchange \d+/i);
    });
  });
});
