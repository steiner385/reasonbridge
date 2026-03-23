/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FactCheckContext - Manages per-response fact-check state
 *
 * @remarks
 * This context provides state management for fact-checking across all responses
 * in a discussion. It uses a Map<responseId, state> pattern to cache results
 * per-response, enabling efficient lookups and independent state management
 * for each response.
 *
 * **Key Features:**
 * - Per-response fact-check state management
 * - Automatic claim extraction and API calls
 * - Caching of results with timestamps
 * - Error handling and loading states
 *
 * **Usage:**
 * - Wrap DiscussionPage with FactCheckProvider
 * - Use useFactCheck hook in ResponseCard components
 *
 * @example
 * ```tsx
 * // In DiscussionPage
 * <FactCheckProvider>
 *   <DiscussionContent />
 * </FactCheckProvider>
 *
 * // In ResponseCard
 * const { status, results, checkClaims } = useFactCheck(responseId);
 * ```
 */

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import type { FactCheckResult, FactCheckStatus, Claim } from '../types/factCheck';
import { factCheckService } from '../services/factCheckService';

interface FactCheckState {
  status: FactCheckStatus;
  results: FactCheckResult[] | null;
  error: string | null;
  checkedAt: number | null;
}

interface FactCheckContextValue {
  getState: (responseId: string) => FactCheckState;
  checkClaims: (responseId: string, content: string) => Promise<void>;
  clearResults: (responseId: string) => void;
  getHighlightedClaims: (responseId: string) => Claim[] | null;
}

const defaultState: FactCheckState = {
  status: 'idle',
  results: null,
  error: null,
  checkedAt: null,
};

const FactCheckContext = createContext<FactCheckContextValue | null>(null);

export function FactCheckProvider({ children }: { children: React.ReactNode }) {
  const [stateMap, setStateMap] = useState<Map<string, FactCheckState>>(new Map());

  const getState = useCallback(
    (responseId: string): FactCheckState => {
      return stateMap.get(responseId) || defaultState;
    },
    [stateMap],
  );

  const updateState = useCallback((responseId: string, updates: Partial<FactCheckState>) => {
    setStateMap((prev) => {
      const newMap = new Map(prev);
      const current = prev.get(responseId) || defaultState;
      newMap.set(responseId, { ...current, ...updates });
      return newMap;
    });
  }, []);

  const checkClaims = useCallback(
    async (responseId: string, content: string) => {
      updateState(responseId, { status: 'loading', error: null });

      try {
        const claims = factCheckService.extractClaims(content);

        if (claims.length === 0) {
          updateState(responseId, {
            status: 'no-results',
            results: [],
            checkedAt: Date.now(),
          });
          return;
        }

        const response = await factCheckService.checkClaims(responseId, claims);

        updateState(responseId, {
          status: response.results.length > 0 ? 'success' : 'no-results',
          results: response.results,
          checkedAt: Date.now(),
        });
      } catch (err) {
        updateState(responseId, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to check claims',
        });
      }
    },
    [updateState],
  );

  const clearResults = useCallback((responseId: string) => {
    setStateMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(responseId);
      return newMap;
    });
  }, []);

  const getHighlightedClaims = useCallback(
    (responseId: string): Claim[] | null => {
      const state = stateMap.get(responseId);
      if (!state?.results || state.results.length === 0) return null;

      return state.results
        .filter((r) => r.claimStartOffset !== undefined && r.claimEndOffset !== undefined)
        .map((r) => ({
          text: r.claimText,
          startOffset: r.claimStartOffset!,
          endOffset: r.claimEndOffset!,
        }));
    },
    [stateMap],
  );

  const value = useMemo(
    () => ({ getState, checkClaims, clearResults, getHighlightedClaims }),
    [getState, checkClaims, clearResults, getHighlightedClaims],
  );

  return <FactCheckContext.Provider value={value}>{children}</FactCheckContext.Provider>;
}

/**
 * Hook to access fact-check state and actions for a specific response
 *
 * @param responseId - The response ID to get fact-check state for
 * @returns Object with status, results, error, claims, and action functions
 * @throws Error if used outside of FactCheckProvider
 *
 * @example
 * ```tsx
 * const { status, results, checkClaims } = useFactCheck('response-123');
 *
 * // Trigger fact-checking
 * await checkClaims(responseContent);
 *
 * // Check status
 * if (status === 'success') {
 *   // Render results
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFactCheck(responseId: string) {
  const context = useContext(FactCheckContext);
  if (!context) {
    throw new Error('useFactCheck must be used within a FactCheckProvider');
  }

  const state = context.getState(responseId);
  const claims = context.getHighlightedClaims(responseId);

  return {
    status: state.status,
    results: state.results,
    error: state.error,
    claims,
    checkClaims: (content: string) => context.checkClaims(responseId, content),
    clear: () => context.clearResults(responseId),
  };
}
