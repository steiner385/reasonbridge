import { describe, it, expect, beforeEach } from 'vitest';
import { ClarityAnalyzerService } from './clarity-analyzer.service.js';
import { FeedbackType } from '@reason-bridge/db-models';

describe('ClarityAnalyzerService', () => {
  let service: ClarityAnalyzerService;

  beforeEach(() => {
    service = new ClarityAnalyzerService();
  });

  describe('analyze', () => {
    it('should return null for content with no issues', async () => {
      const content = 'I believe this approach is better because it provides more flexibility.';

      const result = await service.analyze(content);

      expect(result).toBeNull();
    });

    describe('unsourced claims detection', () => {
      it('should detect "studies show that"', async () => {
        const content = 'Studies show that this approach works better.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
        expect(result?.reasoning).toContain('unsourced claims');
      });

      it('should detect "research proves"', async () => {
        const content = 'Research proves this is the best method.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "scientists say"', async () => {
        const content = 'Scientists say this will solve the problem.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "it is a fact that"', async () => {
        const content = 'It is a fact that this method is superior.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect percentage claims without sources', async () => {
        const content = '75% of people prefer this approach.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "according to experts"', async () => {
        const content = 'According to experts, this is the way to go.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "the data shows"', async () => {
        const content = 'The data shows a clear trend.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect vague language "some people say"', async () => {
        const content = 'Some people say this is important.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should detect "I heard that"', async () => {
        const content = 'I heard that this approach is better.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });

      it('should increase confidence with multiple claims', async () => {
        const content = 'Studies show that this works. Research proves it. Scientists say so.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.confidenceScore).toBeGreaterThan(0.7);
      });

      it('should provide educational resources', async () => {
        const content = 'Studies show that this is true.';

        const result = await service.analyze(content);

        expect(result?.educationalResources?.links).toBeDefined();
        expect(result?.educationalResources?.links?.length).toBeGreaterThan(0);
      });
    });

    describe('bias detection', () => {
      it('should detect "obviously X is"', async () => {
        const content = 'Obviously this is the correct answer.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "any reasonable person would"', async () => {
        const content = 'Any reasonable person would agree with this.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "it\'s common sense that"', async () => {
        const content = "It's common sense that this is correct.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "only X would think"', async () => {
        const content = 'Only idiots would think otherwise.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should detect "radical" loaded language', async () => {
        const content = 'The radical opposition wants to change everything.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.BIAS);
      });

      it('should have loaded_language subtype', async () => {
        const content = 'Obviously this is wrong.';

        const result = await service.analyze(content);

        expect(result?.subtype).toBe('loaded_language');
      });
    });

    describe('priority', () => {
      it('should prioritize unsourced claims over bias', async () => {
        const content = 'Studies show that this is obviously true. Research proves it.';

        const result = await service.analyze(content);

        expect(result?.type).toBe(FeedbackType.UNSOURCED);
      });
    });
  });
});
