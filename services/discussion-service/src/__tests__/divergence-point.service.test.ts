import { DivergencePointService } from '../services/divergence-point.service.js';
import type { PropositionAlignment } from '../services/divergence-point.service.js';

describe('DivergencePointService', () => {
  let service: DivergencePointService;

  beforeEach(() => {
    service = new DivergencePointService();
  });

  describe('identifyDivergencePoints', () => {
    it('should identify a clear divergence point with 50/50 split', async () => {
      const propositions: PropositionAlignment[] = [
        {
          id: 'prop-1',
          statement: 'Climate change requires immediate government intervention',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT', nuanceExplanation: 'We need action now' },
            { userId: 'user-2', stance: 'SUPPORT', nuanceExplanation: 'Government must lead' },
            { userId: 'user-3', stance: 'SUPPORT' },
            { userId: 'user-4', stance: 'SUPPORT' },
            { userId: 'user-5', stance: 'SUPPORT' },
            { userId: 'user-6', stance: 'OPPOSE', nuanceExplanation: 'Market solutions work' },
            {
              userId: 'user-7',
              stance: 'OPPOSE',
              nuanceExplanation: 'Private sector is more efficient',
            },
            { userId: 'user-8', stance: 'OPPOSE' },
            { userId: 'user-9', stance: 'OPPOSE' },
            { userId: 'user-10', stance: 'OPPOSE' },
          ],
        },
      ];

      const result = await service.identifyDivergencePoints('topic-1', propositions);

      expect(result.topicId).toBe('topic-1');
      expect(result.divergencePoints.length).toBe(1);
      expect(result.participantCount).toBe(10);

      const divergence = result.divergencePoints[0]!;
      expect(divergence.proposition).toBe(
        'Climate change requires immediate government intervention',
      );
      expect(divergence.propositionId).toBe('prop-1');
      expect(divergence.viewpoints.length).toBe(2);
      expect(divergence.totalParticipants).toBe(10);

      // Check support viewpoint
      const supportViewpoint = divergence.viewpoints.find((v) => v.position === 'Support');
      expect(supportViewpoint).toBeDefined();
      expect(supportViewpoint!.participantCount).toBe(5);
      expect(supportViewpoint!.percentage).toBe(50);
      expect(supportViewpoint!.reasoning.length).toBeGreaterThan(0);

      // Check oppose viewpoint
      const opposeViewpoint = divergence.viewpoints.find((v) => v.position === 'Oppose');
      expect(opposeViewpoint).toBeDefined();
      expect(opposeViewpoint!.participantCount).toBe(5);
      expect(opposeViewpoint!.percentage).toBe(50);
      expect(opposeViewpoint!.reasoning.length).toBeGreaterThan(0);

      // 50/50 split should have high polarization
      expect(divergence.polarizationScore).toBeGreaterThan(0.9);

      // Overall polarization should match the single divergence point
      expect(result.overallPolarization).toBeCloseTo(divergence.polarizationScore, 2);
    });

    it('should identify multiple divergence points', async () => {
      const propositions: PropositionAlignment[] = [
        {
          id: 'prop-1',
          statement: 'Universal healthcare is a human right',
          supportCount: 7,
          opposeCount: 3,
          nuancedCount: 0,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT' },
            { userId: 'user-2', stance: 'SUPPORT' },
            { userId: 'user-3', stance: 'SUPPORT' },
            { userId: 'user-4', stance: 'SUPPORT' },
            { userId: 'user-5', stance: 'SUPPORT' },
            { userId: 'user-6', stance: 'SUPPORT' },
            { userId: 'user-7', stance: 'SUPPORT' },
            { userId: 'user-8', stance: 'OPPOSE' },
            { userId: 'user-9', stance: 'OPPOSE' },
            { userId: 'user-10', stance: 'OPPOSE' },
          ],
        },
        {
          id: 'prop-2',
          statement: 'Free market solutions are more efficient than regulations',
          supportCount: 4,
          opposeCount: 6,
          nuancedCount: 0,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT' },
            { userId: 'user-2', stance: 'SUPPORT' },
            { userId: 'user-3', stance: 'SUPPORT' },
            { userId: 'user-4', stance: 'SUPPORT' },
            { userId: 'user-5', stance: 'OPPOSE' },
            { userId: 'user-6', stance: 'OPPOSE' },
            { userId: 'user-7', stance: 'OPPOSE' },
            { userId: 'user-8', stance: 'OPPOSE' },
            { userId: 'user-9', stance: 'OPPOSE' },
            { userId: 'user-10', stance: 'OPPOSE' },
          ],
        },
      ];

      const result = await service.identifyDivergencePoints('topic-1', propositions);

      expect(result.divergencePoints.length).toBe(2);
      expect(result.participantCount).toBe(10);
      expect(result.overallPolarization).toBeGreaterThan(0);
    });

    it('should NOT identify divergence when nuance is too high (misunderstanding)', async () => {
      const propositions: PropositionAlignment[] = [
        {
          id: 'prop-1',
          statement: 'Justice is important',
          supportCount: 3,
          opposeCount: 2,
          nuancedCount: 5, // High nuance suggests misunderstanding
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT' },
            { userId: 'user-2', stance: 'SUPPORT' },
            { userId: 'user-3', stance: 'SUPPORT' },
            { userId: 'user-4', stance: 'OPPOSE' },
            { userId: 'user-5', stance: 'OPPOSE' },
            {
              userId: 'user-6',
              stance: 'NUANCED',
              nuanceExplanation: 'Depends on what you mean by justice',
            },
            {
              userId: 'user-7',
              stance: 'NUANCED',
              nuanceExplanation: 'Different types of justice',
            },
            {
              userId: 'user-8',
              stance: 'NUANCED',
              nuanceExplanation: 'Context matters',
            },
            { userId: 'user-9', stance: 'NUANCED' },
            { userId: 'user-10', stance: 'NUANCED' },
          ],
        },
      ];

      const result = await service.identifyDivergencePoints('topic-1', propositions);

      // High nuance should prevent this from being identified as divergence
      expect(result.divergencePoints.length).toBe(0);
      expect(result.overallPolarization).toBe(0);
    });

    it('should NOT identify divergence when one side is too small', async () => {
      const propositions: PropositionAlignment[] = [
        {
          id: 'prop-1',
          statement: 'The Earth is round',
          supportCount: 9,
          opposeCount: 1, // Too small to be significant (10%)
          nuancedCount: 0,
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

      const result = await service.identifyDivergencePoints('topic-1', propositions);

      // 90/10 split should not be considered a divergence
      expect(result.divergencePoints.length).toBe(0);
    });

    it('should skip propositions with insufficient participation', async () => {
      const propositions: PropositionAlignment[] = [
        {
          id: 'prop-1',
          statement: 'Barely discussed proposition',
          supportCount: 1,
          opposeCount: 1,
          nuancedCount: 0,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT' },
            { userId: 'user-2', stance: 'OPPOSE' },
          ],
        },
      ];

      const result = await service.identifyDivergencePoints('topic-1', propositions);

      // Less than 3 participants should be skipped
      expect(result.divergencePoints.length).toBe(0);
    });

    it('should calculate polarization correctly for different splits', async () => {
      // 70/30 split should have lower polarization than 50/50
      const propositions7030: PropositionAlignment[] = [
        {
          id: 'prop-1',
          statement: 'Test proposition',
          supportCount: 7,
          opposeCount: 3,
          nuancedCount: 0,
          alignments: Array.from({ length: 10 }, (_, i) => ({
            userId: `user-${i + 1}`,
            stance: (i < 7 ? 'SUPPORT' : 'OPPOSE') as 'SUPPORT' | 'OPPOSE',
          })),
        },
      ];

      const result7030 = await service.identifyDivergencePoints('topic-1', propositions7030);

      const propositions5050: PropositionAlignment[] = [
        {
          id: 'prop-2',
          statement: 'Test proposition',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          alignments: Array.from({ length: 10 }, (_, i) => ({
            userId: `user-${i + 1}`,
            stance: (i < 5 ? 'SUPPORT' : 'OPPOSE') as 'SUPPORT' | 'OPPOSE',
          })),
        },
      ];

      const result5050 = await service.identifyDivergencePoints('topic-2', propositions5050);

      // 50/50 should be more polarized than 70/30
      expect(result5050.divergencePoints[0]!.polarizationScore).toBeGreaterThan(
        result7030.divergencePoints[0]!.polarizationScore,
      );
    });

    it('should handle empty proposition list', async () => {
      const result = await service.identifyDivergencePoints('topic-1', []);

      expect(result.topicId).toBe('topic-1');
      expect(result.divergencePoints.length).toBe(0);
      expect(result.overallPolarization).toBe(0);
      expect(result.participantCount).toBe(0);
    });

    it('should include reasoning when available', async () => {
      const propositions: PropositionAlignment[] = [
        {
          id: 'prop-1',
          statement: 'Test proposition',
          supportCount: 3,
          opposeCount: 3,
          nuancedCount: 0,
          alignments: [
            {
              userId: 'user-1',
              stance: 'SUPPORT',
              nuanceExplanation: 'Reason 1 for support',
            },
            {
              userId: 'user-2',
              stance: 'SUPPORT',
              nuanceExplanation: 'Reason 2 for support',
            },
            { userId: 'user-3', stance: 'SUPPORT' },
            {
              userId: 'user-4',
              stance: 'OPPOSE',
              nuanceExplanation: 'Reason 1 for oppose',
            },
            {
              userId: 'user-5',
              stance: 'OPPOSE',
              nuanceExplanation: 'Reason 2 for oppose',
            },
            { userId: 'user-6', stance: 'OPPOSE' },
          ],
        },
      ];

      const result = await service.identifyDivergencePoints('topic-1', propositions);

      const divergence = result.divergencePoints[0]!;
      const supportViewpoint = divergence.viewpoints.find((v) => v.position === 'Support');
      const opposeViewpoint = divergence.viewpoints.find((v) => v.position === 'Oppose');

      expect(supportViewpoint!.reasoning).toContain('Reason 1 for support');
      expect(supportViewpoint!.reasoning).toContain('Reason 2 for support');
      expect(opposeViewpoint!.reasoning).toContain('Reason 1 for oppose');
      expect(opposeViewpoint!.reasoning).toContain('Reason 2 for oppose');
    });
  });
});
