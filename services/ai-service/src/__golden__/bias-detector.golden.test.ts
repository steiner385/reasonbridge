/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bias Detector Golden Tests
 *
 * T339: Fixed input/output pairs for regression testing.
 * These tests serve as baselines for the bias detector service.
 *
 * Golden tests verify:
 * 1. Confirmation bias detection
 * 2. System 1 thinking pattern detection
 * 3. System 2 thinking pattern recognition (reduces concern)
 * 4. Neutral content classification (returns null)
 * 5. Confidence score calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BiasDetectorService } from '../services/bias-detector.service.js';
import { FeedbackType } from '@prisma/client';

describe('BiasDetectorService Golden Tests', () => {
  let service: BiasDetectorService;

  beforeEach(() => {
    service = new BiasDetectorService();
  });

  /**
   * ========================================
   * GOLDEN TEST FIXTURES - DO NOT MODIFY
   * Unless intentionally changing analyzer behavior
   * ========================================
   */

  describe('Confirmation Bias Detection - Golden Fixtures', () => {
    /**
     * Confirmation bias: Selective attention to confirming evidence
     */
    const CONFIRMATION_BIAS_FIXTURES = [
      {
        id: 'CB-001',
        input: "This proves exactly what I've always said about this topic.",
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-002',
        input: 'See, I knew this would happen all along.',
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-003',
        input: 'Just as I expected, the data supports my position.',
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-004',
        input: "That's just an exception to the rule I've established.",
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-005',
        input: "Those studies are biased so they don't count.",
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-006',
        input: 'Ignore those facts, they are irrelevant.',
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-007',
        input: 'My sources say something completely different.',
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-008',
        input: 'According to my research, this is clearly true.',
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-009',
        input: 'This only confirms what I already believed.',
        expectedSubtype: 'confirmation_bias',
      },
      {
        id: 'CB-010',
        input: "I've always known that this was the case.",
        expectedSubtype: 'confirmation_bias',
      },
    ];

    it.each(CONFIRMATION_BIAS_FIXTURES)(
      'should detect confirmation bias [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.BIAS);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('Confirmation Bias');
      },
    );
  });

  describe('System 1 Thinking Detection - Golden Fixtures', () => {
    /**
     * System 1 thinking: Fast, intuitive, emotional responses
     */
    const SYSTEM1_FIXTURES = [
      {
        id: 'S1-001',
        input: 'I just know this is wrong, trust me.',
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-002',
        input: 'My gut tells me this is a bad idea.',
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-003',
        input: "It's just obvious that this won't work.",
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-004',
        input: 'Common sense tells us the answer.',
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-005',
        input: "I can't believe you would think that.",
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-006',
        input: 'How can anyone believe this nonsense?',
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-007',
        input: "It's crazy to think this would succeed.",
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-008',
        input: "That's ridiculous. No way that could work.",
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-009',
        input: "Don't be ridiculous, think about it.",
        expectedSubtype: 'system1_thinking',
      },
      {
        id: 'S1-010',
        input: 'Come on, seriously? You believe that?',
        expectedSubtype: 'system1_thinking',
      },
    ];

    it.each(SYSTEM1_FIXTURES)(
      'should detect System 1 thinking [$id]: "$input"',
      async ({ input, expectedSubtype }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.type).toBe(FeedbackType.BIAS);
        expect(result!.subtype).toBe(expectedSubtype);
        expect(result!.reasoning).toContain('System 1 Thinking');
      },
    );
  });

  describe('System 2 Thinking Mitigation - Golden Fixtures', () => {
    /**
     * System 2 thinking mitigates bias detection
     * A single bias indicator with System 2 thinking should return null
     */
    const SYSTEM2_MITIGATION_FIXTURES = [
      {
        id: 'S2-001',
        input:
          'I could be wrong, but my gut tells me this is the right approach based on prior experience.',
        expectedResult: null,
        reason: 'System 2 acknowledgment of fallibility mitigates single System 1 indicator',
      },
      {
        id: 'S2-002',
        input:
          'Let me think about this carefully. On one hand, the data supports this view. On the other hand, there are valid counterarguments.',
        expectedResult: null,
        reason: 'Clear System 2 deliberation without bias indicators',
      },
      {
        id: 'S2-003',
        input:
          'While I disagree, I understand your perspective and see merit in some of your points.',
        expectedResult: null,
        reason: 'Acknowledging opposing views shows System 2 thinking',
      },
    ];

    it.each(SYSTEM2_MITIGATION_FIXTURES)(
      'should recognize System 2 thinking [$id]: $reason',
      async ({ input, expectedResult }) => {
        const result = await service.analyze(input);
        expect(result).toBe(expectedResult);
      },
    );
  });

  describe('Neutral Content Classification - Golden Fixtures', () => {
    /**
     * Neutral content should return null (no biases detected)
     */
    const NEUTRAL_CONTENT = [
      {
        id: 'NC-001',
        input: 'The research methodology used in this study appears sound.',
        reason: 'Factual observation without bias indicators',
      },
      {
        id: 'NC-002',
        input:
          'I have concerns about the sample size, which may limit the generalizability of these findings.',
        reason: 'Specific critique without confirmation bias',
      },
      {
        id: 'NC-003',
        input: 'Both proponents and critics of this policy raise valid points.',
        reason: 'Balanced acknowledgment',
      },
      {
        id: 'NC-004',
        input: 'More data would help clarify this issue.',
        reason: 'Requesting evidence rather than dismissing',
      },
      {
        id: 'NC-005',
        input: 'I disagree with this conclusion based on the evidence presented.',
        reason: 'Evidence-based disagreement',
      },
      {
        id: 'NC-006',
        input: 'The argument has merit, though I would like to see stronger supporting data.',
        reason: 'Constructive feedback',
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
     * Verify exact suggestion text for each bias type
     */
    const SUGGESTION_FIXTURES = [
      {
        biasType: 'confirmation_bias',
        input: 'This proves exactly what I always said.',
        expectedSuggestion:
          'Consider seeking out evidence that might challenge your view. What would change your mind on this topic?',
      },
      {
        biasType: 'system1_thinking',
        input: 'I just know this is true.',
        expectedSuggestion:
          'Take a moment to reflect on the reasoning behind your position. What specific evidence supports this view?',
      },
    ];

    it.each(SUGGESTION_FIXTURES)(
      'should provide correct suggestion for $biasType',
      async ({ input, expectedSuggestion }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.suggestionText).toBe(expectedSuggestion);
      },
    );
  });

  describe('Reasoning Text - Golden Fixtures', () => {
    /**
     * Verify reasoning includes bias explanation
     */
    const REASONING_FIXTURES = [
      {
        biasType: 'confirmation_bias',
        input: 'See, I told you so!',
        expectedReasoningContains: 'Confirmation Bias (selective attention to confirming evidence)',
      },
      {
        biasType: 'system1_thinking',
        input: 'My gut feeling says otherwise.',
        expectedReasoningContains: 'System 1 Thinking (intuitive responses without deliberation)',
      },
    ];

    it.each(REASONING_FIXTURES)(
      'should include bias explanation in reasoning for $biasType',
      async ({ input, expectedReasoningContains }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.reasoning).toContain(expectedReasoningContains);
      },
    );
  });

  describe('Educational Resources - Golden Fixtures', () => {
    /**
     * Verify educational resources are included for each bias type
     */
    const RESOURCE_FIXTURES = [
      {
        biasType: 'confirmation_bias',
        input: 'Exactly as I expected to happen.',
        expectedTitle: 'Confirmation Bias',
        expectedUrl: 'https://en.wikipedia.org/wiki/Confirmation_bias',
      },
      {
        biasType: 'system1_thinking',
        input: 'I just feel that this is correct.',
        expectedTitle: 'Thinking, Fast and Slow',
        expectedUrl: 'https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow',
      },
    ];

    it.each(RESOURCE_FIXTURES)(
      'should include correct educational resources for $biasType',
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
     * Verify confidence score formula: Math.min(0.90, 0.65 + count * 0.08)
     */
    const CONFIDENCE_TESTS = [
      {
        id: 'CS-001',
        input: 'I just know this is right.', // 1 bias indicator
        expectedConfidenceMin: 0.73, // 0.65 + 1 * 0.08
        expectedConfidenceMax: 0.75,
      },
      {
        id: 'CS-002',
        input: "See, I knew it. Just as I expected. This proves what I've always said.", // Multiple confirmation bias indicators
        expectedConfidenceMin: 0.81, // 0.65 + 2+ * 0.08
        expectedConfidenceMax: 0.9,
      },
    ];

    it.each(CONFIDENCE_TESTS)(
      'should calculate confidence within range [$id]: $expectedConfidenceMin - $expectedConfidenceMax',
      async ({ input, expectedConfidenceMin, expectedConfidenceMax }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.confidenceScore).toBeGreaterThanOrEqual(expectedConfidenceMin);
        expect(result!.confidenceScore).toBeLessThanOrEqual(expectedConfidenceMax);
      },
    );
  });

  describe('Multiple Bias Types - Golden Fixtures', () => {
    /**
     * When multiple bias types detected, returns the most common
     */
    const MULTIPLE_BIAS_TESTS = [
      {
        id: 'MB-001',
        input:
          "See, I told you so. I knew this would happen. This proves exactly what I've always said.",
        expectedPrimaryType: 'confirmation_bias',
        reason: 'Three confirmation bias indicators should dominate',
      },
      {
        id: 'MB-002',
        input: "I just know this is wrong. It's just obvious. My gut tells me this is a bad idea.",
        expectedPrimaryType: 'system1_thinking',
        reason: 'Three System 1 indicators should dominate',
      },
    ];

    it.each(MULTIPLE_BIAS_TESTS)(
      'should detect primary bias type [$id]: $reason',
      async ({ input, expectedPrimaryType }) => {
        const result = await service.analyze(input);

        expect(result).not.toBeNull();
        expect(result!.subtype).toBe(expectedPrimaryType);
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
        input: 'know', // Partial pattern
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
        input: 'I JUST KNOW THIS IS TRUE.',
        shouldMatch: true,
      },
      {
        id: 'CI-002',
        input: 'See, I TOLD YOU so!',
        shouldMatch: true,
      },
      {
        id: 'CI-003',
        input: 'MY GUT TELLS me this.',
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
