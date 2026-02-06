/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { useSuggestionActions } from '../../hooks/useSuggestionActions';
import type {
  TagSuggestionsResponse,
  TopicLinkSuggestionsResponse,
  TopicLink,
} from '../../types/suggestions';
import SuggestionCards from './SuggestionCards';

export interface SuggestionPanelProps {
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
   * Topic ID to apply suggestions to
   */
  topicId: string;

  /**
   * Optional title for the panel
   */
  title?: string;

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

  /**
   * Optional callback when a suggestion is successfully applied
   */
  onApplied?: (suggestion: string | TopicLink) => void;

  /**
   * Optional callback when a suggestion is dismissed
   */
  onDismissed?: (suggestion: string | TopicLink) => void;
}

/**
 * SuggestionPanel - A higher-level component that combines SuggestionCards
 * with suggestion application logic
 *
 * This component:
 * - Displays suggestions using the SuggestionCards component
 * - Manages applying and dismissing suggestions via useSuggestionActions hook
 * - Provides feedback on application success/failure
 * - Filters out already applied or dismissed suggestions
 */
const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  type,
  tagSuggestions,
  topicLinkSuggestions,
  topicId,
  title,
  className = '',
  showEmptyState = false,
  emptyStateMessage,
  onApplied,
  onDismissed,
}) => {
  const {
    applyTag,
    applyTopicLink,
    dismissTag,
    dismissTopicLink,
    isTagApplied,
    isTagDismissed,
    isTopicLinkApplied,
    isTopicLinkDismissed,
    isApplying,
    error,
  } = useSuggestionActions();

  /**
   * Handle accepting a suggestion
   */
  const handleAccept = useCallback(
    async (suggestion: string | TopicLink) => {
      if (typeof suggestion === 'string') {
        // Tag suggestion
        const result = await applyTag({ topicId, tag: suggestion });
        if (result.success && onApplied) {
          onApplied(suggestion);
        }
      } else {
        // Topic link suggestion
        const result = await applyTopicLink({ topicId, link: suggestion });
        if (result.success && onApplied) {
          onApplied(suggestion);
        }
      }
    },
    [topicId, applyTag, applyTopicLink, onApplied],
  );

  /**
   * Handle dismissing a suggestion
   */
  const handleDismiss = useCallback(
    (suggestion: string | TopicLink) => {
      if (typeof suggestion === 'string') {
        // Tag suggestion
        dismissTag(suggestion);
      } else {
        // Topic link suggestion
        dismissTopicLink(suggestion);
      }

      if (onDismissed) {
        onDismissed(suggestion);
      }
    },
    [dismissTag, dismissTopicLink, onDismissed],
  );

  // Filter out applied and dismissed tag suggestions
  const filteredTagSuggestions: TagSuggestionsResponse | undefined = tagSuggestions
    ? {
        ...tagSuggestions,
        suggestions: tagSuggestions.suggestions.filter(
          (tag) => !isTagApplied(tag) && !isTagDismissed(tag),
        ),
      }
    : undefined;

  // Filter out applied and dismissed topic link suggestions
  const filteredTopicLinkSuggestions: TopicLinkSuggestionsResponse | undefined =
    topicLinkSuggestions
      ? {
          ...topicLinkSuggestions,
          linkSuggestions: topicLinkSuggestions.linkSuggestions.filter(
            (link) => !isTopicLinkApplied(link) && !isTopicLinkDismissed(link),
          ),
        }
      : undefined;

  return (
    <div className={className}>
      {/* Error display */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {isApplying && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">Applying suggestion...</p>
        </div>
      )}

      {/* Suggestion cards with actions */}
      <SuggestionCards
        type={type}
        {...(filteredTagSuggestions && { tagSuggestions: filteredTagSuggestions })}
        {...(filteredTopicLinkSuggestions && {
          topicLinkSuggestions: filteredTopicLinkSuggestions,
        })}
        {...(title && { title })}
        onAccept={handleAccept}
        onDismiss={handleDismiss}
        showActions={true}
        showEmptyState={showEmptyState}
        {...(emptyStateMessage && { emptyStateMessage })}
      />
    </div>
  );
};

export default SuggestionPanel;
