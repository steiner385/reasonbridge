import { vi } from 'vitest';
import { CommonGroundDetectorService } from '../services/common-ground-detector.service.js';
import { CommonGroundSynthesizer } from '../common-ground/common-ground.synthesizer.js';
import { BedrockService } from '../ai/bedrock.service.js';
import type { TopicData } from '../common-ground/common-ground.synthesizer.js';

describe('CommonGroundDetectorService', () => {
  let service: CommonGroundDetectorService;
  let synthesizer: CommonGroundSynthesizer;
  let bedrock: BedrockService;

  beforeEach(() => {
    synthesizer = new CommonGroundSynthesizer();
    bedrock = new BedrockService();
    service = new CommonGroundDetectorService(synthesizer, bedrock);
  });

  describe('detectCommonGround - AI not available', () => {
    it('should fall back to pattern-based analysis when AI is not ready', async () => {
      // Mock AI as not ready
      vi.spyOn(bedrock, 'isReady').mockResolvedValue(false);

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Climate change requires immediate action',
            supportCount: 8,
            opposeCount: 2,
            nuancedCount: 0,
            consensusScore: 0.8,
            alignments: [
              { userId: 'user-1', stance: 'SUPPORT' },
              { userId: 'user-2', stance: 'SUPPORT' },
              { userId: 'user-3', stance: 'SUPPORT' },
              { userId: 'user-4', stance: 'SUPPORT' },
              { userId: 'user-5', stance: 'SUPPORT' },
              { userId: 'user-6', stance: 'SUPPORT' },
              { userId: 'user-7', stance: 'SUPPORT' },
              { userId: 'user-8', stance: 'SUPPORT' },
              { userId: 'user-9', stance: 'OPPOSE' },
              { userId: 'user-10', stance: 'OPPOSE' },
            ],
          },
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await service.detectCommonGround(topicData);

      expect(result.agreementZones).toHaveLength(1);
      expect(result.agreementZones[0]?.proposition).toBe(
        'Climate change requires immediate action',
      );
      expect(result.agreementZones[0]?.agreementPercentage).toBe(80);
    });
  });

  describe('detectCommonGround - AI available', () => {
    it('should use AI to enhance misunderstanding detection with semantic clustering', async () => {
      // Mock AI as ready
      vi.spyOn(bedrock, 'isReady').mockResolvedValue(true);

      // Mock clustering response
      vi.spyOn(bedrock, 'clusterTexts').mockResolvedValue([
        {
          theme: 'Free speech with hate speech exceptions',
          members: [
            'I support free speech but with limits on hate speech',
            'Free speech is important but hate speech should be regulated',
          ],
        },
        {
          theme: 'Context-dependent free speech',
          members: [
            'It depends on the context and platform',
            'Different platforms need different rules',
          ],
        },
      ]);

      // Mock clarification generation
      vi
        .spyOn(bedrock, 'generateClarification')
        .mockResolvedValue(
          'Participants have different interpretations of "absolute": some see it as unrestricted except for hate speech, while others interpret it as context-dependent based on platform norms.',
        );

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
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
                nuanceExplanation: 'I support free speech but with limits on hate speech',
              },
              {
                userId: 'user-6',
                stance: 'NUANCED',
                nuanceExplanation: 'It depends on the context and platform',
              },
              {
                userId: 'user-7',
                stance: 'NUANCED',
                nuanceExplanation: 'Free speech is important but hate speech should be regulated',
              },
              {
                userId: 'user-8',
                stance: 'NUANCED',
                nuanceExplanation: 'Different platforms need different rules',
              },
              {
                userId: 'user-9',
                stance: 'NUANCED',
                nuanceExplanation: 'I oppose absolute free speech due to harm prevention',
              },
              {
                userId: 'user-10',
                stance: 'NUANCED',
                nuanceExplanation: 'Context matters when defining free speech boundaries',
              },
            ],
          },
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await service.detectCommonGround(topicData);

      expect(result.misunderstandings).toHaveLength(1);
      expect(result.misunderstandings[0]?.interpretations).toHaveLength(2);
      expect(result.misunderstandings[0]?.interpretations[0]?.interpretation).toBe(
        'Free speech with hate speech exceptions',
      );
      expect(result.misunderstandings[0]?.clarification).toContain('different interpretations');
    });

    it('should use AI to identify underlying values in disagreements', async () => {
      // Mock AI as ready
      vi.spyOn(bedrock, 'isReady').mockResolvedValue(true);

      // Mock value identification
      vi
        .spyOn(bedrock, 'identifyValues')
        .mockResolvedValue([
          'Individual liberty and autonomy',
          'Community welfare and collective good',
          'Fairness and equal treatment',
        ]);

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Universal healthcare should be implemented',
            supportCount: 5,
            opposeCount: 5,
            nuancedCount: 0,
            consensusScore: 0.5,
            alignments: [
              {
                userId: 'user-1',
                stance: 'SUPPORT',
                nuanceExplanation: 'Healthcare is a basic human right',
              },
              {
                userId: 'user-2',
                stance: 'SUPPORT',
                nuanceExplanation: 'Society benefits when everyone has healthcare',
              },
              { userId: 'user-3', stance: 'SUPPORT' },
              { userId: 'user-4', stance: 'SUPPORT' },
              { userId: 'user-5', stance: 'SUPPORT' },
              {
                userId: 'user-6',
                stance: 'OPPOSE',
                nuanceExplanation: 'Individuals should choose their own healthcare',
              },
              {
                userId: 'user-7',
                stance: 'OPPOSE',
                nuanceExplanation: 'Market competition provides better outcomes',
              },
              { userId: 'user-8', stance: 'OPPOSE' },
              { userId: 'user-9', stance: 'OPPOSE' },
              { userId: 'user-10', stance: 'OPPOSE' },
            ],
          },
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await service.detectCommonGround(topicData);

      expect(result.genuineDisagreements).toHaveLength(1);
      expect(result.genuineDisagreements[0]?.underlyingValues).toContain(
        'Individual liberty and autonomy',
      );
      expect(result.genuineDisagreements[0]?.underlyingValues).toContain(
        'Community welfare and collective good',
      );
    });

    it('should gracefully handle AI errors and fall back to pattern-based results', async () => {
      // Mock AI as ready
      vi.spyOn(bedrock, 'isReady').mockResolvedValue(true);

      // Mock clustering to throw an error
      vi.spyOn(bedrock, 'clusterTexts').mockRejectedValue(new Error('AI service error'));

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Test proposition',
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
                nuanceExplanation: 'I support this with some conditions',
              },
              {
                userId: 'user-6',
                stance: 'NUANCED',
                nuanceExplanation: 'I generally support but with caveats',
              },
              {
                userId: 'user-7',
                stance: 'NUANCED',
                nuanceExplanation: 'I oppose this except in certain cases',
              },
              {
                userId: 'user-8',
                stance: 'NUANCED',
                nuanceExplanation: 'It depends on context',
              },
              { userId: 'user-9', stance: 'NUANCED', nuanceExplanation: 'Contextual position' },
              { userId: 'user-10', stance: 'NUANCED', nuanceExplanation: 'Context matters' },
            ],
          },
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await service.detectCommonGround(topicData);

      // Should still return results from pattern-based analysis
      expect(result.misunderstandings).toHaveLength(1);
      // Pattern-based interpretations should be present (at least 2 for pattern-based detection)
      expect(result.misunderstandings[0]?.interpretations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty propositions', async () => {
      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [],
        responses: [],
        participantCount: 0,
      };

      const result = await service.detectCommonGround(topicData);

      expect(result.agreementZones).toEqual([]);
      expect(result.misunderstandings).toEqual([]);
      expect(result.genuineDisagreements).toEqual([]);
    });

    it('should handle propositions without nuanced explanations', async () => {
      vi.spyOn(bedrock, 'isReady').mockResolvedValue(true);

      const topicData: TopicData = {
        topicId: 'topic-1',
        propositions: [
          {
            id: 'prop-1',
            statement: 'Test proposition',
            supportCount: 2,
            opposeCount: 2,
            nuancedCount: 6,
            consensusScore: null,
            alignments: [
              { userId: 'user-1', stance: 'SUPPORT' },
              { userId: 'user-2', stance: 'SUPPORT' },
              { userId: 'user-3', stance: 'OPPOSE' },
              { userId: 'user-4', stance: 'OPPOSE' },
              { userId: 'user-5', stance: 'NUANCED' },
              { userId: 'user-6', stance: 'NUANCED' },
              { userId: 'user-7', stance: 'NUANCED' },
              { userId: 'user-8', stance: 'NUANCED' },
              { userId: 'user-9', stance: 'NUANCED' },
              { userId: 'user-10', stance: 'NUANCED' },
            ],
          },
        ],
        responses: [],
        participantCount: 10,
      };

      const result = await service.detectCommonGround(topicData);

      // Should handle gracefully without crashing
      expect(result).toBeDefined();
    });
  });
});
