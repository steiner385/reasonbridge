import { useState, useCallback } from 'react';
import type { DismissFeedbackRequest } from '../types/feedback';

export interface DismissFeedbackOptions {
  feedbackId: string;
  dismissalReason?: string;
}

export interface FeedbackActionsState {
  dismissedFeedback: Set<string>;
  isDismissing: boolean;
  error: string | null;
}

/**
 * Custom hook for managing feedback actions
 *
 * This hook provides functionality to:
 * - Dismiss feedback items
 * - Track dismissed feedback
 * - Call backend API for persistent dismissal tracking
 */
export function useFeedbackActions() {
  const [state, setState] = useState<FeedbackActionsState>({
    dismissedFeedback: new Set(),
    isDismissing: false,
    error: null,
  });

  /**
   * Dismiss a feedback item
   * Calls the backend API to persist the dismissal
   */
  const dismissFeedback = useCallback(async (options: DismissFeedbackOptions) => {
    setState((prev) => ({ ...prev, isDismissing: true, error: null }));

    try {
      // Call backend API to dismiss feedback
      const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] || 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/feedback/${options.feedbackId}/dismiss`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dismissalReason: options.dismissalReason,
        } as DismissFeedbackRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss feedback: ${response.statusText}`);
      }

      // Update local state
      setState((prev) => ({
        ...prev,
        dismissedFeedback: new Set([...prev.dismissedFeedback, options.feedbackId]),
        isDismissing: false,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss feedback';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isDismissing: false,
      }));

      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Check if a feedback item has been dismissed
   */
  const isFeedbackDismissed = useCallback(
    (feedbackId: string) => {
      return state.dismissedFeedback.has(feedbackId);
    },
    [state.dismissedFeedback],
  );

  /**
   * Clear all dismissed feedback (reset state)
   */
  const clearDismissed = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dismissedFeedback: new Set(),
    }));
  }, []);

  return {
    dismissFeedback,
    isFeedbackDismissed,
    clearDismissed,
    isDismissing: state.isDismissing,
    error: state.error,
  };
}
