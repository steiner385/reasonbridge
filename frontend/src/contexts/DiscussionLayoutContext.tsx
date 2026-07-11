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
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_PANEL_STATE: PanelState = {
  leftPanelWidth: 300,
  rightPanelWidth: 360,
  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  activeTopic: null,
};

/** Metadata panel tab types (imported from MetadataPanel for type safety) */
export type MetadataPanelTab = 'propositions' | 'commonGround' | 'bridging' | 'preview' | 'info';

/**
 * Context value interface with state and actions
 */
interface DiscussionLayoutContextValue {
  panelState: PanelState;
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  togglePanel: (panel: 'left' | 'right') => void;
  setActiveTopic: (topicId: string | null) => void;
  /**
   * Whether a left (topic-navigation) panel actually exists in this layout instance.
   * False when the layout is rendered with `hideSidebar` and no `leftPanel` (e.g. the
   * discussion page, where the unified sidebar owns navigation). Consumers use this to
   * avoid rendering a hamburger/overlay control that toggles a non-existent panel (#1376).
   */
  hasLeftPanel?: boolean;
  /** Whether left panel overlay is open (tablet/mobile only) */
  isLeftPanelOverlayOpen?: boolean;
  /** Toggle left panel overlay (tablet/mobile only) */
  toggleLeftPanelOverlay?: () => void;
  /** Close left panel overlay (tablet/mobile only) */
  closeLeftPanelOverlay?: () => void;
  /** Expand right panel to a specific tab */
  expandRightPanelToTab?: (tab: MetadataPanelTab) => void;
  /** Currently requested tab to expand to (used for cross-component communication) */
  requestedTab?: MetadataPanelTab | null;
  /** Clear the requested tab after it's been handled */
  clearRequestedTab?: () => void;
}

/**
 * Discussion layout context for managing three-panel UI state
 */
const DiscussionLayoutContext = createContext<DiscussionLayoutContextValue | null>(null);

/**
 * Hook to access discussion layout context
 * @throws Error if used outside DiscussionLayoutProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDiscussionLayout(): DiscussionLayoutContextValue {
  const context = useContext(DiscussionLayoutContext);
  if (!context) {
    throw new Error('useDiscussionLayout must be used within DiscussionLayoutProvider');
  }
  return context;
}

/**
 * Safe hook to access discussion layout context (returns null if not in provider)
 * Use this in components that may be rendered outside the DiscussionLayoutProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDiscussionLayoutSafe(): DiscussionLayoutContextValue | null {
  return useContext(DiscussionLayoutContext);
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
