/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integration tests for confidence metadata storage and tracking.
 * Verifies that:
 * 1. Confidence scores are persisted correctly to the database
 * 2. Confidence data supports quality monitoring queries
 * 3. Analytics can aggregate confidence metrics by type
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackService } from '../../src/feedback/feedback.service.js';
import { FeedbackSensitivity } from '../../src/feedback/dto/index.js';
import type { AnalysisResult } from '../../src/services/response-analyzer.service.js';
import { Prisma, FeedbackType } from '@prisma/client';

describe('Confidence Metadata Storage', () => {
  let service: FeedbackService;
  let mockPrisma: any;
  let mockAnalyzer: any;
  let mockSemanticCache: any;
  let mockBedrock: any;
  let mockRedisCache: any;
  let storedFeedback: any[];

  beforeEach(() => {
    storedFeedback = [];

    mockPrisma = {
      response: { findUnique: vi.fn() },
      feedback: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const record = {
            id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            ...data,
            confidenceScore: data.confidenceScore,
            createdAt: new Date(),
          };
          storedFeedback.push(record);
          return record;
        }),
        findUnique: vi.fn(),
        findMany: vi.fn().mockImplementation(async (query) => {
          let results = [...storedFeedback];

          if (query?.where?.type) {
            results = results.filter((f) => f.type === query.where.type);
          }
          if (query?.where?.displayedToUser !== undefined) {
            results = results.filter((f) => f.displayedToUser === query.where.displayedToUser);
          }
          if (query?.where?.confidenceScore?.gte !== undefined) {
            const threshold = Number(query.where.confidenceScore.gte);
            results = results.filter((f) => Number(f.confidenceScore) >= threshold);
          }

          return results;
        }),
        groupBy: vi.fn().mockImplementation(async (query) => {
          const groups = new Map<string, { count: number; confidenceSum: number }>();

          for (const feedback of storedFeedback) {
            const key = feedback.type;
            const existing = groups.get(key) || { count: 0, confidenceSum: 0 };
            groups.set(key, {
              count: existing.count + 1,
              confidenceSum: existing.confidenceSum + Number(feedback.confidenceScore),
            });
          }

          return Array.from(groups.entries()).map(([type, data]) => ({
            type,
            _count: { id: data.count },
            _avg: { confidenceScore: data.confidenceSum / data.count },
          }));
        }),
      },
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
      getFeedback: vi.fn().mockResolvedValue(null),
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

  describe('Confidence score persistence', () => {
    it('should store confidence score as Decimal(3,2) in database', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.87));

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confidenceScore: expect.any(Prisma.Decimal),
          }),
        }),
      );

      // Verify the stored value
      const createCall = mockPrisma.feedback.create.mock.calls[0][0];
      const storedDecimal = createCall.data.confidenceScore;
      expect(Number(storedDecimal)).toBe(0.87);
    });

    it('should preserve precision for confidence scores', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      // Test various confidence values
      const testCases = [0.0, 0.15, 0.5, 0.75, 0.85, 0.99, 1.0];

      for (const confidence of testCases) {
        mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', confidence));

        await service.requestFeedback({
          responseId: 'response-1',
          content: `Content with confidence ${confidence}`,
          sensitivity: FeedbackSensitivity.MEDIUM,
        });
      }

      expect(storedFeedback).toHaveLength(testCases.length);

      // Verify each stored confidence value
      testCases.forEach((expected, index) => {
        const stored = Number(storedFeedback[index]?.confidenceScore);
        expect(stored).toBeCloseTo(expected, 2);
      });
    });

    it('should store feedback type alongside confidence', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      const feedbackTypes: Array<
        'INFLAMMATORY' | 'FALLACY' | 'BIAS' | 'UNSOURCED' | 'AFFIRMATION'
      > = ['INFLAMMATORY', 'FALLACY', 'BIAS', 'UNSOURCED', 'AFFIRMATION'];

      for (const type of feedbackTypes) {
        mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult(type, 0.8));

        await service.requestFeedback({
          responseId: 'response-1',
          content: `Content of type ${type}`,
          sensitivity: FeedbackSensitivity.MEDIUM,
        });
      }

      expect(storedFeedback).toHaveLength(feedbackTypes.length);

      feedbackTypes.forEach((expectedType, index) => {
        expect(storedFeedback[index]?.type).toBe(expectedType);
        expect(Number(storedFeedback[index]?.confidenceScore)).toBe(0.8);
      });
    });
  });

  describe('Quality monitoring support', () => {
    it('should support querying feedback by confidence threshold', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      // Store feedback with various confidence levels
      const confidenceLevels = [0.3, 0.5, 0.7, 0.85, 0.95];
      for (const conf of confidenceLevels) {
        mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', conf));
        await service.requestFeedback({
          responseId: 'response-1',
          content: `Content with confidence ${conf}`,
          sensitivity: FeedbackSensitivity.MEDIUM,
        });
      }

      // Query for high-confidence feedback (>= 0.8)
      const highConfidence = await mockPrisma.feedback.findMany({
        where: { confidenceScore: { gte: 0.8 } },
      });

      expect(highConfidence).toHaveLength(2); // 0.85 and 0.95
    });

    it('should support querying feedback by displayedToUser flag', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      // Store with different confidence levels (MEDIUM threshold = 0.7)
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.5)); // Not displayed
      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Low confidence',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.9)); // Displayed
      await service.requestFeedback({
        responseId: 'response-1',
        content: 'High confidence',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const displayedFeedback = await mockPrisma.feedback.findMany({
        where: { displayedToUser: true },
      });

      const hiddenFeedback = await mockPrisma.feedback.findMany({
        where: { displayedToUser: false },
      });

      expect(displayedFeedback).toHaveLength(1);
      expect(hiddenFeedback).toHaveLength(1);
    });

    it('should support querying feedback by type', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      // Store multiple types
      const typesWithConfidence: Array<{ type: FeedbackType; confidence: number }> = [
        { type: 'INFLAMMATORY', confidence: 0.8 },
        { type: 'INFLAMMATORY', confidence: 0.9 },
        { type: 'FALLACY', confidence: 0.75 },
        { type: 'BIAS', confidence: 0.85 },
      ];

      for (const { type, confidence } of typesWithConfidence) {
        mockAnalyzer.analyzeContent.mockResolvedValue({
          type,
          suggestionText: `Suggestion for ${type}`,
          reasoning: `Reasoning for ${type}`,
          confidenceScore: confidence,
        });

        await service.requestFeedback({
          responseId: 'response-1',
          content: `Content for ${type}`,
          sensitivity: FeedbackSensitivity.MEDIUM,
        });
      }

      const inflammatoryFeedback = await mockPrisma.feedback.findMany({
        where: { type: 'INFLAMMATORY' },
      });

      expect(inflammatoryFeedback).toHaveLength(2);
    });
  });

  describe('Analytics aggregation support', () => {
    it('should support grouping feedback by type with average confidence', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      // Store multiple feedback records
      const feedbackData: Array<{ type: FeedbackType; confidence: number }> = [
        { type: 'INFLAMMATORY', confidence: 0.8 },
        { type: 'INFLAMMATORY', confidence: 0.9 },
        { type: 'FALLACY', confidence: 0.7 },
        { type: 'FALLACY', confidence: 0.8 },
        { type: 'FALLACY', confidence: 0.9 },
        { type: 'BIAS', confidence: 0.85 },
      ];

      for (const { type, confidence } of feedbackData) {
        mockAnalyzer.analyzeContent.mockResolvedValue({
          type,
          suggestionText: `Suggestion`,
          reasoning: `Reasoning`,
          confidenceScore: confidence,
        });

        await service.requestFeedback({
          responseId: 'response-1',
          content: `Content`,
          sensitivity: FeedbackSensitivity.MEDIUM,
        });
      }

      // Simulate groupBy query for analytics
      const groupedResults = await mockPrisma.feedback.groupBy({
        by: ['type'],
        _count: { id: true },
        _avg: { confidenceScore: true },
      });

      expect(groupedResults).toHaveLength(3);

      const inflammatory = groupedResults.find((g: any) => g.type === 'INFLAMMATORY');
      expect(inflammatory?._count.id).toBe(2);
      expect(inflammatory?._avg.confidenceScore).toBeCloseTo(0.85, 2);

      const fallacy = groupedResults.find((g: any) => g.type === 'FALLACY');
      expect(fallacy?._count.id).toBe(3);
      expect(fallacy?._avg.confidenceScore).toBeCloseTo(0.8, 2);

      const bias = groupedResults.find((g: any) => g.type === 'BIAS');
      expect(bias?._count.id).toBe(1);
      expect(bias?._avg.confidenceScore).toBeCloseTo(0.85, 2);
    });

    it('should track timestamp for time-based monitoring', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.8));

      const beforeCreate = new Date();

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const afterCreate = new Date();

      expect(storedFeedback).toHaveLength(1);
      const createdAt = storedFeedback[0]?.createdAt;

      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Data integrity for monitoring', () => {
    it('should store complete feedback record for audit trail', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });

      const analysisResult: AnalysisResult = {
        type: 'FALLACY',
        subtype: 'strawman',
        suggestionText: 'Address the actual argument presented',
        reasoning: 'The response misrepresents the opposing viewpoint',
        confidenceScore: 0.82,
        educationalResources: {
          links: [{ title: 'Strawman Fallacy', url: 'https://example.com/strawman' }],
        },
      };
      mockAnalyzer.analyzeContent.mockResolvedValue(analysisResult);

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const stored = storedFeedback[0];

      // Verify all fields are stored for monitoring/audit
      expect(stored).toMatchObject({
        responseId: 'response-1',
        type: 'FALLACY',
        subtype: 'strawman',
        suggestionText: 'Address the actual argument presented',
        reasoning: 'The response misrepresents the opposing viewpoint',
        displayedToUser: true, // 0.82 >= 0.7 MEDIUM threshold
        userAcknowledged: false,
        userRevised: false,
      });

      expect(Number(stored.confidenceScore)).toBeCloseTo(0.82, 2);
      expect(stored.educationalResources).toEqual({
        links: [{ title: 'Strawman Fallacy', url: 'https://example.com/strawman' }],
      });
    });

    it('should initialize user interaction tracking fields', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({
        id: 'response-1',
        topicId: 'topic-1',
      });
      mockAnalyzer.analyzeContent.mockResolvedValue(createAnalysisResult('BIAS', 0.8));

      await service.requestFeedback({
        responseId: 'response-1',
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      const stored = storedFeedback[0];

      // User interaction fields should be initialized for tracking
      expect(stored.userAcknowledged).toBe(false);
      expect(stored.userRevised).toBe(false);
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
