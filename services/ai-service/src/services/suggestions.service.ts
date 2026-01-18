import { Injectable } from '@nestjs/common';
import { TagSuggester } from '../synthesizers/tag.suggester.js';
import { TopicLinkSuggester, type TopicLinkSuggestionResult } from '../synthesizers/topic-link.suggester.js';

/**
 * Suggestion result from synthesizers
 */
export interface SuggestionResult {
  suggestions: string[];
  confidenceScore: number;
  reasoning: string;
}

/**
 * Orchestrator service for AI-powered suggestions
 * Coordinates tag and topic-link suggestions generation
 */
@Injectable()
export class SuggestionsService {
  constructor(
    private readonly tagSuggester: TagSuggester,
    private readonly topicLinkSuggester: TopicLinkSuggester,
  ) {}

  /**
   * Generate tag suggestions for content
   * @param title Topic title
   * @param content Topic content to analyze for tag suggestions
   * @returns Tag suggestions with confidence and reasoning
   */
  async generateTagSuggestions(title: string, content: string): Promise<SuggestionResult> {
    return this.tagSuggester.suggest(title, content);
  }

  /**
   * Generate topic link suggestions for content
   * @param topicId The current topic ID
   * @param title Topic title
   * @param content The topic content
   * @param existingTopics Optional array of existing topics to compare against
   * @returns Topic link suggestions with confidence and reasoning
   */
  async generateTopicLinkSuggestions(
    topicId: string,
    title: string,
    content: string,
    existingTopics?: Array<{ id: string; title: string; content: string }>,
  ): Promise<TopicLinkSuggestionResult> {
    return this.topicLinkSuggester.suggest(topicId, title, content, existingTopics);
  }
}
