/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

export interface MobileActionBarProps {
  /**
   * The action button(s) to display in the bar
   */
  children: ReactNode;

  /**
   * Whether to show the action bar (defaults to showing only on mobile)
   */
  show?: boolean;

  /**
   * Custom CSS class name for the bar wrapper
   */
  className?: string;
}

/**
 * MobileActionBar - Fixed bottom action bar for mobile devices
 *
 * Provides a persistent, accessible action bar at the bottom of the screen
 * for primary CTAs on mobile devices. Automatically hidden on desktop.
 *
 * Features:
 * - Fixed to bottom of viewport on mobile (<768px)
 * - Safe area support for notched devices
 * - Dark mode styling
 * - Smooth slide-up animation
 * - Backdrop gradient for content separation
 */
function MobileActionBar({ children, show = true, className = '' }: MobileActionBarProps) {
  if (!show) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        md:hidden
        ${className}
      `}
    >
      {/* Gradient backdrop to separate from content */}
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />

      {/* Action bar container */}
      <div
        className="
          bg-white dark:bg-gray-900
          border-t border-gray-200 dark:border-gray-700
          px-4 py-3
          shadow-lg
          transition-transform duration-200 ease-out
        "
        style={{
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex gap-3">{children}</div>
      </div>
    </div>
  );
}

export default MobileActionBar;
