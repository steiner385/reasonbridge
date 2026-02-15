/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fallacy Detector Golden Tests
 *
 * T340: Fixed input/output pairs for regression testing.
 * These tests serve as baselines for the fallacy detector service.
 *
 * Golden tests verify:
 * 1. Detection of 7 fallacy types (ad hominem, strawman, etc.)
 * 2. Neutral content classification (returns null)
 * 3. Confidence score calculations
 * 4. Suggestion text per fallacy type
 * 5. Educational resources
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FallacyDetectorService } from '../services/fallacy-detector.service.js';
import { FeedbackType } from '@prisma/client';

describe('FallacyDetectorService Golden Tests', () => {
  let service: FallacyDetectorService;

  beforeEach(() => {
    service = new FallacyDetectorService();
  });

  /**
   * ========================================
   * GOLDEN TEST FIXTURES - DO NOT MODIFY
   * Unless intentionally changing analyzer behavior
   * ========================================
   */

  describe('Ad Hominem Detection - Golden Fixtures', () => {
    /**
     * Ad hominem: Attacking the person instead of the argument
     */
    const AD_HOMINEM_FIXTURES = [
      {
        id: 'AH-001',
        input: "You're just a teacher, what would you know about economics?",
        expectedSubtype: 'ad_hominem',
      },
      {
        id: 'AH-002',
        input: 'Coming from someone who failed math, this is rich.',
        expectedSubtype: 'ad_hominem',
      },
      {
        id: 'AH-003',
        input: 'You lack credentials to speak on this topic.',
        expectedSubtype: 'ad_hominem',
      },
      {
        id: 'AH-004',
        input: 'What would you know about running a business?',
        expectedSubtype: 'ad_hominem',
      },
      {
        id: 'AH-005',
        input: "Your lack experience in this field, so your opinion doesn't count.",
        expectedSubtype: 'ad_hominem',
      },
    ];

    it.each(AD_HOMINEM_FIXTURES)(
      'should detect ad hominem [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.FALLACY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('Ad Hominem');
      },
    );
  });

  describe('Strawman Detection - Golden Fixtures', () => {
    /**
     * Strawman: Misrepresenting the opponent's argument
     */
    const STRAWMAN_FIXTURES = [
      {
        id: 'SM-001',
        input: "So you're saying we should just let everyone do whatever they want?",
        expectedSubtype: 'strawman',
      },
      {
        id: 'SM-002',
        input: 'By that logic, we should never regulate anything.',
        expectedSubtype: 'strawman',
      },
      {
        id: 'SM-003',
        input: 'If we follow your reasoning, we might as well abolish all laws.',
        expectedSubtype: 'strawman',
      },
      {
        id: 'SM-004',
        input: 'You think that all politicians are corrupt.',
        expectedSubtype: 'strawman',
      },
    ];

    it.each(STRAWMAN_FIXTURES)(
      'should detect strawman [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.FALLACY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('Strawman');
      },
    );
  });

  describe('False Dichotomy Detection - Golden Fixtures', () => {
    /**
     * False dichotomy: Presenting only two options when more exist
     */
    const FALSE_DICHOTOMY_FIXTURES = [
      {
        id: 'FD-001',
        input: "You're either with us or against us on this issue.",
        expectedSubtype: 'false_dichotomy',
      },
      {
        id: 'FD-002',
        input: 'There are only two options here: we act now or lose everything.',
        expectedSubtype: 'false_dichotomy',
      },
      {
        id: 'FD-003',
        input: "If you don't agree, then you must be wrong.",
        expectedSubtype: 'false_dichotomy',
      },
      {
        id: 'FD-004',
        input: 'Either we ban all cars or accept pollution. Those are our only two choices.',
        expectedSubtype: 'false_dichotomy',
      },
    ];

    it.each(FALSE_DICHOTOMY_FIXTURES)(
      'should detect false dichotomy [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.FALLACY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('False Dichotomy');
      },
    );
  });

  describe('Slippery Slope Detection - Golden Fixtures', () => {
    /**
     * Slippery slope: Claiming cascading consequences without evidence
     */
    const SLIPPERY_SLOPE_FIXTURES = [
      {
        id: 'SS-001',
        input: 'If we allow this, next thing you know they will want X.',
        expectedSubtype: 'slippery_slope',
      },
      {
        id: 'SS-002',
        input: 'This will lead to complete societal collapse.',
        expectedSubtype: 'slippery_slope',
      },
      {
        id: 'SS-003',
        input: "Where does it end? Once we start, there's no stopping.",
        expectedSubtype: 'slippery_slope',
      },
      {
        id: 'SS-004',
        input: "It's a slippery slope to authoritarianism.",
        expectedSubtype: 'slippery_slope',
      },
    ];

    it.each(SLIPPERY_SLOPE_FIXTURES)(
      'should detect slippery slope [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.FALLACY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('Slippery Slope');
      },
    );
  });

  describe('Appeal to Emotion Detection - Golden Fixtures', () => {
    /**
     * Appeal to emotion: Using feelings instead of logic
     */
    const APPEAL_TO_EMOTION_FIXTURES = [
      {
        id: 'AE-001',
        input: 'Think of the children! We must act immediately.',
        expectedSubtype: 'appeal_to_emotion',
      },
      {
        id: 'AE-002',
        input: 'How would you feel if it was your family affected by this?',
        expectedSubtype: 'appeal_to_emotion',
      },
      {
        id: 'AE-003',
        input: 'Imagine if it was your child in that situation.',
        expectedSubtype: 'appeal_to_emotion',
      },
      {
        id: 'AE-004',
        input: 'This makes me so angry that people still believe this.',
        expectedSubtype: 'appeal_to_emotion',
      },
    ];

    it.each(APPEAL_TO_EMOTION_FIXTURES)(
      'should detect appeal to emotion [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.FALLACY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('Appeal to Emotion');
      },
    );
  });

  describe('Hasty Generalization Detection - Golden Fixtures', () => {
    /**
     * Hasty generalization: Overgeneralizing from limited examples
     */
    const HASTY_GENERALIZATION_FIXTURES = [
      {
        id: 'HG-001',
        input: 'All politicians are always corrupt.',
        expectedSubtype: 'hasty_generalization',
      },
      {
        id: 'HG-002',
        input: 'Everyone knows that vaccines cause autism.',
        expectedSubtype: 'hasty_generalization',
      },
      {
        id: 'HG-003',
        input: 'No one thinks that policy is a good idea.',
        expectedSubtype: 'hasty_generalization',
      },
      {
        id: 'HG-004',
        input: 'John always does complain about everything.',
        expectedSubtype: 'hasty_generalization',
      },
    ];

    it.each(HASTY_GENERALIZATION_FIXTURES)(
      'should detect hasty generalization [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.FALLACY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('Hasty Generalization');
      },
    );
  });

  describe('Appeal to Authority Detection - Golden Fixtures', () => {
    /**
     * Appeal to authority: Citing sources without specifics
     */
    const APPEAL_TO_AUTHORITY_FIXTURES = [
      {
        id: 'AA-001',
        input: 'Experts agree that this is the best approach.',
        expectedSubtype: 'appeal_to_authority',
      },
      {
        id: 'AA-002',
        input: 'Studies show that people who do X are more successful.',
        expectedSubtype: 'appeal_to_authority',
      },
      {
        id: 'AA-003',
        input: 'Science says that climate change is real.',
        expectedSubtype: 'appeal_to_authority',
      },
      {
        id: 'AA-004',
        input: 'Einstein said so, therefore it must be true.',
        expectedSubtype: 'appeal_to_authority',
      },
    ];

    it.each(APPEAL_TO_AUTHORITY_FIXTURES)(
      'should detect appeal to authority [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.FALLACY);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('Appeal to Authority');
      },
    );
  });

  describe('Neutral Content Classification - Golden Fixtures', () => {
    /**
     * Neutral content should return null (no fallacies detected)
     */
    const NEUTRAL_CONTENT = [
      {
        id: 'NC-001',
        input:
          'According to Smith et al. (2023), the evidence suggests moderate effects on economic growth.',
        reason: 'Properly cited research',
      },
      {
        id: 'NC-002',
        input: 'While there are valid points on both sides, the data supports a nuanced approach.',
        reason: 'Balanced reasoning',
      },
      {
        id: 'NC-003',
        input: 'I disagree with your conclusion because the premise seems flawed.',
        reason: 'Direct argument refutation',
      },
      {
        id: 'NC-004',
        input: 'This policy has both advantages and disadvantages that we should consider.',
        reason: 'Acknowledging complexity',
      },
      {
        id: 'NC-005',
        input: 'Your argument would be stronger with more specific evidence.',
        reason: 'Constructive feedback on logic',
      },
      {
        id: 'NC-006',
        input:
          'Based on the available data, several interpretations are possible. Let me explain my view.',
        reason: 'Tentative conclusion with evidence',
      },
      {
        id: 'NC-007',
        input: 'I understand your perspective, but here are three counterpoints worth considering.',
        reason: 'Respectful disagreement',
      },
      {
        id: 'NC-008',
        input: 'The correlation in this study does not necessarily imply causation.',
        reason: 'Critical thinking about evidence',
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
     * Verify exact suggestion text for each fallacy type
     */
    const SUGGESTION_FIXTURES = [
      {
        fallacyType: 'ad_hominem',
        input: "You're just a student, what would you know?",
        expectedSuggestion:
          'Focus on addressing the argument itself rather than attacking the person making it. What specific claims can you refute?',
      },
      {
        fallacyType: 'strawman',
        input: "So you're saying we should abandon all rules?",
        expectedSuggestion:
          "Ensure you're responding to the actual argument being made, not a misrepresented version. Can you quote their exact position?",
      },
      {
        fallacyType: 'false_dichotomy',
        input: "You're either with us or against us.",
        expectedSuggestion:
          'Consider whether there are more than two options available. Are there middle-ground positions or alternative approaches?',
      },
      {
        fallacyType: 'slippery_slope',
        input: 'This will lead to total chaos.',
        expectedSuggestion:
          'Provide evidence for each step in the causal chain. What specific mechanisms would lead to the predicted outcome?',
      },
      {
        fallacyType: 'appeal_to_emotion',
        input: 'Think of the children who will suffer.',
        expectedSuggestion:
          'While emotions are valid, consider supporting your point with factual reasoning. What objective evidence supports this position?',
      },
      {
        fallacyType: 'hasty_generalization',
        input: 'All lawyers are always greedy.',
        expectedSuggestion:
          'Avoid sweeping generalizations. Can you provide specific examples or acknowledge exceptions?',
      },
      {
        fallacyType: 'appeal_to_authority',
        input: 'Experts agree on this point.',
        expectedSuggestion:
          'When citing authorities, provide specific sources and be open to counter-evidence. Which studies or experts specifically?',
      },
    ];

    it.each(SUGGESTION_FIXTURES)(
      'should provide correct suggestion for $fallacyType',
      async ({ input, expectedSuggestion }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.suggestionText).toBe(expectedSuggestion);
      },
    );
  });

  describe('Reasoning Text - Golden Fixtures', () => {
    /**
     * Verify reasoning includes fallacy name explanation
     */
    const REASONING_FIXTURES = [
      {
        fallacyType: 'ad_hominem',
        input: "You're just a beginner at this.",
        expectedReasoningContains: 'Ad Hominem (attacking the person)',
      },
      {
        fallacyType: 'strawman',
        input: 'By that logic, no one should ever eat anything.',
        expectedReasoningContains: 'Strawman (misrepresenting the argument)',
      },
      {
        fallacyType: 'false_dichotomy',
        input: 'There are only two choices here.',
        expectedReasoningContains: 'False Dichotomy (presenting only two options)',
      },
      {
        fallacyType: 'slippery_slope',
        input: "It's a slippery slope to tyranny.",
        expectedReasoningContains:
          'Slippery Slope (claiming cascading consequences without evidence)',
      },
      {
        fallacyType: 'appeal_to_emotion',
        input: 'This makes me sad that people believe this.',
        expectedReasoningContains: 'Appeal to Emotion (using feelings instead of logic)',
      },
      {
        fallacyType: 'hasty_generalization',
        input: 'Nobody thinks that works anymore.',
        expectedReasoningContains: 'Hasty Generalization (overgeneralizing from limited examples)',
      },
      {
        fallacyType: 'appeal_to_authority',
        input: 'Science says we must act.',
        expectedReasoningContains: 'Appeal to Authority (citing sources without specifics)',
      },
    ];

    it.each(REASONING_FIXTURES)(
      'should include fallacy explanation in reasoning for $fallacyType',
      async ({ input, expectedReasoningContains }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.reasoning).toContain(expectedReasoningContains);
      },
    );
  });

  describe('Educational Resources - Golden Fixtures', () => {
    /**
     * Verify educational resources are included for each fallacy type
     */
    const RESOURCE_FIXTURES = [
      {
        fallacyType: 'ad_hominem',
        input: "You're only a hobbyist.",
        expectedTitle: 'Ad Hominem Fallacy',
        expectedUrl: 'https://en.wikipedia.org/wiki/Ad_hominem',
      },
      {
        fallacyType: 'strawman',
        input: "So you're saying we should ignore all safety?",
        expectedTitle: 'Straw Man Fallacy',
        expectedUrl: 'https://en.wikipedia.org/wiki/Straw_man',
      },
      {
        fallacyType: 'false_dichotomy',
        input: 'We have only two options.',
        expectedTitle: 'False Dilemma',
        expectedUrl: 'https://en.wikipedia.org/wiki/False_dilemma',
      },
      {
        fallacyType: 'slippery_slope',
        input: 'Where does it stop?',
        expectedTitle: 'Slippery Slope Fallacy',
        expectedUrl: 'https://en.wikipedia.org/wiki/Slippery_slope',
      },
      {
        fallacyType: 'appeal_to_emotion',
        input: 'How would you feel if your family was affected?',
        expectedTitle: 'Appeal to Emotion',
        expectedUrl: 'https://en.wikipedia.org/wiki/Appeal_to_emotion',
      },
      {
        fallacyType: 'hasty_generalization',
        input: 'Everyone knows that this is obvious.',
        expectedTitle: 'Hasty Generalization',
        expectedUrl: 'https://en.wikipedia.org/wiki/Hasty_generalization',
      },
      {
        fallacyType: 'appeal_to_authority',
        input: 'Studies show results.',
        expectedTitle: 'Appeal to Authority',
        expectedUrl: 'https://en.wikipedia.org/wiki/Argument_from_authority',
      },
    ];

    it.each(RESOURCE_FIXTURES)(
      'should include correct educational resources for $fallacyType',
      async ({ input, expectedTitle, expectedUrl }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.educationalResources).toBeDefined();
        expect(result!.educationalResources.links).toBeDefined();

        const firstLink = result!.educationalResources.links[0];
        expect(firstLink.title).toBe(expectedTitle);
        expect(firstLink.url).toBe(expectedUrl);
      },
    );
  });

  describe('Confidence Score Calculation - Golden Fixtures', () => {
    /**
     * Verify confidence score formula: Math.min(0.92, 0.7 + count * 0.08)
     */
    const CONFIDENCE_TESTS = [
      {
        id: 'CS-001',
        input: 'Experts agree on this.', // 1 fallacy
        expectedConfidence: 0.78, // 0.7 + 1 * 0.08
      },
      {
        id: 'CS-002',
        input: 'Studies show results. Science says so.', // 2 fallacies from same type
        expectedConfidence: 0.86, // 0.7 + 2 * 0.08
      },
      {
        id: 'CS-003',
        input:
          "Experts agree. Studies show. Science says. It's a slippery slope. This will lead to disaster.", // 5 fallacies
        expectedConfidence: 0.92, // Capped at 0.92
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

  describe('Multiple Fallacy Types - Golden Fixtures', () => {
    /**
     * When multiple fallacy types detected, returns the most common
     */
    const MULTIPLE_FALLACY_TESTS = [
      {
        id: 'MF-001',
        input: "You're just a student. Coming from you, that's rich.", // 2 ad hominem
        expectedPrimaryType: 'ad_hominem',
        expectedMinConfidence: 0.86, // 0.7 + 2 * 0.08
      },
      {
        id: 'MF-002',
        input: "So you're saying we should abandon laws. By that logic, crime is okay.", // 2 strawman
        expectedPrimaryType: 'strawman',
        expectedMinConfidence: 0.86,
      },
    ];

    it.each(MULTIPLE_FALLACY_TESTS)(
      'should detect primary fallacy type [$id]: $expectedPrimaryType',
      async ({ input, expectedPrimaryType, expectedMinConfidence }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.subtype).toBe(expectedPrimaryType);
        expect(result!.confidenceScore).toBeGreaterThanOrEqual(expectedMinConfidence);
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
        input: 'experts', // Partial pattern without full phrase
        expectedResult: null,
        description: 'Partial pattern should return null',
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
        input: 'EXPERTS AGREE',
        shouldMatch: true,
      },
      {
        id: 'CI-002',
        input: 'Studies SHOW',
        shouldMatch: true,
      },
      {
        id: 'CI-003',
        input: 'Think Of The Children',
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
});
