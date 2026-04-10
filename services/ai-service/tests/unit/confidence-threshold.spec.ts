/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for confidence threshold enforcement in AI feedback service.
 * Verifies that feedback is only displayed to users when confidence
 * scores meet the threshold for their selected sensitivity level.
 *
 * Thresholds:
 * - LOW: 0.5 (50%) - Show all feedback
 * - MEDIUM: 0.7 (70%) - Default, moderately confident feedback
 * - HIGH: 0.85 (85%) - Only high-confidence feedback
 * - CRITICAL: 0.75 (75%) - Fixed threshold for blocking INFLAMMATORY/FALLACY
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from '../../src/feedback/feedback.service.js';
import { FeedbackSensitivity } from '../../src/feedback/dto/index.js';
import type { AnalysisResult } from '../../src/services/response-analyzer.service.js';

describe('Confidence Threshold Enforcement', () => {
  let service: FeedbackService;
  let mockPrisma: any;
  let mockAnalyzer: any;
  let mockSemanticCache: any;
  let mockBedrock: any;
  let mockRedisCache: any;

  beforeEach(() => {
    mockPrisma = {
      response: { findUnique: vi.fn() },
      feedback: { create: vi.fn(), findUnique: vi.fn() },
    };
    mockAnalyzer = {
      analyzeContentFull: vi.fn(),
      analyzeContent: vi.fn(),
    };
    mockSemanticCache = {
      getOrAnalyze: vi.fn().mockImplementation(async (_content, fn) => fn()),
    };
    mockBedrock = {
      isReady: vi.fn().mockResolvedValue(false),
    };
    mockRedisCache = {
      findFeedback: vi.fn().mockResolvedValue(null),
      setFeedback: vi.fn().mockResolvedValue(undefined),
    };

    service = new FeedbackService(
      mockPrisma,
      mockAnalyzer,
      mockSemanticCache,
      mockBedrock,
      mockRedisCache,
    );
  });

  describe('LOW sensitivity threshold (0.5)', () => {
    it('should display feedback with confidence >= 0.5', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('BIAS', 0.5),
        createAnalysisResult('AFFIRMATION', 0.6),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.LOW,
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(2);
    });

    it('should hide feedback with confidence < 0.5', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('BIAS', 0.49),
        createAnalysisResult('INFLAMMATORY', 0.3),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.LOW,
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(0);
    });

    it('should handle edge case at exactly 0.5 threshold', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([createAnalysisResult('BIAS', 0.5)]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.LOW,
      });

      expect(result.feedback[0]?.shouldDisplay).toBe(true);
    });
  });

  describe('MEDIUM sensitivity threshold (0.7) - Default', () => {
    it('should display feedback with confidence >= 0.7', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('FALLACY', 0.7),
        createAnalysisResult('BIAS', 0.85),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(2);
    });

    it('should hide feedback with confidence < 0.7', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('FALLACY', 0.69),
        createAnalysisResult('BIAS', 0.5),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(0);
    });

    it('should use MEDIUM threshold as default when no sensitivity specified', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('BIAS', 0.69), // Below 0.7
        createAnalysisResult('BIAS', 0.71), // Above 0.7
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        // No sensitivity specified - should default to MEDIUM
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(1);
      expect(displayed[0]?.confidenceScore).toBe(0.71);
    });

    it('should handle edge case at exactly 0.7 threshold', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([createAnalysisResult('BIAS', 0.7)]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.feedback[0]?.shouldDisplay).toBe(true);
    });
  });

  describe('HIGH sensitivity threshold (0.85)', () => {
    it('should display feedback with confidence >= 0.85', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.85),
        createAnalysisResult('FALLACY', 0.95),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.HIGH,
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(2);
    });

    it('should hide feedback with confidence < 0.85', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.84),
        createAnalysisResult('FALLACY', 0.7),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.HIGH,
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(0);
    });

    it('should handle edge case at exactly 0.85 threshold', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([createAnalysisResult('BIAS', 0.85)]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.HIGH,
      });

      expect(result.feedback[0]?.shouldDisplay).toBe(true);
    });
  });

  describe('CRITICAL confidence threshold (0.75) for blocking', () => {
    it('should block posting when INFLAMMATORY has confidence >= 0.75', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.75),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(false);
    });

    it('should block posting when FALLACY has confidence >= 0.75', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([createAnalysisResult('FALLACY', 0.75)]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(false);
    });

    it('should allow posting when INFLAMMATORY has confidence < 0.75', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.74),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(true);
    });

    it('should allow posting when FALLACY has confidence < 0.75', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([createAnalysisResult('FALLACY', 0.74)]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(true);
    });

    it('should allow posting for non-critical types regardless of confidence', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('BIAS', 0.95),
        createAnalysisResult('UNSOURCED', 0.9),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(true);
    });

    it('should allow posting when only AFFIRMATION is present', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('AFFIRMATION', 0.95),
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(true);
    });
  });

  describe('Threshold interaction with multiple feedback items', () => {
    it('should apply threshold to each item independently', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.9), // Above MEDIUM threshold
        createAnalysisResult('BIAS', 0.65), // Below MEDIUM threshold
        createAnalysisResult('FALLACY', 0.75), // Above MEDIUM threshold
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const displayed = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayed).toHaveLength(2);
      expect(displayed.map((f) => f.type)).toContain('INFLAMMATORY');
      expect(displayed.map((f) => f.type)).toContain('FALLACY');
      expect(displayed.map((f) => f.type)).not.toContain('BIAS');
    });

    it('should select highest confidence non-AFFIRMATION as primary', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('BIAS', 0.85),
        createAnalysisResult('FALLACY', 0.9),
        createAnalysisResult('AFFIRMATION', 0.95), // Should not be primary
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.primary?.type).toBe('FALLACY');
      expect(result.primary?.confidenceScore).toBe(0.9);
    });

    it('should not select primary when only AFFIRMATION displayed', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('AFFIRMATION', 0.95),
        createAnalysisResult('BIAS', 0.5), // Below MEDIUM threshold
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.primary).toBeUndefined();
    });
  });

  describe('requestFeedback threshold enforcement', () => {
    it('should set displayedToUser based on threshold when storing feedback', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1', topicId: 'topic-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.65));
      mockPrisma.feedback.create.mockImplementation(async ({ data }) => ({
        id: 'feedback-1',
        ...data,
        createdAt: new Date(),
      }));

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM, // 0.7 threshold
      });

      // 0.65 < 0.7, so displayedToUser should be false
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayedToUser: false,
          }),
        }),
      );
    });

    it('should set displayedToUser true when confidence meets threshold', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1', topicId: 'topic-1' });
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.75));
      mockPrisma.feedback.create.mockImplementation(async ({ data }) => ({
        id: 'feedback-1',
        ...data,
        createdAt: new Date(),
      }));

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM, // 0.7 threshold
      });

      // 0.75 >= 0.7, so displayedToUser should be true
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayedToUser: true,
          }),
        }),
      );
    });
  });
});

/**
 * Helper to create AnalysisResult test fixtures
 */
function createAnalysisResult(
  type: 'INFLAMMATORY' | 'FALLACY' | 'BIAS' | 'UNSOURCED' | 'AFFIRMATION',
  confidenceScore: number,
): AnalysisResult {
  return {
    type,
    suggestionText: `Suggestion for ${type}`,
    reasoning: `Reasoning for ${type}`,
    confidenceScore,
    educationalResources: { links: [] },
  };
}
