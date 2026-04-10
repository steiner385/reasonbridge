/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tests to verify AI (Bedrock/Claude) correctly detects inflammatory language
 * that might be missed by regex patterns.
 *
 * These tests mock the Bedrock client and verify that:
 * 1. The AI prompt correctly instructs Claude to detect inflammatory language
 * 2. The AI response is correctly parsed and returned
 * 3. Fallback to regex works when AI is unavailable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackService } from '../feedback/feedback.service.js';
import { FeedbackSensitivity } from '../feedback/dto/request-feedback.dto.js';
import { FeedbackType } from '@prisma/client';

// Mock the response analyzer (regex-based)
const createMockResponseAnalyzer = () => ({
  analyzeContent: vi.fn(),
  analyzeContentFull: vi.fn().mockResolvedValue([
    {
      type: FeedbackType.AFFIRMATION,
      subtype: 'constructive',
      suggestionText: 'Looks good',
      reasoning: 'No issues detected',
      confidenceScore: 0.8,
    },
  ]),
});

// Mock the semantic cache
const createMockSemanticCache = () => ({
  getOrAnalyze: vi.fn(),
  lookup: vi.fn(),
});

// Mock the Redis cache
const createMockRedisCache = () => ({
  findFeedback: vi.fn().mockResolvedValue(null),
  setFeedback: vi.fn().mockResolvedValue(undefined),
});

// Mock the Bedrock service
const createMockBedrockService = () => ({
  isReady: vi.fn().mockResolvedValue(true),
  complete: vi.fn(),
});

// Mock Prisma
const createMockPrisma = () => ({
  response: { findUnique: vi.fn() },
  feedback: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
});

describe('AI Inflammatory Detection', () => {
  let service: FeedbackService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAnalyzer: ReturnType<typeof createMockResponseAnalyzer>;
  let mockSemanticCache: ReturnType<typeof createMockSemanticCache>;
  let mockBedrockService: ReturnType<typeof createMockBedrockService>;
  let mockRedisCache: ReturnType<typeof createMockRedisCache>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockAnalyzer = createMockResponseAnalyzer();
    mockSemanticCache = createMockSemanticCache();
    mockBedrockService = createMockBedrockService();
    mockRedisCache = createMockRedisCache();

    service = new FeedbackService(
      mockPrisma as any,
      mockAnalyzer as any,
      mockSemanticCache as any,
      mockBedrockService as any,
      mockRedisCache as any,
    );
  });

  describe('previewFeedbackAI - when Bedrock is available', () => {
    it('should detect "this whole conversation is stupid" as inflammatory', async () => {
      const inflammatoryContent = 'This whole conversation is really stupid';

      // Mock Claude's response - what we expect Claude to return
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify([
          {
            type: 'INFLAMMATORY',
            subtype: 'dismissive_language',
            suggestion: 'Consider expressing disagreement without dismissing the entire discussion',
            reasoning:
              'Calling the conversation "stupid" dismisses all participants and contributions',
            confidence: 0.9,
          },
        ]),
      });

      const result = await service.previewFeedbackAI({
        content: inflammatoryContent,
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Verify Bedrock was called with the content
      expect(mockBedrockService.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining(inflammatoryContent),
            }),
          ]),
        }),
      );

      // Verify the result indicates inflammatory content
      expect(result.readyToPost).toBe(false);
      expect(result.feedback).toHaveLength(1);
      expect(result.feedback[0].type).toBe('INFLAMMATORY');
      expect(result.feedback[0].subtype).toBe('dismissive_language');
    });

    it('should detect subtle condescension that regex might miss', async () => {
      const subtleContent =
        "I'm sure you tried your best to understand this, but let me explain it more simply for you";

      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify([
          {
            type: 'INFLAMMATORY',
            subtype: 'condescension',
            suggestion: 'Avoid implying the other person lacks understanding',
            reasoning:
              'The phrasing suggests the reader is incapable of understanding complex ideas',
            confidence: 0.85,
          },
        ]),
      });

      const result = await service.previewFeedbackAI({
        content: subtleContent,
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(false);
      expect(result.feedback[0].type).toBe('INFLAMMATORY');
      expect(result.feedback[0].subtype).toBe('condescension');
    });

    it('should detect sarcastic dismissal', async () => {
      const sarcasticContent =
        'Oh sure, because your opinion is clearly the only one that matters here';

      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify([
          {
            type: 'INFLAMMATORY',
            subtype: 'sarcastic_dismissal',
            suggestion: 'Express disagreement directly rather than through sarcasm',
            reasoning: "Sarcastic tone dismisses the other person's contributions",
            confidence: 0.88,
          },
        ]),
      });

      const result = await service.previewFeedbackAI({
        content: sarcasticContent,
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(false);
      expect(result.feedback[0].type).toBe('INFLAMMATORY');
    });

    it('should approve constructive content', async () => {
      const constructiveContent =
        'I respectfully disagree with this perspective. Here is why I think differently...';

      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify([
          {
            type: 'AFFIRMATION',
            subtype: 'constructive_engagement',
            suggestion: 'Great use of respectful disagreement',
            reasoning: 'The response expresses disagreement while remaining respectful',
            confidence: 0.92,
          },
        ]),
      });

      const result = await service.previewFeedbackAI({
        content: constructiveContent,
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(true);
      expect(result.feedback[0].type).toBe('AFFIRMATION');
    });

    it('should include the correct system prompt for inflammatory detection', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: JSON.stringify([
          { type: 'AFFIRMATION', suggestion: '', reasoning: '', confidence: 0.9 },
        ]),
      });

      await service.previewFeedbackAI({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Verify the system prompt includes inflammatory detection instructions
      expect(mockBedrockService.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('Inflammatory language'),
        }),
      );

      // Verify it mentions specific inflammatory behaviors
      expect(mockBedrockService.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('Personal attacks'),
        }),
      );

      expect(mockBedrockService.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('hostile tone'),
        }),
      );

      expect(mockBedrockService.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('dismissiveness'),
        }),
      );
    });
  });

  describe('previewFeedbackAI - fallback when Bedrock unavailable', () => {
    it('should fall back to regex analysis when Bedrock is not ready', async () => {
      mockBedrockService.isReady.mockResolvedValue(false);

      // Mock the regex analyzer to return inflammatory result
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        {
          type: FeedbackType.INFLAMMATORY,
          subtype: 'personal_attack',
          suggestionText: 'Consider rephrasing...',
          reasoning: 'Detected inflammatory language',
          confidenceScore: 0.75,
        },
      ]);

      const result = await service.previewFeedbackAI({
        content: 'This whole conversation is really stupid',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Verify Bedrock was NOT called
      expect(mockBedrockService.complete).not.toHaveBeenCalled();

      // Verify regex analyzer was used instead
      expect(mockAnalyzer.analyzeContentFull).toHaveBeenCalled();

      // Result should still indicate inflammatory content
      expect(result.feedback[0].type).toBe(FeedbackType.INFLAMMATORY);
    });

    it('should fall back to regex when Bedrock call fails', async () => {
      mockBedrockService.isReady.mockResolvedValue(true);
      mockBedrockService.complete.mockRejectedValue(new Error('Bedrock connection failed'));

      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        {
          type: FeedbackType.INFLAMMATORY,
          subtype: 'personal_attack',
          suggestionText: 'Consider rephrasing...',
          reasoning: 'Detected inflammatory language',
          confidenceScore: 0.75,
        },
      ]);

      const result = await service.previewFeedbackAI({
        content: 'This whole conversation is really stupid',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Should have attempted Bedrock first
      expect(mockBedrockService.complete).toHaveBeenCalled();

      // Then fallen back to regex
      expect(mockAnalyzer.analyzeContentFull).toHaveBeenCalled();

      // Result should still work
      expect(result.feedback[0].type).toBe(FeedbackType.INFLAMMATORY);
    });
  });

  describe('Edge cases for AI detection', () => {
    it('should handle malformed AI response gracefully', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: 'This is not valid JSON',
      });

      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        {
          type: FeedbackType.AFFIRMATION,
          suggestionText: 'Looks good',
          reasoning: 'No issues detected',
          confidenceScore: 0.8,
        },
      ]);

      const result = await service.previewFeedbackAI({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Should fall back to regex gracefully
      expect(result.feedback).toBeDefined();
      expect(mockAnalyzer.analyzeContentFull).toHaveBeenCalled();
    });

    it('should handle empty AI response', async () => {
      mockBedrockService.complete.mockResolvedValue({
        content: '[]',
      });

      const result = await service.previewFeedbackAI({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.feedback).toEqual([]);
      expect(result.readyToPost).toBe(true);
    });
  });
});
