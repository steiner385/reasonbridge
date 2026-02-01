import { describe, it, expect, beforeEach } from 'vitest';
import { ToneAnalyzerService } from './tone-analyzer.service.js';
import { FeedbackType } from '@prisma/client';

describe('ToneAnalyzerService', () => {
  let service: ToneAnalyzerService;

  beforeEach(() => {
    service = new ToneAnalyzerService();
  });

  describe('analyze', () => {
    it('should return null for content with no issues', async () => {
      const content = 'I respectfully disagree with your point. Here is why...';

      const result = await service.analyze(content);

      expect(result).toBeNull();
    });

    describe('personal attacks detection', () => {
      it('should detect "you are stupid"', async () => {
        const content = 'You are stupid for believing that.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "you\'re an idiot"', async () => {
        // Pattern: you('re| are)\s+(stupid|dumb|idiot|moron|fool|ignorant)
        const content = "You're idiot for saying that.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "shut up"', async () => {
        const content = 'Just shut up already.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "get lost"', async () => {
        const content = 'Get lost, nobody cares.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "hate you"', async () => {
        const content = 'I hate you and your ideas.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "you make me sick"', async () => {
        const content = 'You make me sick with these ideas.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect political attacks like "typical liberal"', async () => {
        const content = 'Typical liberal response.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "typical conservative"', async () => {
        const content = 'Typical conservative attitude.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect all caps aggressive language', async () => {
        // Pattern requires 3+ consecutive words of 4+ chars each in all caps
        const content = 'WAKE UPPP PEOPLE THISSS ISSS IMPORTANT';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });
    });

    describe('hostile tone detection', () => {
      it('should detect "obviously you don\'t"', async () => {
        const content = "Obviously you don't understand the basics.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "clearly you can\'t"', async () => {
        const content = "Clearly you can't grasp this concept.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "anyone with half a brain"', async () => {
        const content = 'Anyone with half a brain would see this.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });

      it('should detect "it\'s obvious that you"', async () => {
        const content = "It's obvious that you have no idea.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.type).toBe(FeedbackType.INFLAMMATORY);
      });
    });

    describe('subtypes', () => {
      it('should identify personal_attack subtype', async () => {
        // Pattern: you('re| are)\s+(stupid|...)
        const content = 'You are stupid for that.';

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('personal_attack');
      });

      it('should identify hostile_tone subtype', async () => {
        // Pattern: obviously\s+(you|they)\s+(don't|can't|won't)
        const content = "Obviously you don't understand this topic.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('hostile_tone');
      });

      it('should identify combined subtype when both present', async () => {
        // Both patterns must match
        const content = "You are stupid. Obviously you don't understand.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.subtype).toBe('personal_attack_with_hostile_tone');
      });
    });

    describe('suggestions', () => {
      it('should provide suggestion for personal attacks', async () => {
        const content = 'You are stupid for that.';

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('ideas rather than personal');
      });

      it('should provide suggestion for hostile tone', async () => {
        const content = "Clearly you can't understand.";

        const result = await service.analyze(content);

        expect(result?.suggestionText).toContain('neutral language');
      });
    });

    describe('confidence scores', () => {
      it('should increase confidence with multiple issues', async () => {
        const content = "You're an idiot. Shut up. Obviously you don't get it.";

        const result = await service.analyze(content);

        expect(result?.confidenceScore).toBeGreaterThan(0.75);
      });

      it('should cap confidence at 0.95', async () => {
        const content = "You're stupid. You're dumb. You're a moron. Shut up. Get lost.";

        const result = await service.analyze(content);

        expect(result?.confidenceScore).toBeLessThanOrEqual(0.95);
      });
    });

    describe('educational resources', () => {
      it('should provide educational resources', async () => {
        const content = "You're stupid and an idiot.";

        const result = await service.analyze(content);

        expect(result).not.toBeNull();
        expect(result?.educationalResources).toBeDefined();
        expect(result?.educationalResources?.links).toBeDefined();
        expect(result?.educationalResources?.links?.length).toBeGreaterThan(0);
      });
    });
  });
});
