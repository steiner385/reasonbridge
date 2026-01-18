import { Injectable } from '@nestjs/common';
import type { SuggestionResult } from '../services/suggestions.service.js';

/**
 * Relationship type for topic links
 */
export enum TopicRelationshipType {
  SUPPORTS = 'supports',
  CONTRADICTS = 'contradicts',
  EXTENDS = 'extends',
  QUESTIONS = 'questions',
  RELATES_TO = 'relates_to',
}

/**
 * Topic link suggestion with relationship type
 */
export interface TopicLinkSuggestion {
  targetTopicId: string;
  relationshipType: TopicRelationshipType;
  reasoning: string;
}

/**
 * Extended suggestion result for topic links
 */
export interface TopicLinkSuggestionResult extends SuggestionResult {
  linkSuggestions: TopicLinkSuggestion[];
}

/**
 * Topic link suggestion synthesizer
 * Suggests related topics and their relationship types using semantic analysis
 */
@Injectable()
export class TopicLinkSuggester {
  /**
   * Generate topic link suggestions based on content analysis
   * @param currentTopicId The current topic ID
   * @param title Current topic title
   * @param content Current topic content
   * @param existingTopics Optional array of existing topics to compare against
   * @returns Topic link suggestions with relationship types and confidence
   */
  async suggest(
    currentTopicId: string,
    title: string,
    content: string,
    existingTopics?: Array<{ id: string; title: string; content: string }>,
  ): Promise<TopicLinkSuggestionResult> {
    // Stub implementation - requires semantic analysis and database of existing topics
    // For now, return empty suggestions with reasoning

    if (!existingTopics || existingTopics.length === 0) {
      return {
        suggestions: [],
        linkSuggestions: [],
        confidenceScore: 0.5,
        reasoning:
          'Topic link suggestion requires access to existing topics database and semantic similarity analysis. This is a stub implementation pending AI client integration and database queries.',
      };
    }

    // Simple keyword-based matching as a placeholder
    const linkSuggestions = this.findRelatedTopics(title, content, currentTopicId, existingTopics);

    return {
      suggestions: linkSuggestions.map((link) => link.targetTopicId),
      linkSuggestions,
      confidenceScore: linkSuggestions.length > 0 ? 0.6 : 0.5,
      reasoning:
        linkSuggestions.length > 0
          ? `Found ${linkSuggestions.length} potential topic link${linkSuggestions.length === 1 ? '' : 's'} based on keyword matching. AI-powered semantic analysis will improve accuracy.`
          : 'No related topics found using keyword matching. AI-powered semantic analysis pending.',
    };
  }

  /**
   * Find related topics using simple keyword matching
   * This is a placeholder for AI-powered semantic similarity
   */
  private findRelatedTopics(
    title: string,
    content: string,
    currentTopicId: string,
    existingTopics: Array<{ id: string; title: string; content: string }>,
  ): TopicLinkSuggestion[] {
    const currentText = `${title} ${content}`.toLowerCase();
    const currentKeywords = this.extractKeywords(currentText);

    if (currentKeywords.length === 0) {
      return [];
    }

    const suggestions: TopicLinkSuggestion[] = [];

    for (const topic of existingTopics) {
      // Skip the current topic
      if (topic.id === currentTopicId) {
        continue;
      }

      const topicText = `${topic.title} ${topic.content}`.toLowerCase();
      const topicKeywords = this.extractKeywords(topicText);

      // Calculate keyword overlap
      const overlap = currentKeywords.filter((kw) => topicKeywords.includes(kw));

      if (overlap.length > 0) {
        // Determine relationship type based on language cues
        const relationshipType = this.inferRelationshipType(currentText, topicText);

        suggestions.push({
          targetTopicId: topic.id,
          relationshipType,
          reasoning: `Shares ${overlap.length} keyword${overlap.length === 1 ? '' : 's'} (${overlap.slice(0, 3).join(', ')}${overlap.length > 3 ? '...' : ''})`,
        });
      }
    }

    // Return top 3 suggestions
    return suggestions.slice(0, 3);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text.split(/\s+/);

    // Stop words to filter out
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
    ]);

    return words
      .map((word) => word.replace(/[^a-z]/g, ''))
      .filter((word) => word.length > 4 && !stopWords.has(word));
  }

  /**
   * Infer relationship type based on language cues
   * This is a simple heuristic; AI analysis will provide better accuracy
   */
  private inferRelationshipType(text1: string, text2: string): TopicRelationshipType {
    const supportWords = ['agree', 'support', 'confirm', 'validate', 'prove'];
    const contradictWords = [
      'disagree',
      'contradict',
      'refute',
      'oppose',
      'challenge',
      'however',
      'but',
    ];
    const questionWords = ['question', 'doubt', 'wonder', 'unclear', 'uncertain'];
    const extendWords = ['building', 'expand', 'extend', 'develop', 'further', 'additionally'];

    const combinedText = `${text1} ${text2}`;

    if (contradictWords.some((word) => combinedText.includes(word))) {
      return TopicRelationshipType.CONTRADICTS;
    } else if (questionWords.some((word) => combinedText.includes(word))) {
      return TopicRelationshipType.QUESTIONS;
    } else if (extendWords.some((word) => combinedText.includes(word))) {
      return TopicRelationshipType.EXTENDS;
    } else if (supportWords.some((word) => combinedText.includes(word))) {
      return TopicRelationshipType.SUPPORTS;
    }

    // Default to generic relationship
    return TopicRelationshipType.RELATES_TO;
  }
}
