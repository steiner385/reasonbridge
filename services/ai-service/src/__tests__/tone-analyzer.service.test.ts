import { ToneAnalyzerService } from '../services/tone-analyzer.service.js';
import { FeedbackType } from '@prisma/client';

describe('ToneAnalyzerService', () => {
  let service: ToneAnalyzerService;

  beforeEach(() => {
    service = new ToneAnalyzerService();
  });

  describe('analyze', () => {
    describe('inflammatory patterns detection', () => {
      it('should detect personal attacks with "you are stupid"', async () => {
        const result = await service.analyze(
          "You're stupid if you believe that climate change isn't real.",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result?.subtype).toContain('personal_attack');
        expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.65);
      });

      it('should detect personal attacks with "you are dumb"', async () => {
        // Pattern: you('re| are)\s+(stupid|dumb|idiot|moron|fool|ignorant)
        // Note: "You are dumb" matches, "You are a moron" does not (missing "a" in pattern)
        const result = await service.analyze('You are dumb for thinking this policy would work.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result?.suggestionText).toContain('Attack the argument');
      });

      it('should detect "shut up" as inflammatory', async () => {
        const result = await service.analyze('Just shut up, nobody wants to hear your opinion.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result?.subtype).toContain('personal_attack');
      });

      it('should detect "get lost" as inflammatory', async () => {
        const result = await service.analyze('Get lost with your ridiculous conspiracy theories.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect aggressive "hate you" language', async () => {
        const result = await service.analyze('I hate you and your terrible ideas.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "you make me sick" as inflammatory', async () => {
        const result = await service.analyze('You make me sick with this kind of reasoning.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect dismissive political attacks', async () => {
        const result = await service.analyze(
          "That's typical liberal nonsense that ignores basic economics.",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "wake up sheeple" as inflammatory', async () => {
        const result = await service.analyze("Wake up sheeple! Can't you see the truth?");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect aggressive profanity', async () => {
        // Pattern: f\*+ck\s+(you|off|this)
        const result = await service.analyze('f*ck you and your biased sources.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect all caps aggression', async () => {
        const result = await service.analyze(
          'THIS IS ABSOLUTELY RIDICULOUS BEHAVIOR from people who claim to be experts.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });
    });

    describe('hostile tone indicators detection', () => {
      it('should detect "obviously you dont" hostile tone', async () => {
        const result = await service.analyze("Obviously you don't understand basic economics.");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result?.subtype).toContain('hostile_tone');
      });

      it('should detect "clearly you cant" hostile tone', async () => {
        const result = await service.analyze(
          "Clearly you can't grasp the complexity of this issue.",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result?.subtype).toBe('hostile_tone');
      });

      it('should detect "anyone with half a brain" hostile tone', async () => {
        const result = await service.analyze(
          'Anyone with half a brain would see through this argument.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result?.subtype).toBe('hostile_tone');
      });

      it('should detect "its obvious that you" hostile tone', async () => {
        const result = await service.analyze(
          "It's obvious that you have never read the scientific literature on this topic.",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });
    });

    describe('combined inflammatory and hostile detection', () => {
      it('should detect both inflammatory and hostile patterns', async () => {
        // Combine inflammatory (you're stupid) + hostile (obviously you don't)
        const result = await service.analyze(
          "You're stupid. Obviously you don't know anything about this topic.",
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result?.subtype).toBe('personal_attack_with_hostile_tone');
        expect(result?.confidenceScore).toBeGreaterThan(0.75); // Higher confidence for multiple issues
      });

      it('should provide appropriate combined suggestion', async () => {
        const result = await service.analyze(
          "Shut up! Clearly you haven't read anything on this subject.",
        );

        expect(result).not.toBeNull();
        expect(result?.suggestionText).toContain('personal attacks');
        expect(result?.suggestionText).toContain('hostile language');
      });
    });

    describe('clean content - no issues detected', () => {
      it('should return null for respectful disagreement', async () => {
        const result = await service.analyze(
          'I disagree with your perspective on this issue. The evidence suggests a different conclusion based on recent studies.',
        );

        expect(result).toBeNull();
      });

      it('should return null for constructive criticism', async () => {
        const result = await service.analyze(
          'While I understand your point, I think there are some gaps in the reasoning. Consider the following counter-argument.',
        );

        expect(result).toBeNull();
      });

      it('should return null for passionate but respectful discourse', async () => {
        const result = await service.analyze(
          'This is a critically important issue! We need to address it urgently with evidence-based policies.',
        );

        expect(result).toBeNull();
      });

      it('should return null for neutral factual statements', async () => {
        const result = await service.analyze(
          'The data from the 2024 census shows a 12% increase in urban population. This trend has implications for housing policy.',
        );

        expect(result).toBeNull();
      });

      it('should return null for questions', async () => {
        const result = await service.analyze(
          "Could you explain your reasoning on this point? I'm trying to understand your perspective better.",
        );

        expect(result).toBeNull();
      });
    });

    describe('confidence score calculation', () => {
      it('should have minimum confidence of 0.65 for single match', async () => {
        const result = await service.analyze("You're stupid for believing that.");

        expect(result?.confidenceScore).toBe(0.75); // 0.65 + 0.1 = 0.75 for one match
      });

      it('should have higher confidence for multiple matches', async () => {
        const result = await service.analyze(
          "You're stupid! Shut up! Obviously you don't know anything!",
        );

        expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.85);
      });

      it('should cap confidence at 0.95', async () => {
        const result = await service.analyze(
          "You're an idiot! Shut up! Get lost! I hate you! You make me sick! OBVIOUSLY YOU DON'T UNDERSTAND ANYTHING!",
        );

        expect(result?.confidenceScore).toBeLessThanOrEqual(0.95);
      });
    });

    describe('reasoning and educational resources', () => {
      it('should provide reasoning with detected examples', async () => {
        const result = await service.analyze("You're stupid if you think that's a valid argument.");

        expect(result?.reasoning).toContain('inflammatory language');
        expect(result?.reasoning).toContain('"');
      });

      it('should include educational resources', async () => {
        const result = await service.analyze('Shut up with your fake news nonsense.');

        expect(result?.educationalResources).toBeDefined();
        expect(result?.educationalResources.links).toHaveLength(2);
        expect(result?.educationalResources.links[0].title).toContain('Constructive Communication');
      });

      it('should limit reasoning examples to 2', async () => {
        const result = await service.analyze("You're stupid! Shut up! Get lost! You make me sick!");

        const quotedExamples = result?.reasoning.match(/"[^"]+"/g);
        expect(quotedExamples?.length).toBeLessThanOrEqual(2);
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

      it('should be case-insensitive for pattern matching', async () => {
        const resultLower = await service.analyze("you're stupid");
        const resultUpper = await service.analyze("YOU'RE STUPID");
        const resultMixed = await service.analyze("You're Stupid");

        expect(resultLower).not.toBeNull();
        expect(resultUpper).not.toBeNull();
        expect(resultMixed).not.toBeNull();
      });

      it('should not flag partial word matches incorrectly', async () => {
        // "stupid" appears but not in the inflammatory pattern context
        const result = await service.analyze(
          'Calling someone stupid is not a valid argument technique.',
        );

        // This contains the word but not in the "you are stupid" pattern
        expect(result).toBeNull();
      });

      it('should handle very long content', async () => {
        const longContent =
          'This is a respectful argument. '.repeat(100) + "You're stupid for not seeing this.";
        const result = await service.analyze(longContent);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should handle special characters in content', async () => {
        // Pattern needs: you're + (stupid|dumb|idiot|moron|fool|ignorant)
        const result = await service.analyze(
          "You're stupid! (I can't believe you'd say that) [Source: my opinion]",
        );

        expect(result).not.toBeNull();
      });
    });
  });
});
