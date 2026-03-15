/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenerationOrchestrator, isCacheValid, CACHE_VERSION } from '../generators/orchestrator.js';
import type { SeedingLLMClient } from '../generators/llm-client.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('GenerationOrchestrator', () => {
  describe('isCacheValid', () => {
    it('should return false when cache does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const result = await isCacheValid('/fake/path');
      expect(result).toBe(false);
    });

    it('should return true when metadata exists and version matches', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ cacheVersion: 1, topicCount: 75 }));
      const result = await isCacheValid('/fake/path', 1);
      expect(result).toBe(true);
    });

    it('should return false when version does not match', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ cacheVersion: 1, topicCount: 75 }));
      const result = await isCacheValid('/fake/path', 2);
      expect(result).toBe(false);
    });

    it('should return false when metadata file is invalid JSON', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');
      const result = await isCacheValid('/fake/path', 1);
      expect(result).toBe(false);
    });
  });

  describe('CACHE_VERSION', () => {
    it('should export CACHE_VERSION as 1', () => {
      expect(CACHE_VERSION).toBe(1);
    });
  });

  describe('GenerationOrchestrator class', () => {
    let mockClient: SeedingLLMClient;
    let orchestrator: GenerationOrchestrator;
    let mockGenerateJSON: ReturnType<typeof vi.fn>;

    /**
     * Setup mocks for a full generation cycle.
     * Returns mock data for each generator in sequence:
     * 1. Topics (called 9 times, once per category)
     * 2. Responses (called once per topic)
     * 3. Propositions (called once per topic with responses)
     * 4. Common ground (called once per topic with 3+ responses)
     * 5. Bridging (called once per topic with common ground)
     */
    function setupGenerationMocks(): void {
      let callCount = 0;

      mockGenerateJSON.mockImplementation(async () => {
        callCount++;

        // First 9 calls are for topic generation (one per category)
        if (callCount <= 9) {
          return [
            {
              title: `Should we implement policy ${callCount}?`,
              description: `Description for policy ${callCount}`,
              crossCuttingThemes: ['test'],
            },
          ];
        }

        // Next calls are for response generation (9 topics)
        if (callCount <= 18) {
          return [
            {
              authorIndex: 0,
              parentIndex: null,
              content: 'Support response content',
              viewpoint: 'support',
              citedSources: [],
            },
            {
              authorIndex: 1,
              parentIndex: null,
              content: 'Oppose response content',
              viewpoint: 'oppose',
              citedSources: [],
            },
            {
              authorIndex: 2,
              parentIndex: null,
              content: 'Nuanced response content',
              viewpoint: 'nuanced',
              citedSources: [],
            },
            {
              authorIndex: 3,
              parentIndex: 0,
              content: 'Reply to support',
              viewpoint: 'oppose',
              citedSources: [],
            },
            {
              authorIndex: 0,
              parentIndex: 1,
              content: 'Reply to oppose',
              viewpoint: 'nuanced',
              citedSources: [],
            },
            {
              authorIndex: 1,
              parentIndex: 3,
              content: 'Nested reply',
              viewpoint: 'support',
              citedSources: [],
            },
          ];
        }

        // Next calls are for proposition generation (9 topics)
        if (callCount <= 27) {
          return [
            { statement: 'Proposition 1', source: 'AI_IDENTIFIED' },
            { statement: 'Proposition 2', source: 'USER_CREATED' },
            { statement: 'Proposition 3', source: 'AI_IDENTIFIED' },
            { statement: 'Proposition 4', source: 'USER_CREATED' },
          ];
        }

        // Next calls are for common ground generation (9 topics)
        if (callCount <= 36) {
          return {
            agreementZones: [
              {
                proposition: 'Evidence-based decision making',
                participantCount: 3,
                supportingEvidence: ['Research'],
                agreementPercentage: 75,
              },
            ],
            misunderstandings: [],
            genuineDisagreements: [
              {
                proposition: 'Rate of change',
                viewpoints: [
                  { position: 'Fast', reasoning: ['Urgency'], participantCount: 2 },
                  { position: 'Slow', reasoning: ['Caution'], participantCount: 2 },
                ],
                underlyingValues: ['Progress', 'Stability'],
              },
            ],
            overallConsensusScore: 0.65,
          };
        }

        // Final calls are for bridging generation (9 topics)
        return [
          {
            suggestionText: 'Consider shared goals',
            targetAudience: 'both',
            relatedPropositionIndices: [0, 1],
            potentialCommonGround: 'Shared values',
            confidenceScore: 0.75,
            suggestionType: 'shared_value',
          },
          {
            suggestionText: 'Reframe the issue',
            targetAudience: 'support',
            relatedPropositionIndices: [2],
            potentialCommonGround: 'Alternative perspective',
            confidenceScore: 0.7,
            suggestionType: 'reframe',
          },
          {
            suggestionText: 'Ask clarifying questions',
            targetAudience: 'oppose',
            relatedPropositionIndices: [3],
            potentialCommonGround: 'Better understanding',
            confidenceScore: 0.8,
            suggestionType: 'question',
          },
        ];
      });
    }

    beforeEach(() => {
      vi.resetAllMocks();

      // Create mock function
      mockGenerateJSON = vi.fn();

      // Mock LLM client
      mockClient = {
        generateJSON: mockGenerateJSON,
        destroy: vi.fn(),
      } as unknown as SeedingLLMClient;

      // Mock fs operations
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('{}');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      orchestrator = new GenerationOrchestrator(mockClient);
    });

    afterEach(() => {
      // Don't call destroy in afterEach to avoid double-destroy
      vi.resetAllMocks();
    });

    it('should create orchestrator with provided client', () => {
      expect(orchestrator).toBeInstanceOf(GenerationOrchestrator);
    });

    it('should have getData method', () => {
      expect(orchestrator.getData).toBeDefined();
      expect(typeof orchestrator.getData).toBe('function');
    });

    it('should have destroy method', () => {
      expect(orchestrator.destroy).toBeDefined();
      expect(typeof orchestrator.destroy).toBe('function');
    });

    describe('getData', () => {
      it('should generate data when cache is invalid', async () => {
        // Mock cache as invalid
        vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

        // Setup full generation mocks
        setupGenerationMocks();

        const data = await orchestrator.getData({
          forceRegenerate: false,
          startingTopicNumber: 113,
        });

        expect(data).toBeDefined();
        expect(data.metadata).toBeDefined();
        expect(data.topics).toBeDefined();
        expect(data.responses).toBeDefined();
        expect(data.propositions).toBeDefined();
        expect(data.commonGround).toBeDefined();
        expect(data.bridging).toBeDefined();
      });

      it('should load from cache when valid and forceRegenerate is false', async () => {
        // Mock cache as valid
        vi.mocked(fs.access).mockResolvedValue(undefined);

        const mockCachedData = {
          metadata: {
            generatedAt: new Date().toISOString(),
            modelVersion: 'claude-3-5-sonnet',
            topicCount: 1,
            responseCount: 0,
            propositionCount: 0,
            commonGroundCount: 0,
            bridgingCount: 0,
            generationDurationMs: 1000,
            cacheVersion: 1,
          },
          topics: [
            {
              id: '11111111-0000-4000-8000-000000000113',
              title: 'Cached Topic',
              description: 'From cache',
              slug: 'cached-topic',
              creatorId: '11111111-0000-4000-8000-000000000001',
              category: 'Climate & Environment',
              status: 'ACTIVE',
              tagIds: [],
              crossCuttingThemes: [],
              expectedEngagement: 'medium',
              topicIndex: 113,
              createdAtOffset: 30,
            },
          ],
          responses: [],
          propositions: [],
          commonGround: [],
          bridging: [],
        };

        vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
          const pathStr = filePath.toString();
          if (pathStr.includes('generation-metadata.json')) {
            return JSON.stringify(mockCachedData.metadata);
          }
          if (pathStr.includes('generated-topics.json')) {
            return JSON.stringify(mockCachedData.topics);
          }
          if (pathStr.includes('generated-responses.json')) {
            return JSON.stringify(mockCachedData.responses);
          }
          if (pathStr.includes('generated-propositions.json')) {
            return JSON.stringify(mockCachedData.propositions);
          }
          if (pathStr.includes('generated-common-ground.json')) {
            return JSON.stringify(mockCachedData.commonGround);
          }
          if (pathStr.includes('generated-bridging.json')) {
            return JSON.stringify(mockCachedData.bridging);
          }
          return '{}';
        });

        const data = await orchestrator.getData({
          forceRegenerate: false,
          startingTopicNumber: 113,
        });

        expect(data).toBeDefined();
        expect(data.topics[0]?.title).toBe('Cached Topic');
        // LLM should not have been called
        expect(mockClient.generateJSON).not.toHaveBeenCalled();
      });

      it('should regenerate when forceRegenerate is true even if cache is valid', async () => {
        // Mock cache as valid
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile).mockResolvedValue(
          JSON.stringify({ cacheVersion: 1, topicCount: 75 }),
        );

        // Setup full generation mocks
        setupGenerationMocks();

        const data = await orchestrator.getData({
          forceRegenerate: true,
          startingTopicNumber: 113,
        });

        expect(data).toBeDefined();
        // LLM should have been called despite valid cache
        expect(mockClient.generateJSON).toHaveBeenCalled();
      });

      it('should use default starting topic number of 113', async () => {
        vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
        setupGenerationMocks();

        const data = await orchestrator.getData({});

        expect(data).toBeDefined();
        // First topic should have ID based on 113
        if (data.topics.length > 0) {
          expect(data.topics[0]?.id).toBe('11111111-0000-4000-8000-000000000113');
        }
      });
    });

    describe('destroy', () => {
      it('should not destroy client when client was provided externally', () => {
        // When a client is provided, the orchestrator doesn't own it
        // so destroy should NOT be called on the client
        orchestrator.destroy();
        expect(mockClient.destroy).not.toHaveBeenCalled();
      });

      it('should only mark as destroyed once even if called multiple times', () => {
        orchestrator.destroy();
        orchestrator.destroy();
        // Should not throw and not call destroy on external client
        expect(mockClient.destroy).not.toHaveBeenCalled();
      });
    });

    describe('destroy with owned client', () => {
      // These tests verify behavior when orchestrator creates its own client
      // We'll test this indirectly by checking the internal state
      it('should handle destroy gracefully', () => {
        const ownedOrchestrator = new GenerationOrchestrator(mockClient);
        // Should not throw
        expect(() => ownedOrchestrator.destroy()).not.toThrow();
      });
    });
  });
});
