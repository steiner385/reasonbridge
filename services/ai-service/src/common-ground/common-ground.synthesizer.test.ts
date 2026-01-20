import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommonGroundSynthesizer,
  type TopicData,
  type PropositionWithAlignments,
} from './common-ground.synthesizer.js';

/**
 * Tests for CommonGroundSynthesizer
 *
 * Tests pattern-based common ground detection including:
 * - Agreement zone identification
 * - Misunderstanding detection
 * - Genuine disagreement detection
 * - Overall consensus calculation
 * - Agreement percentage calculation
 */
describe('CommonGroundSynthesizer', () => {
  let synthesizer: CommonGroundSynthesizer;

  beforeEach(() => {
    synthesizer = new CommonGroundSynthesizer();
  });

  describe('calculateAgreementPercentage', () => {
    it('should return null when no alignments exist', () => {
      const result = synthesizer.calculateAgreementPercentage(0, 0, 0);
      expect(result).toBeNull();
    });

    it('should calculate 100% when all support', () => {
      const result = synthesizer.calculateAgreementPercentage(10, 0, 0);
      expect(result).toBe(100);
    });

    it('should calculate 0% when all oppose', () => {
      const result = synthesizer.calculateAgreementPercentage(0, 10, 0);
      expect(result).toBe(0);
    });

    it('should calculate 50% when evenly split between support and oppose', () => {
      const result = synthesizer.calculateAgreementPercentage(5, 5, 0);
      expect(result).toBe(50);
    });

    it('should include nuanced in denominator', () => {
      // 5 support out of 15 total = 33.33% -> rounded to 33%
      const result = synthesizer.calculateAgreementPercentage(5, 5, 5);
      expect(result).toBe(33);
    });

    it('should round to nearest integer', () => {
      // 7 support out of 10 total = 70%
      const result = synthesizer.calculateAgreementPercentage(7, 2, 1);
      expect(result).toBe(70);
    });

    it('should handle fractional results correctly', () => {
      // 2 support out of 3 total = 66.67% -> rounded to 67%
      const result = synthesizer.calculateAgreementPercentage(2, 1, 0);
      expect(result).toBe(67);
    });
  });

  describe('synthesize', () => {
    it('should return empty arrays for empty propositions', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [],
        responses: [],
        participantCount: 0,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones).toEqual([]);
      expect(result.misunderstandings).toEqual([]);
      expect(result.genuineDisagreements).toEqual([]);
      expect(result.overallConsensusScore).toBeNull();
    });

    it('should handle propositions with insufficient participation', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Test proposition',
            supportCount: 1,
            opposeCount: 1,
            nuancedCount: 0,
            consensusScore: null,
            alignments: [],
          },
        ],
        responses: [],
        participantCount: 2,
      };

      const result = await synthesizer.synthesize(topicData);

      // All should be empty due to insufficient participation (< 3)
      expect(result.agreementZones).toEqual([]);
      expect(result.misunderstandings).toEqual([]);
      expect(result.genuineDisagreements).toEqual([]);
      expect(result.overallConsensusScore).toBeNull();
    });
  });

  describe('agreement zones', () => {
    it('should identify high agreement propositions', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 8,
            opposeCount: 1,
            nuancedCount: 1,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones).toHaveLength(1);
      expect(result.agreementZones[0]?.agreementPercentage).toBe(80);
    });

    it('should exclude propositions below threshold', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 5,
            opposeCount: 4,
            nuancedCount: 1,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // 50% agreement is below 70% threshold
      expect(result.agreementZones).toHaveLength(0);
    });

    it('should sort agreement zones by percentage descending', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            id: 'prop-1',
            statement: 'Lower agreement',
            supportCount: 7,
            opposeCount: 2,
            nuancedCount: 1,
          }),
          createProposition({
            id: 'prop-2',
            statement: 'Higher agreement',
            supportCount: 9,
            opposeCount: 0,
            nuancedCount: 1,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones).toHaveLength(2);
      expect(result.agreementZones[0]?.proposition).toBe('Higher agreement');
      expect(result.agreementZones[1]?.proposition).toBe('Lower agreement');
    });

    it('should extract supporting evidence from nuance explanations', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 8,
            opposeCount: 1,
            nuancedCount: 1,
            alignments: [
              {
                userId: 'user-1',
                stance: 'SUPPORT',
                nuanceExplanation: 'Strong evidence supports this',
              },
              {
                userId: 'user-2',
                stance: 'NUANCED',
                nuanceExplanation: 'Mostly agree with caveats',
              },
              { userId: 'user-3', stance: 'OPPOSE' },
            ],
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones[0]?.supportingEvidence).toContain(
        'Strong evidence supports this',
      );
      expect(result.agreementZones[0]?.supportingEvidence).toContain('Mostly agree with caveats');
    });

    it('should limit supporting evidence to 3 items', async () => {
      const alignments = [];
      for (let i = 0; i < 5; i++) {
        alignments.push({
          userId: `user-${i}`,
          stance: 'SUPPORT' as const,
          nuanceExplanation: `Reason ${i}`,
        });
      }

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 8,
            opposeCount: 1,
            nuancedCount: 1,
            alignments,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones[0]?.supportingEvidence).toHaveLength(3);
    });
  });

  describe('misunderstandings', () => {
    it('should identify high nuance as potential misunderstanding', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 3,
            opposeCount: 3,
            nuancedCount: 4, // 40% nuanced, above 30% threshold
            alignments: [
              {
                userId: 'user-1',
                stance: 'NUANCED',
                nuanceExplanation: 'I support with conditions',
              },
              { userId: 'user-2', stance: 'NUANCED', nuanceExplanation: 'I oppose in some cases' },
            ],
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.misunderstandings).toHaveLength(1);
      expect(result.misunderstandings[0]?.topic).toBe('Test proposition');
    });

    it('should require at least 2 distinct interpretations', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 3,
            opposeCount: 3,
            nuancedCount: 4,
            alignments: [
              // All context-based, only one interpretation type
              { userId: 'user-1', stance: 'NUANCED', nuanceExplanation: 'Depends on context' },
              { userId: 'user-2', stance: 'NUANCED', nuanceExplanation: 'It varies' },
            ],
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // Only one interpretation type (context-dependent), so no misunderstanding detected
      expect(result.misunderstandings).toHaveLength(0);
    });

    it('should group interpretations by stance keywords', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 2,
            opposeCount: 2,
            nuancedCount: 6,
            alignments: [
              {
                userId: 'user-1',
                stance: 'NUANCED',
                nuanceExplanation: 'I generally support this idea',
              },
              {
                userId: 'user-2',
                stance: 'NUANCED',
                nuanceExplanation: 'I oppose this in most cases',
              },
              {
                userId: 'user-3',
                stance: 'NUANCED',
                nuanceExplanation: 'Depends on the situation',
              },
            ],
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.misunderstandings).toHaveLength(1);
      const interpretations = result.misunderstandings[0]?.interpretations;
      expect(
        interpretations?.some((i) => i.interpretation === 'Support with conditions or caveats'),
      ).toBe(true);
      expect(interpretations?.some((i) => i.interpretation === 'Opposition with exceptions')).toBe(
        true,
      );
      expect(interpretations?.some((i) => i.interpretation === 'Context-dependent position')).toBe(
        true,
      );
    });

    it('should not flag low nuance as misunderstanding', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 7,
            opposeCount: 2,
            nuancedCount: 1, // 10% nuanced, below 30% threshold
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.misunderstandings).toHaveLength(0);
    });
  });

  describe('genuine disagreements', () => {
    it('should identify balanced support/opposition with low nuance', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 4, // 40%
            opposeCount: 4, // 40%
            nuancedCount: 2, // 20% < 30% threshold
            alignments: [
              { userId: 'user-1', stance: 'SUPPORT', nuanceExplanation: 'Good for innovation' },
              { userId: 'user-2', stance: 'OPPOSE', nuanceExplanation: 'Harmful to privacy' },
            ],
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.genuineDisagreements).toHaveLength(1);
      expect(result.genuineDisagreements[0]?.viewpoints).toHaveLength(2);
    });

    it('should extract reasoning from alignments', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 4,
            opposeCount: 4,
            nuancedCount: 2,
            alignments: [
              { userId: 'user-1', stance: 'SUPPORT', nuanceExplanation: 'Promotes fairness' },
              { userId: 'user-2', stance: 'OPPOSE', nuanceExplanation: 'Limits freedom' },
            ],
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      const supportViewpoint = result.genuineDisagreements[0]?.viewpoints.find(
        (v) => v.position === 'Support',
      );
      const opposeViewpoint = result.genuineDisagreements[0]?.viewpoints.find(
        (v) => v.position === 'Oppose',
      );

      expect(supportViewpoint?.reasoning).toContain('Promotes fairness');
      expect(opposeViewpoint?.reasoning).toContain('Limits freedom');
    });

    it('should provide default reasoning when none provided', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 4,
            opposeCount: 4,
            nuancedCount: 2,
            alignments: [], // No explanations
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      const supportViewpoint = result.genuineDisagreements[0]?.viewpoints.find(
        (v) => v.position === 'Support',
      );
      expect(supportViewpoint?.reasoning).toContain('Supports this proposition');
    });

    it('should limit reasoning to 2 items per viewpoint', async () => {
      const alignments = [];
      for (let i = 0; i < 5; i++) {
        alignments.push({
          userId: `user-${i}`,
          stance: 'SUPPORT' as const,
          nuanceExplanation: `Reason ${i}`,
        });
      }

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 5,
            opposeCount: 3,
            nuancedCount: 2,
            alignments,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      const supportViewpoint = result.genuineDisagreements[0]?.viewpoints.find(
        (v) => v.position === 'Support',
      );
      expect(supportViewpoint?.reasoning).toHaveLength(2);
    });

    it('should not identify when support is too low', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 2, // 20% < 25% threshold
            opposeCount: 6,
            nuancedCount: 2,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.genuineDisagreements).toHaveLength(0);
    });

    it('should not identify when opposition is too low', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 6,
            opposeCount: 2, // 20% < 25% threshold
            nuancedCount: 2,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.genuineDisagreements).toHaveLength(0);
    });

    it('should not identify when nuance is too high', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 3,
            opposeCount: 3,
            nuancedCount: 4, // 40% > 30% threshold
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.genuineDisagreements).toHaveLength(0);
    });

    it('should include placeholder for underlying values', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 4,
            opposeCount: 4,
            nuancedCount: 2,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.genuineDisagreements[0]?.underlyingValues).toContain(
        'Underlying values will be identified through AI-powered moral foundations analysis',
      );
    });
  });

  describe('overall consensus calculation', () => {
    it('should return null when no propositions have sufficient data', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 1,
            opposeCount: 1,
            nuancedCount: 0,
          }),
        ],
        responses: [],
        participantCount: 2,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.overallConsensusScore).toBeNull();
    });

    it('should use existing consensus scores when available', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 5,
            opposeCount: 3,
            nuancedCount: 2,
            consensusScore: 0.75,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.overallConsensusScore).toBe(0.75);
    });

    it('should calculate consensus when not provided', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 8,
            opposeCount: 2,
            nuancedCount: 0,
            consensusScore: null,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // (8-2)/10 = 0.6, normalized: (0.6+1)/2 = 0.8
      expect(result.overallConsensusScore).toBe(0.8);
    });

    it('should average consensus across multiple propositions', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            id: 'prop-1',
            supportCount: 10,
            opposeCount: 0,
            nuancedCount: 0,
            consensusScore: 1.0,
          }),
          createProposition({
            id: 'prop-2',
            supportCount: 5,
            opposeCount: 5,
            nuancedCount: 0,
            consensusScore: 0.5,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // Average: (1.0 + 0.5) / 2 = 0.75
      expect(result.overallConsensusScore).toBe(0.75);
    });

    it('should round to 2 decimal places', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 7,
            opposeCount: 2,
            nuancedCount: 1,
            consensusScore: 0.666,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.overallConsensusScore).toBe(0.67);
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed results across categories', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          // High agreement
          createProposition({
            id: 'prop-1',
            statement: 'Agreed point',
            supportCount: 9,
            opposeCount: 1,
            nuancedCount: 0,
          }),
          // Misunderstanding
          createProposition({
            id: 'prop-2',
            statement: 'Confusing point',
            supportCount: 3,
            opposeCount: 2,
            nuancedCount: 5,
            alignments: [
              { userId: 'u1', stance: 'NUANCED', nuanceExplanation: 'I support in some cases' },
              { userId: 'u2', stance: 'NUANCED', nuanceExplanation: 'I oppose generally' },
            ],
          }),
          // Genuine disagreement
          createProposition({
            id: 'prop-3',
            statement: 'Divisive point',
            supportCount: 4,
            opposeCount: 4,
            nuancedCount: 2,
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones).toHaveLength(1);
      expect(result.agreementZones[0]?.proposition).toBe('Agreed point');

      expect(result.misunderstandings).toHaveLength(1);
      expect(result.misunderstandings[0]?.topic).toBe('Confusing point');

      expect(result.genuineDisagreements).toHaveLength(1);
      expect(result.genuineDisagreements[0]?.proposition).toBe('Divisive point');
    });

    it('should handle proposition that qualifies for multiple categories', async () => {
      // 70% support + 30% nuanced = agreement zone + potential misunderstanding
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          createProposition({
            supportCount: 7,
            opposeCount: 0,
            nuancedCount: 3,
            alignments: [
              { userId: 'u1', stance: 'NUANCED', nuanceExplanation: 'Support with conditions' },
              { userId: 'u2', stance: 'NUANCED', nuanceExplanation: 'Oppose in edge cases' },
            ],
          }),
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // Should appear in both agreement zones and misunderstandings
      expect(result.agreementZones).toHaveLength(1);
      expect(result.misunderstandings).toHaveLength(1);
    });
  });
});

/**
 * Helper to create proposition with defaults
 */
function createProposition(
  overrides: Partial<PropositionWithAlignments> & {
    supportCount: number;
    opposeCount: number;
    nuancedCount: number;
  },
): PropositionWithAlignments {
  return {
    id: overrides.id ?? 'prop-test',
    statement: overrides.statement ?? 'Test proposition',
    supportCount: overrides.supportCount,
    opposeCount: overrides.opposeCount,
    nuancedCount: overrides.nuancedCount,
    consensusScore: overrides.consensusScore ?? null,
    alignments: overrides.alignments ?? [],
  };
}
