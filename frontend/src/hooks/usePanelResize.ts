/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for drag-to-resize panel functionality
 * @param panel - Which panel to resize ('left' or 'right')
 * @param initialWidth - Initial width in pixels
 * @returns Width, resizing state, and mouse down handler
 */
export function usePanelResize(panel: 'left' | 'right', initialWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth: number;

      if (panel === 'left') {
        // Left panel: resize based on distance from left edge
        newWidth = Math.max(240, Math.min(480, e.clientX));
      } else {
        // Right panel: resize based on distance from right edge
        newWidth = Math.max(280, Math.min(600, window.innerWidth - e.clientX));
      }

      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Add cursor style to body during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, panel]);

  return { width, isResizing, handleMouseDown };
}
