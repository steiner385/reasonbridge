/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSwipeable } from 'react-swipeable';
import { DiscussionLayoutProvider } from '../../contexts/DiscussionLayoutContext';
import { usePanelState } from '../../hooks/usePanelState';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { CollapsedMetadataBar } from './CollapsedMetadataBar';
import '../../styles/discussion-layout.css';

/**
 * DiscussionLayout props
 */
interface DiscussionLayoutProps {
  leftPanel?: ReactNode;
  centerPanel?: ReactNode;
  rightPanel?: ReactNode;
  /**
   * When true, hides the left panel and uses 2-panel mode.
   * Use this when the unified sidebar already provides topic navigation.
   */
  hideSidebar?: boolean;
  /**
   * Whether user is currently composing (shows Preview icon in collapsed bar)
   */
  isComposing?: boolean;
  /**
   * Currently active metadata tab (for collapsed bar highlighting)
   */
  activeMetadataTab?: 'propositions' | 'commonGround' | 'bridging' | 'preview' | 'info';
}

/**
 * Responsive three-panel layout container for discussion interface
 *
 * @remarks
 * This component provides the foundational layout structure with adaptive behavior across devices:
 *
 * **Desktop (≥1280px)**:
 * - All three panels visible simultaneously in grid layout
 * - Left panel: 320px fixed width (topics)
 * - Center panel: Flexible, fills remaining space (conversation)
 * - Right panel: 360px fixed width (metadata/analysis)
 *
 * **Tablet (768px - 1279px)**:
 * - Center and right panels visible
 * - Left panel becomes slide-in overlay (triggered by hamburger menu)
 * - Backdrop overlay with Escape key and click-outside support
 * - Swipe gestures for panel control
 *
 * **Mobile (<768px)**:
 * - Only center panel visible by default
 * - Left panel as slide-in overlay (same as tablet)
 * - Right panel content moved to accordion sections within center panel
 * - 44px minimum touch targets for WCAG 2.1 AA compliance
 *
 * **Key Features**:
 * - Touch gesture support via react-swipeable (swipe right to open left panel)
 * - Automatic overlay close on breakpoint change to desktop
 * - Context provider for panel state management across child components
 * - CSS custom properties for dynamic panel widths
 *
 * @param props - Component props
 * @param props.leftPanel - Content for left panel (typically TopicNavigationPanel)
 * @param props.centerPanel - Content for center panel (typically ConversationPanel)
 * @param props.rightPanel - Content for right panel (typically MetadataPanel)
 *
 * @example
 * ```tsx
 * <DiscussionLayout
 *   leftPanel={<TopicNavigationPanel topics={topics} />}
 *   centerPanel={<ConversationPanel topic={activeTopic} />}
 *   rightPanel={<MetadataPanel topic={activeTopic} />}
 * />
 * ```
 */
export function DiscussionLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  hideSidebar = false,
  isComposing = false,
  activeMetadataTab = 'propositions',
}: DiscussionLayoutProps) {
  const {
    panelState,
    setPanelWidth,
    togglePanel,
    setActiveTopic,
    expandRightPanelToTab,
    requestedTab,
    clearRequestedTab,
  } = usePanelState();
  const breakpoint = useBreakpoint();
  const [isLeftPanelOverlayOpen, setIsLeftPanelOverlayOpen] = useState(false);

  // A left panel only exists when it isn't hidden AND content was actually provided.
  // The overlay/hamburger/swipe affordances are meaningless without it (#1376).
  const hasLeftPanel = !hideSidebar && leftPanel != null;

  // Close overlay when breakpoint changes to desktop
  useEffect(() => {
    if (breakpoint === 'desktop') {
      // Schedule state update asynchronously to avoid cascading renders
      setTimeout(() => {
        setIsLeftPanelOverlayOpen(false);
      }, 0);
    }
  }, [breakpoint]);

  const handleToggleLeftPanelOverlay = useCallback(() => {
    setIsLeftPanelOverlayOpen((prev) => !prev);
  }, []);

  const handleCloseLeftPanelOverlay = useCallback(() => {
    setIsLeftPanelOverlayOpen(false);
  }, []);

  // Swipe gesture handlers (mobile/tablet only)
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (
        hasLeftPanel &&
        (breakpoint === 'tablet' || breakpoint === 'mobile') &&
        !isLeftPanelOverlayOpen
      ) {
        setIsLeftPanelOverlayOpen(true);
      }
    },
    onSwipedLeft: () => {
      if ((breakpoint === 'tablet' || breakpoint === 'mobile') && isLeftPanelOverlayOpen) {
        setIsLeftPanelOverlayOpen(false);
      }
    },
    trackMouse: false, // Only track touch events, not mouse
    trackTouch: true,
    delta: 50, // Minimum distance for swipe detection (pixels)
  });

  // Handle expanding right panel
  const handleExpandRightPanel = useCallback(() => {
    togglePanel('right');
  }, [togglePanel]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({
      panelState,
      setPanelWidth,
      togglePanel,
      setActiveTopic,
      hasLeftPanel,
      isLeftPanelOverlayOpen,
      toggleLeftPanelOverlay: handleToggleLeftPanelOverlay,
      closeLeftPanelOverlay: handleCloseLeftPanelOverlay,
      expandRightPanelToTab,
      requestedTab,
      clearRequestedTab,
    }),
    [
      panelState,
      setPanelWidth,
      togglePanel,
      setActiveTopic,
      hasLeftPanel,
      isLeftPanelOverlayOpen,
      handleToggleLeftPanelOverlay,
      handleCloseLeftPanelOverlay,
      expandRightPanelToTab,
      requestedTab,
      clearRequestedTab,
    ],
  );

  const showBackdrop =
    (breakpoint === 'tablet' || breakpoint === 'mobile') && isLeftPanelOverlayOpen;

  // Determine panel configuration
  const panelCount = hideSidebar ? 2 : 3;

  return (
    <DiscussionLayoutProvider value={contextValue}>
      <div
        {...swipeHandlers}
        className="discussion-layout"
        data-testid="discussion-layout"
        data-breakpoint={breakpoint}
        data-panels={panelCount}
        data-right-collapsed={panelState.isRightPanelCollapsed ? 'true' : undefined}
        style={
          {
            '--left-panel-width': `${panelState.leftPanelWidth}px`,
            '--right-panel-width': `${panelState.rightPanelWidth}px`,
          } as React.CSSProperties
        }
      >
        {/* Backdrop overlay for tablet/mobile when left panel is open */}
        {showBackdrop && !hideSidebar && (
          <div
            className="discussion-layout__backdrop"
            onClick={handleCloseLeftPanelOverlay}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCloseLeftPanelOverlay();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close navigation panel"
          />
        )}

        {/* Left Panel - Topic Navigation (hidden when hideSidebar is true) */}
        {!hideSidebar && (
          <aside
            className={`discussion-layout__panel discussion-layout__panel--left ${
              panelState.isLeftPanelCollapsed ? 'discussion-layout__panel--collapsed' : ''
            } ${isLeftPanelOverlayOpen ? 'discussion-layout__panel--overlay-open' : ''}`}
            role="navigation"
            aria-label="Topic navigation"
          >
            {leftPanel}
          </aside>
        )}

        {/* Center Panel - Conversation */}
        <main
          className="discussion-layout__panel discussion-layout__panel--center"
          role="main"
          aria-label="Discussion conversation"
        >
          {centerPanel}
        </main>

        {/* Right Panel - Metadata (or Collapsed Bar) */}
        {panelState.isRightPanelCollapsed && breakpoint === 'desktop' ? (
          <aside
            className="discussion-layout__panel discussion-layout__panel--right discussion-layout__panel--collapsed-bar"
            role="complementary"
            aria-label="Discussion metadata shortcuts"
          >
            <CollapsedMetadataBar
              onExpandToTab={expandRightPanelToTab}
              onExpand={handleExpandRightPanel}
              isComposing={isComposing}
              activeTab={activeMetadataTab}
            />
          </aside>
        ) : (
          <aside
            className={`discussion-layout__panel discussion-layout__panel--right ${
              panelState.isRightPanelCollapsed ? 'discussion-layout__panel--collapsed' : ''
            }`}
            role="complementary"
            aria-label="Discussion metadata and analysis"
          >
            {rightPanel}
          </aside>
        )}
      </div>
    </DiscussionLayoutProvider>
  );
}
