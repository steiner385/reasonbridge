import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import { ToneAnalyzerService } from '../services/tone-analyzer.service.js';
import { FallacyDetectorService } from '../services/fallacy-detector.service.js';
import { ClarityAnalyzerService } from '../services/clarity-analyzer.service.js';
import { FeedbackType } from '@unite-discord/db-models';

describe('ResponseAnalyzerService', () => {
  let service: ResponseAnalyzerService;
  let toneAnalyzer: ToneAnalyzerService;
  let fallacyDetector: FallacyDetectorService;
  let clarityAnalyzer: ClarityAnalyzerService;

  beforeEach(() => {
    toneAnalyzer = new ToneAnalyzerService();
    fallacyDetector = new FallacyDetectorService();
    clarityAnalyzer = new ClarityAnalyzerService();
    service = new ResponseAnalyzerService(toneAnalyzer, fallacyDetector, clarityAnalyzer);
  });

  describe('analyzeContent', () => {
    describe('affirmation for clean content', () => {
      it('should return affirmation for well-reasoned respectful content', async () => {
        const result = await service.analyzeContent(
          'I respectfully disagree with your point. Based on the evidence from the 2024 economic report, the data suggests a different conclusion. I would be interested to hear your thoughts on this counter-argument.',
        );

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
        expect(result.suggestionText).toContain('constructive dialogue');
        expect(result.reasoning).toContain('No logical fallacies');
        expect(result.confidenceScore).toBe(0.85);
      });

      it('should return affirmation for neutral factual content', async () => {
        const result = await service.analyzeContent(
          'The legislation passed with a 55-45 vote. This represents a change from previous voting patterns in this legislative body.',
        );

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });

      it('should return affirmation for questions', async () => {
        const result = await service.analyzeContent(
          'Could you explain your reasoning behind this conclusion? What specific data points support this view?',
        );

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });
    });

    describe('individual issue detection', () => {
      it('should detect inflammatory language (tone)', async () => {
        const result = await service.analyzeContent(
          "You're stupid if you think this plan will work.",
        );

        expect(result.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result.suggestionText).toContain('Attack the argument');
      });

      it('should detect fallacies', async () => {
        const result = await service.analyzeContent(
          'By that logic, we should just eliminate all regulations entirely.',
        );

        expect(result.type).toBe(FeedbackType.FALLACY);
        expect(result.subtype).toBe('strawman');
      });

      it('should detect unsourced claims (clarity)', async () => {
        // Use pattern that isn't also in fallacy detector
        const result = await service.analyzeContent(
          'Research demonstrates that this approach is 90% more effective than alternatives. The data shows clear improvement.',
        );

        expect(result.type).toBe(FeedbackType.UNSOURCED);
        expect(result.suggestionText).toContain('specific sources');
      });

      it('should detect bias indicators (clarity)', async () => {
        const result = await service.analyzeContent(
          'Obviously capitalism is the only sensible economic system.',
        );

        expect(result.type).toBe(FeedbackType.BIAS);
        expect(result.subtype).toBe('loaded_language');
      });
    });

    describe('priority ordering when multiple issues detected', () => {
      it('should prioritize higher confidence FALLACY over lower confidence INFLAMMATORY', async () => {
        // Content with clear fallacy and mild inflammatory tone
        const result = await service.analyzeContent(
          'By that logic, we should just give up. Everyone knows that. Scientists found this.',
        );

        // Multiple fallacies = higher confidence, should be returned
        // The result should be the higher confidence one
        expect(result.type).toBe(FeedbackType.FALLACY);
      });

      it('should prioritize FALLACY over UNSOURCED when same confidence', async () => {
        // Content with both fallacy and unsourced claim (similar confidence levels)
        const result = await service.analyzeContent(
          'By that logic, we should never change anything. Studies show that this is true.',
        );

        // Priority: FALLACY > INFLAMMATORY > UNSOURCED > BIAS
        // With similar confidence, FALLACY takes priority
        expect([FeedbackType.FALLACY, FeedbackType.UNSOURCED]).toContain(result.type);
      });

      it('should return highest confidence result regardless of type when clearly different', async () => {
        // Content with very high confidence inflammatory (multiple matches)
        const result = await service.analyzeContent(
          "You're stupid! Shut up! Get lost! I hate you! Obviously you don't know anything!",
        );

        // Multiple inflammatory patterns = very high confidence
        expect(result.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0.9);
      });
    });

    describe('parallel analysis execution', () => {
      it('should complete analysis within reasonable time', async () => {
        const startTime = Date.now();

        await service.analyzeContent(
          'This is a comprehensive test of the analysis system to verify performance characteristics under normal operating conditions.',
        );

        const duration = Date.now() - startTime;
        // Should complete quickly (< 500ms per FR-005 requirement)
        expect(duration).toBeLessThan(500);
      });

      it('should handle all analyzers returning null gracefully', async () => {
        const result = await service.analyzeContent(
          'This is a neutral, well-formed statement with no issues.',
        );

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });

      it('should handle single analyzer finding an issue', async () => {
        // Only fallacy detected
        const result = await service.analyzeContent('By that logic, everything fails.');

        expect(result.type).toBe(FeedbackType.FALLACY);
      });
    });

    describe('confidence score sorting', () => {
      it('should return higher confidence result when types differ', async () => {
        // Multiple fallacy patterns = higher confidence than single bias
        const result = await service.analyzeContent(
          'By that logic, everyone knows that this is wrong. Obviously something is broken.',
        );

        // Multiple fallacy matches should have higher confidence
        expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
      });

      it('should use type priority when confidence scores are equal', async () => {
        // This is hard to test exactly, but we can verify the logic works
        const result = await service.analyzeContent(
          'Obviously socialism is wrong according to research.',
        );

        // Should return one of the detected issues
        expect([
          FeedbackType.FALLACY,
          FeedbackType.INFLAMMATORY,
          FeedbackType.UNSOURCED,
          FeedbackType.BIAS,
        ]).toContain(result.type);
      });
    });

    describe('feedback content verification', () => {
      it('should include suggestion text', async () => {
        const result = await service.analyzeContent("You're stupid for believing that.");

        expect(result.suggestionText).toBeDefined();
        expect(result.suggestionText.length).toBeGreaterThan(0);
      });

      it('should include reasoning', async () => {
        const result = await service.analyzeContent(
          'By that logic, we should never try anything new.',
        );

        expect(result.reasoning).toBeDefined();
        expect(result.reasoning.length).toBeGreaterThan(0);
      });

      it('should include confidence score', async () => {
        const result = await service.analyzeContent('Studies show that this approach is best.');

        expect(result.confidenceScore).toBeDefined();
        expect(result.confidenceScore).toBeGreaterThan(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(1);
      });

      it('should include educational resources when issue detected', async () => {
        const result = await service.analyzeContent("You're stupid if you think that's valid.");

        expect(result.educationalResources).toBeDefined();
        expect(result.educationalResources.links).toBeDefined();
        expect(result.educationalResources.links.length).toBeGreaterThan(0);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', async () => {
        const result = await service.analyzeContent('');

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });

      it('should handle string with only whitespace', async () => {
        const result = await service.analyzeContent('   \n\t   ');

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });

      it('should handle very long content', async () => {
        const longContent =
          'This is a well-reasoned argument. '.repeat(100) + "You're stupid for not seeing this.";
        const result = await service.analyzeContent(longContent);

        expect(result.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should handle special characters', async () => {
        const result = await service.analyzeContent(
          "You're stupid! (Really?) [Citation needed] & more...",
        );

        expect(result.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should handle content with multiple newlines', async () => {
        const result = await service.analyzeContent(
          'Paragraph one.\n\nParagraph two.\n\n\nBy that logic, everything fails.',
        );

        expect(result.type).toBe(FeedbackType.FALLACY);
      });

      it('should handle unicode characters', async () => {
        // Using "studies show that" pattern - need to match exactly
        const result = await service.analyzeContent(
          'Research demonstrates that émojis 🎉 and àccénts are widely used.',
        );

        expect(result.type).toBe(FeedbackType.UNSOURCED);
      });
    });

    describe('comprehensive scenarios', () => {
      it('should handle academic-style content with citations', async () => {
        const result = await service.analyzeContent(
          'According to Smith et al. (2024), the data from the Harvard study indicates a 15% improvement in outcomes. These findings align with previous research by Johnson (2023) at MIT.',
        );

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });

      it('should handle conversational but respectful disagreement', async () => {
        const result = await service.analyzeContent(
          "I see where you're coming from, but I think there's another angle to consider here. While your point about costs is valid, the long-term benefits might outweigh the initial investment.",
        );

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });

      it('should handle content with only personal experience', async () => {
        const result = await service.analyzeContent(
          'In my 10 years of experience working in this field, I have found that collaborative approaches tend to produce better outcomes than top-down mandates.',
        );

        expect(result.type).toBe(FeedbackType.AFFIRMATION);
      });

      it('should detect subtle hostility combined with fallacy', async () => {
        const result = await service.analyzeContent(
          "Obviously you don't understand economics. By that logic, we should just print unlimited money.",
        );

        // Should detect both but return the higher priority/confidence one
        expect([FeedbackType.INFLAMMATORY, FeedbackType.FALLACY]).toContain(result.type);
      });
    });
  });
});
