import { CommonGroundSynthesizer } from '../common-ground/common-ground.synthesizer.js';
import type {
  TopicData,
  PropositionWithAlignments,
} from '../common-ground/common-ground.synthesizer.js';

describe('CommonGroundSynthesizer', () => {
  let synthesizer: CommonGroundSynthesizer;

  beforeEach(() => {
    synthesizer = new CommonGroundSynthesizer();
  });

  describe('synthesize', () => {
    it('should return empty results for topic with no propositions', async () => {
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

    it('should identify agreement zones with high support', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Climate change is a serious issue',
          supportCount: 9,
          opposeCount: 1,
          nuancedCount: 0,
          consensusScore: 0.90,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT' },
            { userId: 'user-2', stance: 'SUPPORT' },
            { userId: 'user-3', stance: 'SUPPORT' },
            { userId: 'user-4', stance: 'SUPPORT' },
            { userId: 'user-5', stance: 'SUPPORT' },
            { userId: 'user-6', stance: 'SUPPORT' },
            { userId: 'user-7', stance: 'SUPPORT' },
            { userId: 'user-8', stance: 'SUPPORT' },
            { userId: 'user-9', stance: 'SUPPORT' },
            { userId: 'user-10', stance: 'OPPOSE' },
          ],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones).toHaveLength(1);
      expect(result.agreementZones[0].proposition).toBe(
        'Climate change is a serious issue'
      );
      expect(result.agreementZones[0].agreementPercentage).toBe(90);
      expect(result.agreementZones[0].participantCount).toBe(9);
    });

    it('should identify misunderstandings with high nuanced responses', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Free speech should be absolute',
          supportCount: 2,
          opposeCount: 2,
          nuancedCount: 6,
          consensusScore: null,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT' },
            { userId: 'user-2', stance: 'SUPPORT' },
            { userId: 'user-3', stance: 'OPPOSE' },
            { userId: 'user-4', stance: 'OPPOSE' },
            {
              userId: 'user-5',
              stance: 'NUANCED',
              nuanceExplanation:
                'I support free speech but with limits on hate speech',
            },
            {
              userId: 'user-6',
              stance: 'NUANCED',
              nuanceExplanation: 'It depends on the context and platform',
            },
            {
              userId: 'user-7',
              stance: 'NUANCED',
              nuanceExplanation:
                'I oppose absolute free speech due to harm prevention',
            },
            {
              userId: 'user-8',
              stance: 'NUANCED',
              nuanceExplanation: 'Free speech needs balancing with safety',
            },
            {
              userId: 'user-9',
              stance: 'NUANCED',
              nuanceExplanation: 'Support with exceptions for violence',
            },
            {
              userId: 'user-10',
              stance: 'NUANCED',
              nuanceExplanation: 'Contextual - different in different scenarios',
            },
          ],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.misunderstandings).toHaveLength(1);
      expect(result.misunderstandings[0].topic).toBe(
        'Free speech should be absolute'
      );
      expect(result.misunderstandings[0].interpretations.length).toBeGreaterThanOrEqual(
        2
      );
    });

    it('should identify genuine disagreements with balanced opposition', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Taxation should be increased for higher earners',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.50,
          alignments: [
            {
              userId: 'user-1',
              stance: 'SUPPORT',
              nuanceExplanation: 'Reduces inequality',
            },
            {
              userId: 'user-2',
              stance: 'SUPPORT',
              nuanceExplanation: 'Funds public services',
            },
            { userId: 'user-3', stance: 'SUPPORT' },
            { userId: 'user-4', stance: 'SUPPORT' },
            { userId: 'user-5', stance: 'SUPPORT' },
            {
              userId: 'user-6',
              stance: 'OPPOSE',
              nuanceExplanation: 'Discourages entrepreneurship',
            },
            {
              userId: 'user-7',
              stance: 'OPPOSE',
              nuanceExplanation: 'Reduces economic growth',
            },
            { userId: 'user-8', stance: 'OPPOSE' },
            { userId: 'user-9', stance: 'OPPOSE' },
            { userId: 'user-10', stance: 'OPPOSE' },
          ],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.genuineDisagreements).toHaveLength(1);
      expect(result.genuineDisagreements[0].proposition).toBe(
        'Taxation should be increased for higher earners'
      );
      expect(result.genuineDisagreements[0].viewpoints).toHaveLength(2);

      const supportViewpoint = result.genuineDisagreements[0].viewpoints.find(
        (v) => v.position === 'Support'
      );
      const opposeViewpoint = result.genuineDisagreements[0].viewpoints.find(
        (v) => v.position === 'Oppose'
      );

      expect(supportViewpoint).toBeDefined();
      expect(supportViewpoint?.participantCount).toBe(5);
      expect(opposeViewpoint).toBeDefined();
      expect(opposeViewpoint?.participantCount).toBe(5);
    });

    it('should calculate overall consensus score correctly', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Proposition with high consensus',
          supportCount: 9,
          opposeCount: 1,
          nuancedCount: 0,
          consensusScore: 0.90,
          alignments: [],
        },
        {
          id: 'prop-2',
          statement: 'Proposition with moderate consensus',
          supportCount: 6,
          opposeCount: 4,
          nuancedCount: 0,
          consensusScore: 0.60,
          alignments: [],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // Average of 0.90 and 0.60 = 0.75
      expect(result.overallConsensusScore).toBe(0.75);
    });

    it('should skip propositions with insufficient participation', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Low participation proposition',
          supportCount: 1,
          opposeCount: 0,
          nuancedCount: 0,
          consensusScore: null,
          alignments: [{ userId: 'user-1', stance: 'SUPPORT' }],
        },
        {
          id: 'prop-2',
          statement: 'High participation proposition',
          supportCount: 8,
          opposeCount: 2,
          nuancedCount: 0,
          consensusScore: 0.80,
          alignments: [],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // Only the high participation proposition should be included
      expect(result.agreementZones).toHaveLength(1);
      expect(result.agreementZones[0].proposition).toBe(
        'High participation proposition'
      );
    });

    it('should sort agreement zones by percentage descending', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Medium agreement',
          supportCount: 7,
          opposeCount: 3,
          nuancedCount: 0,
          consensusScore: 0.70,
          alignments: [],
        },
        {
          id: 'prop-2',
          statement: 'High agreement',
          supportCount: 9,
          opposeCount: 1,
          nuancedCount: 0,
          consensusScore: 0.90,
          alignments: [],
        },
        {
          id: 'prop-3',
          statement: 'Higher agreement',
          supportCount: 8,
          opposeCount: 2,
          nuancedCount: 0,
          consensusScore: 0.80,
          alignments: [],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones).toHaveLength(3);
      expect(result.agreementZones[0].proposition).toBe('High agreement');
      expect(result.agreementZones[1].proposition).toBe('Higher agreement');
      expect(result.agreementZones[2].proposition).toBe('Medium agreement');
      expect(result.agreementZones[0].agreementPercentage).toBe(90);
      expect(result.agreementZones[1].agreementPercentage).toBe(80);
      expect(result.agreementZones[2].agreementPercentage).toBe(70);
    });

    it('should handle mixed scenario with all analysis types', async () => {
      const propositions: PropositionWithAlignments[] = [
        // Agreement zone
        {
          id: 'prop-1',
          statement: 'Democracy is important',
          supportCount: 9,
          opposeCount: 1,
          nuancedCount: 0,
          consensusScore: 0.90,
          alignments: [
            {
              userId: 'user-1',
              stance: 'SUPPORT',
              nuanceExplanation: 'Essential for freedom',
            },
          ],
        },
        // Misunderstanding
        {
          id: 'prop-2',
          statement: 'Privacy should be protected',
          supportCount: 2,
          opposeCount: 2,
          nuancedCount: 6,
          consensusScore: null,
          alignments: [
            {
              userId: 'user-5',
              stance: 'NUANCED',
              nuanceExplanation: 'Support privacy except for security',
            },
            {
              userId: 'user-6',
              stance: 'NUANCED',
              nuanceExplanation: 'Depends on the situation',
            },
            {
              userId: 'user-7',
              stance: 'NUANCED',
              nuanceExplanation: 'Contextual based on threat level',
            },
            {
              userId: 'user-8',
              stance: 'NUANCED',
              nuanceExplanation: 'Support with exceptions',
            },
            {
              userId: 'user-9',
              stance: 'NUANCED',
              nuanceExplanation: 'Oppose blanket privacy',
            },
            {
              userId: 'user-10',
              stance: 'NUANCED',
              nuanceExplanation: 'Context matters most',
            },
          ],
        },
        // Genuine disagreement
        {
          id: 'prop-3',
          statement: 'Government spending should increase',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.50,
          alignments: [
            {
              userId: 'user-1',
              stance: 'SUPPORT',
              nuanceExplanation: 'Boosts economy',
            },
            {
              userId: 'user-6',
              stance: 'OPPOSE',
              nuanceExplanation: 'Increases debt',
            },
          ],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones).toHaveLength(1);
      expect(result.misunderstandings).toHaveLength(1);
      expect(result.genuineDisagreements).toHaveLength(1);
      expect(result.overallConsensusScore).toBeGreaterThan(0);
      expect(result.overallConsensusScore).toBeLessThanOrEqual(1);
    });

    it('should calculate consensus score when not provided', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Test proposition',
          supportCount: 7,
          opposeCount: 3,
          nuancedCount: 0,
          consensusScore: null, // No pre-calculated score
          alignments: [],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      // Should calculate: (7-3)/10 = 0.4, normalized: (0.4+1)/2 = 0.7
      expect(result.overallConsensusScore).toBe(0.7);
    });

    it('should include supporting evidence in agreement zones', async () => {
      const propositions: PropositionWithAlignments[] = [
        {
          id: 'prop-1',
          statement: 'Evidence-backed proposition',
          supportCount: 8,
          opposeCount: 2,
          nuancedCount: 0,
          consensusScore: 0.80,
          alignments: [
            {
              userId: 'user-1',
              stance: 'SUPPORT',
              nuanceExplanation: 'Evidence point 1',
            },
            {
              userId: 'user-2',
              stance: 'SUPPORT',
              nuanceExplanation: 'Evidence point 2',
            },
            {
              userId: 'user-3',
              stance: 'NUANCED',
              nuanceExplanation: 'Evidence point 3',
            },
            {
              userId: 'user-4',
              stance: 'SUPPORT',
              nuanceExplanation: 'Evidence point 4',
            },
          ],
        },
      ];

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions,
        responses: [],
        participantCount: 10,
      };

      const result = await synthesizer.synthesize(topicData);

      expect(result.agreementZones[0].supportingEvidence).toHaveLength(3);
      expect(result.agreementZones[0].supportingEvidence).toContain(
        'Evidence point 1'
      );
    });
  });
});
