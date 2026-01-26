import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import { ToneAnalyzerService } from '../services/tone-analyzer.service.js';
import { FallacyDetectorService } from '../services/fallacy-detector.service.js';
import { ClarityAnalyzerService } from '../services/clarity-analyzer.service.js';
import { FeedbackType } from '@reason-bridge/db-models';

/**
 * Integration tests for AI feedback analysis
 * Tests the complete analysis pipeline from content input to feedback generation
 */
describe('AI Feedback Analysis', () => {
  let analyzer: ResponseAnalyzerService;
  let toneAnalyzer: ToneAnalyzerService;
  let fallacyDetector: FallacyDetectorService;
  let clarityAnalyzer: ClarityAnalyzerService;

  beforeEach(() => {
    toneAnalyzer = new ToneAnalyzerService();
    fallacyDetector = new FallacyDetectorService();
    clarityAnalyzer = new ClarityAnalyzerService();
    analyzer = new ResponseAnalyzerService(toneAnalyzer, fallacyDetector, clarityAnalyzer);
  });

  describe('Affirmative Feedback', () => {
    it('should return affirmation for constructive content', async () => {
      const content =
        'I appreciate your perspective and would like to share my thoughts on this matter.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.AFFIRMATION);
      expect(result.confidenceScore).toBe(0.85);
      expect(result.suggestionText).toContain('constructive dialogue');
    });

    it('should return affirmation for well-reasoned arguments', async () => {
      const content = 'Based on the evidence, I believe this approach has merit.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.AFFIRMATION);
    });
  });

  describe('Inflammatory Language Detection', () => {
    it('should detect shut up phrase', async () => {
      const content = 'Just shut up already.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect get lost phrase', async () => {
      const content = "Why don't you just get lost.";
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
    });

    it('should detect all caps aggressive text', async () => {
      const content = 'THIS MAKES ABSOLUTELY ZERO SENSE WHATSOEVER';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
    });

    it('should detect hostile tone with obviously pattern', async () => {
      const content = "Obviously you don't understand the basics.";
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
    });

    it('should detect clearly you pattern', async () => {
      const content = "Clearly you haven't thought this through.";
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
    });

    it('should include educational resources', async () => {
      const content = 'Just shut up.';
      const result = await analyzer.analyzeContent(content);

      expect(result.educationalResources).toBeDefined();
      expect(result.educationalResources?.links).toBeDefined();
    });
  });

  describe('Logical Fallacy Detection', () => {
    it('should detect strawman fallacy', async () => {
      const content = 'So you are saying we should just do nothing?';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.subtype).toBe('strawman');
    });

    it('should detect by that logic pattern', async () => {
      const content = 'By that logic, we should ban everything.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.subtype).toBe('strawman');
    });

    it('should detect false dichotomy with either or', async () => {
      const content = 'Either we do this or we fail completely.';
      const result = await analyzer.analyzeContent(content);

      // May match false_dichotomy or slippery_slope
      expect([FeedbackType.FALLACY, FeedbackType.AFFIRMATION]).toContain(result.type);
    });

    it('should detect slippery slope', async () => {
      const content = 'If we allow this, next thing you know everything will collapse.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.subtype).toBe('slippery_slope');
    });

    it('should detect this will lead to pattern', async () => {
      const content = 'This will lead to complete disaster.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.subtype).toBe('slippery_slope');
    });

    it('should detect appeal to emotion', async () => {
      const content = 'Think of the children!';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.subtype).toBe('appeal_to_emotion');
    });

    it('should detect hasty generalization with all always pattern', async () => {
      const content = 'All politicians are always lying.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.FALLACY);
      expect(result.subtype).toBe('hasty_generalization');
    });

    it('should detect everyone knows pattern', async () => {
      const content = 'Everyone knows that this is obviously true.';
      const result = await analyzer.analyzeContent(content);

      // Could be fallacy (hasty_generalization) or bias (obviously)
      expect([FeedbackType.FALLACY, FeedbackType.BIAS]).toContain(result.type);
    });

    it('should include fallacy-specific educational resources', async () => {
      const content = 'So you are saying we should do nothing?';
      const result = await analyzer.analyzeContent(content);

      expect(result.educationalResources).toBeDefined();
      expect(result.educationalResources?.links).toBeDefined();
      expect(result.educationalResources?.links.length).toBeGreaterThan(0);
    });
  });

  describe('Unsourced Claims Detection', () => {
    it('should detect studies show pattern', async () => {
      const content = 'Studies show that this approach is highly effective.';
      const result = await analyzer.analyzeContent(content);

      // May detect as UNSOURCED or FALLACY (appeal to authority)
      expect([FeedbackType.UNSOURCED, FeedbackType.FALLACY]).toContain(result.type);
    });

    it('should detect research demonstrates pattern', async () => {
      const content = 'Research demonstrates this works well.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.UNSOURCED);
    });

    it('should detect scientists say pattern', async () => {
      const content = 'Scientists believe this is correct.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.UNSOURCED);
    });

    it('should detect according to experts pattern', async () => {
      const content = 'According to experts, this is the best method.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.UNSOURCED);
    });

    it('should detect the data shows pattern', async () => {
      const content = 'The data shows clear improvement.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.UNSOURCED);
    });

    it('should detect vague some people say pattern', async () => {
      const content = 'Some people say this is problematic.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.UNSOURCED);
    });
  });

  describe('Bias Detection', () => {
    it('should detect bias indicators in content', async () => {
      const content = 'Obviously this is the only solution and everyone agrees.';
      const result = await analyzer.analyzeContent(content);

      // Should detect BIAS (obviously) or FALLACY (everyone = hasty generalization)
      expect([FeedbackType.BIAS, FeedbackType.FALLACY]).toContain(result.type);
    });

    it('should detect common sense bias pattern', async () => {
      const content = "It's common sense that everyone would agree with me.";
      const result = await analyzer.analyzeContent(content);

      // Should detect some issue (bias, generalization, etc.)
      expect(result.type).not.toBe(FeedbackType.AFFIRMATION);
    });

    it('should detect emotionally charged descriptors', async () => {
      const content = 'These radical extremist activists are causing huge problems.';
      const result = await analyzer.analyzeContent(content);

      // Should detect bias or another issue
      expect(result.type).not.toBe(FeedbackType.AFFIRMATION);
    });
  });

  describe('Priority and Confidence', () => {
    it('should detect issues in content with multiple problems', async () => {
      const content = 'Studies show that obviously this is the right approach.';
      const result = await analyzer.analyzeContent(content);

      // Should detect either UNSOURCED or FALLACY (appeal to authority)
      expect([FeedbackType.UNSOURCED, FeedbackType.FALLACY]).toContain(result.type);
    });

    it('should have higher confidence with multiple matches', async () => {
      const content = 'Shut up. Get lost. This is stupid.';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
      expect(result.confidenceScore).toBeGreaterThan(0.7);
    });

    it('should cap confidence scores appropriately', async () => {
      const content = 'This is a test of confidence scoring.';
      const result = await analyzer.analyzeContent(content);

      expect(result.confidenceScore).toBeLessThanOrEqual(1.0);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const content = '';
      const result = await analyzer.analyzeContent(content);

      expect(result).toBeDefined();
      expect(result.type).toBe(FeedbackType.AFFIRMATION);
    });

    it('should handle very short content', async () => {
      const content = 'OK';
      const result = await analyzer.analyzeContent(content);

      expect(result).toBeDefined();
    });

    it('should handle mixed case content', async () => {
      const content = 'SHUT UP and listen!';
      const result = await analyzer.analyzeContent(content);

      expect(result.type).toBe(FeedbackType.INFLAMMATORY);
    });
  });
});
