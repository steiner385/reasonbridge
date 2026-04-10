/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for low-confidence feedback handling.
 * Verifies that:
 * 1. Low-confidence analyses are still processed and returned
 * 2. Low-confidence items are marked with shouldDisplay: false
 * 3. Low-confidence items are still stored in the database for analytics
 * 4. The user-facing response correctly filters out low-confidence items
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from '../../src/feedback/feedback.service.js';
import { FeedbackSensitivity } from '../../src/feedback/dto/index.js';
import type { AnalysisResult } from '../../src/services/response-analyzer.service.js';
import { Prisma } from '@prisma/client';

describe('Low-Confidence Silent Logging', () => {
  let service: FeedbackService;
  let mockPrisma: any;
  let mockAnalyzer: any;
  let mockSemanticCache: any;
  let mockBedrock: any;
  let mockRedisCache: any;

  beforeEach(() => {
    mockPrisma = {
      response: { findUnique: vi.fn() },
      feedback: { create: vi.fn(), findMany: vi.fn() },
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

  describe('previewFeedback - low-confidence handling', () => {
    it('should return low-confidence items with shouldDisplay: false', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('BIAS', 0.4), // Below all thresholds
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.LOW, // Even with LOW (0.5), 0.4 is below
      });

      expect(result.feedback).toHaveLength(1);
      expect(result.feedback[0]?.type).toBe('BIAS');
      expect(result.feedback[0]?.confidenceScore).toBe(0.4);
      expect(result.feedback[0]?.shouldDisplay).toBe(false);
    });

    it('should include all analysis results regardless of confidence', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.9), // High confidence
        createAnalysisResult('BIAS', 0.3), // Very low confidence
        createAnalysisResult('FALLACY', 0.1), // Extremely low confidence
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // All items should be returned, but only high-confidence displayed
      expect(result.feedback).toHaveLength(3);
      expect(result.feedback.filter((f) => f.shouldDisplay)).toHaveLength(1);
      expect(result.feedback.filter((f) => !f.shouldDisplay)).toHaveLength(2);
    });

    it('should preserve all metadata for low-confidence items', async () => {
      const lowConfidenceResult: AnalysisResult = {
        type: 'FALLACY',
        subtype: 'strawman',
        suggestionText: 'Consider addressing the actual argument',
        reasoning: 'Detected possible strawman construction',
        confidenceScore: 0.35,
        educationalResources: { links: [{ title: 'Fallacies', url: 'https://example.com' }] },
      };
      mockAnalyzer.analyzeContentFull.mockResolvedValue([lowConfidenceResult]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const feedback = result.feedback[0];
      expect(feedback?.type).toBe('FALLACY');
      expect(feedback?.subtype).toBe('strawman');
      expect(feedback?.suggestionText).toBe('Consider addressing the actual argument');
      expect(feedback?.reasoning).toBe('Detected possible strawman construction');
      expect(feedback?.confidenceScore).toBe(0.35);
      expect(feedback?.educationalResources).toEqual({
        links: [{ title: 'Fallacies', url: 'https://example.com' }],
      });
      expect(feedback?.shouldDisplay).toBe(false);
    });

    it('should not include low-confidence items in primary selection', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('FALLACY', 0.95), // Highest but below threshold
        createAnalysisResult('BIAS', 0.5), // Lower confidence
      ]);

      // Use HIGH sensitivity (0.85 threshold) - both items below
      const resultHigh = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.HIGH,
      });

      // With HIGH sensitivity, 0.95 >= 0.85, so FALLACY should be primary
      expect(resultHigh.primary?.type).toBe('FALLACY');

      // Now test with items truly below threshold
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('FALLACY', 0.6), // Below MEDIUM threshold
        createAnalysisResult('BIAS', 0.5), // Below MEDIUM threshold
      ]);

      const resultMedium = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // With MEDIUM sensitivity (0.7), both items are below threshold
      // Primary should be undefined since nothing should display
      expect(resultMedium.primary).toBeUndefined();
    });
  });

  describe('requestFeedback - low-confidence storage', () => {
    it('should store low-confidence feedback with displayedToUser: false', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.4));
      mockPrisma.feedback.create.mockImplementation(async ({ data }) => ({
        id: 'feedback-1',
        ...data,
        createdAt: new Date(),
      }));

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayedToUser: false,
            confidenceScore: expect.any(Prisma.Decimal),
          }),
        }),
      );
    });

    it('should store all feedback metadata even when not displayed', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });
      mockAnalyzer.analyzeContent.mockResolvedValue({
        type: 'FALLACY',
        subtype: 'ad_hominem',
        suggestionText: 'Focus on the argument, not the person',
        reasoning: 'Detected personal attack',
        confidenceScore: 0.3,
        educationalResources: { links: [] },
      });
      mockPrisma.feedback.create.mockImplementation(async ({ data }) => ({
        id: 'feedback-1',
        ...data,
        createdAt: new Date(),
      }));

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'FALLACY',
            subtype: 'ad_hominem',
            suggestionText: 'Focus on the argument, not the person',
            reasoning: 'Detected personal attack',
            displayedToUser: false,
            // User interaction fields should be initialized
            userAcknowledged: false,
            userRevised: false,
          }),
        }),
      );
    });

    it('should not skip analysis for low-confidence content', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('AFFIRMATION', 0.2));
      mockPrisma.feedback.create.mockImplementation(async ({ data }) => ({
        id: 'feedback-1',
        ...data,
        createdAt: new Date(),
      }));

      const result = await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Should still analyze and store, even with very low confidence
      expect(mockAnalyzer.analyzeContent).toHaveBeenCalled();
      expect(mockPrisma.feedback.create).toHaveBeenCalled();
      expect(result.confidenceScore).toBe(0.2);
    });
  });

  describe('Analytics support for low-confidence feedback', () => {
    it('should enable querying of all feedback including low-confidence', async () => {
      // This test verifies the data model supports analytics queries
      // Low-confidence items are stored with displayedToUser: false
      // Analytics can query WHERE displayedToUser = false to find patterns

      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      // Simulate storing both high and low confidence feedback
      const storedFeedback: any[] = [];
      mockPrisma.feedback.create.mockImplementation(async ({ data }) => {
        const record = {
          id: `feedback-${storedFeedback.length + 1}`,
          ...data,
          createdAt: new Date(),
        };
        storedFeedback.push(record);
        return record;
      });

      // Store high confidence
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.85));
      await service.requestFeedback({
        responseId: 'response-1',
        content: 'High confidence content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Store low confidence
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('FALLACY', 0.3));
      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Low confidence content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Verify both are stored
      expect(storedFeedback).toHaveLength(2);

      // Verify display flags are set correctly
      expect(storedFeedback[0]?.displayedToUser).toBe(true);
      expect(storedFeedback[1]?.displayedToUser).toBe(false);

      // Both records should have confidence scores for analytics
      expect(storedFeedback[0]?.confidenceScore).toBeDefined();
      expect(storedFeedback[1]?.confidenceScore).toBeDefined();
    });
  });

  describe('Summary generation with low-confidence items', () => {
    it('should generate positive summary when only low-confidence issues exist', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.5), // Below critical threshold (0.75)
        createAnalysisResult('FALLACY', 0.4), // Below critical threshold
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // Low-confidence critical issues don't block posting
      expect(result.readyToPost).toBe(true);
      expect(result.summary).toContain('Looking good');
    });

    it('should generate warning when high-confidence critical issues exist', async () => {
      mockAnalyzer.analyzeContentFull.mockResolvedValue([
        createAnalysisResult('INFLAMMATORY', 0.8), // Above critical threshold (0.75)
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(result.readyToPost).toBe(false);
      expect(result.summary).toContain('revising');
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
