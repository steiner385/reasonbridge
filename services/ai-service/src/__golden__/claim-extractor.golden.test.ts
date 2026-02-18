/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Claim Extractor Golden Tests
 *
 * T341: Fixed input/output pairs for regression testing.
 * These tests serve as baselines for the claim extractor service.
 *
 * Golden tests verify:
 * 1. Detection of 7 claim types (statistic, historical, scientific, etc.)
 * 2. Correct extraction offsets
 * 3. Confidence score calculations
 * 4. Non-claim content returns empty array
 * 5. Complex multi-claim extraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimExtractorService, type ClaimType } from '../services/claim-extractor.service.js';

describe('ClaimExtractorService Golden Tests', () => {
  let service: ClaimExtractorService;

  beforeEach(() => {
    service = new ClaimExtractorService();
  });

  /**
   * ========================================
   * GOLDEN TEST FIXTURES - DO NOT MODIFY
   * Unless intentionally changing extractor behavior
   * ========================================
   */

  describe('Statistical Claims - Golden Fixtures', () => {
    /**
     * Statistical claims: Numbers, percentages, quantities
     */
    const STATISTIC_FIXTURES = [
      {
        id: 'STAT-001',
        input: 'Approximately 75% of Americans support this policy.',
        expectedClaimType: 'statistic' as ClaimType,
        expectedMinConfidence: 0.8,
        mustContain: '75%',
      },
      {
        id: 'STAT-002',
        input: 'Over 3 million people attended the event last year.',
        expectedClaimType: 'statistic' as ClaimType,
        expectedMinConfidence: 0.8,
        mustContain: '3 million',
      },
      {
        id: 'STAT-003',
        input: 'One in every ten adults experiences chronic pain.',
        expectedClaimType: 'statistic' as ClaimType,
        expectedMinConfidence: 0.8,
        mustContain: 'one in every ten',
      },
      {
        id: 'STAT-004',
        input: 'The unemployment rate fell to 3.5 percent last quarter.',
        expectedClaimType: 'statistic' as ClaimType,
        expectedMinConfidence: 0.8,
        mustContain: '3.5 percent',
      },
      {
        id: 'STAT-005',
        input: 'Nearly 500,000 people have been affected by the change.',
        expectedClaimType: 'statistic' as ClaimType,
        expectedMinConfidence: 0.8,
        mustContain: '500,000',
      },
    ];

    it.each(STATISTIC_FIXTURES)(
      'should detect statistic [$id]: "$input"',
      async ({ input, expectedClaimType, expectedMinConfidence, mustContain }) => {
        const result = await service.extract(input);

        expect(result.claims.length).toBeGreaterThan(0);
        const claim = result.claims.find((c) => c.claimType === expectedClaimType);
        expect(claim).toBeDefined();
        expect(claim!.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
        expect(claim!.text.toLowerCase()).toContain(mustContain.toLowerCase());
      },
    );
  });

  describe('Historical Claims - Golden Fixtures', () => {
    /**
     * Historical claims: Dates, years, past events
     */
    const HISTORICAL_FIXTURES = [
      {
        id: 'HIST-001',
        input: 'The treaty was signed in 1945 after prolonged negotiations.',
        expectedClaimType: 'historical' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: '1945',
      },
      {
        id: 'HIST-002',
        input: 'Since 1990, global temperatures have risen significantly.',
        expectedClaimType: 'historical' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: '1990',
      },
      {
        id: 'HIST-003',
        input: 'During the Cold War, tensions between superpowers reached a peak.',
        expectedClaimType: 'historical' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: 'Cold War',
      },
      {
        id: 'HIST-004',
        input: 'After World War, the global economy underwent major restructuring.',
        expectedClaimType: 'historical' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: 'World War',
      },
      {
        id: 'HIST-005',
        input: 'In 2008, the financial crisis affected markets worldwide.',
        expectedClaimType: 'historical' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: '2008',
      },
    ];

    it.each(HISTORICAL_FIXTURES)(
      'should detect historical [$id]: "$input"',
      async ({ input, expectedClaimType, expectedMinConfidence, mustContain }) => {
        const result = await service.extract(input);

        expect(result.claims.length).toBeGreaterThan(0);
        const claim = result.claims.find((c) => c.claimType === expectedClaimType);
        expect(claim).toBeDefined();
        expect(claim!.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
        expect(claim!.text.toLowerCase()).toContain(mustContain.toLowerCase());
      },
    );
  });

  describe('Scientific Claims - Golden Fixtures', () => {
    /**
     * Scientific claims: Research, studies, expert findings
     */
    const SCIENTIFIC_FIXTURES = [
      {
        id: 'SCI-001',
        input: 'Studies show that regular exercise improves cognitive function.',
        expectedClaimType: 'scientific' as ClaimType,
        expectedMinConfidence: 0.7,
        mustContain: 'studies show',
      },
      {
        id: 'SCI-002',
        input: 'Based on recent research, the treatment is 90% effective.',
        expectedClaimType: 'scientific' as ClaimType,
        expectedMinConfidence: 0.7,
        mustContain: 'based on',
      },
      {
        id: 'SCI-003',
        input: 'Scientists found evidence of water on the distant planet.',
        expectedClaimType: 'scientific' as ClaimType,
        expectedMinConfidence: 0.7,
        mustContain: 'scientists found',
      },
      {
        id: 'SCI-004',
        input: 'Peer-reviewed journals confirm the hypothesis is valid.',
        expectedClaimType: 'scientific' as ClaimType,
        expectedMinConfidence: 0.7,
        mustContain: 'peer-reviewed',
      },
      {
        id: 'SCI-005',
        input: 'Researchers indicate that the method produces reliable results.',
        expectedClaimType: 'scientific' as ClaimType,
        expectedMinConfidence: 0.7,
        mustContain: 'researchers indicate',
      },
    ];

    it.each(SCIENTIFIC_FIXTURES)(
      'should detect scientific [$id]: "$input"',
      async ({ input, expectedClaimType, expectedMinConfidence, mustContain }) => {
        const result = await service.extract(input);

        expect(result.claims.length).toBeGreaterThan(0);
        const claim = result.claims.find((c) => c.claimType === expectedClaimType);
        expect(claim).toBeDefined();
        expect(claim!.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
        expect(claim!.text.toLowerCase()).toContain(mustContain.toLowerCase());
      },
    );
  });

  describe('Causal Claims - Golden Fixtures', () => {
    /**
     * Causal claims: Cause and effect relationships
     */
    const CAUSAL_FIXTURES = [
      {
        id: 'CAUS-001',
        input: 'Smoking causes lung cancer and heart disease.',
        expectedClaimType: 'causal' as ClaimType,
        expectedMinConfidence: 0.6,
        mustContain: 'causes',
      },
      {
        id: 'CAUS-002',
        input: 'The policy led to a significant reduction in emissions.',
        expectedClaimType: 'causal' as ClaimType,
        expectedMinConfidence: 0.6,
        mustContain: 'led to',
      },
      {
        id: 'CAUS-003',
        input: 'As a result of the changes, productivity increased.',
        expectedClaimType: 'causal' as ClaimType,
        expectedMinConfidence: 0.6,
        mustContain: 'as a result',
      },
      {
        id: 'CAUS-004',
        input: 'Due to climate change, sea levels have risen.',
        expectedClaimType: 'causal' as ClaimType,
        expectedMinConfidence: 0.6,
        mustContain: 'due to',
      },
      {
        id: 'CAUS-005',
        input: 'The intervention results in better patient outcomes.',
        expectedClaimType: 'causal' as ClaimType,
        expectedMinConfidence: 0.6,
        mustContain: 'results in',
      },
    ];

    it.each(CAUSAL_FIXTURES)(
      'should detect causal [$id]: "$input"',
      async ({ input, expectedClaimType, expectedMinConfidence, mustContain }) => {
        const result = await service.extract(input);

        expect(result.claims.length).toBeGreaterThan(0);
        const claim = result.claims.find((c) => c.claimType === expectedClaimType);
        expect(claim).toBeDefined();
        expect(claim!.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
        expect(claim!.text.toLowerCase()).toContain(mustContain.toLowerCase());
      },
    );
  });

  describe('Comparative Claims - Golden Fixtures', () => {
    /**
     * Comparative claims: Comparisons between entities
     */
    const COMPARATIVE_FIXTURES = [
      {
        id: 'COMP-001',
        input: 'Electric cars produce less pollution than gasoline vehicles.',
        expectedClaimType: 'comparative' as ClaimType,
        expectedMinConfidence: 0.65,
        mustContain: 'less',
      },
      {
        id: 'COMP-002',
        input: 'This approach is more effective than traditional methods.',
        expectedClaimType: 'comparative' as ClaimType,
        expectedMinConfidence: 0.65,
        mustContain: 'more',
      },
      {
        id: 'COMP-003',
        input: 'The highest temperature in recorded history was set last year.',
        expectedClaimType: 'comparative' as ClaimType,
        expectedMinConfidence: 0.65,
        mustContain: 'highest',
      },
      {
        id: 'COMP-004',
        input: 'Compared to the control group, outcomes were significantly better.',
        expectedClaimType: 'comparative' as ClaimType,
        expectedMinConfidence: 0.65,
        mustContain: 'compared to',
      },
      {
        id: 'COMP-005',
        input: 'This is the largest study of its kind in the world.',
        expectedClaimType: 'comparative' as ClaimType,
        expectedMinConfidence: 0.65,
        mustContain: 'largest',
      },
    ];

    it.each(COMPARATIVE_FIXTURES)(
      'should detect comparative [$id]: "$input"',
      async ({ input, expectedClaimType, expectedMinConfidence, mustContain }) => {
        const result = await service.extract(input);

        expect(result.claims.length).toBeGreaterThan(0);
        const claim = result.claims.find((c) => c.claimType === expectedClaimType);
        expect(claim).toBeDefined();
        expect(claim!.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
        expect(claim!.text.toLowerCase()).toContain(mustContain.toLowerCase());
      },
    );
  });

  describe('Attribution Claims - Golden Fixtures', () => {
    /**
     * Attribution claims: Quotes and source references
     */
    const ATTRIBUTION_FIXTURES = [
      {
        id: 'ATTR-001',
        input: 'According to the World Health Organization, vaccines are safe.',
        expectedClaimType: 'attribution' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: 'according to',
      },
      {
        id: 'ATTR-002',
        input: 'As stated by Dr. Johnson, the findings are conclusive.',
        expectedClaimType: 'attribution' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: 'as stated by',
      },
      {
        id: 'ATTR-003',
        input: 'Per the Federal Reserve, inflation will remain stable.',
        expectedClaimType: 'attribution' as ClaimType,
        expectedMinConfidence: 0.75,
        mustContain: 'per the',
      },
    ];

    it.each(ATTRIBUTION_FIXTURES)(
      'should detect attribution [$id]: "$input"',
      async ({ input, expectedClaimType, expectedMinConfidence, mustContain }) => {
        const result = await service.extract(input);

        expect(result.claims.length).toBeGreaterThan(0);
        const claim = result.claims.find((c) => c.claimType === expectedClaimType);
        expect(claim).toBeDefined();
        expect(claim!.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
        expect(claim!.text.toLowerCase()).toContain(mustContain.toLowerCase());
      },
    );
  });

  describe('Non-Claim Content - Golden Fixtures', () => {
    /**
     * Content that should NOT be detected as claims
     */
    const NON_CLAIM_FIXTURES = [
      {
        id: 'NC-001',
        input: 'I think this is an interesting topic to explore.',
      },
      {
        id: 'NC-002',
        input: 'What do you believe about this subject?',
      },
      {
        id: 'NC-003',
        input: 'In my opinion, we should consider alternatives.',
      },
      {
        id: 'NC-004',
        input: 'Thank you for sharing your perspective on this matter.',
      },
      {
        id: 'NC-005',
        input: 'Could you elaborate on your reasoning?',
      },
    ];

    it.each(NON_CLAIM_FIXTURES)(
      'should return no claims for [$id]: "$input"',
      async ({ input }) => {
        const result = await service.extract(input);

        expect(result.claims).toHaveLength(0);
        expect(result.totalClaims).toBe(0);
      },
    );
  });

  describe('Complex Multi-Claim Content - Golden Fixtures', () => {
    /**
     * Complex content with multiple claim types
     */
    const MULTI_CLAIM_FIXTURES = [
      {
        id: 'MULTI-001',
        input: `In 2020, researchers found that 80% of adults experienced increased stress.
                According to the CDC, this led to higher rates of anxiety.
                Studies show that meditation can reduce stress by up to 40%.`,
        expectedMinClaims: 3,
        expectedTypes: ['historical', 'statistic', 'scientific', 'attribution', 'causal'],
      },
      {
        id: 'MULTI-002',
        input: `Since 1990, global temperatures have risen by 1.5 degrees.
                Scientists found that this is more rapid than previous centuries.
                The warming causes glaciers to melt at unprecedented rates.`,
        expectedMinClaims: 3,
        expectedTypes: ['historical', 'statistic', 'scientific', 'comparative', 'causal'],
      },
    ];

    it.each(MULTI_CLAIM_FIXTURES)(
      'should extract multiple claims [$id]',
      async ({ input, expectedMinClaims, expectedTypes }) => {
        const result = await service.extract(input);

        expect(result.claims.length).toBeGreaterThanOrEqual(expectedMinClaims);

        // Check that at least some expected types are found
        const foundTypes = result.claims.map((c) => c.claimType);
        const matchingTypes = expectedTypes.filter((t) => foundTypes.includes(t as ClaimType));
        expect(matchingTypes.length).toBeGreaterThan(0);
      },
    );
  });

  describe('Offset Accuracy - Golden Fixtures', () => {
    /**
     * Verify that extraction offsets correctly map back to original text
     */
    const OFFSET_FIXTURES = [
      {
        id: 'OFF-001',
        input: 'Exactly 50% of respondents agreed with the statement.',
      },
      {
        id: 'OFF-002',
        input: 'The study in 2019 showed significant results.',
      },
      {
        id: 'OFF-003',
        input: 'Research shows clear benefits for participants.',
      },
    ];

    it.each(OFFSET_FIXTURES)(
      'should provide accurate offsets [$id]: "$input"',
      async ({ input }) => {
        const result = await service.extract(input);

        for (const claim of result.claims) {
          // Extract text using offsets
          const extractedFromOffsets = input.slice(claim.startOffset, claim.endOffset);
          // The claim text should be contained in or equal to the extracted text
          expect(extractedFromOffsets.trim()).toContain(claim.text.trim().substring(0, 10));
          // Offsets should be within bounds
          expect(claim.startOffset).toBeGreaterThanOrEqual(0);
          expect(claim.endOffset).toBeLessThanOrEqual(input.length);
          expect(claim.startOffset).toBeLessThan(claim.endOffset);
        }
      },
    );
  });
});
