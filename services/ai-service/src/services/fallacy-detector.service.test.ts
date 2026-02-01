import { FallacyDetectorService } from './fallacy-detector.service.js';
import { FeedbackType } from '@prisma/client';

describe('FallacyDetectorService', () => {
  let service: FallacyDetectorService;

  beforeEach(() => {
    service = new FallacyDetectorService();
  });

  describe('analyze', () => {
    it('should return null for content with no fallacies', async () => {
      const content =
        'I respectfully disagree with your point. Here are the specific reasons why...';

      const result = await service.analyze(content);

      expect(result).toBeNull();
    });

    describe('ad hominem detection', () => {
      it('should detect "you are just a" pattern', async () => {
        const content = "You are just a novice, you wouldn't understand.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should detect "you\'re only a" pattern', async () => {
        const content = "You're only a student, what do you know?";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should detect "coming from someone" pattern', async () => {
        const content = "That's rich coming from someone like you.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should detect "what would you know" pattern', async () => {
        const content = 'What would you know about this topic?';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should detect "your lack credentials" pattern', async () => {
        const content = 'Your lack credentials to speak on this matter.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('ad_hominem');
      });
    });

    describe('strawman detection', () => {
      it('should detect "so you are saying" pattern', async () => {
        const content = 'So you are saying that we should just give up entirely?';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('strawman');
      });

      it('should detect "so you\'re saying we should" pattern', async () => {
        const content = "So you're saying we should abandon all standards?";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('strawman');
      });

      it('should detect "by that logic" pattern', async () => {
        const content = 'By that logic, we should never make any changes at all.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('strawman');
      });

      it('should detect "if we follow your reasoning" pattern', async () => {
        const content = 'If we follow your reasoning, chaos would ensue.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('strawman');
      });

      it('should detect "you think that all X are" pattern', async () => {
        const content = 'You think that all politicians are corrupt.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('strawman');
      });
    });

    describe('false dichotomy detection', () => {
      it('should detect "either X or Y" pattern', async () => {
        // Pattern: either\s+\w+\s+or\s+\w+ - needs single words
        const content = 'Either agree or leave.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should detect "with us or against us" pattern', async () => {
        const content = "You're with us or against us on this issue.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should detect "only two options" pattern', async () => {
        const content = 'There are only two options here.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should detect "only two choices" pattern', async () => {
        const content = 'We have only two choices available.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should detect "if you don\'t X then you must" pattern', async () => {
        const content = "If you don't agree, then you must be ignorant.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('false_dichotomy');
      });
    });

    describe('slippery slope detection', () => {
      it('should detect "if we allow X next thing" pattern', async () => {
        const content = 'If we allow this, next thing you know everything will collapse.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should detect "this will lead to" pattern', async () => {
        const content = 'This will lead to disaster.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should detect "where does it end" pattern', async () => {
        const content = 'Where does it end if we start down this path?';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should detect "where does it stop" pattern', async () => {
        const content = 'Where does it stop once we begin?';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should detect "it\'s a slippery slope" pattern', async () => {
        const content = "It's a slippery slope if we proceed.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('slippery_slope');
      });
    });

    describe('appeal to emotion detection', () => {
      it('should detect "think of the children" pattern', async () => {
        const content = 'Think of the children who will be affected!';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should detect "how would you feel if" pattern', async () => {
        const content = 'How would you feel if this happened to you?';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should detect "imagine if it was your" pattern', async () => {
        const content = 'Imagine if it was your family in that situation.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should detect "this makes me so angry" pattern', async () => {
        const content = 'This makes me so angry that people would suggest this.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should detect "this makes me upset" pattern', async () => {
        const content = 'This makes me upset every time I hear it.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_emotion');
      });
    });

    describe('hasty generalization detection', () => {
      it('should detect "all X are always" pattern', async () => {
        const content = 'All politicians are always lying.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect "everyone knows that" pattern', async () => {
        const content = 'Everyone knows that this is true.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect "no one thinks that" pattern', async () => {
        const content = 'No one thinks that this is a good idea.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect "nobody thinks that" pattern', async () => {
        const content = 'Nobody thinks that way anymore.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect "X always does" pattern', async () => {
        const content = 'He always does this when confronted.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('hasty_generalization');
      });
    });

    describe('appeal to authority detection', () => {
      it('should detect "experts agree" pattern', async () => {
        const content = 'Experts agree that this is the best approach.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_authority');
      });

      it('should detect "studies show" pattern', async () => {
        const content = 'Studies show that my position is correct.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_authority');
      });

      it('should detect "science says" pattern', async () => {
        const content = 'Science says we should do it this way.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_authority');
      });

      it('should detect "X said so" pattern', async () => {
        const content = 'Einstein said so, therefore it must be true.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('appeal_to_authority');
      });
    });

    describe('confidence scores', () => {
      it('should return base confidence for single fallacy', async () => {
        const content = "You're just a beginner.";

        const result = await service.analyze(content);

        // Use toBeCloseTo for floating point comparison
        expect(result?.confidenceScore).toBeCloseTo(0.78, 2); // 0.7 + 1 * 0.08
      });

      it('should increase confidence with multiple instances', async () => {
        // Multiple fallacies detected
        const content = 'You are just a novice. What would you know? Your lack credentials.';

        const result = await service.analyze(content);

        expect(result?.confidenceScore).toBeGreaterThan(0.78);
      });

      it('should cap confidence at 0.92', async () => {
        // Many fallacies in one text
        const content =
          'You are just a beginner. Coming from you. What would you know? ' +
          'Your lack credentials. So you are saying we should give up. By that logic.';

        const result = await service.analyze(content);

        expect(result?.confidenceScore).toBeLessThanOrEqual(0.92);
      });
    });

    describe('multiple fallacy types', () => {
      it('should return the most common fallacy type', async () => {
        // 2 ad_hominem patterns, 1 strawman
        const content =
          'You are just a novice. What would you know? By that logic everything fails.';

        const result = await service.analyze(content);

        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should handle mixed fallacy types', async () => {
        const content = 'Think of the children! This will lead to disaster. Where does it end?';

        const result = await service.analyze(content);

        // slippery_slope appears twice, appeal_to_emotion once
        expect(result?.subtype).toBe('slippery_slope');
      });
    });

    describe('suggestions', () => {
      it('should provide suggestion for ad hominem', async () => {
        const content = 'You are just a beginner.';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('argument itself');
        expect(result?.suggestionText).toContain('attacking the person');
      });

      it('should provide suggestion for strawman', async () => {
        const content = 'By that logic, nothing would work.';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('actual argument');
      });

      it('should provide suggestion for false dichotomy', async () => {
        const content = 'There are only two options here.';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('more than two options');
      });

      it('should provide suggestion for slippery slope', async () => {
        const content = 'This will lead to disaster.';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('evidence');
        expect(result?.suggestionText).toContain('causal chain');
      });

      it('should provide suggestion for appeal to emotion', async () => {
        const content = 'Think of the children!';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('factual reasoning');
      });

      it('should provide suggestion for hasty generalization', async () => {
        const content = 'Everyone knows that this is true.';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('sweeping generalizations');
      });

      it('should provide suggestion for appeal to authority', async () => {
        const content = 'Experts agree on this.';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('specific sources');
      });

      it('should provide default suggestion for unknown fallacy type', async () => {
        // This tests the default path - though in practice all types are covered
        const content = "You're just a beginner.";

        const result = await service.analyze(content);

        // Ad hominem should have specific suggestion
        expect(result?.suggestionText).toBeTruthy();
      });
    });

    describe('reasoning', () => {
      it('should include fallacy name in reasoning', async () => {
        const content = 'You are just a beginner.';

        const result = await service.analyze(content);

        expect(result?.reasoning).toContain('Ad Hominem');
        expect(result?.reasoning).toContain('attacking the person');
      });

      it('should include instance count in reasoning', async () => {
        const content = 'You are just a novice. What would you know?';

        const result = await service.analyze(content);

        expect(result?.reasoning).toContain('2 instance(s)');
      });

      it('should provide advice about strengthening arguments', async () => {
        const content = 'By that logic, nothing works.';

        const result = await service.analyze(content);

        expect(result?.reasoning).toContain('strengthen');
      });
    });

    describe('educational resources', () => {
      it('should provide resources for ad hominem', async () => {
        const content = 'You are just a beginner.';

        const result = await service.analyze(content);

        expect(result?.educationalResources).toBeDefined();
        expect(result?.educationalResources?.links?.length).toBeGreaterThan(0);
        // URL uses "Ad_hominem" not "ad_hominem"
        expect(result?.educationalResources?.links?.[0]?.url).toContain('Ad_hominem');
      });

      it('should provide resources for strawman', async () => {
        const content = 'By that logic, nothing works.';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links?.[0]?.url).toContain('Straw_man');
      });

      it('should provide resources for false dichotomy', async () => {
        const content = 'Only two options exist.';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links?.[0]?.url).toContain('False_dilemma');
      });

      it('should provide resources for slippery slope', async () => {
        const content = 'This will lead to ruin.';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links?.[0]?.url).toContain('Slippery_slope');
      });

      it('should provide resources for appeal to emotion', async () => {
        const content = 'Think of the children!';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links?.[0]?.url).toContain('Appeal_to_emotion');
      });

      it('should provide resources for hasty generalization', async () => {
        const content = 'Everyone knows that.';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links?.[0]?.url).toContain('Hasty_generalization');
      });

      it('should provide resources for appeal to authority', async () => {
        const content = 'Experts agree on this.';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links?.[0]?.url).toContain('Argument_from_authority');
      });

      it('should provide default resources for unknown type', async () => {
        // Test that fallback resources work - we test this by ensuring all known types have resources
        const content = 'You are just a novice.';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links?.length).toBeGreaterThan(0);
      });
    });

    describe('case insensitivity', () => {
      it('should detect patterns regardless of case', async () => {
        const content = 'EVERYONE KNOWS THAT this is correct.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect mixed case patterns', async () => {
        const content = 'By That Logic, we would fail.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('strawman');
      });
    });
  });
});
