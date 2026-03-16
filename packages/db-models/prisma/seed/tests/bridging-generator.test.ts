/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BridgingGenerator } from '../generators/bridging-generator.js';
import type { SeedingLLMClient } from '../generators/llm-client.js';
import type {
  GeneratedTopic,
  GeneratedProposition,
  GeneratedCommonGround,
} from '../generators/types.js';

describe('BridgingGenerator', () => {
  let mockClient: SeedingLLMClient;
  let generator: BridgingGenerator;

  const mockTopic: GeneratedTopic = {
    id: '11111111-0000-4000-8000-000000000113',
    title: 'Should cities ban gas-powered leaf blowers?',
    description: 'Test description',
    slug: 'test',
    creatorId: '11111111-0000-4000-8000-000000000003',
    category: 'Climate & Environment',
    status: 'ACTIVE',
    tagIds: [],
    crossCuttingThemes: [],
    expectedEngagement: 'medium',
    topicIndex: 113,
    createdAtOffset: 30,
  };

  const mockCommonGround: GeneratedCommonGround = {
    id: '11111111-0000-4000-8000-003113000001',
    topicId: mockTopic.id,
    version: 1,
    agreementZones: [],
    misunderstandings: [],
    genuineDisagreements: [
      {
        proposition: 'Economic impact',
        viewpoints: [],
        underlyingValues: ['Jobs', 'Health'],
      },
    ],
    overallConsensusScore: 0.6,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 6,
    modelVersion: 'test',
  };

  beforeEach(() => {
    mockClient = {
      generateJSON: vi.fn().mockResolvedValue([
        {
          suggestionText: 'Consider subsidies for electric equipment transition',
          targetAudience: 'both',
          relatedPropositionIndices: [0],
          potentialCommonGround: 'Both sides value economic stability',
          confidenceScore: 0.75,
          suggestionType: 'compromise',
        },
      ]),
      destroy: vi.fn(),
    } as unknown as SeedingLLMClient;

    generator = new BridgingGenerator(mockClient);
  });

  it('should generate bridging suggestions', async () => {
    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]!.topicId).toBe(mockTopic.id);
  });

  it('should link to common ground analysis', async () => {
    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);
    expect(suggestions[0]!.commonGroundAnalysisId).toBe(mockCommonGround.id);
  });

  it('should generate 3 suggestions per topic', async () => {
    // Mock returns 3 suggestions
    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        suggestionText: 'Suggestion 1',
        targetAudience: 'both',
        relatedPropositionIndices: [],
        potentialCommonGround: 'Common ground 1',
        confidenceScore: 0.8,
        suggestionType: 'reframe',
      },
      {
        suggestionText: 'Suggestion 2',
        targetAudience: 'support',
        relatedPropositionIndices: [],
        potentialCommonGround: 'Common ground 2',
        confidenceScore: 0.7,
        suggestionType: 'question',
      },
      {
        suggestionText: 'Suggestion 3',
        targetAudience: 'oppose',
        relatedPropositionIndices: [],
        potentialCommonGround: 'Common ground 3',
        confidenceScore: 0.6,
        suggestionType: 'shared_value',
      },
    ]);

    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);
    expect(suggestions.length).toBe(3);
  });

  it('should map proposition indices to actual IDs', async () => {
    const mockPropositions: GeneratedProposition[] = [
      {
        id: '11111111-0000-4000-8000-001113000001',
        topicId: mockTopic.id,
        statement: 'Electric alternatives are effective',
        source: 'AI_IDENTIFIED',
        supportCount: 5,
        opposeCount: 2,
        nuancedCount: 3,
        consensusScore: 0.7,
        status: 'ACTIVE',
      },
      {
        id: '11111111-0000-4000-8000-001113000002',
        topicId: mockTopic.id,
        statement: 'Transition costs are significant',
        source: 'AI_IDENTIFIED',
        supportCount: 3,
        opposeCount: 4,
        nuancedCount: 2,
        consensusScore: 0.5,
        status: 'ACTIVE',
      },
    ];

    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        suggestionText: 'Consider both perspectives',
        targetAudience: 'both',
        relatedPropositionIndices: [0, 1],
        potentialCommonGround: 'Shared values',
        confidenceScore: 0.75,
        suggestionType: 'compromise',
      },
    ]);

    const suggestions = await generator.generateForTopic(
      mockTopic,
      mockPropositions,
      mockCommonGround,
      113,
    );
    expect(suggestions[0]!.relatedPropositionIds).toContain(mockPropositions[0]!.id);
    expect(suggestions[0]!.relatedPropositionIds).toContain(mockPropositions[1]!.id);
  });

  it('should clamp confidence score to 0.5-0.95 range', async () => {
    // Test low confidence clamping
    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        suggestionText: 'Low confidence suggestion',
        targetAudience: 'both',
        relatedPropositionIndices: [],
        potentialCommonGround: 'Common ground',
        confidenceScore: 0.2, // Below minimum
        suggestionType: 'reframe',
      },
    ]);

    const lowConfidenceSuggestions = await generator.generateForTopic(
      mockTopic,
      [],
      mockCommonGround,
      113,
    );
    expect(lowConfidenceSuggestions[0]!.confidenceScore).toBeGreaterThanOrEqual(0.5);

    // Test high confidence clamping
    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        suggestionText: 'High confidence suggestion',
        targetAudience: 'both',
        relatedPropositionIndices: [],
        potentialCommonGround: 'Common ground',
        confidenceScore: 0.99, // Above maximum
        suggestionType: 'reframe',
      },
    ]);

    const highConfidenceSuggestions = await generator.generateForTopic(
      mockTopic,
      [],
      mockCommonGround,
      113,
    );
    expect(highConfidenceSuggestions[0]!.confidenceScore).toBeLessThanOrEqual(0.95);
  });

  it('should support all suggestion types', async () => {
    const suggestionTypes = ['reframe', 'question', 'shared_value', 'compromise'];

    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      suggestionTypes.map((type, i) => ({
        suggestionText: `Suggestion for ${type}`,
        targetAudience: 'both',
        relatedPropositionIndices: [],
        potentialCommonGround: `Common ground for ${type}`,
        confidenceScore: 0.7,
        suggestionType: type,
      })),
    );

    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);

    const generatedTypes = suggestions.map((s) => s.suggestionType);
    for (const type of suggestionTypes) {
      expect(generatedTypes).toContain(type);
    }
  });

  it('should support all target audience types', async () => {
    const audiences = ['support', 'oppose', 'both'];

    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(
      audiences.map((audience) => ({
        suggestionText: `Suggestion for ${audience}`,
        targetAudience: audience,
        relatedPropositionIndices: [],
        potentialCommonGround: `Common ground for ${audience}`,
        confidenceScore: 0.7,
        suggestionType: 'reframe',
      })),
    );

    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);

    const generatedAudiences = suggestions.map((s) => s.targetAudience);
    for (const audience of audiences) {
      expect(generatedAudiences).toContain(audience);
    }
  });

  it('should generate deterministic IDs based on topic number and sequence', async () => {
    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        suggestionText: 'Suggestion 1',
        targetAudience: 'both',
        relatedPropositionIndices: [],
        potentialCommonGround: 'Common ground',
        confidenceScore: 0.7,
        suggestionType: 'reframe',
      },
      {
        suggestionText: 'Suggestion 2',
        targetAudience: 'support',
        relatedPropositionIndices: [],
        potentialCommonGround: 'Common ground 2',
        confidenceScore: 0.8,
        suggestionType: 'question',
      },
    ]);

    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);

    // IDs should follow the format from generateBridgingId
    expect(suggestions[0]!.id).toMatch(/^11111111-0000-4000-8000-004113/);
    expect(suggestions[1]!.id).toMatch(/^11111111-0000-4000-8000-004113/);
    // Sequence numbers should be different
    expect(suggestions[0]!.id).not.toBe(suggestions[1]!.id);
  });

  describe('generateForAllTopics', () => {
    it('should generate suggestions for all topics with common ground analyses', async () => {
      const topics: GeneratedTopic[] = [
        mockTopic,
        {
          ...mockTopic,
          id: '11111111-0000-4000-8000-000000000114',
          title: 'Second topic',
          topicIndex: 114,
        },
      ];

      const commonGroundAnalyses: GeneratedCommonGround[] = [
        mockCommonGround,
        {
          ...mockCommonGround,
          id: '11111111-0000-4000-8000-003114000001',
          topicId: topics[1]!.id,
        },
      ];

      (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          suggestionText: 'Bridging suggestion',
          targetAudience: 'both',
          relatedPropositionIndices: [],
          potentialCommonGround: 'Common ground',
          confidenceScore: 0.7,
          suggestionType: 'reframe',
        },
      ]);

      const allSuggestions = await generator.generateForAllTopics(topics, [], commonGroundAnalyses);

      // Should have suggestions for both topics
      expect(allSuggestions.length).toBeGreaterThanOrEqual(2);

      // Check that suggestions reference correct topics
      const topicIds = new Set(allSuggestions.map((s) => s.topicId));
      expect(topicIds.has(topics[0]!.id)).toBe(true);
      expect(topicIds.has(topics[1]!.id)).toBe(true);
    });

    it('should skip topics without common ground analyses', async () => {
      const topics: GeneratedTopic[] = [
        mockTopic,
        {
          ...mockTopic,
          id: '11111111-0000-4000-8000-000000000114',
          title: 'Topic without common ground',
          topicIndex: 114,
        },
      ];

      // Only provide common ground for first topic
      const commonGroundAnalyses: GeneratedCommonGround[] = [mockCommonGround];

      (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          suggestionText: 'Bridging suggestion',
          targetAudience: 'both',
          relatedPropositionIndices: [],
          potentialCommonGround: 'Common ground',
          confidenceScore: 0.7,
          suggestionType: 'reframe',
        },
      ]);

      const allSuggestions = await generator.generateForAllTopics(topics, [], commonGroundAnalyses);

      // Should only have suggestions for the topic with common ground analysis
      const topicIds = new Set(allSuggestions.map((s) => s.topicId));
      expect(topicIds.has(topics[0]!.id)).toBe(true);
      expect(topicIds.has(topics[1]!.id)).toBe(false);
    });
  });
});
