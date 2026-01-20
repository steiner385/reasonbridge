// @ts-nocheck
import { SuggestionsService } from '../services/suggestions.service.js';
import { TagSuggester } from '../synthesizers/tag.suggester.js';
import { TopicLinkSuggester, TopicRelationshipType } from '../synthesizers/topic-link.suggester.js';
import { BridgingSuggester } from '../synthesizers/bridging.suggester.js';

describe('SuggestionsService', () => {
  let service: SuggestionsService;
  let tagSuggester: TagSuggester;
  let topicLinkSuggester: TopicLinkSuggester;
  let bridgingSuggester: BridgingSuggester;

  beforeEach(() => {
    tagSuggester = new TagSuggester();
    topicLinkSuggester = new TopicLinkSuggester();
    // Create mock Prisma for BridgingSuggester
    const mockPrisma = { proposition: { findMany: async () => [] } } as any;
    bridgingSuggester = new BridgingSuggester(mockPrisma);
    service = new SuggestionsService(tagSuggester, topicLinkSuggester, bridgingSuggester);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTagSuggestions', () => {
    it('should return suggestions from TagSuggester', async () => {
      const result = await service.generateTagSuggestions(
        'Scientific Research',
        'A study on hypothesis testing and experimental design.',
      );

      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('reasoning');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(typeof result.confidenceScore).toBe('number');
      expect(typeof result.reasoning).toBe('string');
    });

    it('should handle empty title and content', async () => {
      const result = await service.generateTagSuggestions('', '');

      expect(result).toHaveProperty('suggestions');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('generateTopicLinkSuggestions', () => {
    it('should return topic link suggestions from TopicLinkSuggester', async () => {
      const result = await service.generateTopicLinkSuggestions(
        'topic-123',
        'Healthcare Reform',
        'Proposed changes to medical system.',
        [
          {
            id: 'topic-456',
            title: 'Medical Insurance',
            content: 'Discussion about healthcare coverage',
          },
        ],
      );

      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('linkSuggestions');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('reasoning');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.linkSuggestions)).toBe(true);
    });

    it('should handle missing existingTopics parameter', async () => {
      const result = await service.generateTopicLinkSuggestions(
        'topic-123',
        'Test Topic',
        'Test content',
      );

      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('linkSuggestions');
      expect(result.linkSuggestions).toEqual([]);
    });

    it('should handle empty existingTopics array', async () => {
      const result = await service.generateTopicLinkSuggestions(
        'topic-123',
        'Test Topic',
        'Test content',
        [],
      );

      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('linkSuggestions');
      expect(result.linkSuggestions).toEqual([]);
    });
  });
});
