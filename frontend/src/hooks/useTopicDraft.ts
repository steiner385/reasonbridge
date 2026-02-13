/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Draft Auto-Save Hook
 * Feature 016: Topic Management - T231
 *
 * Provides auto-save functionality for topic creation with:
 * - Debounced saves to localStorage
 * - Save status indicators
 * - Draft recovery on modal reopen
 * - Configurable storage key and save interval
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

const DEFAULT_STORAGE_KEY = 'topic-draft';
const DEFAULT_DEBOUNCE_DELAY = 800; // ms
const DEFAULT_MIN_CONTENT_LENGTH = 10; // chars before saving

/**
 * Topic draft data structure
 */
export interface TopicDraftData {
  title: string;
  description: string;
  tags: string[];
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  evidenceStandards: 'MINIMAL' | 'STANDARD' | 'RIGOROUS';
  isMatureContent: boolean;
}

/**
 * Save status for UI indicators
 */
export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Hook options
 */
export interface UseTopicDraftOptions {
  /** localStorage key for the draft (default: 'topic-draft') */
  storageKey?: string;
  /** Debounce delay in ms before auto-save (default: 800) */
  debounceDelay?: number;
  /** Minimum content length before saving (default: 10) */
  minContentLength?: number;
  /** Callback when draft is restored */
  onDraftRestored?: (draft: TopicDraftData) => void;
}

/**
 * Hook return value
 */
export interface UseTopicDraftReturn {
  /** Whether there's a saved draft available */
  hasDraft: boolean;
  /** Current save status for UI indicators */
  saveStatus: DraftSaveStatus;
  /** Last save timestamp */
  lastSavedAt: Date | null;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Update the draft data (triggers debounced save) */
  updateDraft: (data: Partial<TopicDraftData>) => void;
  /** Get the current draft data */
  getDraft: () => TopicDraftData | null;
  /** Clear the draft from storage */
  clearDraft: () => void;
  /** Force an immediate save */
  saveDraftNow: () => void;
  /** Restore draft and return the data */
  restoreDraft: () => TopicDraftData | null;
}

/**
 * Initial empty draft data
 */
export const EMPTY_DRAFT: TopicDraftData = {
  title: '',
  description: '',
  tags: [],
  visibility: 'PUBLIC',
  evidenceStandards: 'STANDARD',
  isMatureContent: false,
};

/**
 * Custom hook for topic draft auto-save functionality
 *
 * @param options - Configuration options
 * @returns Draft state and actions
 *
 * @example
 * ```tsx
 * const {
 *   saveStatus,
 *   lastSavedAt,
 *   updateDraft,
 *   clearDraft,
 *   restoreDraft
 * } = useTopicDraft({
 *   storageKey: 'create-topic-draft',
 *   onDraftRestored: (draft) => setFormData(draft)
 * });
 *
 * // Update draft on form changes
 * useEffect(() => {
 *   updateDraft({ title, description, tags });
 * }, [title, description, tags, updateDraft]);
 *
 * // Show save indicator
 * {saveStatus === 'saving' && <span>Saving...</span>}
 * {saveStatus === 'saved' && <span>Saved at {formatTime(lastSavedAt)}</span>}
 * ```
 */
export function useTopicDraft(options: UseTopicDraftOptions = {}): UseTopicDraftReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    minContentLength = DEFAULT_MIN_CONTENT_LENGTH,
    onDraftRestored,
  } = options;

  // Internal draft state
  const [draftData, setDraftData] = useState<TopicDraftData>(EMPTY_DRAFT);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track if draft exists in storage (lazy initialization)
  const [hasDraft, setHasDraft] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });

  // Ref to track initial mount
  const isInitialMount = useRef(true);

  // Debounce draft data for auto-save
  const debouncedDraft = useDebounce(draftData, debounceDelay);

  // Auto-save when debounced draft changes
  // Note: setState in effect is intentional for auto-save status updates
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return undefined;
    }

    // Check if there's enough content to save
    const hasEnoughContent =
      debouncedDraft.title.length >= minContentLength ||
      debouncedDraft.description.length >= minContentLength;

    if (!hasEnoughContent) {
      return undefined;
    }

    // Perform save
    setSaveStatus('saving');

    try {
      const saveData = {
        ...debouncedDraft,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      setLastSavedAt(new Date());
      setHasDraft(true);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');

      // Reset to idle after 2 seconds
      const timeoutId = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.warn('Failed to save topic draft:', error);
      setSaveStatus('error');
      return undefined;
    }
  }, [debouncedDraft, storageKey, minContentLength]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Update draft data (triggers debounced save)
   */
  const updateDraft = useCallback((data: Partial<TopicDraftData>) => {
    setDraftData((prev) => ({ ...prev, ...data }));
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Get current draft from storage
   */
  const getDraft = useCallback((): TopicDraftData | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { savedAt, ...draftFields } = parsed;
        return { ...EMPTY_DRAFT, ...draftFields };
      }
    } catch (error) {
      console.warn('Failed to get topic draft:', error);
    }
    return null;
  }, [storageKey]);

  /**
   * Clear draft from storage
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setDraftData(EMPTY_DRAFT);
      setHasDraft(false);
      setHasUnsavedChanges(false);
      setLastSavedAt(null);
      setSaveStatus('idle');
    } catch (error) {
      console.warn('Failed to clear topic draft:', error);
    }
  }, [storageKey]);

  /**
   * Force immediate save
   */
  const saveDraftNow = useCallback(() => {
    const hasEnoughContent =
      draftData.title.length >= minContentLength ||
      draftData.description.length >= minContentLength;

    if (!hasEnoughContent) {
      return;
    }

    setSaveStatus('saving');

    try {
      const saveData = {
        ...draftData,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      setLastSavedAt(new Date());
      setHasDraft(true);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.warn('Failed to save topic draft:', error);
      setSaveStatus('error');
    }
  }, [draftData, storageKey, minContentLength]);

  /**
   * Restore draft from storage
   */
  const restoreDraft = useCallback((): TopicDraftData | null => {
    const draft = getDraft();
    if (draft) {
      setDraftData(draft);
      onDraftRestored?.(draft);
    }
    return draft;
  }, [getDraft, onDraftRestored]);

  return {
    hasDraft,
    saveStatus,
    lastSavedAt,
    hasUnsavedChanges,
    updateDraft,
    getDraft,
    clearDraft,
    saveDraftNow,
    restoreDraft,
  };
}
