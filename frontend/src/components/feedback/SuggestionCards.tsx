/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type {
  TagSuggestionsResponse,
  TopicLinkSuggestionsResponse,
  TopicLink,
} from '../../types/suggestions';

export interface SuggestionCardsProps {
  /**
   * Type of suggestions to display
   */
  type: 'tags' | 'topic-links';

  /**
   * Tag suggestions data (when type is 'tags')
   */
  tagSuggestions?: TagSuggestionsResponse;

  /**
   * Topic link suggestions data (when type is 'topic-links')
   */
  topicLinkSuggestions?: TopicLinkSuggestionsResponse;

  /**
   * Optional title for the suggestion cards section
   */
  title?: string;

  /**
   * Optional callback when a suggestion is accepted
   */
  onAccept?: (suggestion: string | TopicLink) => void;

  /**
   * Optional callback when a suggestion is dismissed
   */
  onDismiss?: (suggestion: string | TopicLink) => void;

  /**
   * Whether to show accept/dismiss buttons
   */
  showActions?: boolean;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to show an empty state when no suggestions are available
   */
  showEmptyState?: boolean;

  /**
   * Custom empty state message
   */
  emptyStateMessage?: string;
}

/**
 * Get relationship type styling
 */
const getRelationshipTypeStyles = (relationshipType: string) => {
  const styles = {
    supports: {
      badge: 'bg-green-100 text-green-800',
      icon: '✓',
    },
    contradicts: {
      badge: 'bg-red-100 text-red-800',
      icon: '✗',
    },
    extends: {
      badge: 'bg-blue-100 text-blue-800',
      icon: '→',
    },
    questions: {
      badge: 'bg-purple-100 text-purple-800',
      icon: '?',
    },
    relates_to: {
      badge: 'bg-gray-100 text-gray-800',
      icon: '~',
    },
  };

  return styles[relationshipType as keyof typeof styles] || styles.relates_to;
};

/**
 * SuggestionCards - A reusable component for displaying AI-generated suggestions
 *
 * This component displays tag suggestions or topic link suggestions with appropriate
 * styling and optional accept/dismiss actions.
 */
const SuggestionCards: React.FC<SuggestionCardsProps> = ({
  type,
  tagSuggestions,
  topicLinkSuggestions,
  title,
  onAccept,
  onDismiss,
  showActions = false,
  className = '',
  showEmptyState = false,
  emptyStateMessage = 'No suggestions available',
}) => {
  // Determine if we have suggestions
  const hasSuggestions =
    (type === 'tags' && tagSuggestions && tagSuggestions.suggestions.length > 0) ||
    (type === 'topic-links' &&
      topicLinkSuggestions &&
      topicLinkSuggestions.linkSuggestions.length > 0);

  // Early return if no suggestions and empty state is not shown
  if (!hasSuggestions && !showEmptyState) {
    return null;
  }

  // Empty state
  if (!hasSuggestions && showEmptyState) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-gray-500">{emptyStateMessage}</p>
      </div>
    );
  }

  // Get the appropriate data based on type
  const suggestions = type === 'tags' ? tagSuggestions : topicLinkSuggestions;

  if (!suggestions) {
    return null;
  }

  return (
    <div className={className}>
      {title && <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>}

      {/* Confidence and attribution info */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          AI Confidence: {Math.round(suggestions.confidenceScore * 100)}%
        </span>
        <span className="text-gray-400 italic">{suggestions.attribution}</span>
      </div>

      {/* Tag Suggestions */}
      {type === 'tags' && tagSuggestions && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tagSuggestions.suggestions.map((tag, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2"
              >
                <span className="text-sm font-medium text-primary-800">#{tag}</span>
                {showActions && (
                  <div className="flex gap-1">
                    {onAccept && (
                      <button
                        type="button"
                        onClick={() => onAccept(tag)}
                        className="text-green-600 hover:text-green-700 transition-colors"
                        aria-label={`Accept tag ${tag}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        type="button"
                        onClick={() => onDismiss(tag)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={`Dismiss tag ${tag}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reasoning */}
          {tagSuggestions.reasoning && (
            <p className="text-xs text-gray-600 italic mt-3">{tagSuggestions.reasoning}</p>
          )}
        </div>
      )}

      {/* Topic Link Suggestions */}
      {type === 'topic-links' && topicLinkSuggestions && (
        <div className="space-y-3">
          {topicLinkSuggestions.linkSuggestions.map((link, index) => {
            const styles = getRelationshipTypeStyles(link.relationshipType);

            return (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${styles.badge}`}>
                      <span className="mr-1">{styles.icon}</span>
                      {link.relationshipType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      Topic: {link.targetTopicId.slice(0, 8)}...
                    </span>
                  </div>

                  {showActions && (
                    <div className="flex gap-1">
                      {onAccept && (
                        <button
                          type="button"
                          onClick={() => onAccept(link)}
                          className="text-green-600 hover:text-green-700 transition-colors"
                          aria-label="Accept topic link suggestion"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      )}
                      {onDismiss && (
                        <button
                          type="button"
                          onClick={() => onDismiss(link)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label="Dismiss topic link suggestion"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-700">{link.reasoning}</p>
              </div>
            );
          })}

          {/* Overall reasoning */}
          {topicLinkSuggestions.reasoning && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 italic">
                <span className="font-medium">Overall Analysis:</span>{' '}
                {topicLinkSuggestions.reasoning}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestionCards;
