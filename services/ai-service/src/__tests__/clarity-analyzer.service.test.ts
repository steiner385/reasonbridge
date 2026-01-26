import { ClarityAnalyzerService } from '../services/clarity-analyzer.service.js';
import { FeedbackType } from '@reason-bridge/db-models';

describe('ClarityAnalyzerService', () => {
  let service: ClarityAnalyzerService;

  beforeEach(() => {
    service = new ClarityAnalyzerService();
  });

  describe('analyze', () => {
    describe('unsourced claim detection', () => {
      it('should detect "studies show that" unsourced claim', async () => {
        // Pattern: studies\s+show\s+that
        const result = await service.analyze('Studies show that this approach is more effective.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
        expect(result?.suggestionText).toContain('specific sources');
      });

      it('should detect "research shows/proves/demonstrates" unsourced claim', async () => {
        // Pattern: research\s+(shows|proves|demonstrates)
        const result = await service.analyze('Research proves this theory is correct.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "scientists say/believe/found" unsourced claim', async () => {
        // Pattern: scientists\s+(say|believe|found)
        const result = await service.analyze(
          'Scientists found that climate change is accelerating.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "it is proven that" unsourced claim', async () => {
        // Pattern: it('s| is)\s+(proven|a\s+fact)\s+that
        const result = await service.analyze('It is proven that this method works better.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "it\'s a fact that" unsourced claim', async () => {
        // Pattern: it('s| is)\s+(proven|a\s+fact)\s+that
        const result = await service.analyze("It's a fact that most people prefer this option.");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect percentage statistics without citation', async () => {
        // Pattern: \d+%\s+of\s+(people|users|respondents)
        const result = await service.analyze('73% of people agree with this statement.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "according to experts/studies" unsourced claim', async () => {
        // Pattern: according\s+to\s+(experts|studies|research)
        const result = await service.analyze('According to experts, this is the best practice.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "the data shows" unsourced claim', async () => {
        // Pattern: the\s+data\s+shows
        const result = await service.analyze('The data shows a clear upward trend.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });
    });

    describe('vague language detection', () => {
      it('should detect "some people say" vague language', async () => {
        // Pattern: some\s+people\s+say
        const result = await service.analyze('Some people say this approach is dangerous.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "I heard that" vague language', async () => {
        // Pattern: I\s+heard\s+that
        const result = await service.analyze('I heard that the company is planning layoffs.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "they say that" vague language', async () => {
        // Pattern: they\s+say\s+that
        const result = await service.analyze('They say that this policy will hurt the economy.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "word on the street" vague language', async () => {
        // Pattern: word\s+on\s+the\s+street
        const result = await service.analyze(
          'Word on the street is that the merger is happening soon.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "rumor has it" vague language', async () => {
        // Pattern: rumor\s+has\s+it
        const result = await service.analyze('Rumor has it the CEO will resign.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });
    });

    describe('bias indicator detection', () => {
      it('should detect "obviously X is/are" bias indicator', async () => {
        // Pattern: (obviously|clearly|undeniably)\s+\w+\s+(is|are)
        // Pattern matches: "Obviously X is" where X is a single word
        const result = await service.analyze(
          'Obviously socialism is the correct approach to the problem.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
        expect(result?.subtype).toBe('loaded_language');
      });

      it('should detect "clearly X is/are" bias indicator', async () => {
        // Pattern: (obviously|clearly|undeniably)\s+\w+\s+(is|are)
        const result = await service.analyze('Clearly this is a bad idea that will fail.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "undeniably X is" bias indicator', async () => {
        // Pattern: (obviously|clearly|undeniably)\s+\w+\s+(is|are)
        const result = await service.analyze('Undeniably capitalism is the best economic system.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "any reasonable person would" bias indicator', async () => {
        // Pattern: any\s+reasonable\s+person\s+(would|knows)
        const result = await service.analyze(
          'Any reasonable person would agree with this position.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "it\'s common sense that" bias indicator', async () => {
        // Pattern: it's\s+common\s+sense\s+that
        const result = await service.analyze("It's common sense that we need to act now.");

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "only X would think/believe" bias indicator', async () => {
        // Pattern: only\s+\w+\s+would\s+(think|believe|say)
        const result = await service.analyze('Only fools would believe this argument.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "of course X is/would" bias indicator', async () => {
        // Pattern: of\s+course\s+\w+\s+(is|are|would)
        const result = await service.analyze('Of course this is going to fail spectacularly.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "radical/extremist/fanatic" bias indicator', async () => {
        // Pattern: \b(radical|extremist|fanatic)\s+\w+
        const result = await service.analyze('These radical ideas will destroy our society.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "crazy/insane/lunatic" bias indicator', async () => {
        // Pattern: \b(crazy|insane|lunatic)\s+\w+
        const result = await service.analyze('That is a crazy idea that no one should support.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });
    });

    describe('priority: unsourced over bias', () => {
      it('should return unsourced feedback when both detected', async () => {
        const result = await service.analyze(
          'Studies show that obviously this is the right approach.',
        );

        expect(result).not.toBeNull();
        // Should prioritize UNSOURCED over BIAS
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should return bias feedback only when no unsourced claims', async () => {
        const result = await service.analyze('Obviously this is the correct solution to consider.');

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });
    });

    describe('clean content - no issues detected', () => {
      it('should return null for well-sourced argument', async () => {
        const result = await service.analyze(
          'According to the 2024 report by Harvard University (Smith et al., p.45), renewable energy adoption increased by 12% globally.',
        );

        expect(result).toBeNull();
      });

      it('should return null for neutral factual statement', async () => {
        const result = await service.analyze(
          'The legislation was passed in 2023 with a 60-40 vote in the Senate. This marked the first major reform in the sector in a decade.',
        );

        expect(result).toBeNull();
      });

      it('should return null for balanced opinion', async () => {
        const result = await service.analyze(
          'I believe this approach has merits, though others may disagree based on different priorities. Both perspectives have valid points.',
        );

        expect(result).toBeNull();
      });

      it('should return null for direct question', async () => {
        const result = await service.analyze(
          'What evidence supports this claim? Could you provide a source for that statistic?',
        );

        expect(result).toBeNull();
      });

      it('should return null for personal experience statement', async () => {
        const result = await service.analyze(
          'In my experience working on this project, we found that collaborative approaches were more effective.',
        );

        expect(result).toBeNull();
      });
    });

    describe('confidence score calculation', () => {
      describe('unsourced claims', () => {
        it('should have minimum confidence of 0.65 for single unsourced claim', async () => {
          const result = await service.analyze('Studies show that this works.');

          expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.65);
          expect(result?.confidenceScore).toBeLessThan(0.8);
        });

        it('should have higher confidence for multiple unsourced claims', async () => {
          const result = await service.analyze(
            'Studies show that this works. Research proves it. The data shows improvement.',
          );

          expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.8);
        });

        it('should cap unsourced confidence at 0.88', async () => {
          const result = await service.analyze(
            'Studies show this. Research proves that. Scientists found evidence. It is proven that. 90% of people agree. According to studies, this is true. The data shows improvement.',
          );

          expect(result?.confidenceScore).toBeLessThanOrEqual(0.88);
        });
      });

      describe('bias indicators', () => {
        it('should have minimum confidence of 0.6 for single bias indicator', async () => {
          const result = await service.analyze('Obviously this is the solution.');

          expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.6);
          expect(result?.confidenceScore).toBeLessThan(0.75);
        });

        it('should have higher confidence for multiple bias indicators', async () => {
          const result = await service.analyze(
            'Obviously this is correct. Clearly it is the answer. Any reasonable person would agree.',
          );

          expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.75);
        });

        it('should cap bias confidence at 0.85', async () => {
          const result = await service.analyze(
            'Obviously this is true. Clearly it is correct. Any reasonable person knows this. Only fools would disagree. Of course this is right. Crazy opponents will reject it.',
          );

          expect(result?.confidenceScore).toBeLessThanOrEqual(0.85);
        });
      });
    });

    describe('reasoning and educational resources', () => {
      describe('unsourced claims', () => {
        it('should provide reasoning with claim count and examples', async () => {
          const result = await service.analyze(
            'Research shows that 50% of users prefer this. Studies show that it works.',
          );

          // 3 matches: "Research shows", "50% of users", "Studies show that"
          expect(result?.reasoning).toContain('instance');
          expect(result?.reasoning).toContain('unsourced claims');
        });

        it('should include educational resources for unsourced claims', async () => {
          const result = await service.analyze('The data shows a significant improvement.');

          expect(result?.educationalResources).toBeDefined();
          expect(result?.educationalResources.links).toHaveLength(2);
          expect(result?.educationalResources.links[0].title).toContain('Cite');
        });

        it('should limit examples to 2 in reasoning', async () => {
          const result = await service.analyze(
            'Studies show X. Research proves Y. Scientists found Z. The data shows W.',
          );

          const quotedExamples = result?.reasoning.match(/"[^"]+"/g);
          expect(quotedExamples?.length).toBeLessThanOrEqual(2);
        });
      });

      describe('bias indicators', () => {
        it('should provide reasoning with bias count and examples', async () => {
          const result = await service.analyze('Obviously this is correct. Clearly it is true.');

          expect(result?.reasoning).toContain('2 instance');
          expect(result?.reasoning).toContain('biased framing');
        });

        it('should include educational resources for bias', async () => {
          const result = await service.analyze('Any reasonable person would see this.');

          expect(result?.educationalResources).toBeDefined();
          expect(result?.educationalResources.links).toHaveLength(2);
          expect(result?.educationalResources.links[0].title).toContain('Neutral');
        });

        it('should provide appropriate bias suggestion', async () => {
          // Pattern: (obviously|clearly|undeniably)\s+\w+\s+(is|are)
          const result = await service.analyze('Obviously capitalism is the best system ever.');

          expect(result).not.toBeNull();
          expect(result?.suggestionText).toContain('neutral language');
          expect(result?.suggestionText).toContain('alternative perspectives');
        });
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
        const resultLower = await service.analyze('studies show that this works');
        const resultUpper = await service.analyze('STUDIES SHOW THAT THIS WORKS');
        const resultMixed = await service.analyze('Studies Show That this works');

        expect(resultLower).not.toBeNull();
        expect(resultUpper).not.toBeNull();
        expect(resultMixed).not.toBeNull();
      });

      it('should handle very long content', async () => {
        const longContent =
          'This is a well-sourced argument. '.repeat(100) + 'Studies show that it works.';
        const result = await service.analyze(longContent);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should handle special characters in content', async () => {
        const result = await service.analyze(
          'Studies show that (surprisingly!) this approach works [better] & faster.',
        );

        expect(result).not.toBeNull();
      });

      it('should handle content with newlines', async () => {
        const result = await service.analyze(
          'Studies show that this works.\n\nResearch proves it is effective.',
        );

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });
    });
  });
});
