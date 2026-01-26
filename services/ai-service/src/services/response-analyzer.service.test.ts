import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseAnalyzerService } from './response-analyzer.service.js';
import { FeedbackType } from '@reason-bridge/db-models';

const createMockToneAnalyzer = () => ({
  analyze: vi.fn().mockResolvedValue(null),
});

const createMockFallacyDetector = () => ({
  analyze: vi.fn().mockResolvedValue(null),
});

const createMockClarityAnalyzer = () => ({
  analyze: vi.fn().mockResolvedValue(null),
});

describe('ResponseAnalyzerService', () => {
  let service: ResponseAnalyzerService;
  let mockTone: ReturnType<typeof createMockToneAnalyzer>;
  let mockFallacy: ReturnType<typeof createMockFallacyDetector>;
  let mockClarity: ReturnType<typeof createMockClarityAnalyzer>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTone = createMockToneAnalyzer();
    mockFallacy = createMockFallacyDetector();
    mockClarity = createMockClarityAnalyzer();
    service = new ResponseAnalyzerService(mockTone as any, mockFallacy as any, mockClarity as any);
  });

  describe('analyzeContent', () => {
    it('should return affirmation when no issues detected', async () => {
      const result = await service.analyzeContent('A well-reasoned response.');

      expect(result.type).toBe(FeedbackType.AFFIRMATION);
      expect(result.suggestionText).toContain('constructive dialogue');
      expect(result.confidenceScore).toBe(0.85);
    });

    it('should call all analyzers in parallel', async () => {
      await service.analyzeContent('Test content');

      expect(mockTone.analyze).toHaveBeenCalledWith('Test content');
      expect(mockFallacy.analyze).toHaveBeenCalledWith('Test content');
      expect(mockClarity.analyze).toHaveBeenCalledWith('Test content');
    });

    it('should return tone result when only tone issues detected', async () => {
      mockTone.analyze.mockResolvedValue({
        type: FeedbackType.INFLAMMATORY,
        subtype: 'hostile_tone',
        suggestionText: 'Consider neutral language',
        reasoning: 'Detected hostile tone',
        confidenceScore: 0.75,
      });

      const result = await service.analyzeContent('Hostile content');

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
      expect(result.subtype).toBe('hostile_tone');
    });

    it('should return fallacy result when only fallacy detected', async () => {
      mockFallacy.analyze.mockResolvedValue({
        type: FeedbackType.FALLACY,
        subtype: 'ad_hominem',
        suggestionText: 'Focus on the argument',
        reasoning: 'Detected ad hominem',
        confidenceScore: 0.8,
      });

      const result = await service.analyzeContent('Content with fallacy');

      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.subtype).toBe('ad_hominem');
    });

    it('should return clarity result when only clarity issues detected', async () => {
      mockClarity.analyze.mockResolvedValue({
        type: FeedbackType.UNSOURCED,
        suggestionText: 'Provide sources',
        reasoning: 'Unsourced claims',
        confidenceScore: 0.7,
      });

      const result = await service.analyzeContent('Studies show that...');

      expect(result.type).toBe(FeedbackType.UNSOURCED);
    });

    it('should return highest confidence result', async () => {
      mockTone.analyze.mockResolvedValue({
        type: FeedbackType.INFLAMMATORY,
        suggestionText: 'Tone suggestion',
        reasoning: 'Tone reasoning',
        confidenceScore: 0.65,
      });
      mockClarity.analyze.mockResolvedValue({
        type: FeedbackType.BIAS,
        suggestionText: 'Bias suggestion',
        reasoning: 'Bias reasoning',
        confidenceScore: 0.85,
      });

      const result = await service.analyzeContent('Test');

      expect(result.type).toBe(FeedbackType.BIAS);
      expect(result.confidenceScore).toBe(0.85);
    });

    it('should prioritize fallacy over inflammatory at equal confidence', async () => {
      mockTone.analyze.mockResolvedValue({
        type: FeedbackType.INFLAMMATORY,
        suggestionText: 'Tone suggestion',
        reasoning: 'Tone reasoning',
        confidenceScore: 0.8,
      });
      mockFallacy.analyze.mockResolvedValue({
        type: FeedbackType.FALLACY,
        suggestionText: 'Fallacy suggestion',
        reasoning: 'Fallacy reasoning',
        confidenceScore: 0.8,
      });

      const result = await service.analyzeContent('Test');

      expect(result.type).toBe(FeedbackType.FALLACY);
    });

    it('should prioritize inflammatory over unsourced at equal confidence', async () => {
      mockTone.analyze.mockResolvedValue({
        type: FeedbackType.INFLAMMATORY,
        suggestionText: 'Tone suggestion',
        reasoning: 'Tone reasoning',
        confidenceScore: 0.75,
      });
      mockClarity.analyze.mockResolvedValue({
        type: FeedbackType.UNSOURCED,
        suggestionText: 'Clarity suggestion',
        reasoning: 'Clarity reasoning',
        confidenceScore: 0.75,
      });

      const result = await service.analyzeContent('Test');

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
    });

    it('should prioritize unsourced over bias at equal confidence', async () => {
      mockClarity.analyze.mockResolvedValue({
        type: FeedbackType.UNSOURCED,
        suggestionText: 'Unsourced suggestion',
        reasoning: 'Unsourced reasoning',
        confidenceScore: 0.7,
      });
      mockFallacy.analyze.mockResolvedValue({
        type: FeedbackType.BIAS,
        suggestionText: 'Bias suggestion',
        reasoning: 'Bias reasoning',
        confidenceScore: 0.7,
      });

      const result = await service.analyzeContent('Test');

      expect(result.type).toBe(FeedbackType.UNSOURCED);
    });

    it('should handle all analyzers returning results', async () => {
      mockTone.analyze.mockResolvedValue({
        type: FeedbackType.INFLAMMATORY,
        suggestionText: 'Tone',
        reasoning: 'Tone',
        confidenceScore: 0.7,
      });
      mockFallacy.analyze.mockResolvedValue({
        type: FeedbackType.FALLACY,
        suggestionText: 'Fallacy',
        reasoning: 'Fallacy',
        confidenceScore: 0.9,
      });
      mockClarity.analyze.mockResolvedValue({
        type: FeedbackType.BIAS,
        suggestionText: 'Bias',
        reasoning: 'Bias',
        confidenceScore: 0.65,
      });

      const result = await service.analyzeContent('Test');

      // Highest confidence wins
      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.confidenceScore).toBe(0.9);
    });

    it('should include educational resources when present', async () => {
      const resources = { links: [{ title: 'Test', url: 'https://test.com' }] };
      mockClarity.analyze.mockResolvedValue({
        type: FeedbackType.UNSOURCED,
        suggestionText: 'Source your claims',
        reasoning: 'Unsourced claims detected',
        confidenceScore: 0.75,
        educationalResources: resources,
      });

      const result = await service.analyzeContent('Studies show...');

      expect(result.educationalResources).toEqual(resources);
    });
  });
});
