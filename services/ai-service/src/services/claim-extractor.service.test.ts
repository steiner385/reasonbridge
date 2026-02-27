/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaimExtractorService, type ClaimType } from './claim-extractor.service.js';

describe('ClaimExtractorService', () => {
  let service: ClaimExtractorService;

  beforeEach(() => {
    service = new ClaimExtractorService();
  });

  describe('extract', () => {
    it('should return empty claims for text with no factual assertions', async () => {
      const content = 'I think this is interesting. What do you believe?';
      const result = await service.extract(content);

      expect(result.claims).toHaveLength(0);
      expect(result.totalClaims).toBe(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should extract statistical claims with percentages', async () => {
      const content = 'Studies show that 75% of people prefer remote work.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims.find((c) => c.claimType === 'statistic');
      expect(claim).toBeDefined();
      expect(claim!.text).toContain('75%');
    });

    it('should extract statistical claims with large numbers', async () => {
      const content = 'Over 2 million people have signed the petition.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims.find((c) => c.claimType === 'statistic');
      expect(claim).toBeDefined();
      expect(claim!.text).toContain('2 million');
    });

    it('should extract historical claims with years', async () => {
      const content = 'The treaty was signed in 1945 after the war ended.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims.find((c) => c.claimType === 'historical');
      expect(claim).toBeDefined();
      expect(claim!.text).toContain('1945');
    });

    it('should extract scientific claims with research references', async () => {
      const content = 'Research shows that regular exercise improves mental health.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims.find((c) => c.claimType === 'scientific');
      expect(claim).toBeDefined();
      expect(claim!.text.toLowerCase()).toContain('research shows');
    });

    it('should extract attribution claims', async () => {
      const content = 'According to the World Health Organization, vaccines are safe.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims.find((c) => c.claimType === 'attribution');
      expect(claim).toBeDefined();
      expect(claim!.text).toContain('According to');
    });

    it('should extract causal claims', async () => {
      const content = 'Smoking causes lung cancer and other respiratory diseases.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims.find((c) => c.claimType === 'causal');
      expect(claim).toBeDefined();
      expect(claim!.text.toLowerCase()).toContain('causes');
    });

    it('should extract comparative claims', async () => {
      const content = 'Electric vehicles produce less pollution than gasoline cars.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims.find((c) => c.claimType === 'comparative');
      expect(claim).toBeDefined();
      expect(claim!.text).toContain('less');
    });

    it('should extract multiple claims from complex text', async () => {
      const content = `
        In 2020, researchers found that 80% of adults experienced increased stress.
        According to the CDC, this led to higher rates of anxiety.
        Studies show that meditation can reduce stress by up to 40%.
      `;
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThanOrEqual(3);
      expect(result.totalClaims).toBeGreaterThanOrEqual(3);
    });

    it('should include correct offset positions', async () => {
      const content = 'Exactly 50% of respondents agreed with the statement.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      const claim = result.claims[0]!;

      // The extracted text should match the content at the specified offsets
      const extractedFromOffsets = content.slice(claim.startOffset, claim.endOffset);
      expect(extractedFromOffsets.trim()).toBe(claim.text.trim());
    });

    it('should assign appropriate confidence scores', async () => {
      const content = '85% of scientists agree that climate change is real.';
      const result = await service.extract(content);

      expect(result.claims.length).toBeGreaterThan(0);
      for (const claim of result.claims) {
        expect(claim.confidence).toBeGreaterThan(0);
        expect(claim.confidence).toBeLessThanOrEqual(0.95);
      }
    });

    it('should deduplicate overlapping claims of the same type', async () => {
      // This text might match multiple patterns for the same region
      const content = 'According to a 2023 study, 90% of users reported satisfaction.';
      const result = await service.extract(content);

      // Claims of the SAME type should not overlap
      // (different types can overlap since a sentence can have multiple claim types)
      const byType = new Map<string, typeof result.claims>();
      for (const claim of result.claims) {
        const existing = byType.get(claim.claimType) || [];
        existing.push(claim);
        byType.set(claim.claimType, existing);
      }

      for (const [, typeClaims] of byType) {
        const sorted = [...typeClaims].sort((a, b) => a.startOffset - b.startOffset);
        for (let i = 0; i < sorted.length - 1; i++) {
          const current = sorted[i]!;
          const next = sorted[i + 1]!;
          expect(next.startOffset).toBeGreaterThanOrEqual(current.endOffset);
        }
      }
    });

    it('should expand claims to sentence boundaries', async () => {
      const content = 'This is a preface. In 2019, the economy grew by 3%. This is after.';
      const result = await service.extract(content);

      // Find the claim containing 2019
      const historicalClaim = result.claims.find((c) => c.text.includes('2019'));
      if (historicalClaim) {
        // Should include full sentence, not just "in 2019"
        expect(historicalClaim.text).toContain('economy grew');
      }
    });
  });

  describe('claim types', () => {
    const claimTypeTests: Array<{
      type: ClaimType;
      examples: string[];
    }> = [
      {
        type: 'statistic',
        examples: [
          '45 percent of voters support the measure',
          '3.5 billion people use the internet',
          'One in every ten people experience this',
        ],
      },
      {
        type: 'historical',
        examples: [
          'Since 1990, temperatures have risen',
          'During the Cold War, tensions were high',
          'After World War, countries rebuilt',
        ],
      },
      {
        type: 'scientific',
        examples: [
          'Scientists found evidence of water on Mars',
          'Based on recent research, the treatment works',
          'Published in peer-reviewed journals',
        ],
      },
      {
        type: 'causal',
        examples: [
          'Poverty leads to poor health outcomes',
          'As a result of the policy, unemployment fell',
          'Due to climate change, sea levels rose',
        ],
      },
      {
        type: 'comparative',
        examples: [
          'This option is better than the alternative',
          'The highest rate in recorded history',
          'Compared to last year, sales increased',
        ],
      },
    ];

    for (const { type, examples } of claimTypeTests) {
      describe(`${type} claims`, () => {
        for (const example of examples) {
          it(`should detect: "${example.substring(0, 40)}..."`, async () => {
            const result = await service.extract(example);
            expect(result.claims.length).toBeGreaterThan(0);
            expect(result.claims.some((c) => c.claimType === type)).toBe(true);
          });
        }
      });
    }
  });

  describe('performance', () => {
    it('should extract claims in under 200ms for typical response', async () => {
      // Simulate a typical 500-word response
      const content = `
        According to the latest research from Harvard University, approximately 65% of adults
        experience some form of anxiety during their lifetime. In 2022, mental health experts
        found that therapy combined with medication leads to better outcomes than either alone.

        Studies show that cognitive behavioral therapy is more effective than traditional talk
        therapy for treating depression. The World Health Organization reports that depression
        affects over 280 million people worldwide, making it one of the leading causes of
        disability globally.

        Research published in the Journal of Clinical Psychology demonstrates that early
        intervention results in significantly better long-term outcomes. Since 1990, the
        prevalence of diagnosed mental health conditions has increased by 40%, partly due to
        reduced stigma and improved awareness.

        Experts at the National Institute of Mental Health suggest that regular exercise can
        reduce symptoms of depression by up to 30%. This is consistent with findings from a
        2021 meta-analysis that examined over 100 studies on the topic.
      `;

      const result = await service.extract(content);

      expect(result.processingTimeMs).toBeLessThan(200);
      expect(result.claims.length).toBeGreaterThan(0);
    });

    it('should handle very long text without timeout', async () => {
      // Generate 2000+ words of text
      const paragraph = `
        According to recent studies, 75% of professionals now work remotely at least part-time.
        This trend began in 2020 and has continued to grow since then.
        Research shows that remote work leads to higher productivity in most cases.
      `;
      const content = paragraph.repeat(20);

      const startTime = Date.now();
      const result = await service.extract(content);
      const elapsed = Date.now() - startTime;

      // Should complete in reasonable time (under 1 second)
      expect(elapsed).toBeLessThan(1000);
      expect(result.claims.length).toBeGreaterThan(0);
    });
  });
});
