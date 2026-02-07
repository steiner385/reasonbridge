/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import type { PanelState } from '../contexts/DiscussionLayoutContext';
import { DEFAULT_PANEL_STATE } from '../contexts/DiscussionLayoutContext';

const STORAGE_KEY = 'discussion-panel-state';

/**
 * Custom hook for managing panel state with sessionStorage persistence
 * @returns Panel state and setter functions
 */
export function usePanelState() {
  const [panelState, setPanelStateInternal] = useState<PanelState>(() => {
    // Load from sessionStorage on mount
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate parsed data
        if (
          typeof parsed.leftPanelWidth === 'number' &&
          typeof parsed.rightPanelWidth === 'number' &&
          typeof parsed.isLeftPanelCollapsed === 'boolean' &&
          typeof parsed.isRightPanelCollapsed === 'boolean'
        ) {
          return { ...DEFAULT_PANEL_STATE, ...parsed };
        }
      }
    } catch (error) {
      console.warn('Failed to load panel state from sessionStorage:', error);
    }
    return DEFAULT_PANEL_STATE;
  });

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(panelState));
    } catch (error) {
      console.warn('Failed to save panel state to sessionStorage:', error);
    }
  }, [panelState]);

  /**
   * Set panel width with validation
   */
  const setPanelWidth = useCallback((panel: 'left' | 'right', width: number) => {
    setPanelStateInternal((prev) => {
      // Validate width constraints
      let validatedWidth = width;
      if (panel === 'left') {
        validatedWidth = Math.max(240, Math.min(480, width));
      } else {
        validatedWidth = Math.max(280, Math.min(600, width));
      }

      return {
        ...prev,
        [`${panel}PanelWidth`]: validatedWidth,
      };
    });
  }, []);

  /**
   * Toggle panel collapsed state
   */
  const togglePanel = useCallback((panel: 'left' | 'right') => {
    setPanelStateInternal((prev) => ({
      ...prev,
      [`is${panel.charAt(0).toUpperCase() + panel.slice(1)}PanelCollapsed`]:
        !prev[
          `is${panel.charAt(0).toUpperCase() + panel.slice(1)}PanelCollapsed` as keyof PanelState
        ],
    }));
  }, []);

  /**
   * Set active topic
   */
  const setActiveTopic = useCallback((topicId: string | null) => {
    setPanelStateInternal((prev) => ({
      ...prev,
      activeTopic: topicId,
    }));
  }, []);

  return {
    panelState,
    setPanelWidth,
    togglePanel,
    setActiveTopic,
  };
}
