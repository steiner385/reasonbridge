/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useChildSafety } from '../../contexts/ChildSafetyContext';

export interface SafeSpaceBadgeProps {
  /** Visual variant of the badge */
  variant?: 'inline' | 'floating' | 'header';
  /** Whether to show the badge even when not in child mode (for preview) */
  forceShow?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SafeSpaceBadge - Visual indicator that the user is in a safe environment
 *
 * @remarks
 * Provides visual reassurance to child users that they are in a protected,
 * moderated space. Only visible in child-friendly mode.
 *
 * **Variants:**
 * - `inline`: Small badge for use within content areas
 * - `floating`: Positioned badge (for corners of pages)
 * - `header`: Larger badge suitable for page headers
 *
 * **Design:**
 * - Uses calming mint/teal colors
 * - Shield or checkmark icon for trust
 * - Friendly, reassuring language
 *
 * @param props - Component props
 * @returns Badge element or null if not in child mode
 *
 * @example
 * ```tsx
 * // In a page header
 * <SafeSpaceBadge variant="header" />
 *
 * // Floating in corner
 * <SafeSpaceBadge variant="floating" className="fixed bottom-4 right-4" />
 *
 * // Inline with content
 * <p>Welcome! <SafeSpaceBadge variant="inline" /></p>
 * ```
 */
export function SafeSpaceBadge({
  variant = 'inline',
  forceShow = false,
  className = '',
}: SafeSpaceBadgeProps): React.ReactElement | null {
  const { isChildMode } = useChildSafety();

  // Only show in child mode (or when forced for previews)
  if (!isChildMode && !forceShow) {
    return null;
  }

  const baseClasses = 'inline-flex items-center gap-1.5 font-medium';

  const variantClasses = {
    inline:
      'px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    floating:
      'px-3 py-1.5 text-sm rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 shadow-lg',
    header:
      'px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-800 dark:from-teal-900/30 dark:to-cyan-900/30 dark:text-teal-300',
  };

  const iconSizes = {
    inline: 'w-3 h-3',
    floating: 'w-4 h-4',
    header: 'w-5 h-5',
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      data-testid="safe-space-badge"
      role="status"
      aria-label="Safe space indicator"
    >
      {/* Shield icon */}
      <svg
        className={iconSizes[variant]}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
        />
      </svg>

      <span>{variant === 'header' ? 'You are in a Safe Space' : 'Safe Space'}</span>

      {variant === 'header' && (
        <svg
          className="w-4 h-4 text-teal-600 dark:text-teal-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
    </span>
  );
}

export default SafeSpaceBadge;
