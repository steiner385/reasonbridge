/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Panel state interface for managing three-panel layout
 */
export interface PanelState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  activeTopic: string | null;
}

/**
 * Default panel state configuration
 */
export const DEFAULT_PANEL_STATE: PanelState = {
  leftPanelWidth: 300,
  rightPanelWidth: 360,
  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  activeTopic: null,
};

/**
 * Context value interface with state and actions
 */
interface DiscussionLayoutContextValue {
  panelState: PanelState;
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  togglePanel: (panel: 'left' | 'right') => void;
  setActiveTopic: (topicId: string | null) => void;
  /** Whether left panel overlay is open (tablet/mobile only) */
  isLeftPanelOverlayOpen?: boolean;
  /** Toggle left panel overlay (tablet/mobile only) */
  toggleLeftPanelOverlay?: () => void;
  /** Close left panel overlay (tablet/mobile only) */
  closeLeftPanelOverlay?: () => void;
}

/**
 * Discussion layout context for managing three-panel UI state
 */
const DiscussionLayoutContext = createContext<DiscussionLayoutContextValue | null>(null);

/**
 * Hook to access discussion layout context
 * @throws Error if used outside DiscussionLayoutProvider
 */
export function useDiscussionLayout(): DiscussionLayoutContextValue {
  const context = useContext(DiscussionLayoutContext);
  if (!context) {
    throw new Error('useDiscussionLayout must be used within DiscussionLayoutProvider');
  }
  return context;
}

/**
 * Provider props
 */
interface DiscussionLayoutProviderProps {
  children: ReactNode;
  value: DiscussionLayoutContextValue;
}

/**
 * Provider component for discussion layout context
 */
export function DiscussionLayoutProvider({ children, value }: DiscussionLayoutProviderProps) {
  return (
    <DiscussionLayoutContext.Provider value={value}>{children}</DiscussionLayoutContext.Provider>
  );
}
