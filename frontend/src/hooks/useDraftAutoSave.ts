/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Draft Auto-Save Hook
 * Feature 016: Topic Management (T231)
 *
 * A generic hook for auto-saving draft data to localStorage.
 * Provides debounced saves on change and optional interval-based saves.
 *
 * Features:
 * - Generic type support for any serializable data
 * - Debounced saves to prevent excessive writes
 * - Optional interval-based auto-save
 * - Save status tracking (idle, saving, saved, error)
 * - Draft restoration on mount
 * - Draft clearing functionality
 * - Configurable storage key namespace
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * Save status for the draft
 */
export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Configuration options for the auto-save hook
 */
export interface UseDraftAutoSaveOptions<T> {
  /**
   * Unique storage key for this draft
   */
  storageKey: string;

  /**
   * Initial data (used when no draft exists)
   */
  initialData: T;

  /**
   * Debounce delay in milliseconds for saves triggered by data changes
   * @default 1000
   */
  debounceMs?: number;

  /**
   * Optional interval in milliseconds for periodic saves
   * Set to 0 to disable interval saves
   * @default 0
   */
  intervalMs?: number;

  /**
   * Whether to restore the draft on mount
   * @default true
   */
  restoreOnMount?: boolean;

  /**
   * Optional validation function to determine if data should be saved
   * Return true to allow save, false to skip
   */
  shouldSave?: (data: T) => boolean;

  /**
   * Callback when draft is successfully saved
   */
  onSave?: (data: T) => void;

  /**
   * Callback when draft save fails
   */
  onError?: (error: Error) => void;

  /**
   * Callback when draft is restored from storage
   */
  onRestore?: (data: T) => void;
}

/**
 * Return type for the useDraftAutoSave hook
 */
export interface UseDraftAutoSaveResult<T> {
  /**
   * Current draft data
   */
  data: T;

  /**
   * Update the draft data (triggers debounced save)
   */
  setData: (data: T | ((prev: T) => T)) => void;

  /**
   * Current save status
   */
  status: DraftSaveStatus;

  /**
   * Timestamp of last successful save
   */
  lastSavedAt: Date | null;

  /**
   * Whether there are unsaved changes
   */
  hasUnsavedChanges: boolean;

  /**
   * Force an immediate save (bypasses debounce)
   */
  saveNow: () => void;

  /**
   * Clear the draft from storage and reset to initial data
   */
  clearDraft: () => void;

  /**
   * Whether a draft exists in storage (without restoring it)
   */
  hasDraft: boolean;
}

/**
 * Custom hook for auto-saving draft data to localStorage
 *
 * @param options - Configuration options
 * @returns Draft state and controls
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   setData,
 *   status,
 *   lastSavedAt,
 *   hasUnsavedChanges,
 *   saveNow,
 *   clearDraft,
 * } = useDraftAutoSave({
 *   storageKey: 'topic-wizard-draft',
 *   initialData: { title: '', description: '' },
 *   debounceMs: 1000,
 *   shouldSave: (data) => data.title.length > 0 || data.description.length > 0,
 * });
 * ```
 */
export function useDraftAutoSave<T>({
  storageKey,
  initialData,
  debounceMs = 1000,
  intervalMs = 0,
  restoreOnMount = true,
  shouldSave,
  onSave,
  onError,
  onRestore,
}: UseDraftAutoSaveOptions<T>): UseDraftAutoSaveResult<T> {
  // Check if draft exists in storage (for hasDraft indicator)
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });

  // Initialize data from storage or initial value
  const [data, setDataState] = useState<T>(() => {
    if (!restoreOnMount) {
      return initialData;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { data: T; savedAt: string };
        // Use queueMicrotask to defer the onRestore callback
        if (onRestore) {
          queueMicrotask(() => onRestore(parsed.data));
        }
        return parsed.data;
      }
    } catch (error) {
      console.warn(`Failed to restore draft from localStorage (${storageKey}):`, error);
    }
    return initialData;
  });

  const [status, setStatus] = useState<DraftSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track the last saved data to detect changes
  const lastSavedDataRef = useRef<string>(JSON.stringify(initialData));
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize the shouldSave function to prevent unnecessary re-renders
  const shouldSaveData = useMemo(() => {
    return shouldSave ?? (() => true);
  }, [shouldSave]);

  /**
   * Save data to localStorage
   */
  const saveToStorage = useCallback(
    (dataToSave: T) => {
      // Check if we should save this data
      if (!shouldSaveData(dataToSave)) {
        return;
      }

      setStatus('saving');

      try {
        const payload = {
          data: dataToSave,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));

        const now = new Date();
        setLastSavedAt(now);
        setStatus('saved');
        setHasUnsavedChanges(false);
        setHasDraft(true);
        lastSavedDataRef.current = JSON.stringify(dataToSave);

        onSave?.(dataToSave);

        // Reset status to idle after a brief period
        setTimeout(() => {
          setStatus((current) => (current === 'saved' ? 'idle' : current));
        }, 2000);
      } catch (error) {
        console.error(`Failed to save draft to localStorage (${storageKey}):`, error);
        setStatus('error');
        onError?.(error instanceof Error ? error : new Error('Failed to save draft'));
      }
    },
    [storageKey, shouldSaveData, onSave, onError],
  );

  /**
   * Force an immediate save
   */
  const saveNow = useCallback(() => {
    // Clear any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    saveToStorage(data);
  }, [data, saveToStorage]);

  /**
   * Clear the draft from storage
   */
  const clearDraft = useCallback(() => {
    // Clear any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDataState(initialData);
      setStatus('idle');
      setLastSavedAt(null);
      setHasUnsavedChanges(false);
      lastSavedDataRef.current = JSON.stringify(initialData);
    } catch (error) {
      console.warn(`Failed to clear draft from localStorage (${storageKey}):`, error);
    }
  }, [storageKey, initialData]);

  /**
   * Update data with debounced save
   */
  const setData = useCallback(
    (newData: T | ((prev: T) => T)) => {
      setDataState((prev) => {
        const updated = typeof newData === 'function' ? (newData as (prev: T) => T)(prev) : newData;

        // Check if data has actually changed
        const updatedJson = JSON.stringify(updated);
        if (updatedJson !== lastSavedDataRef.current) {
          setHasUnsavedChanges(true);

          // Clear existing debounce timer
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          // Schedule debounced save
          debounceTimerRef.current = setTimeout(() => {
            saveToStorage(updated);
          }, debounceMs);
        }

        return updated;
      });
    },
    [debounceMs, saveToStorage],
  );

  // Interval-based auto-save
  useEffect(() => {
    if (intervalMs <= 0 || !hasUnsavedChanges) {
      return;
    }

    const intervalId = setInterval(() => {
      if (hasUnsavedChanges) {
        saveNow();
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs, hasUnsavedChanges, saveNow]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Save on page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges && shouldSaveData(data)) {
        // Synchronous save before unload
        try {
          const payload = {
            data,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {
          // Ignore errors during unload
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, data, storageKey, shouldSaveData]);

  return {
    data,
    setData,
    status,
    lastSavedAt,
    hasUnsavedChanges,
    saveNow,
    clearDraft,
    hasDraft,
  };
}

export default useDraftAutoSave;
