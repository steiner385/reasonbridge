/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSwipeable } from 'react-swipeable';
import { DiscussionLayoutProvider } from '../../contexts/DiscussionLayoutContext';
import { usePanelState } from '../../hooks/usePanelState';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import '../../styles/discussion-layout.css';

/**
 * DiscussionLayout props
 */
interface DiscussionLayoutProps {
  leftPanel?: ReactNode;
  centerPanel?: ReactNode;
  rightPanel?: ReactNode;
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
export function DiscussionLayout({ leftPanel, centerPanel, rightPanel }: DiscussionLayoutProps) {
  const { panelState, setPanelWidth, togglePanel, setActiveTopic } = usePanelState();
  const breakpoint = useBreakpoint();
  const [isLeftPanelOverlayOpen, setIsLeftPanelOverlayOpen] = useState(false);

  // Close overlay when breakpoint changes to desktop
  useEffect(() => {
    if (breakpoint === 'desktop') {
      setIsLeftPanelOverlayOpen(false);
    }
  }, [breakpoint]);

  const handleToggleLeftPanelOverlay = () => {
    setIsLeftPanelOverlayOpen((prev) => !prev);
  };

  const handleCloseLeftPanelOverlay = () => {
    setIsLeftPanelOverlayOpen(false);
  };

  // Swipe gesture handlers (mobile/tablet only)
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if ((breakpoint === 'tablet' || breakpoint === 'mobile') && !isLeftPanelOverlayOpen) {
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

  const contextValue = {
    panelState,
    setPanelWidth,
    togglePanel,
    setActiveTopic,
    isLeftPanelOverlayOpen,
    toggleLeftPanelOverlay: handleToggleLeftPanelOverlay,
    closeLeftPanelOverlay: handleCloseLeftPanelOverlay,
  };

  const showBackdrop =
    (breakpoint === 'tablet' || breakpoint === 'mobile') && isLeftPanelOverlayOpen;

  return (
    <DiscussionLayoutProvider value={contextValue}>
      <div
        {...swipeHandlers}
        className="discussion-layout"
        data-testid="discussion-layout"
        data-breakpoint={breakpoint}
        style={
          {
            '--left-panel-width': `${panelState.leftPanelWidth}px`,
            '--right-panel-width': `${panelState.rightPanelWidth}px`,
          } as React.CSSProperties
        }
      >
        {/* Backdrop overlay for tablet/mobile when left panel is open */}
        {showBackdrop && (
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

        {/* Left Panel - Topic Navigation */}
        <aside
          className={`discussion-layout__panel discussion-layout__panel--left ${
            panelState.isLeftPanelCollapsed ? 'discussion-layout__panel--collapsed' : ''
          } ${isLeftPanelOverlayOpen ? 'discussion-layout__panel--overlay-open' : ''}`}
          role="navigation"
          aria-label="Topic navigation"
        >
          {leftPanel}
        </aside>

        {/* Center Panel - Conversation */}
        <main
          className="discussion-layout__panel discussion-layout__panel--center"
          role="main"
          aria-label="Discussion conversation"
        >
          {centerPanel}
        </main>

        {/* Right Panel - Metadata */}
        <aside
          className={`discussion-layout__panel discussion-layout__panel--right ${
            panelState.isRightPanelCollapsed ? 'discussion-layout__panel--collapsed' : ''
          }`}
          role="complementary"
          aria-label="Discussion metadata and analysis"
        >
          {rightPanel}
        </aside>
      </div>
    </DiscussionLayoutProvider>
  );
}
