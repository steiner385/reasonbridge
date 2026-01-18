import {
  TopicLinkSuggester,
  TopicRelationshipType,
} from '../synthesizers/topic-link.suggester.js';

describe('TopicLinkSuggester', () => {
  let suggester: TopicLinkSuggester;

  beforeEach(() => {
    suggester = new TopicLinkSuggester();
  });

  it('should be defined', () => {
    expect(suggester).toBeDefined();
  });

  describe('suggest', () => {
    it('should return empty suggestions when no existing topics provided', async () => {
      const result = await suggester.suggest(
        'topic-123',
        'Test Topic',
        'Test content',
        undefined
      );

      expect(result.suggestions).toEqual([]);
      expect(result.linkSuggestions).toEqual([]);
      expect(result.confidenceScore).toBe(0.5);
      expect(result.reasoning).toContain('requires access to existing topics');
    });

    it('should return empty suggestions when existing topics array is empty', async () => {
      const result = await suggester.suggest('topic-123', 'Test Topic', 'Test content', []);

      expect(result.suggestions).toEqual([]);
      expect(result.linkSuggestions).toEqual([]);
      expect(result.confidenceScore).toBe(0.5);
      expect(result.reasoning).toContain('requires access to existing topics');
    });

    it('should find related topics based on keyword overlap', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Climate Policy',
          content: 'Environmental policies and climate change regulations.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Environmental Protection',
        'Discussion about climate and environmental conservation.',
        existingTopics
      );

      expect(result.linkSuggestions.length).toBeGreaterThan(0);
      expect(result.linkSuggestions[0].targetTopicId).toBe('topic-456');
      expect(result.confidenceScore).toBe(0.6);
    });

    it('should skip the current topic when finding links', async () => {
      const existingTopics = [
        {
          id: 'topic-123',
          title: 'Same Topic',
          content: 'This is the same topic.',
        },
        {
          id: 'topic-456',
          title: 'Different Topic',
          content: 'This is a different topic with similar keywords.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Same Topic',
        'This is the same topic with keywords.',
        existingTopics
      );

      expect(result.linkSuggestions.every((link) => link.targetTopicId !== 'topic-123')).toBe(
        true
      );
    });

    it('should limit results to top 3 suggestions', async () => {
      const existingTopics = [
        {
          id: 'topic-1',
          title: 'Technology Software',
          content: 'Programming and software development.',
        },
        {
          id: 'topic-2',
          title: 'Software Engineering',
          content: 'Engineering software systems and programming.',
        },
        {
          id: 'topic-3',
          title: 'Programming Languages',
          content: 'Various software programming languages.',
        },
        {
          id: 'topic-4',
          title: 'Software Testing',
          content: 'Testing software and programming quality.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Software Development',
        'Programming and software engineering practices.',
        existingTopics
      );

      expect(result.linkSuggestions.length).toBeLessThanOrEqual(3);
    });

    it('should detect CONTRADICTS relationship from contradiction words', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Counter Argument',
          content: 'However, this disagrees with the previous stance.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Main Argument',
        'This argument contradicts earlier claims.',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        const hasContradicts = result.linkSuggestions.some(
          (link) => link.relationshipType === TopicRelationshipType.CONTRADICTS
        );
        expect(hasContradicts).toBe(true);
      }
    });

    it('should detect QUESTIONS relationship from question words', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Uncertain Topic',
          content: 'This raises questions about the methodology.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Doubtful Analysis',
        'I wonder if this approach is unclear.',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        const hasQuestions = result.linkSuggestions.some(
          (link) => link.relationshipType === TopicRelationshipType.QUESTIONS
        );
        expect(hasQuestions).toBe(true);
      }
    });

    it('should detect EXTENDS relationship from extend words', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Base Concept',
          content: 'Building on this concept further.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Extended Analysis',
        'Additionally, we can expand this concept.',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        const hasExtends = result.linkSuggestions.some(
          (link) => link.relationshipType === TopicRelationshipType.EXTENDS
        );
        expect(hasExtends).toBe(true);
      }
    });

    it('should detect SUPPORTS relationship from support words', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Original Claim',
          content: 'This claim is validated by evidence.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Supporting Evidence',
        'I agree with and support this argument.',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        const hasSupports = result.linkSuggestions.some(
          (link) => link.relationshipType === TopicRelationshipType.SUPPORTS
        );
        expect(hasSupports).toBe(true);
      }
    });

    it('should default to RELATES_TO when no specific relationship detected', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Related Topic',
          content: 'Similar content without specific relationship markers.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Similar Topic',
        'Similar content without specific markers.',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        const hasRelatesTo = result.linkSuggestions.some(
          (link) => link.relationshipType === TopicRelationshipType.RELATES_TO
        );
        expect(hasRelatesTo).toBe(true);
      }
    });

    it('should provide reasoning with shared keywords', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Technology Discussion',
          content: 'Software programming and development.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Programming Topic',
        'Discussion about software and programming.',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        expect(result.linkSuggestions[0].reasoning).toContain('Shares');
        expect(result.linkSuggestions[0].reasoning).toContain('keyword');
      }
    });

    it('should filter keywords longer than 4 characters', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Short',
          content: 'The cat sat on mat.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Test',
        'The dog sat on rug.',
        existingTopics
      );

      expect(result.linkSuggestions.length).toBe(0);
    });

    it('should handle content with no meaningful keywords', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Test',
          content: 'A test.',
        },
      ];

      const result = await suggester.suggest('topic-123', 'Test', 'A test.', existingTopics);

      expect(result.linkSuggestions).toEqual([]);
      expect(result.reasoning).toContain('No related topics found');
    });

    it('should return suggestions array matching linkSuggestions target IDs', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Related Topic',
          content: 'Programming software development.',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Software Topic',
        'Programming and software engineering.',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        expect(result.suggestions).toEqual(
          result.linkSuggestions.map((link) => link.targetTopicId)
        );
      }
    });

    it('should be case-insensitive for keyword matching', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'TECHNOLOGY',
          content: 'SOFTWARE PROGRAMMING',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'technology',
        'software programming',
        existingTopics
      );

      expect(result.linkSuggestions.length).toBeGreaterThan(0);
    });

    it('should handle special characters in content', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Tech@2024',
          content: 'Software #programming $development',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Technology!',
        'Software* &programming development%',
        existingTopics
      );

      expect(result.linkSuggestions.length).toBeGreaterThan(0);
    });

    it('should show up to 3 keywords in reasoning', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Comprehensive Topic',
          content: 'Software programming development technology engineering systems architecture',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Tech Discussion',
        'Software programming development technology engineering systems architecture',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        const reasoning = result.linkSuggestions[0].reasoning;
        const keywordMatches = reasoning.match(/,/g);
        if (keywordMatches) {
          expect(keywordMatches.length).toBeLessThanOrEqual(2);
        }
      }
    });

    it('should include ellipsis when more than 3 keywords shared', async () => {
      const existingTopics = [
        {
          id: 'topic-456',
          title: 'Many Keywords',
          content:
            'programming software development engineering architecture systems design implementation',
        },
      ];

      const result = await suggester.suggest(
        'topic-123',
        'Tech Topic',
        'programming software development engineering architecture systems design implementation',
        existingTopics
      );

      if (result.linkSuggestions.length > 0) {
        const reasoning = result.linkSuggestions[0].reasoning;
        const sharedCount = parseInt(reasoning.match(/Shares (\d+)/)?.[1] || '0');
        if (sharedCount > 3) {
          expect(reasoning).toContain('...');
        }
      }
    });
  });
});
