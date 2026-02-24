/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { GroomingDetectorService } from './grooming-detector.service.js';

describe('GroomingDetectorService', () => {
  let service: GroomingDetectorService;

  beforeEach(() => {
    service = new GroomingDetectorService();
  });

  describe('analyze', () => {
    it('should return ALLOW with no detection for clean content', async () => {
      const content = 'This is a great discussion about science!';

      const result = await service.analyze(content);

      expect(result.detected).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.patternType).toBeNull();
      expect(result.flaggedPhrases).toHaveLength(0);
      expect(result.recommendedAction).toBe('ALLOW');
    });

    describe('isolation_attempt detection', () => {
      it('should detect "don\'t tell your parents" pattern', async () => {
        const content = "This is our special secret, don't tell your parents about it.";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('isolation_attempt');
        expect(result.flaggedPhrases.length).toBeGreaterThan(0);
      });

      it('should detect "our little secret" pattern', async () => {
        const content = "Let's keep this as our little secret, okay?";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('isolation_attempt');
      });

      it('should detect "just between us" pattern', async () => {
        const content = 'This should stay just between us.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('isolation_attempt');
      });

      it('should detect "don\'t tell anyone" pattern', async () => {
        const content = "Don't tell anyone about our conversation.";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('isolation_attempt');
      });
    });

    describe('secrecy_request detection', () => {
      it('should detect "keep this between us" pattern', async () => {
        const content = 'Can you keep this between us?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('secrecy_request');
      });

      it('should detect "don\'t show anyone" pattern', async () => {
        const content = "Don't show anyone these messages.";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('secrecy_request');
      });

      it('should detect "delete this message" pattern', async () => {
        const content = 'Make sure to delete this message after reading.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('secrecy_request');
      });
    });

    describe('inappropriate_contact detection', () => {
      it('should detect "DM me" pattern', async () => {
        const content = 'DM me instead, we can talk privately.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('inappropriate_contact');
      });

      it('should detect "text me privately" pattern', async () => {
        const content = 'You should text me privately sometime.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('inappropriate_contact');
      });

      it('should detect "give me your number" pattern', async () => {
        const content = 'Can you give me your number?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('inappropriate_contact');
      });

      it('should detect "add me on" pattern for social media', async () => {
        const content = 'Add me on Snapchat, my username is xyz.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('inappropriate_contact');
      });

      it('should detect "message me on" pattern', async () => {
        const content = 'Message me on Instagram instead.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('inappropriate_contact');
      });
    });

    describe('age_probing detection', () => {
      it('should detect "how old are you" pattern', async () => {
        const content = 'So how old are you anyway?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('age_probing');
      });

      it('should detect "are you alone" pattern', async () => {
        const content = 'Are you alone right now?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('age_probing');
      });

      it('should detect "when are your parents home" pattern', async () => {
        const content = 'When are your parents home usually?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('age_probing');
      });

      it('should detect "where do you live" pattern', async () => {
        const content = 'So where do you live?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('age_probing');
      });

      it('should detect "what school do you go to" pattern', async () => {
        const content = 'What school do you go to?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('age_probing');
      });
    });

    describe('gift_offering detection', () => {
      it('should detect "I\'ll buy you" pattern', async () => {
        const content = "I'll buy you whatever you want.";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('gift_offering');
      });

      it('should detect "send you gifts" pattern', async () => {
        const content = 'I can send you gifts if you want.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('gift_offering');
      });

      it('should detect "I have something for you" pattern', async () => {
        const content = 'I have something special for you.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('gift_offering');
      });

      it('should detect "send you money" pattern', async () => {
        const content = 'I can send you money.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('gift_offering');
      });
    });

    describe('excessive_flattery detection', () => {
      it('should detect "you\'re so mature for your age" pattern', async () => {
        const content = "You're so mature for your age, I can tell.";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('excessive_flattery');
      });

      it('should detect "not like other kids" pattern', async () => {
        const content = "You're not like other kids your age.";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('excessive_flattery');
      });

      it('should detect "you understand me" pattern', async () => {
        const content = 'You understand me better than anyone else.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('excessive_flattery');
      });

      it('should detect "special connection" pattern', async () => {
        const content = 'I feel like we have a special connection.';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('excessive_flattery');
      });
    });

    describe('boundary_testing detection', () => {
      it('should detect "have you ever" suggestive pattern', async () => {
        const content = 'Have you ever kissed someone before?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('boundary_testing');
      });

      it('should detect "do you have a boyfriend/girlfriend" pattern', async () => {
        const content = 'Do you have a boyfriend?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('boundary_testing');
      });

      it('should detect "send me a pic" pattern', async () => {
        const content = 'Can you send me a pic of yourself?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('boundary_testing');
      });

      it('should detect "what are you wearing" pattern', async () => {
        const content = 'What are you wearing right now?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('boundary_testing');
      });
    });

    describe('confidence scoring', () => {
      it('should return low confidence for single weak pattern', async () => {
        const content = 'How old are you?';

        const result = await service.analyze(content);

        expect(result.confidence).toBeGreaterThanOrEqual(0.3);
        expect(result.confidence).toBeLessThan(0.6);
      });

      it('should return higher confidence for multiple patterns', async () => {
        const content =
          "How old are you? Don't tell your parents about our chat. Let's keep this between us.";

        const result = await service.analyze(content);

        expect(result.confidence).toBeGreaterThan(0.6);
      });

      it('should cap confidence at 1.0', async () => {
        const content =
          "How old are you? Are you alone? Don't tell your parents. Our little secret. " +
          "I'll buy you gifts. You're so mature for your age. DM me privately.";

        const result = await service.analyze(content);

        expect(result.confidence).toBeLessThanOrEqual(1.0);
      });
    });

    describe('recommended actions', () => {
      it('should recommend BLOCK for high confidence (>= 0.8)', async () => {
        const content =
          "Don't tell your parents. Our little secret. Are you alone? " +
          "I'll buy you anything you want. You're so mature for your age.";

        const result = await service.analyze(content);

        expect(result.confidence).toBeGreaterThanOrEqual(0.8);
        expect(result.recommendedAction).toBe('BLOCK');
      });

      it('should recommend REVIEW for medium-high confidence (>= 0.6)', async () => {
        // Two patterns from same type to get REVIEW range (0.6-0.8)
        const content = "Don't tell your parents. Our little secret.";

        const result = await service.analyze(content);

        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.confidence).toBeLessThan(0.8);
        expect(result.recommendedAction).toBe('REVIEW');
      });

      it('should recommend FLAG for medium confidence (>= 0.4)', async () => {
        // Single low-severity pattern for FLAG range (0.4-0.6)
        const content = 'How old are you?';

        const result = await service.analyze(content);

        expect(result.confidence).toBeGreaterThanOrEqual(0.4);
        expect(result.confidence).toBeLessThan(0.6);
        expect(result.recommendedAction).toBe('FLAG');
      });

      it('should recommend ALLOW for low confidence (< 0.4)', async () => {
        const content = 'This is a normal discussion about science topics.';

        const result = await service.analyze(content);

        expect(result.confidence).toBeLessThan(0.4);
        expect(result.recommendedAction).toBe('ALLOW');
      });
    });

    describe('case insensitivity', () => {
      it('should detect patterns regardless of case', async () => {
        const content = "DON'T TELL YOUR PARENTS about this.";

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('isolation_attempt');
      });

      it('should detect mixed case patterns', async () => {
        const content = 'How Old Are You?';

        const result = await service.analyze(content);

        expect(result.detected).toBe(true);
        expect(result.patternType).toBe('age_probing');
      });
    });

    describe('explanation', () => {
      it('should provide meaningful explanation when patterns detected', async () => {
        const content = "Don't tell your parents about our conversation.";

        const result = await service.analyze(content);

        expect(result.explanation).toBeTruthy();
        expect(result.explanation.length).toBeGreaterThan(20);
      });

      it('should explain no concerns for clean content', async () => {
        const content = 'This is a great discussion!';

        const result = await service.analyze(content);

        expect(result.explanation).toContain('No grooming patterns detected');
      });
    });
  });

  describe('shouldBlockForChildren', () => {
    it('should return true for high-confidence grooming content', async () => {
      const content =
        "Don't tell your parents. Our little secret. Are you alone? " +
        "I'll buy you anything. You're so mature for your age.";

      const shouldBlock = await service.shouldBlockForChildren(content);

      expect(shouldBlock).toBe(true);
    });

    it('should return false for clean content', async () => {
      const content = 'This is a great science discussion!';

      const shouldBlock = await service.shouldBlockForChildren(content);

      expect(shouldBlock).toBe(false);
    });

    it('should return true for content requiring review', async () => {
      const content = "How old are you? Don't tell your parents. Just between us.";

      const shouldBlock = await service.shouldBlockForChildren(content);

      expect(shouldBlock).toBe(true);
    });

    it('should return false for content only flagged (medium confidence)', async () => {
      // Single pattern with low-medium confidence
      const content = 'What school do you go to?';

      const shouldBlock = await service.shouldBlockForChildren(content);

      // This should NOT block since it's just flagged, not blocked/reviewed
      expect(shouldBlock).toBe(false);
    });
  });

  describe('getDetailedAnalysis', () => {
    it('should return detailed breakdown of all patterns found', async () => {
      const content = "How old are you? Don't tell your parents.";

      const detailed = await service.getDetailedAnalysis(content);

      expect(detailed.allPatternsFound).toBeDefined();
      expect(detailed.allPatternsFound.length).toBeGreaterThan(0);
      expect(detailed.riskLevel).toBeDefined();
    });

    it('should include pattern breakdown with matches', async () => {
      const content = "Don't tell your parents. Our little secret.";

      const detailed = await service.getDetailedAnalysis(content);

      expect(detailed.allPatternsFound).toContainEqual(
        expect.objectContaining({
          type: 'isolation_attempt',
        }),
      );
    });

    it('should provide risk level assessment', async () => {
      const content =
        "Don't tell your parents. Are you alone? I'll buy you gifts. DM me privately.";

      const detailed = await service.getDetailedAnalysis(content);

      expect(['low', 'medium', 'high', 'critical']).toContain(detailed.riskLevel);
    });

    it('should include moderator notes', async () => {
      const content = "Don't tell your parents about this conversation.";

      const detailed = await service.getDetailedAnalysis(content);

      expect(detailed.moderatorNotes).toBeDefined();
      expect(detailed.moderatorNotes.length).toBeGreaterThan(0);
    });

    it('should return clean result for safe content', async () => {
      const content = 'This is a wonderful discussion about space exploration!';

      const detailed = await service.getDetailedAnalysis(content);

      expect(detailed.allPatternsFound).toHaveLength(0);
      expect(detailed.riskLevel).toBe('low');
    });
  });

  describe('multiple patterns detection', () => {
    it('should return the most severe pattern type as primary', async () => {
      // boundary_testing is more severe than age_probing
      const content = 'How old are you? Send me a pic of yourself.';

      const result = await service.analyze(content);

      expect(result.detected).toBe(true);
      // boundary_testing should be prioritized as it's more explicit
      expect(result.patternType).toBe('boundary_testing');
    });

    it('should flag all matched phrases', async () => {
      const content = "Don't tell your parents. Our little secret. How old are you?";

      const result = await service.analyze(content);

      expect(result.flaggedPhrases.length).toBeGreaterThanOrEqual(2);
    });
  });
});
