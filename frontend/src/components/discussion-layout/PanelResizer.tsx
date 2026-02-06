/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { usePanelResize } from '../../hooks/usePanelResize';
import { useDiscussionLayout } from '../../contexts/DiscussionLayoutContext';

/**
 * PanelResizer props
 */
interface PanelResizerProps {
  /** Which panel this resizer controls */
  panel: 'left' | 'right';
  /** CSS class name */
  className?: string;
}

/**
 * Draggable divider component for resizing panels
 */
export function PanelResizer({ panel, className = '' }: PanelResizerProps) {
  const { panelState, setPanelWidth } = useDiscussionLayout();
  const initialWidth = panel === 'left' ? panelState.leftPanelWidth : panelState.rightPanelWidth;

  const { width, isResizing, handleMouseDown } = usePanelResize(panel, initialWidth);

  // Sync width changes to context
  React.useEffect(() => {
    if (width !== initialWidth && !isResizing) {
      setPanelWidth(panel, width);
    }
  }, [width, initialWidth, isResizing, panel, setPanelWidth]);

  return (
    <div
      className={`panel-resizer panel-resizer--${panel} ${isResizing ? 'panel-resizer--active' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-label={`Resize ${panel} panel`}
      aria-orientation="vertical"
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard accessibility for resizing
        if (e.key === 'ArrowLeft' && panel === 'left') {
          setPanelWidth(panel, Math.max(240, width - 20));
          e.preventDefault();
        } else if (e.key === 'ArrowRight' && panel === 'left') {
          setPanelWidth(panel, Math.min(480, width + 20));
          e.preventDefault();
        } else if (e.key === 'ArrowLeft' && panel === 'right') {
          setPanelWidth(panel, Math.min(600, width + 20));
          e.preventDefault();
        } else if (e.key === 'ArrowRight' && panel === 'right') {
          setPanelWidth(panel, Math.max(280, width - 20));
          e.preventDefault();
        }
      }}
    >
      <div className="panel-resizer__handle" />
    </div>
  );
}
