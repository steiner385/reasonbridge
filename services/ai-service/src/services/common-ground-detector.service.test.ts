import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommonGroundDetectorService } from './common-ground-detector.service.js';
import type {
  CommonGroundSynthesizer,
  TopicData,
  SynthesisResult,
} from '../common-ground/common-ground.synthesizer.js';
import type { BedrockService } from '../ai/bedrock.service.js';

/**
 * Tests for CommonGroundDetectorService
 *
 * This service enhances pattern-based common ground detection with AI-powered
 * semantic analysis using AWS Bedrock. Tests cover:
 * - Fallback to pattern-based when AI unavailable
 * - AI-enhanced misunderstanding detection
 * - AI-enhanced disagreement analysis with value identification
 * - Error handling and graceful degradation
 */
describe('CommonGroundDetectorService', () => {
  let service: CommonGroundDetectorService;
  let mockSynthesizer: Partial<CommonGroundSynthesizer>;
  let mockBedrock: Partial<BedrockService>;

  const mockTopicData: TopicData = {
    topicId: 'topic-1',
    participantCount: 5,
    propositions: [
      {
        id: 'prop-1',
        statement: 'AI should be regulated',
        supportCount: 3,
        opposeCount: 1,
        nuancedCount: 2,
        consensusScore: 0.6,
        alignments: [
          { userId: 'user-1', stance: 'SUPPORT' },
          { userId: 'user-2', stance: 'SUPPORT' },
          { userId: 'user-3', stance: 'OPPOSE' },
          {
            userId: 'user-4',
            stance: 'NUANCED',
            nuanceExplanation: 'Regulation depends on the domain',
          },
          {
            userId: 'user-5',
            stance: 'NUANCED',
            nuanceExplanation: 'Only regulate high-risk applications',
          },
        ],
      },
    ],
    responses: [
      {
        id: 'resp-1',
        authorId: 'user-1',
        content: 'We need AI regulation',
        containsOpinion: true,
        containsFactualClaims: false,
      },
    ],
  };

  const mockBaseSynthesisResult: SynthesisResult = {
    agreementZones: [
      {
        topic: 'AI should be regulated',
        consensusLevel: 'moderate',
        supportingParticipants: 3,
        totalParticipants: 5,
      },
    ],
    misunderstandings: [
      {
        topic: 'AI should be regulated',
        interpretations: [
          { interpretation: 'Domain-specific regulation', participantCount: 1 },
          { interpretation: 'Risk-based regulation', participantCount: 1 },
        ],
        clarification: 'Participants have different views on regulation scope',
      },
    ],
    genuineDisagreements: [
      {
        topic: 'AI regulation necessity',
        viewpoints: [
          {
            stance: 'Support',
            reasoning: ['AI poses risks to society', 'Prevent misuse'],
            participantCount: 3,
          },
          {
            stance: 'Oppose',
            reasoning: ['Stifles innovation', 'Self-regulation works'],
            participantCount: 1,
          },
        ],
      },
    ],
    overallConsensusScore: 0.6,
  };

  beforeEach(() => {
    mockSynthesizer = {
      synthesize: vi.fn().mockResolvedValue(mockBaseSynthesisResult),
    };

    mockBedrock = {
      isReady: vi.fn().mockResolvedValue(true),
      clusterTexts: vi.fn().mockResolvedValue([
        { theme: 'Domain-specific approach', members: ['Regulation depends on the domain'] },
        { theme: 'Risk-based approach', members: ['Only regulate high-risk applications'] },
      ]),
      generateClarification: vi
        .fn()
        .mockResolvedValue(
          'Participants interpret "regulation" differently - some focus on domains, others on risk levels.',
        ),
      identifyValues: vi.fn().mockResolvedValue(['Innovation', 'Safety', 'Freedom']),
    };

    service = new CommonGroundDetectorService(
      mockSynthesizer as CommonGroundSynthesizer,
      mockBedrock as BedrockService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectCommonGround', () => {
    it('should return pattern-based result when AI is not available', async () => {
      (mockBedrock.isReady as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await service.detectCommonGround(mockTopicData);

      expect(mockSynthesizer.synthesize).toHaveBeenCalledWith(mockTopicData);
      expect(mockBedrock.clusterTexts).not.toHaveBeenCalled();
      expect(mockBedrock.identifyValues).not.toHaveBeenCalled();
      expect(result).toEqual(mockBaseSynthesisResult);
    });

    it('should enhance results with AI when available', async () => {
      const result = await service.detectCommonGround(mockTopicData);

      expect(mockSynthesizer.synthesize).toHaveBeenCalledWith(mockTopicData);
      expect(mockBedrock.isReady).toHaveBeenCalled();
      expect(mockBedrock.clusterTexts).toHaveBeenCalled();
      expect(mockBedrock.identifyValues).toHaveBeenCalled();

      // Should have enhanced misunderstandings with AI clarification
      expect(result.misunderstandings[0]?.clarification).toBe(
        'Participants interpret "regulation" differently - some focus on domains, others on risk levels.',
      );

      // Should have enhanced disagreements with underlying values
      expect(result.genuineDisagreements[0]?.underlyingValues).toEqual([
        'Innovation',
        'Safety',
        'Freedom',
      ]);
    });

    it('should preserve agreement zones from base synthesis', async () => {
      const result = await service.detectCommonGround(mockTopicData);

      expect(result.agreementZones).toEqual(mockBaseSynthesisResult.agreementZones);
      expect(result.overallConsensusScore).toEqual(mockBaseSynthesisResult.overallConsensusScore);
    });

    it('should call synthesizer once even when AI is available', async () => {
      await service.detectCommonGround(mockTopicData);

      expect(mockSynthesizer.synthesize).toHaveBeenCalledTimes(1);
    });
  });

  describe('misunderstanding enhancement', () => {
    it('should use AI to cluster nuanced explanations', async () => {
      await service.detectCommonGround(mockTopicData);

      expect(mockBedrock.clusterTexts).toHaveBeenCalledWith(
        ['Regulation depends on the domain', 'Only regulate high-risk applications'],
        3,
      );
    });

    it('should generate AI clarification based on clusters', async () => {
      await service.detectCommonGround(mockTopicData);

      expect(mockBedrock.generateClarification).toHaveBeenCalledWith(
        'AI should be regulated',
        expect.arrayContaining([expect.objectContaining({ interpretation: expect.any(String) })]),
      );
    });

    it('should fall back to base result if clustering fails', async () => {
      (mockBedrock.clusterTexts as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.detectCommonGround(mockTopicData);

      expect(result.misunderstandings[0]?.clarification).toBe(
        'Participants have different views on regulation scope',
      );
    });

    it('should handle misunderstanding without matching proposition', async () => {
      const customSynthesisResult: SynthesisResult = {
        ...mockBaseSynthesisResult,
        misunderstandings: [
          {
            topic: 'Non-existent proposition',
            interpretations: [],
            clarification: 'Base clarification',
          },
        ],
      };
      (mockSynthesizer.synthesize as ReturnType<typeof vi.fn>).mockResolvedValue(
        customSynthesisResult,
      );

      const result = await service.detectCommonGround(mockTopicData);

      expect(result.misunderstandings[0]?.topic).toBe('Non-existent proposition');
      expect(result.misunderstandings[0]?.clarification).toBe('Base clarification');
    });

    it('should handle proposition with no nuanced explanations', async () => {
      const noNuanceData: TopicData = {
        ...mockTopicData,
        propositions: [
          {
            ...mockTopicData.propositions[0]!,
            alignments: [
              { userId: 'user-1', stance: 'SUPPORT' },
              { userId: 'user-2', stance: 'OPPOSE' },
            ],
          },
        ],
      };

      const result = await service.detectCommonGround(noNuanceData);

      // Should use base result since no nuanced explanations to cluster
      expect(result.misunderstandings[0]?.clarification).toBe(
        'Participants have different views on regulation scope',
      );
    });

    it('should handle AI clustering error gracefully', async () => {
      (mockBedrock.clusterTexts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('AI service error'),
      );

      const result = await service.detectCommonGround(mockTopicData);

      // Should fall back to base result
      expect(result.misunderstandings[0]?.clarification).toBe(
        'Participants have different views on regulation scope',
      );
    });
  });

  describe('disagreement enhancement', () => {
    it('should identify underlying values in disagreements', async () => {
      await service.detectCommonGround(mockTopicData);

      expect(mockBedrock.identifyValues).toHaveBeenCalledWith([
        'AI poses risks to society',
        'Prevent misuse',
        'Stifles innovation',
        'Self-regulation works',
      ]);
    });

    it('should enhance disagreement with AI-identified values', async () => {
      const result = await service.detectCommonGround(mockTopicData);

      expect(result.genuineDisagreements[0]?.underlyingValues).toEqual([
        'Innovation',
        'Safety',
        'Freedom',
      ]);
    });

    it('should fall back when values contain fallback message', async () => {
      (mockBedrock.identifyValues as ReturnType<typeof vi.fn>).mockResolvedValue([
        'AI-powered moral foundations analysis pending',
      ]);

      const result = await service.detectCommonGround(mockTopicData);

      // Should not have underlyingValues since AI returned fallback
      expect(result.genuineDisagreements[0]?.underlyingValues).toBeUndefined();
    });

    it('should fall back when no values identified', async () => {
      (mockBedrock.identifyValues as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.detectCommonGround(mockTopicData);

      expect(result.genuineDisagreements[0]?.underlyingValues).toBeUndefined();
    });

    it('should handle disagreement with no reasoning', async () => {
      const noReasoningResult: SynthesisResult = {
        ...mockBaseSynthesisResult,
        genuineDisagreements: [
          {
            topic: 'Test topic',
            viewpoints: [
              { stance: 'Support', reasoning: [], participantCount: 2 },
              { stance: 'Oppose', reasoning: [], participantCount: 1 },
            ],
          },
        ],
      };
      (mockSynthesizer.synthesize as ReturnType<typeof vi.fn>).mockResolvedValue(noReasoningResult);

      const result = await service.detectCommonGround(mockTopicData);

      expect(mockBedrock.identifyValues).not.toHaveBeenCalled();
      expect(result.genuineDisagreements[0]?.underlyingValues).toBeUndefined();
    });

    it('should handle AI value identification error gracefully', async () => {
      (mockBedrock.identifyValues as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('AI service error'),
      );

      const result = await service.detectCommonGround(mockTopicData);

      // Should preserve base disagreement without values
      expect(result.genuineDisagreements[0]).toBeDefined();
      expect(result.genuineDisagreements[0]?.underlyingValues).toBeUndefined();
    });
  });

  describe('multiple items processing', () => {
    it('should process multiple misunderstandings', async () => {
      const multiMisunderstandingResult: SynthesisResult = {
        ...mockBaseSynthesisResult,
        misunderstandings: [
          {
            topic: 'AI should be regulated',
            interpretations: [{ interpretation: 'Test', participantCount: 1 }],
            clarification: 'Base 1',
          },
          {
            topic: 'Other topic',
            interpretations: [{ interpretation: 'Other', participantCount: 1 }],
            clarification: 'Base 2',
          },
        ],
      };
      (mockSynthesizer.synthesize as ReturnType<typeof vi.fn>).mockResolvedValue(
        multiMisunderstandingResult,
      );

      const multiPropData: TopicData = {
        ...mockTopicData,
        propositions: [
          ...mockTopicData.propositions,
          {
            id: 'prop-2',
            statement: 'Other topic',
            supportCount: 2,
            opposeCount: 2,
            nuancedCount: 1,
            consensusScore: 0.5,
            alignments: [
              { userId: 'user-6', stance: 'NUANCED', nuanceExplanation: 'Complex issue' },
            ],
          },
        ],
      };

      const result = await service.detectCommonGround(multiPropData);

      expect(result.misunderstandings).toHaveLength(2);
    });

    it('should process multiple disagreements', async () => {
      const multiDisagreementResult: SynthesisResult = {
        ...mockBaseSynthesisResult,
        genuineDisagreements: [
          {
            topic: 'Topic 1',
            viewpoints: [
              { stance: 'Pro', reasoning: ['Reason A'], participantCount: 2 },
              { stance: 'Con', reasoning: ['Reason B'], participantCount: 2 },
            ],
          },
          {
            topic: 'Topic 2',
            viewpoints: [
              { stance: 'Pro', reasoning: ['Reason C'], participantCount: 3 },
              { stance: 'Con', reasoning: ['Reason D'], participantCount: 1 },
            ],
          },
        ],
      };
      (mockSynthesizer.synthesize as ReturnType<typeof vi.fn>).mockResolvedValue(
        multiDisagreementResult,
      );

      const result = await service.detectCommonGround(mockTopicData);

      expect(result.genuineDisagreements).toHaveLength(2);
      expect(mockBedrock.identifyValues).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty topic data', async () => {
      const emptyData: TopicData = {
        topicId: 'empty',
        participantCount: 0,
        propositions: [],
        responses: [],
      };

      const emptyResult: SynthesisResult = {
        agreementZones: [],
        misunderstandings: [],
        genuineDisagreements: [],
        overallConsensusScore: null,
      };
      (mockSynthesizer.synthesize as ReturnType<typeof vi.fn>).mockResolvedValue(emptyResult);

      const result = await service.detectCommonGround(emptyData);

      expect(result).toEqual(emptyResult);
      expect(mockBedrock.clusterTexts).not.toHaveBeenCalled();
      expect(mockBedrock.identifyValues).not.toHaveBeenCalled();
    });

    it('should handle null consensus score', async () => {
      const nullConsensusResult: SynthesisResult = {
        ...mockBaseSynthesisResult,
        overallConsensusScore: null,
      };
      (mockSynthesizer.synthesize as ReturnType<typeof vi.fn>).mockResolvedValue(
        nullConsensusResult,
      );

      const result = await service.detectCommonGround(mockTopicData);

      expect(result.overallConsensusScore).toBeNull();
    });

    it('should handle synthesizer error', async () => {
      (mockSynthesizer.synthesize as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Synthesis failed'),
      );

      await expect(service.detectCommonGround(mockTopicData)).rejects.toThrow('Synthesis failed');
    });
  });
});
