/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tone Analyzer Golden Tests
 *
 * T338: Fixed input/output pairs for regression testing.
 * These tests serve as baselines that should not change unless
 * the analyzer behavior is intentionally modified.
 *
 * Golden tests verify:
 * 1. Inflammatory language detection
 * 2. Hostile tone detection
 * 3. Neutral content classification (returns null)
 * 4. Confidence score calculations
 * 5. Subtype determination
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToneAnalyzerService } from '../services/tone-analyzer.service.js';
import { FeedbackType } from '@prisma/client';

describe('ToneAnalyzerService Golden Tests', () => {
  let service: ToneAnalyzerService;

  beforeEach(() => {
    service = new ToneAnalyzerService();
  });

  /**
   * ========================================
   * GOLDEN TEST FIXTURES - DO NOT MODIFY
   * Unless intentionally changing analyzer behavior
   * ========================================
   */

  describe('Inflammatory Language Detection - Golden Fixtures', () => {
    /**
     * Personal Attack - Direct (you)
     * Pattern: you('re| are)\s+(stupid|dumb|idiot|moron|fool|ignorant|ridiculous)
     */
    const PERSONAL_ATTACKS_DIRECT = [
      {
        id: 'PA-D-001',
        input: "You're stupid if you believe that.",
        expectedMatch: "You're stupid",
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PA-D-002',
        input: 'You are stupid for thinking this way.',
        expectedMatch: 'You are stupid',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PA-D-003',
        input: 'I think you are ignorant about the facts.',
        expectedMatch: 'you are ignorant',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PA-D-004',
        input: "That proves you're dumb.",
        expectedMatch: "you're dumb",
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
    ];

    it.each(PERSONAL_ATTACKS_DIRECT)(
      'should detect personal attack [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );

    /**
     * Personal Attacks - Third Person
     * Pattern: (they|these people|those people|...)\s+(are|'re)\s+...(stupid|dumb|...)
     */
    const PERSONAL_ATTACKS_THIRD_PERSON = [
      {
        id: 'PA-T-001',
        input: 'They are stupid for supporting this policy.',
        expectedMatch: 'They are stupid',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PA-T-002',
        input: 'These people are really ignorant about economics.',
        expectedMatch: 'These people are really ignorant',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PA-T-003',
        input: 'Those folks are completely stupid.',
        expectedMatch: 'Those folks are completely stupid',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PA-T-004',
        input: 'Those people are fools for believing that.',
        expectedMatch: 'Those people are fools',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
    ];

    it.each(PERSONAL_ATTACKS_THIRD_PERSON)(
      'should detect third-person attack [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );

    /**
     * Aggressive Commands
     * Pattern: shut\s+up, get\s+lost
     */
    const AGGRESSIVE_COMMANDS = [
      {
        id: 'AC-001',
        input: 'Just shut up already!',
        expectedMatch: 'shut up',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'AC-002',
        input: "Get lost, you don't know what you're talking about.",
        expectedMatch: 'Get lost',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
    ];

    it.each(AGGRESSIVE_COMMANDS)(
      'should detect aggressive command [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );

    /**
     * Hate/Disgust Expressions
     * Pattern: (hate|despise)\s+(you|your|them|this|these)
     */
    const HATE_EXPRESSIONS = [
      {
        id: 'HE-001',
        input: 'I hate you for saying that.',
        expectedMatch: 'hate you',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'HE-002',
        input: 'I despise this kind of thinking.',
        expectedMatch: 'despise this',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'HE-003',
        input: 'I hate them for what they believe.',
        expectedMatch: 'hate them',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
    ];

    it.each(HATE_EXPRESSIONS)(
      'should detect hate expression [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );

    /**
     * Political Dismissals
     * Pattern: (typical|classic)\s+(liberal|conservative|leftist|right-wing)
     */
    const POLITICAL_DISMISSALS = [
      {
        id: 'PD-001',
        input: 'This is typical liberal nonsense.',
        expectedMatch: 'typical liberal',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PD-002',
        input: 'Classic conservative talking point.',
        expectedMatch: 'Classic conservative',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
      {
        id: 'PD-003',
        input: 'Typical right-wing propaganda.',
        expectedMatch: 'Typical right-wing',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
    ];

    it.each(POLITICAL_DISMISSALS)(
      'should detect political dismissal [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );

    /**
     * Sheeple Accusation
     * Pattern: wake\s+up\s+sheeple
     */
    const SHEEPLE_ACCUSATIONS = [
      {
        id: 'SA-001',
        input: 'Wake up sheeple, you are being controlled!',
        expectedMatch: 'Wake up sheeple',
        expectedSubtype: 'personal_attack',
        expectedConfidence: 0.75,
      },
    ];

    it.each(SHEEPLE_ACCUSATIONS)(
      'should detect sheeple accusation [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );
  });

  describe('Hostile Tone Detection - Golden Fixtures', () => {
    /**
     * Condescending Phrases
     * Pattern: obviously\s+(you|they)\s+(don't|can't|won't)
     * Pattern: clearly\s+you\s+(don't|can't|haven't)
     */
    const HOSTILE_CONDESCENSION = [
      {
        id: 'HC-001',
        input: "Obviously you don't understand basic economics.",
        expectedMatch: "Obviously you don't",
        expectedSubtype: 'hostile_tone',
        expectedConfidence: 0.75,
      },
      {
        id: 'HC-002',
        input: "Clearly you can't grasp the complexity here.",
        expectedMatch: "Clearly you can't",
        expectedSubtype: 'hostile_tone',
        expectedConfidence: 0.75,
      },
      {
        id: 'HC-003',
        input: "Obviously they don't know what they're talking about.",
        expectedMatch: "Obviously they don't",
        expectedSubtype: 'hostile_tone',
        expectedConfidence: 0.75,
      },
      {
        id: 'HC-004',
        input: "Clearly you haven't read the research.",
        expectedMatch: "Clearly you haven't",
        expectedSubtype: 'hostile_tone',
        expectedConfidence: 0.75,
      },
    ];

    it.each(HOSTILE_CONDESCENSION)(
      'should detect hostile condescension [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );

    /**
     * Intelligence Insults
     * Pattern: anyone\s+with\s+half\s+a\s+brain
     */
    const INTELLIGENCE_INSULTS = [
      {
        id: 'II-001',
        input: 'Anyone with half a brain would understand this.',
        expectedMatch: 'Anyone with half a brain',
        expectedSubtype: 'hostile_tone',
        expectedConfidence: 0.75,
      },
    ];

    it.each(INTELLIGENCE_INSULTS)(
      'should detect intelligence insult [$id]: "$input"',
      async ({ input, expectedMatch, expectedSubtype, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
        expect(result!.reasoning).toContain(expectedMatch);
      },
    );
  });

  describe('Combined Attack Detection - Golden Fixtures', () => {
    /**
     * Messages with both inflammatory language AND hostile tone
     * Should return 'personal_attack_with_hostile_tone' subtype
     */
    const COMBINED_ATTACKS = [
      {
        id: 'CA-001',
        input: "Obviously you don't understand because you're stupid.",
        expectedSubtype: 'personal_attack_with_hostile_tone',
        expectedConfidenceMin: 0.85, // Multiple issues = higher confidence
      },
      {
        id: 'CA-002',
        input: "Clearly you can't grasp this, which is typical conservative thinking.",
        expectedSubtype: 'personal_attack_with_hostile_tone',
        expectedConfidenceMin: 0.85,
      },
      {
        id: 'CA-003',
        input: "Anyone with half a brain would know you're stupid for believing that.",
        expectedSubtype: 'personal_attack_with_hostile_tone',
        expectedConfidenceMin: 0.85,
      },
    ];

    it.each(COMBINED_ATTACKS)(
      'should detect combined attack [$id]: "$input"',
      async ({ input, expectedSubtype, expectedConfidenceMin }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.INFLAMMATORY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.confidenceScore).toBeGreaterThanOrEqual(expectedConfidenceMin);
      },
    );
  });

  describe('Neutral Content Classification - Golden Fixtures', () => {
    /**
     * Neutral content should return null (no issues detected)
     * These serve as negative regression tests
     */
    const NEUTRAL_CONTENT = [
      {
        id: 'NC-001',
        input: 'I respectfully disagree with your position on this topic.',
        reason: 'Polite disagreement without attacks',
      },
      {
        id: 'NC-002',
        input: 'While I understand your point, I think there are other factors to consider.',
        reason: 'Acknowledging opposing view while presenting alternatives',
      },
      {
        id: 'NC-003',
        input: 'The data suggests a different conclusion than what you mentioned.',
        reason: 'Evidence-based disagreement',
      },
      {
        id: 'NC-004',
        input: 'I appreciate your perspective, though I see it differently based on my experience.',
        reason: 'Personal perspective without attacks',
      },
      {
        id: 'NC-005',
        input: 'Could you clarify what you mean by that? I want to understand your reasoning.',
        reason: 'Seeking clarification respectfully',
      },
      {
        id: 'NC-006',
        input: 'This is a complex issue with valid points on both sides.',
        reason: 'Acknowledging complexity',
      },
      {
        id: 'NC-007',
        input: "I think we're talking past each other. Let me try to reframe my argument.",
        reason: 'Recognizing miscommunication',
      },
      {
        id: 'NC-008',
        input: 'The economic impact is significant but manageable with proper planning.',
        reason: 'Factual statement without inflammatory language',
      },
      {
        id: 'NC-009',
        input: 'Historical precedent shows that similar policies have had mixed results.',
        reason: 'Referencing evidence neutrally',
      },
      {
        id: 'NC-010',
        input: 'I need more information before I can form a strong opinion on this.',
        reason: 'Acknowledging uncertainty',
      },
    ];

    it.each(NEUTRAL_CONTENT)(
      'should classify as neutral [$id]: "$input" - $reason',
      async ({ input }) => {
        const result = await service.analyze(input);
        expect(result).toBeNull();
      },
    );
  });

  describe('Suggestion Text - Golden Fixtures', () => {
    /**
     * Verify exact suggestion text for each subtype
     */
    it('should provide correct suggestion for personal_attack subtype', async () => {
      const result = await service.analyze("You're stupid for thinking that.");

      expect(result!.suggestionText).toBe(
        'Consider rephrasing to focus on ideas rather than personal characteristics. Attack the argument, not the person.',
      );
    });

    it('should provide correct suggestion for hostile_tone subtype', async () => {
      const result = await service.analyze("Obviously you don't understand the basics.");

      expect(result!.suggestionText).toBe(
        'Your message may come across as hostile. Consider using more neutral language to foster constructive dialogue.',
      );
    });

    it('should provide correct suggestion for personal_attack_with_hostile_tone subtype', async () => {
      const result = await service.analyze("Obviously you don't understand because you're stupid.");

      expect(result!.suggestionText).toBe(
        'This response contains personal attacks and hostile language. Reframe your points to focus on the topic at hand with respectful language.',
      );
    });
  });

  describe('Educational Resources - Golden Fixtures', () => {
    /**
     * Verify educational resources are always included
     */
    it('should include educational resources with correct links', async () => {
      const result = await service.analyze("You're stupid.");

      expect(result!.educationalResources).toBeDefined();
      expect(result!.educationalResources.links).toHaveLength(2);

      expect(result!.educationalResources.links[0]).toEqual({
        title: 'Constructive Communication Guide',
        url: 'https://en.wikipedia.org/wiki/Nonviolent_Communication',
      });

      expect(result!.educationalResources.links[1]).toEqual({
        title: 'Avoiding Personal Attacks in Discussions',
        url: 'https://en.wikipedia.org/wiki/Ad_hominem',
      });
    });
  });

  describe('Confidence Score Calculation - Golden Fixtures', () => {
    /**
     * Verify confidence score formula: Math.min(0.95, 0.65 + issues.length * 0.1)
     */
    const CONFIDENCE_TESTS = [
      {
        id: 'CS-001',
        input: "You're stupid.", // 1 issue
        expectedConfidence: 0.75, // 0.65 + 1 * 0.1
      },
      {
        id: 'CS-002',
        input: "You're stupid and I hate you.", // 2 issues (2 different patterns)
        expectedConfidence: 0.85, // 0.65 + 2 * 0.1
      },
      {
        id: 'CS-003',
        input: "Obviously you don't get it because you're stupid. I hate you and you make me sick.", // 4 issues
        expectedConfidence: 0.95, // Capped at 0.95
      },
    ];

    it.each(CONFIDENCE_TESTS)(
      'should calculate correct confidence [$id]: $expectedConfidence',
      async ({ input, expectedConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.confidenceScore).toBeCloseTo(expectedConfidence, 2);
      },
    );
  });

  describe('Edge Cases - Golden Fixtures', () => {
    /**
     * Edge cases that verify boundary behavior
     */
    const EDGE_CASES = [
      {
        id: 'EC-001',
        input: '', // Empty string
        expectedResult: null,
        description: 'Empty string should return null',
      },
      {
        id: 'EC-002',
        input: '   ', // Whitespace only
        expectedResult: null,
        description: 'Whitespace-only string should return null',
      },
      {
        id: 'EC-003',
        input: 'You are', // Partial match (no insult)
        expectedResult: null,
        description: 'Partial pattern without insult should return null',
      },
      {
        id: 'EC-004',
        input: 'stupid', // Just insult word (no targeting)
        expectedResult: null,
        description: 'Isolated insult word without targeting should return null',
      },
    ];

    it.each(EDGE_CASES)('[$id] $description', async ({ input, expectedResult }) => {
      const result = await service.analyze(input);
      expect(result).toBe(expectedResult);
    });

    /**
     * Case insensitivity tests
     */
    const CASE_INSENSITIVE_TESTS = [
      {
        id: 'CI-001',
        input: "YOU'RE STUPID",
        shouldMatch: true,
      },
      {
        id: 'CI-002',
        input: "you're STUPID",
        shouldMatch: true,
      },
      {
        id: 'CI-003',
        input: "OBVIOUSLY YOU DON'T UNDERSTAND",
        shouldMatch: true,
      },
    ];

    it.each(CASE_INSENSITIVE_TESTS)(
      'should detect patterns case-insensitively [$id]: "$input"',
      async ({ input, shouldMatch }) => {
        const result = await service.analyze(input);
        expect(result !== null).toBe(shouldMatch);
      },
    );
  });

  describe('All Caps Detection - Golden Fixtures', () => {
    /**
     * All caps aggressive text (3+ words of 4+ chars)
     * Pattern: \b[A-Z]{4,}\s+[A-Z]{4,}\s+[A-Z]{4,}
     */
    const ALL_CAPS_TESTS = [
      {
        id: 'CAPS-001',
        input: 'STOP BEING SUCH FOOL', // 4 words of 4+ chars (STOP, BEING, SUCH, FOOL)
        shouldMatch: true,
        description: 'All caps aggressive phrase with 3+ consecutive 4-char words',
      },
      {
        id: 'CAPS-002',
        input: 'THIS VERY WRONG COMPLETELY', // 4 consecutive 4+ char words
        shouldMatch: true,
        description: 'All caps emphasis with consecutive 4-char words',
      },
      {
        id: 'CAPS-003',
        input: 'I DISAGREE COMPLETELY',
        shouldMatch: false,
        description: 'Single-letter word breaks the chain',
      },
      {
        id: 'CAPS-004',
        input: 'OK NO WAY',
        shouldMatch: false,
        description: 'All words under 4 chars should not match',
      },
    ];

    it.each(ALL_CAPS_TESTS)('[$id] $description: "$input"', async ({ input, shouldMatch }) => {
      const result = await service.analyze(input);
      expect(result !== null).toBe(shouldMatch);
    });
  });
});
