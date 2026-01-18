/**
 * Type definitions for AI suggestion functionality
 */

/**
 * Request for tag suggestions
 */
export interface TagSuggestionsRequest {
  title: string;
  content: string;
}

/**
 * Response from tag suggestions endpoint
 */
export interface TagSuggestionsResponse {
  suggestions: string[];
  confidenceScore: number;
  reasoning: string;
  attribution: string;
}

/**
 * Request for topic link suggestions
 */
export interface TopicLinkSuggestionsRequest {
  topicId: string;
  title: string;
  content: string;
  existingTopicIds?: string[];
}

/**
 * Topic link suggestion with relationship type
 */
export interface TopicLink {
  targetTopicId: string;
  relationshipType: 'supports' | 'contradicts' | 'extends' | 'questions' | 'relates_to';
  reasoning: string;
}

/**
 * Response from topic link suggestions endpoint
 */
export interface TopicLinkSuggestionsResponse {
  suggestions: string[];
  linkSuggestions: TopicLink[];
  confidenceScore: number;
  reasoning: string;
  attribution: string;
}

/**
 * Union type for all suggestion types
 */
export type SuggestionResponse = TagSuggestionsResponse | TopicLinkSuggestionsResponse;

/**
 * Type guard to check if response is TagSuggestionsResponse
 */
export function isTagSuggestion(response: SuggestionResponse): response is TagSuggestionsResponse {
  return !('linkSuggestions' in response);
}

/**
 * Type guard to check if response is TopicLinkSuggestionsResponse
 */
export function isTopicLinkSuggestion(
  response: SuggestionResponse,
): response is TopicLinkSuggestionsResponse {
  return 'linkSuggestions' in response;
}
