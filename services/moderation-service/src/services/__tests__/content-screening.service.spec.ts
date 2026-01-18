import { Test, TestingModule } from '@nestjs/testing';
import type { ScreeningResult } from '../content-screening.service.js';
import { ContentScreeningService } from '../content-screening.service.js';

describe('ContentScreeningService', () => {
  let service: ContentScreeningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentScreeningService],
    }).compile();

    service = module.get<ContentScreeningService>(ContentScreeningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('screenContent', () => {
    it('should screen content and return a screening result', async () => {
      const result = await service.screenContent(
        'test-123',
        'This is a normal conversation.',
      );

      expect(result).toBeDefined();
      expect(result.contentId).toBe('test-123');
      expect(result.toneAnalysis).toBeDefined();
      expect(result.fallacyDetection).toBeDefined();
      expect(result.claimExtraction).toBeDefined();
      expect(result.responsePattern).toBeDefined();
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(1);
    });

    it('should detect inflammatory language', async () => {
      const result = await service.screenContent(
        'test-123',
        'You are an absolute idiot who never listens!!!!',
      );

      expect(result.toneAnalysis.isInflammatory).toBe(true);
      expect(result.toneAnalysis.confidence).toBeGreaterThan(0.3);
      expect(result.toneAnalysis.indicators.length).toBeGreaterThan(0);
    });

    it('should detect ad hominem attacks', async () => {
      const result = await service.screenContent(
        'test-123',
        "Of course you would say that - you're just a typical fool.",
      );

      expect(result.toneAnalysis.isInflammatory).toBe(true);
      expect(result.toneAnalysis.indicators.some((i: string) => i.includes('Ad hominem'))).toBe(true);
    });

    it('should detect fallacies in content', async () => {
      const result = await service.screenContent(
        'test-123',
        'All politicians are corrupt. You either support us or you are against us.',
      );

      expect(result.fallacyDetection.total_fallacies).toBeGreaterThan(0);
      expect(result.fallacyDetection.fallacies_found.length).toBeGreaterThan(0);
    });

    it('should extract factual claims', async () => {
      const result = await service.screenContent(
        'test-123',
        'Studies show that 75% of people prefer coffee. Research indicates that experts agree.',
      );

      expect(result.claimExtraction.needs_fact_check).toBe(true);
      expect(result.claimExtraction.claims.length).toBeGreaterThan(0);
    });

    it('should analyze response patterns - System 1 dominant', async () => {
      const result = await service.screenContent(
        'test-123',
        'I hate this idea! It is obviously wrong. Everyone knows this is terrible!',
      );

      expect(result.responsePattern.system1_indicators.length).toBeGreaterThan(0);
      expect(result.responsePattern.emotional_charge).toBeGreaterThan(0.5);
    });

    it('should analyze response patterns - System 2 dominant', async () => {
      const result = await service.screenContent(
        'test-123',
        'Consider the evidence from recent studies. Research indicates that we should evaluate this carefully and examine multiple perspectives before drawing conclusions.',
      );

      expect(result.responsePattern.system2_indicators.length).toBeGreaterThan(0);
    });

    it('should calculate appropriate risk score for clean content', async () => {
      const result = await service.screenContent(
        'test-123',
        'I think we should consider both perspectives on this issue.',
      );

      expect(result.overallRiskScore).toBeLessThan(0.5);
    });

    it('should calculate high risk score for inflammatory content', async () => {
      const result = await service.screenContent(
        'test-123',
        'You are an idiot! This is disgusting and repulsive!!! I hate this!!!',
      );

      expect(result.overallRiskScore).toBeGreaterThan(0.4);
    });
  });

  describe('getRecommendations', () => {
    it('should provide recommendations for high-risk content', async () => {
      const result = await service.screenContent(
        'test-123',
        'You are a complete idiot and a fool! This is absolutely disgusting and repulsive! I hate this!!! Everyone is stupid!!!',
      );

      const recommendations = service.getRecommendations(result);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r: string) => r.includes('flag') || r.includes('moderator') || r.includes('review'))).toBe(true);
    });

    it('should recommend cooling-off prompt for high intensity inflammatory content', async () => {
      const result = await service.screenContent(
        'test-123',
        'I HATE this!!! This is DISGUSTING!!! You are STUPID!!!',
      );

      const recommendations = service.getRecommendations(result);

      expect(recommendations.some((r: string) => r.includes('cooling-off'))).toBe(true);
    });

    it('should recommend educational resources for ad hominem', async () => {
      const result = await service.screenContent(
        'test-123',
        "You're too stupid to understand this. You're just a fool.",
      );

      const recommendations = service.getRecommendations(result);

      expect(recommendations.some((r: string) => r.includes('Educational') || r.includes('constructive'))).toBe(true);
    });

    it('should recommend fact-checking for claims', async () => {
      const result = await service.screenContent(
        'test-123',
        'Studies show 95% of people agree. Research indicates this is true.',
      );

      const recommendations = service.getRecommendations(result);

      expect(recommendations.some((r: string) => r.includes('Fact-check'))).toBe(true);
    });

    it('should recommend System 2 thinking prompts for System 1 dominant content', async () => {
      const result = await service.screenContent(
        'test-123',
        'I feel this is obviously wrong and everyone knows it.',
      );

      const recommendations = service.getRecommendations(result);

      expect(recommendations.some((r: string) => r.includes('System 2') || r.includes('evidence-based'))).toBe(true);
    });

    it('should provide no recommendations for clean content', async () => {
      const result = await service.screenContent(
        'test-123',
        'This is a neutral statement about a topic.',
      );

      const recommendations = service.getRecommendations(result);

      expect(recommendations.length).toBe(0);
    });
  });

  describe('tone analysis', () => {
    it('should detect intense inflammatory language', async () => {
      const result = await service.screenContent(
        'test-123',
        'This is STUPID!!! This is DISGUSTING!!! I HATE this!!!',
      );

      expect(result.toneAnalysis.intensity).toBe('high');
    });

    it('should detect moderate inflammatory language', async () => {
      const result = await service.screenContent(
        'test-123',
        'This seems wrong and misguided in my opinion.',
      );

      expect(result.toneAnalysis.isInflammatory).toBe(false);
      expect(result.toneAnalysis.intensity).toBe('low');
    });
  });

  describe('edge cases', () => {
    it('should handle very short content', async () => {
      const result = await service.screenContent('test-123', 'Hi');

      expect(result).toBeDefined();
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle content with multiple languages/scripts', async () => {
      const result = await service.screenContent(
        'test-123',
        'This is English with numbers 123 and symbols @#$%',
      );

      expect(result).toBeDefined();
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty or near-empty content gracefully', async () => {
      const result = await service.screenContent('test-123', '   ');

      expect(result).toBeDefined();
      expect(result.overallRiskScore).toBeLessThan(0.1);
    });
  });
});
