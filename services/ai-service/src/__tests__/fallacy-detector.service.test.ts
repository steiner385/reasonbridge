import { FallacyDetectorService } from '../services/fallacy-detector.service.js';
import { FeedbackType } from '@unite-discord/db-models';

describe('FallacyDetectorService', () => {
  let service: FallacyDetectorService;

  beforeEach(() => {
    service = new FallacyDetectorService();
  });

  describe('analyze', () => {
    describe('ad hominem detection', () => {
      it('should detect "you are just a" ad hominem', async () => {
        // Pattern: you('re| are)\s+(just|only)\s+(a|an)\s+\w+
        const result = await service.analyze(
          "You're just a student, what would you know about economics?",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('ad_hominem');
        expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.7);
      });

      it('should detect "coming from someone" ad hominem', async () => {
        // Pattern: coming\s+from\s+(someone|you)
        const result = await service.analyze(
          "That's rich coming from someone who failed the class.",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should detect "you lack credentials" ad hominem', async () => {
        // Pattern: (you|your)\s+(lack|don't\s+have)\s+(credentials|experience|expertise)
        const result = await service.analyze('You lack credentials to make that argument.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should detect "what would you know" ad hominem', async () => {
        // Pattern: what\s+would\s+you\s+know
        const result = await service.analyze('What would you know about running a business?');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('ad_hominem');
      });

      it('should provide appropriate ad hominem suggestion', async () => {
        const result = await service.analyze(
          "You're only an amateur, so your opinion doesn't count.",
        );

        expect(result?.suggestionText).toContain('Focus on addressing the argument');
        expect(result?.suggestionText).toContain('rather than attacking the person');
      });
    });

    describe('strawman detection', () => {
      it('should detect "so you are saying we should" strawman', async () => {
        // Pattern: so\s+you('re| are)\s+saying\s+(that\s+)?we\s+should
        const result = await service.analyze(
          "So you're saying we should just ignore all safety regulations?",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('strawman');
      });

      it('should detect "by that logic" strawman', async () => {
        // Pattern: by\s+that\s+logic
        const result = await service.analyze(
          'By that logic, we should also ban all cars because they can cause accidents.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('strawman');
      });

      it('should detect "if we follow your reasoning" strawman', async () => {
        // Pattern: if\s+we\s+follow\s+your\s+reasoning
        const result = await service.analyze(
          'If we follow your reasoning, then we should eliminate all taxes.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('strawman');
      });

      it('should detect "you think that all X are" strawman', async () => {
        // Pattern: you\s+think\s+that\s+all\s+\w+\s+are
        const result = await service.analyze(
          'You think that all politicians are corrupt, which is ridiculous.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('strawman');
      });

      it('should provide appropriate strawman suggestion', async () => {
        const result = await service.analyze('By that logic, we should never change anything.');

        expect(result?.suggestionText).toContain('actual argument');
        expect(result?.suggestionText).toContain('quote');
      });
    });

    describe('false dichotomy detection', () => {
      it('should detect "either X or Y" false dichotomy', async () => {
        // Pattern: either\s+\w+\s+or\s+\w+
        const result = await service.analyze('Either taxes or chaos - those are our only choices.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should detect "with us or against us" false dichotomy', async () => {
        // Pattern: you('re| are)\s+(either|with\s+us\s+or\s+against\s+us)
        const result = await service.analyze("You're either with us or against us on this issue.");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should detect "only two options" false dichotomy', async () => {
        // Pattern: only\s+two\s+(options|choices)
        const result = await service.analyze('There are only two options here - agree or leave.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should detect "if you dont X then you must" false dichotomy', async () => {
        // Pattern: if\s+you\s+don't\s+\w+,?\s+then\s+you\s+must
        // The pattern requires a single word after "don't"
        const result = await service.analyze("If you don't agree, then you must be against us.");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('false_dichotomy');
      });

      it('should provide appropriate false dichotomy suggestion', async () => {
        const result = await service.analyze('There are only two choices available.');

        expect(result?.suggestionText).toContain('more than two options');
        expect(result?.suggestionText).toContain('middle-ground');
      });
    });

    describe('slippery slope detection', () => {
      it('should detect "if we allow X next thing" slippery slope', async () => {
        // Pattern: if\s+we\s+allow\s+\w+,?\s+(then\s+)?next\s+thing
        const result = await service.analyze(
          "If we allow this, next thing you know they'll take everything.",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should detect "this will lead to" slippery slope', async () => {
        // Pattern: this\s+will\s+lead\s+to
        const result = await service.analyze(
          'This will lead to the complete collapse of our economy.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should detect "where does it end" slippery slope', async () => {
        // Pattern: where\s+does\s+it\s+(end|stop)
        const result = await service.analyze('Once we start, where does it end?');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should detect explicit "slippery slope" mention', async () => {
        // Pattern: it's\s+a\s+slippery\s+slope
        const result = await service.analyze("It's a slippery slope once we go down this path.");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('slippery_slope');
      });

      it('should provide appropriate slippery slope suggestion', async () => {
        const result = await service.analyze('This will lead to disaster if we continue.');

        expect(result?.suggestionText).toContain('evidence');
        expect(result?.suggestionText).toContain('causal chain');
      });
    });

    describe('appeal to emotion detection', () => {
      it('should detect "think of the children" appeal', async () => {
        // Pattern: think\s+of\s+the\s+children
        const result = await service.analyze(
          'Think of the children! We must ban this immediately.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should detect "how would you feel if" appeal', async () => {
        // Pattern: how\s+would\s+you\s+feel\s+if
        const result = await service.analyze('How would you feel if this happened to your family?');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should detect "imagine if it was your" appeal', async () => {
        // Pattern: imagine\s+if\s+it\s+was\s+your
        const result = await service.analyze('Imagine if it was your child in that situation.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should detect "this makes me so angry" appeal', async () => {
        // Pattern: this\s+makes\s+me\s+(so\s+)?(angry|sad|upset)
        const result = await service.analyze(
          'This makes me so angry that people can think this way!',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_emotion');
      });

      it('should provide appropriate appeal to emotion suggestion', async () => {
        const result = await service.analyze("Think of the children we're trying to protect!");

        expect(result?.suggestionText).toContain('factual reasoning');
        expect(result?.suggestionText).toContain('objective evidence');
      });
    });

    describe('hasty generalization detection', () => {
      it('should detect "all X are always" hasty generalization', async () => {
        // Pattern: all\s+\w+\s+are\s+(always|never)
        const result = await service.analyze('All politicians are always lying to us.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect "everyone knows that" hasty generalization', async () => {
        // Pattern: every(one)?\s+knows\s+that
        const result = await service.analyze('Everyone knows that this is the only solution.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect "no one thinks that" hasty generalization', async () => {
        // Pattern: (no\s+one|nobody)\s+thinks\s+that
        const result = await service.analyze("No one thinks that's a good idea anymore.");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should detect "X always does Y" hasty generalization', async () => {
        // Pattern: \w+\s+always\s+(does|says|thinks)
        const result = await service.analyze('The government always does the wrong thing.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('hasty_generalization');
      });

      it('should provide appropriate hasty generalization suggestion', async () => {
        const result = await service.analyze(
          'All experts are always wrong about these predictions.',
        );

        expect(result?.suggestionText).toContain('sweeping generalizations');
        expect(result?.suggestionText).toContain('specific examples');
      });
    });

    describe('appeal to authority detection', () => {
      it('should detect "experts agree" appeal to authority', async () => {
        // Pattern: experts\s+agree
        const result = await service.analyze('Experts agree that this is the best approach.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_authority');
      });

      it('should detect "studies show" appeal to authority', async () => {
        // Pattern: studies\s+show
        const result = await service.analyze('Studies show that this method works better.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_authority');
      });

      it('should detect "science says" appeal to authority', async () => {
        // Pattern: science\s+says
        const result = await service.analyze('Science says we need to take immediate action.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_authority');
      });

      it('should detect "X said so" appeal to authority', async () => {
        // Pattern: \w+\s+said\s+(so|it)
        const result = await service.analyze('Einstein said so, therefore it must be true.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
        expect(result?.subtype).toBe('appeal_to_authority');
      });

      it('should provide appropriate appeal to authority suggestion', async () => {
        const result = await service.analyze('Studies show we should follow this path.');

        expect(result?.suggestionText).toContain('specific sources');
        expect(result?.suggestionText).toContain('counter-evidence');
      });
    });

    describe('clean content - no fallacies detected', () => {
      it('should return null for well-reasoned argument', async () => {
        const result = await service.analyze(
          'Based on the economic data from Q3 2024, inflation has decreased by 2%. This suggests that the current monetary policy may be effective.',
        );

        expect(result).toBeNull();
      });

      it('should return null for specific evidence-based claims', async () => {
        const result = await service.analyze(
          'According to the 2024 report by the Congressional Budget Office, the deficit is projected to reach $1.5 trillion by 2025.',
        );

        expect(result).toBeNull();
      });

      it('should return null for nuanced statements', async () => {
        const result = await service.analyze(
          'While some argue X is true, others contend Y. The evidence seems to support a middle ground where both factors contribute to the outcome.',
        );

        expect(result).toBeNull();
      });

      it('should return null for questions seeking information', async () => {
        const result = await service.analyze(
          "Could you provide more details on how this conclusion was reached? I'd like to understand the methodology better.",
        );

        expect(result).toBeNull();
      });
    });

    describe('confidence score and priority calculation', () => {
      it('should have minimum confidence of 0.7 for single match', async () => {
        const result = await service.analyze('By that logic, anything goes.');

        expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.7);
        expect(result?.confidenceScore).toBeLessThan(0.85);
      });

      it('should have higher confidence for multiple matches', async () => {
        const result = await service.analyze(
          'By that logic, everyone knows that this will lead to disaster.',
        );

        expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.85);
      });

      it('should cap confidence at 0.92', async () => {
        const result = await service.analyze(
          'By that logic, all experts are always wrong. Studies show everyone knows this will lead to chaos.',
        );

        expect(result?.confidenceScore).toBeLessThanOrEqual(0.92);
      });

      it('should return most common fallacy type when multiple detected', async () => {
        // Two ad_hominem patterns
        const result = await service.analyze(
          "You're just a novice, coming from someone with no experience.",
        );

        expect(result?.subtype).toBe('ad_hominem');
      });
    });

    describe('reasoning and educational resources', () => {
      it('should provide reasoning with fallacy count', async () => {
        const result = await service.analyze('By that logic, we should ban everything dangerous.');

        expect(result?.reasoning).toContain('instance');
        expect(result?.reasoning).toContain('Strawman');
      });

      it('should include educational resources for detected fallacy', async () => {
        const result = await service.analyze("You're only an intern, what would you know?");

        expect(result?.educationalResources).toBeDefined();
        expect(result?.educationalResources.links).toHaveLength(2);
        expect(result?.educationalResources.links[0].title).toContain('Ad Hominem');
      });

      it('should provide fallback resources for unknown fallacy type', async () => {
        // This test checks the fallback resource path
        const result = await service.analyze('Think of the children in this debate!');

        expect(result?.educationalResources).toBeDefined();
        expect(result?.educationalResources.links.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', async () => {
        const result = await service.analyze('');

        expect(result).toBeNull();
      });

      it('should handle string with only whitespace', async () => {
        const result = await service.analyze('   \n\t   ');

        expect(result).toBeNull();
      });

      it('should be case-insensitive', async () => {
        const resultLower = await service.analyze('by that logic, we should quit');
        const resultUpper = await service.analyze('BY THAT LOGIC, we should quit');
        const resultMixed = await service.analyze('By That Logic, we should quit');

        expect(resultLower).not.toBeNull();
        expect(resultUpper).not.toBeNull();
        expect(resultMixed).not.toBeNull();
      });

      it('should handle very long content', async () => {
        const longContent =
          'This is a well-reasoned argument. '.repeat(100) + 'By that logic, everything fails.';
        const result = await service.analyze(longContent);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.FALLACY);
      });

      it('should handle special characters in content', async () => {
        const result = await service.analyze('By that logic, (we should) [just quit] & give up!');

        expect(result).not.toBeNull();
      });
    });
  });
});
