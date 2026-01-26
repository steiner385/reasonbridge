import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SuggestionsController } from './suggestions.controller.js';

const createMockSuggestionsService = () => ({
  generateTagSuggestions: vi.fn(),
  generateTopicLinkSuggestions: vi.fn(),
  generateBridgingSuggestions: vi.fn(),
});

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
  },
});

describe('SuggestionsController', () => {
  let controller: SuggestionsController;
  let mockSuggestionsService: ReturnType<typeof createMockSuggestionsService>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSuggestionsService = createMockSuggestionsService();
    mockPrisma = createMockPrismaService();
    controller = new SuggestionsController(mockSuggestionsService as any, mockPrisma as any);
  });

  describe('suggestTags', () => {
    it('should return tag suggestions', async () => {
      const dto = {
        title: 'Climate Change Discussion',
        content: "Let's discuss climate change effects.",
      };
      const serviceResult = {
        suggestions: ['climate', 'environment', 'policy'],
        confidenceScore: 0.85,
        reasoning: 'Based on topic content analysis',
      };
      mockSuggestionsService.generateTagSuggestions.mockResolvedValue(serviceResult);

      const result = await controller.suggestTags(dto as any);

      expect(result.suggestions).toEqual(['climate', 'environment', 'policy']);
      expect(result.confidenceScore).toBe(0.85);
      expect(result.reasoning).toBe('Based on topic content analysis');
      expect(result.attribution).toBe('AI Assistant');
    });

    it('should call service with title and content', async () => {
      const dto = { title: 'Test Title', content: 'Test content' };
      mockSuggestionsService.generateTagSuggestions.mockResolvedValue({
        suggestions: [],
        confidenceScore: 0.5,
        reasoning: '',
      });

      await controller.suggestTags(dto as any);

      expect(mockSuggestionsService.generateTagSuggestions).toHaveBeenCalledWith(
        'Test Title',
        'Test content',
      );
    });

    it('should handle empty suggestions', async () => {
      const dto = { title: 'Generic', content: 'No specific topic' };
      mockSuggestionsService.generateTagSuggestions.mockResolvedValue({
        suggestions: [],
        confidenceScore: 0.3,
        reasoning: 'Could not determine specific tags',
      });

      const result = await controller.suggestTags(dto as any);

      expect(result.suggestions).toEqual([]);
      expect(result.confidenceScore).toBe(0.3);
    });
  });

  describe('suggestTopicLinks', () => {
    it('should return topic link suggestions', async () => {
      const dto = {
        topicId: 'topic-1',
        title: 'Climate Policy',
        content: 'Discussion about climate policies',
      };
      const serviceResult = {
        suggestions: [
          'Related to environmental policies',
          'Consider linking to economics discussions',
        ],
        linkSuggestions: [
          {
            targetTopicId: 'topic-2',
            relationshipType: 'RELATED',
            reasoning: 'Similar subject matter',
          },
          {
            targetTopicId: 'topic-3',
            relationshipType: 'BUILDS_UPON',
            reasoning: 'Extends previous discussion',
          },
        ],
        confidenceScore: 0.8,
        reasoning: 'Found multiple relevant connections',
      };
      mockSuggestionsService.generateTopicLinkSuggestions.mockResolvedValue(serviceResult);

      const result = await controller.suggestTopicLinks(dto as any);

      expect(result.suggestions).toEqual(serviceResult.suggestions);
      expect(result.linkSuggestions).toHaveLength(2);
      expect(result.linkSuggestions[0].targetTopicId).toBe('topic-2');
      expect(result.linkSuggestions[0].relationshipType).toBe('RELATED');
      expect(result.confidenceScore).toBe(0.8);
      expect(result.attribution).toBe('AI Assistant');
    });

    it('should call service with correct parameters', async () => {
      const dto = {
        topicId: 'topic-123',
        title: 'Test',
        content: 'Content',
        existingTopicIds: ['topic-1', 'topic-2'],
      };
      mockSuggestionsService.generateTopicLinkSuggestions.mockResolvedValue({
        suggestions: [],
        confidenceScore: 0.5,
        reasoning: '',
      });

      await controller.suggestTopicLinks(dto as any);

      expect(mockSuggestionsService.generateTopicLinkSuggestions).toHaveBeenCalledWith(
        'topic-123',
        'Test',
        'Content',
        [], // existingTopics mapped from existingTopicIds
      );
    });

    it('should handle undefined existingTopicIds', async () => {
      const dto = {
        topicId: 'topic-123',
        title: 'Test',
        content: 'Content',
      };
      mockSuggestionsService.generateTopicLinkSuggestions.mockResolvedValue({
        suggestions: [],
        confidenceScore: 0.5,
        reasoning: '',
      });

      await controller.suggestTopicLinks(dto as any);

      expect(mockSuggestionsService.generateTopicLinkSuggestions).toHaveBeenCalledWith(
        'topic-123',
        'Test',
        'Content',
        undefined,
      );
    });

    it('should handle null linkSuggestions from service', async () => {
      const dto = { topicId: 'topic-1', title: 'Test', content: 'Content' };
      mockSuggestionsService.generateTopicLinkSuggestions.mockResolvedValue({
        suggestions: ['Suggestion 1'],
        linkSuggestions: null,
        confidenceScore: 0.6,
        reasoning: 'No links found',
      });

      const result = await controller.suggestTopicLinks(dto as any);

      expect(result.linkSuggestions).toEqual([]);
    });

    it('should handle undefined linkSuggestions from service', async () => {
      const dto = { topicId: 'topic-1', title: 'Test', content: 'Content' };
      mockSuggestionsService.generateTopicLinkSuggestions.mockResolvedValue({
        suggestions: [],
        confidenceScore: 0.5,
        reasoning: '',
      });

      const result = await controller.suggestTopicLinks(dto as any);

      expect(result.linkSuggestions).toEqual([]);
    });
  });

  describe('getBridgingSuggestions', () => {
    it('should return bridging suggestions for existing topic', async () => {
      const topicId = 'topic-1';
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: topicId, title: 'Test Topic' });
      const serviceResult = {
        suggestions: ['Find common ground on X', 'Acknowledge different perspectives on Y'],
        overallConsensusScore: 0.65,
        conflictAreas: ['Economic impact', 'Implementation timeline'],
        commonGroundAreas: ['Overall goal', 'Need for action'],
        confidenceScore: 0.75,
        reasoning: 'Analyzed 10 propositions with diverse alignments',
      };
      mockSuggestionsService.generateBridgingSuggestions.mockResolvedValue(serviceResult);

      const result = await controller.getBridgingSuggestions(topicId);

      expect(result.topicId).toBe(topicId);
      expect(result.suggestions).toEqual(serviceResult.suggestions);
      expect(result.overallConsensusScore).toBe(0.65);
      expect(result.conflictAreas).toEqual(['Economic impact', 'Implementation timeline']);
      expect(result.commonGroundAreas).toEqual(['Overall goal', 'Need for action']);
      expect(result.confidenceScore).toBe(0.75);
      expect(result.attribution).toBe('AI Assistant');
    });

    it('should throw NotFoundException when topic not found', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(controller.getBridgingSuggestions('non-existent')).rejects.toThrow(
        new NotFoundException('Topic with ID non-existent not found'),
      );
    });

    it('should check topic existence before generating suggestions', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockSuggestionsService.generateBridgingSuggestions.mockResolvedValue({
        suggestions: [],
        overallConsensusScore: 0,
        conflictAreas: [],
        commonGroundAreas: [],
        confidenceScore: 0,
        reasoning: '',
      });

      await controller.getBridgingSuggestions('topic-1');

      expect(mockPrisma.discussionTopic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
      });
      expect(mockSuggestionsService.generateBridgingSuggestions).toHaveBeenCalledWith('topic-1');
    });

    it('should handle topics with no propositions', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockSuggestionsService.generateBridgingSuggestions.mockResolvedValue({
        suggestions: ['Start by adding propositions'],
        overallConsensusScore: 0,
        conflictAreas: [],
        commonGroundAreas: [],
        confidenceScore: 0.3,
        reasoning: 'No propositions found',
      });

      const result = await controller.getBridgingSuggestions('topic-1');

      expect(result.overallConsensusScore).toBe(0);
      expect(result.conflictAreas).toEqual([]);
      expect(result.commonGroundAreas).toEqual([]);
    });
  });
});
