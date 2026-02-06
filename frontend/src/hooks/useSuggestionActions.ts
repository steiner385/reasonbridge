/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import type { TopicLink } from '../types/suggestions';

export interface ApplyTagOptions {
  topicId: string;
  tag: string;
}

export interface ApplyTopicLinkOptions {
  topicId: string;
  link: TopicLink;
}

export interface SuggestionActionsState {
  appliedTags: Set<string>;
  dismissedTags: Set<string>;
  appliedLinks: Set<string>;
  dismissedLinks: Set<string>;
  isApplying: boolean;
  error: string | null;
}

/**
 * Custom hook for managing suggestion accept/dismiss actions
 *
 * This hook provides functionality to:
 * - Accept tag suggestions (adding them to a topic)
 * - Accept topic link suggestions (creating topic relationships)
 * - Dismiss suggestions
 * - Track applied and dismissed suggestions
 */
export function useSuggestionActions() {
  const [state, setState] = useState<SuggestionActionsState>({
    appliedTags: new Set(),
    dismissedTags: new Set(),
    appliedLinks: new Set(),
    dismissedLinks: new Set(),
    isApplying: false,
    error: null,
  });

  /**
   * Apply a tag suggestion to a topic
   */
  const applyTag = useCallback(async (options: ApplyTagOptions) => {
    setState((prev) => ({ ...prev, isApplying: true, error: null }));

    try {
      // TODO: Call backend API to add tag to topic
      // For now, this is a stub that simulates the API call
      // Future implementation will call:
      // await apiClient.post(`/topics/${options.topicId}/tags`, { tag: options.tag, source: 'AI_SUGGESTED' })

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      setState((prev) => ({
        ...prev,
        appliedTags: new Set([...prev.appliedTags, options.tag]),
        isApplying: false,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply tag';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isApplying: false,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Apply a topic link suggestion
   */
  const applyTopicLink = useCallback(async (options: ApplyTopicLinkOptions) => {
    setState((prev) => ({ ...prev, isApplying: true, error: null }));

    try {
      // TODO: Call backend API to create topic link
      // For now, this is a stub that simulates the API call
      // Future implementation will call:
      // await apiClient.post(`/topics/${options.topicId}/links`, {
      //   targetTopicId: options.link.targetTopicId,
      //   relationshipType: options.link.relationshipType,
      //   linkSource: 'AI_SUGGESTED'
      // })

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const linkKey = `${options.link.targetTopicId}-${options.link.relationshipType}`;
      setState((prev) => ({
        ...prev,
        appliedLinks: new Set([...prev.appliedLinks, linkKey]),
        isApplying: false,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply topic link';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isApplying: false,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Dismiss a tag suggestion
   */
  const dismissTag = useCallback((tag: string) => {
    setState((prev) => ({
      ...prev,
      dismissedTags: new Set([...prev.dismissedTags, tag]),
    }));
  }, []);

  /**
   * Dismiss a topic link suggestion
   */
  const dismissTopicLink = useCallback((link: TopicLink) => {
    const linkKey = `${link.targetTopicId}-${link.relationshipType}`;
    setState((prev) => ({
      ...prev,
      dismissedLinks: new Set([...prev.dismissedLinks, linkKey]),
    }));
  }, []);

  /**
   * Check if a tag has been applied
   */
  const isTagApplied = useCallback(
    (tag: string) => {
      return state.appliedTags.has(tag);
    },
    [state.appliedTags],
  );

  /**
   * Check if a tag has been dismissed
   */
  const isTagDismissed = useCallback(
    (tag: string) => {
      return state.dismissedTags.has(tag);
    },
    [state.dismissedTags],
  );

  /**
   * Check if a topic link has been applied
   */
  const isTopicLinkApplied = useCallback(
    (link: TopicLink) => {
      const linkKey = `${link.targetTopicId}-${link.relationshipType}`;
      return state.appliedLinks.has(linkKey);
    },
    [state.appliedLinks],
  );

  /**
   * Check if a topic link has been dismissed
   */
  const isTopicLinkDismissed = useCallback(
    (link: TopicLink) => {
      const linkKey = `${link.targetTopicId}-${link.relationshipType}`;
      return state.dismissedLinks.has(linkKey);
    },
    [state.dismissedLinks],
  );

  /**
   * Reset all suggestion states
   */
  const reset = useCallback(() => {
    setState({
      appliedTags: new Set(),
      dismissedTags: new Set(),
      appliedLinks: new Set(),
      dismissedLinks: new Set(),
      isApplying: false,
      error: null,
    });
  }, []);

  return {
    // State
    ...state,

    // Actions
    applyTag,
    applyTopicLink,
    dismissTag,
    dismissTopicLink,

    // Queries
    isTagApplied,
    isTagDismissed,
    isTopicLinkApplied,
    isTopicLinkDismissed,

    // Utilities
    reset,
  };
}
