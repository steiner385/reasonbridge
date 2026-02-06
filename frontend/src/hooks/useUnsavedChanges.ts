/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

const DRAFT_STORAGE_KEY = 'discussion-unsaved-draft';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Unsaved changes state interface
 */
export interface UnsavedChangesState {
  hasUnsavedChanges: boolean;
  draftContent: string;
  draftTopicId: string | null;
  lastSavedAt: Date | null;
}

/**
 * Custom hook for tracking unsaved response drafts
 * @param topicId - Current topic ID
 * @returns Unsaved changes state and actions
 */
export function useUnsavedChanges(topicId: string | null) {
  const [state, setState] = useState<UnsavedChangesState>(() => {
    // Load draft from localStorage on mount
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if it's for the same topic
        if (parsed.draftTopicId === topicId && parsed.draftContent) {
          return {
            hasUnsavedChanges: parsed.draftContent.length >= 10,
            draftContent: parsed.draftContent,
            draftTopicId: parsed.draftTopicId,
            lastSavedAt: parsed.lastSavedAt ? new Date(parsed.lastSavedAt) : null,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load draft from localStorage:', error);
    }

    return {
      hasUnsavedChanges: false,
      draftContent: '',
      draftTopicId: topicId,
      lastSavedAt: null,
    };
  });

  /**
   * Update draft content
   */
  const setDraftContent = useCallback(
    (content: string) => {
      setState((prev) => ({
        ...prev,
        draftContent: content,
        hasUnsavedChanges: content.length >= 10,
        draftTopicId: topicId,
      }));
    },
    [topicId],
  );

  /**
   * Clear draft
   */
  const clearDraft = useCallback(() => {
    setState({
      hasUnsavedChanges: false,
      draftContent: '',
      draftTopicId: null,
      lastSavedAt: null,
    });
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear draft from localStorage:', error);
    }
  }, []);

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback(() => {
    if (state.draftContent.length >= 10) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            draftContent: state.draftContent,
            draftTopicId: topicId,
            lastSavedAt: new Date().toISOString(),
          }),
        );
        setState((prev) => ({ ...prev, lastSavedAt: new Date() }));
      } catch (error) {
        console.warn('Failed to save draft to localStorage:', error);
      }
    }
  }, [state.draftContent, topicId]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!state.hasUnsavedChanges) return;

    const intervalId = setInterval(saveDraft, AUTO_SAVE_INTERVAL);
    return () => clearInterval(intervalId);
  }, [state.hasUnsavedChanges, saveDraft]);

  // Clear draft if topic changes
  useEffect(() => {
    if (topicId !== state.draftTopicId && state.hasUnsavedChanges) {
      // Don't auto-clear - let the user decide via confirmation dialog
      // Topic changed with unsaved draft - confirmation needed
    }
  }, [topicId, state.draftTopicId, state.hasUnsavedChanges]);

  return {
    ...state,
    setDraftContent,
    clearDraft,
    saveDraft,
  };
}
