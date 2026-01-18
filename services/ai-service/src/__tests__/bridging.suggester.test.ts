// @ts-nocheck
import { BridgingSuggester } from '../synthesizers/bridging.suggester.js';
import type { BridgingSuggestionResult } from '../synthesizers/bridging.suggester.js';

describe('BridgingSuggester', () => {
  let suggester: BridgingSuggester;
  let mockPrisma: any;

  beforeEach(() => {
    // Create mock Prisma service
    mockPrisma = {
      proposition: {
        findMany: async () => [],
      },
    };

    // Create suggester with mock Prisma
    suggester = new BridgingSuggester(mockPrisma);
  });

  describe('suggest', () => {
    it('should return empty suggestions for topic with no propositions', async () => {
      mockPrisma.proposition.findMany = async () => [];

      const result: BridgingSuggestionResult = await suggester.suggest('topic-1');

      expect(result.suggestions).toEqual([]);
      expect(result.overallConsensusScore).toBe(0);
      expect(result.conflictAreas).toEqual([]);
      expect(result.commonGroundAreas).toEqual([]);
      expect(result.confidenceScore).toBe(0.5);
      expect(result.reasoning).toContain('No propositions found');
    });

    it('should identify bridging opportunities for propositions with disagreement', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Universal healthcare is a human right',
          supportCount: 6,
          opposeCount: 4,
          nuancedCount: 0,
          consensusScore: 0.6,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT', nuanceExplanation: null },
            { userId: 'user-2', stance: 'SUPPORT', nuanceExplanation: null },
            { userId: 'user-3', stance: 'SUPPORT', nuanceExplanation: null },
            { userId: 'user-4', stance: 'SUPPORT', nuanceExplanation: null },
            { userId: 'user-5', stance: 'SUPPORT', nuanceExplanation: null },
            { userId: 'user-6', stance: 'SUPPORT', nuanceExplanation: null },
            { userId: 'user-7', stance: 'OPPOSE', nuanceExplanation: null },
            { userId: 'user-8', stance: 'OPPOSE', nuanceExplanation: null },
            { userId: 'user-9', stance: 'OPPOSE', nuanceExplanation: null },
            { userId: 'user-10', stance: 'OPPOSE', nuanceExplanation: null },
          ],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.suggestions.length).toBe(1);
      expect(result.suggestions[0].propositionId).toBe('prop-1');
      expect(result.suggestions[0].sourcePosition).toBe('SUPPORT');
      expect(result.suggestions[0].targetPosition).toBe('OPPOSE');
      expect(result.suggestions[0].bridgingLanguage).toBeTruthy();
      expect(result.suggestions[0].commonGround).toBeTruthy();
      expect(result.suggestions[0].confidenceScore).toBeGreaterThan(0);
      expect(result.overallConsensusScore).toBe(0.6);
      expect(result.conflictAreas.length).toBe(1);
    });

    it('should identify common ground areas for high-consensus propositions', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Education is important for society',
          supportCount: 9,
          opposeCount: 1,
          nuancedCount: 0,
          consensusScore: 0.9,
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

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.commonGroundAreas.length).toBeGreaterThan(0);
      expect(result.commonGroundAreas[0]).toContain('Education is important');
    });

    it('should handle propositions with nuanced views', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Climate policy requires trade-offs',
          supportCount: 3,
          opposeCount: 3,
          nuancedCount: 4,
          consensusScore: 0.5,
          alignments: [
            { userId: 'user-1', stance: 'SUPPORT' },
            { userId: 'user-2', stance: 'SUPPORT' },
            { userId: 'user-3', stance: 'SUPPORT' },
            { userId: 'user-4', stance: 'OPPOSE' },
            { userId: 'user-5', stance: 'OPPOSE' },
            { userId: 'user-6', stance: 'OPPOSE' },
            {
              userId: 'user-7',
              stance: 'NUANCED',
              nuanceExplanation: 'Both sides have valid points',
            },
            { userId: 'user-8', stance: 'NUANCED', nuanceExplanation: 'Depends on implementation' },
            { userId: 'user-9', stance: 'NUANCED', nuanceExplanation: 'Need more data' },
            { userId: 'user-10', stance: 'NUANCED', nuanceExplanation: 'Complex issue' },
          ],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.suggestions.length).toBe(1);
      // With nuanced views, target position should be NUANCED
      expect(result.suggestions[0].targetPosition).toBe('NUANCED');
      // Higher confidence when nuanced views are present
      expect(result.suggestions[0].confidenceScore).toBeGreaterThan(0.5);
    });

    it('should calculate higher confidence with more alignments', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Economic growth matters',
          supportCount: 8,
          opposeCount: 2,
          nuancedCount: 0,
          consensusScore: 0.8,
          alignments: Array.from({ length: 10 }, (_, i) => ({
            userId: `user-${i + 1}`,
            stance: i < 8 ? 'SUPPORT' : 'OPPOSE',
            nuanceExplanation: null,
          })),
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      // Confidence should be higher with more alignments (10 > 5)
      expect(result.suggestions[0].confidenceScore).toBeGreaterThanOrEqual(0.6);
    });

    it('should handle multiple propositions with different consensus levels', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Proposition with high consensus',
          supportCount: 9,
          opposeCount: 1,
          nuancedCount: 0,
          consensusScore: 0.9,
          alignments: [],
        },
        {
          id: 'prop-2',
          topicId: 'topic-1',
          statement: 'Proposition with moderate consensus',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.5,
          alignments: [],
        },
        {
          id: 'prop-3',
          topicId: 'topic-1',
          statement: 'Proposition with low consensus',
          supportCount: 3,
          opposeCount: 7,
          nuancedCount: 0,
          consensusScore: 0.3,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      // Should identify bridging opportunities for all propositions that have disagreement (all 3)
      expect(result.suggestions.length).toBe(3);
      expect(result.overallConsensusScore).toBeCloseTo((0.9 + 0.5 + 0.3) / 3, 1);
      expect(result.conflictAreas.length).toBe(3); // All 3 have both support and oppose
      expect(result.commonGroundAreas.length).toBe(1);
    });

    it('should generate descriptive reasoning for the analysis', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Test proposition',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.5,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.reasoning).toContain('Analyzed');
      expect(result.reasoning).toContain('bridging');
      expect(result.reasoning).toContain('proposition');
      expect(result.reasoning).toContain('consensus');
    });

    it('should identify opposing position correctly when opposition is larger', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Tax increases benefit the poor',
          supportCount: 2,
          opposeCount: 8,
          nuancedCount: 0,
          consensusScore: 0.2,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.suggestions.length).toBe(1);
      // When opposition is larger, source should be OPPOSE, target SUPPORT
      expect(result.suggestions[0].sourcePosition).toBe('OPPOSE');
      expect(result.suggestions[0].targetPosition).toBe('SUPPORT');
    });

    it('should handle propositions with null consensus scores', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'New proposition with no consensus yet',
          supportCount: 3,
          opposeCount: 2,
          nuancedCount: 1,
          consensusScore: null,
          alignments: [],
        },
        {
          id: 'prop-2',
          topicId: 'topic-1',
          statement: 'Established proposition',
          supportCount: 8,
          opposeCount: 2,
          nuancedCount: 0,
          consensusScore: 0.8,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      // Should calculate average consensus from only non-null values
      expect(result.overallConsensusScore).toBe(0.8);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle topic with only consensus (no disagreement)', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Universally agreed proposition',
          supportCount: 10,
          opposeCount: 0,
          nuancedCount: 0,
          consensusScore: 1.0,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      // No disagreement means no bridging suggestions
      expect(result.suggestions.length).toBe(0);
      expect(result.commonGroundAreas.length).toBe(1);
    });

    it('should set appropriate confidence scores', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Test proposition',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.5,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      // Overall confidence should be between 0 and 1
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.5);
      expect(result.confidenceScore).toBeLessThanOrEqual(1.0);

      // Suggestion confidence should also be in valid range
      expect(result.suggestions[0].confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.suggestions[0].confidenceScore).toBeLessThanOrEqual(1.0);
    });

    it('should generate bridging language for suggestions', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Government regulation helps consumers',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.5,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.suggestions[0].bridgingLanguage).toBeTruthy();
      expect(result.suggestions[0].bridgingLanguage.length).toBeGreaterThan(0);
      // Bridging language should reference the proposition or positions
      // Check for any of the key terms used in bridging phrases
      const bridgingLanguageLower = result.suggestions[0].bridgingLanguage.toLowerCase();
      expect(
        bridgingLanguageLower.includes('view') ||
          bridgingLanguageLower.includes('perspective') ||
          bridgingLanguageLower.includes('common') ||
          bridgingLanguageLower.includes('bridge') ||
          bridgingLanguageLower.includes('values') ||
          bridgingLanguageLower.includes('disagreement') ||
          bridgingLanguageLower.includes('consider') ||
          bridgingLanguageLower.includes('explore'),
      ).toBeTruthy();
    });

    it('should identify common ground in suggestions', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Healthcare is important',
          supportCount: 6,
          opposeCount: 4,
          nuancedCount: 0,
          consensusScore: 0.6,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.suggestions[0].commonGround).toBeTruthy();
      expect(result.suggestions[0].commonGround.length).toBeGreaterThan(0);
    });

    it('should provide reasoning for each suggestion', async () => {
      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Test proposition',
          supportCount: 7,
          opposeCount: 3,
          nuancedCount: 1,
          consensusScore: 0.7,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      expect(result.suggestions[0].reasoning).toBeTruthy();
      expect(result.suggestions[0].reasoning).toContain('supporters');
      expect(result.suggestions[0].reasoning).toContain('opponents');
    });

    it('should calculate higher overall confidence with more propositions', async () => {
      // Test with fewer propositions
      const fewPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'Proposition 1',
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.5,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => fewPropositions;
      const fewResult = await suggester.suggest('topic-1');

      // Test with more propositions
      const manyPropositions = Array.from({ length: 15 }, (_, i) => ({
        id: `prop-${i + 1}`,
        topicId: 'topic-1',
        statement: `Proposition ${i + 1}`,
        supportCount: 5,
        opposeCount: 5,
        nuancedCount: 0,
        consensusScore: 0.5,
        alignments: [],
      }));

      mockPrisma.proposition.findMany = async () => manyPropositions;
      const manyResult = await suggester.suggest('topic-1');

      // More propositions should lead to higher overall confidence
      expect(manyResult.confidenceScore).toBeGreaterThanOrEqual(fewResult.confidenceScore);
    });

    it('should handle large proposition statement correctly', async () => {
      const longStatement =
        'This is a very long proposition statement that discusses complex policy issues in great detail and requires careful consideration of multiple perspectives and stakeholder interests in the debate';

      const mockPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: longStatement,
          supportCount: 5,
          opposeCount: 5,
          nuancedCount: 0,
          consensusScore: 0.5,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => mockPropositions;

      const result = await suggester.suggest('topic-1');

      // Conflict areas should truncate long statements
      expect(result.conflictAreas[0].length).toBeLessThanOrEqual(100);
    });

    it('should generate appropriate reasoning based on consensus level', async () => {
      const highConsensusPropositions = [
        {
          id: 'prop-1',
          topicId: 'topic-1',
          statement: 'High consensus test',
          supportCount: 9,
          opposeCount: 1,
          nuancedCount: 0,
          consensusScore: 0.9,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => highConsensusPropositions;
      const highResult = await suggester.suggest('topic-1');

      expect(highResult.reasoning.toLowerCase()).toContain('high');

      const lowConsensusPropositions = [
        {
          id: 'prop-2',
          topicId: 'topic-1',
          statement: 'Low consensus test',
          supportCount: 2,
          opposeCount: 8,
          nuancedCount: 0,
          consensusScore: 0.2,
          alignments: [],
        },
      ];

      mockPrisma.proposition.findMany = async () => lowConsensusPropositions;
      const lowResult = await suggester.suggest('topic-1');

      expect(lowResult.reasoning.toLowerCase()).toContain('low');
    });
  });
});
