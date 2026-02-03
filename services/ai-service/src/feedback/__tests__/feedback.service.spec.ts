import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeedbackService } from '../feedback.service.js';
import { FeedbackSensitivity } from '../dto/index.js';
import type { AnalysisResult } from '../../services/response-analyzer.service.js';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockPrismaService: any;
  let mockAnalyzerService: any;
  let mockSemanticCacheService: any;
  let mockRedisCacheService: any;

  const mockAnalysisResults: AnalysisResult[] = [
    {
      type: 'INFLAMMATORY',
      subtype: 'personal_attack',
      suggestionText: 'Consider rephrasing to focus on ideas rather than personal characteristics.',
      reasoning: 'Detected potentially inflammatory language.',
      confidenceScore: 0.85,
      educationalResources: { links: [] },
    },
    {
      type: 'AFFIRMATION',
      suggestionText: 'Your response contributes to constructive dialogue.',
      reasoning: 'No issues detected.',
      confidenceScore: 0.6,
      educationalResources: undefined,
    },
  ];

  beforeEach(() => {
    mockPrismaService = {
      response: { findUnique: vi.fn() },
      feedback: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    };
    mockAnalyzerService = {
      analyzeContentFull: vi.fn().mockResolvedValue(mockAnalysisResults),
      analyzeContent: vi.fn().mockResolvedValue(mockAnalysisResults[0]),
    };
    mockSemanticCacheService = {
      getOrAnalyze: vi
        .fn()
        .mockImplementation(
          async (_content: string, analyzeFunc: () => Promise<AnalysisResult>) => {
            return analyzeFunc();
          },
        ),
    };
    mockRedisCacheService = {
      getFeedback: vi.fn().mockResolvedValue(null),
      setFeedback: vi.fn().mockResolvedValue(undefined),
    };

    // Create service instance directly with mocks
    service = new FeedbackService(
      mockPrismaService,
      mockAnalyzerService,
      mockSemanticCacheService,
      mockRedisCacheService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('previewFeedback', () => {
    it('should return all feedback items with default sensitivity', async () => {
      const result = await service.previewFeedback({
        content: 'This is a test message for preview feedback.',
      });

      expect(result).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.readyToPost).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.analysisTimeMs).toBeGreaterThanOrEqual(0);
      expect(mockAnalyzerService.analyzeContentFull).toHaveBeenCalledWith(
        'This is a test message for preview feedback.',
      );
    });

    it('should filter feedback based on MEDIUM sensitivity (default)', async () => {
      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.MEDIUM,
      });

      // With MEDIUM sensitivity (0.7 threshold), only 0.85 confidence item should display
      const displayedFeedback = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayedFeedback.length).toBe(1);
      expect(displayedFeedback[0]?.type).toBe('INFLAMMATORY');
    });

    it('should show more feedback with LOW sensitivity', async () => {
      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.LOW,
      });

      // With LOW sensitivity (0.5 threshold), both items should display
      const displayedFeedback = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayedFeedback.length).toBe(2);
    });

    it('should show fewer feedback with HIGH sensitivity', async () => {
      mockAnalyzerService.analyzeContentFull = vi.fn().mockResolvedValue([
        { ...mockAnalysisResults[0], confidenceScore: 0.75 }, // Below HIGH threshold
        { ...mockAnalysisResults[1], confidenceScore: 0.9 }, // Above HIGH threshold
      ]);

      const result = await service.previewFeedback({
        content: 'Test content',
        sensitivity: FeedbackSensitivity.HIGH,
      });

      // With HIGH sensitivity (0.85 threshold), only 0.9 confidence item should display
      const displayedFeedback = result.feedback.filter((f) => f.shouldDisplay);
      expect(displayedFeedback.length).toBe(1);
    });

    it('should set readyToPost to false when critical issues detected', async () => {
      const result = await service.previewFeedback({
        content: 'Test content with inflammatory language',
      });

      // INFLAMMATORY with 0.85 confidence >= 0.75 threshold = critical issue
      expect(result.readyToPost).toBe(false);
    });

    it('should set readyToPost to true when no critical issues', async () => {
      mockAnalyzerService.analyzeContentFull = vi.fn().mockResolvedValue([
        {
          type: 'AFFIRMATION',
          suggestionText: 'Looking good!',
          reasoning: 'No issues.',
          confidenceScore: 0.9,
        },
      ]);

      const result = await service.previewFeedback({
        content: 'Test constructive content',
      });

      expect(result.readyToPost).toBe(true);
    });

    it('should use Redis cache when available', async () => {
      const cachedResult: AnalysisResult = {
        type: 'AFFIRMATION',
        suggestionText: 'Cached result',
        reasoning: 'From cache',
        confidenceScore: 0.9,
      };
      mockRedisCacheService.getFeedback = vi.fn().mockResolvedValue(cachedResult);

      const result = await service.previewFeedback({
        content: 'Cached content',
      });

      expect(mockRedisCacheService.getFeedback).toHaveBeenCalled();
      expect(mockAnalyzerService.analyzeContentFull).not.toHaveBeenCalled();
      expect(result.feedback.length).toBe(1);
      expect(result.feedback[0]?.suggestionText).toBe('Cached result');
    });

    it('should cache results after fresh analysis', async () => {
      await service.previewFeedback({
        content: 'New content to cache',
      });

      // Wait for async cache write
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockRedisCacheService.setFeedback).toHaveBeenCalled();
    });

    it('should gracefully handle Redis cache errors', async () => {
      mockRedisCacheService.getFeedback = vi.fn().mockRejectedValue(new Error('Redis error'));

      const result = await service.previewFeedback({
        content: 'Test content',
      });

      // Should still return results from fresh analysis
      expect(result).toBeDefined();
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should generate appropriate summary for critical issues', async () => {
      const result = await service.previewFeedback({
        content: 'Content with inflammatory language',
      });

      expect(result.summary).toContain('revising');
    });

    it('should generate appropriate summary for constructive content', async () => {
      mockAnalyzerService.analyzeContentFull = vi.fn().mockResolvedValue([
        {
          type: 'AFFIRMATION',
          suggestionText: 'Good job!',
          reasoning: 'Constructive.',
          confidenceScore: 0.9,
        },
      ]);

      const result = await service.previewFeedback({
        content: 'Constructive content',
      });

      expect(result.summary).toContain('Looking good');
    });

    it('should identify primary feedback item', async () => {
      const result = await service.previewFeedback({
        content: 'Test content',
      });

      expect(result.primary).toBeDefined();
      expect(result.primary?.type).toBe('INFLAMMATORY');
    });

    it('should not include AFFIRMATION as primary feedback', async () => {
      mockAnalyzerService.analyzeContentFull = vi.fn().mockResolvedValue([
        {
          type: 'AFFIRMATION',
          suggestionText: 'Good!',
          reasoning: 'OK',
          confidenceScore: 0.95,
        },
      ]);

      const result = await service.previewFeedback({
        content: 'Good content',
      });

      expect(result.primary).toBeUndefined();
    });
  });
});
