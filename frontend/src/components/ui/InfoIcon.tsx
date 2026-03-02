/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tooltip } from './Tooltip';

/**
 * Props for the InfoIcon component
 */
export interface InfoIconProps {
  /**
   * The content to display in the tooltip
   * Can be a string or React elements for rich explanations
   */
  content: React.ReactNode;

  /**
   * Size of the info icon
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Preferred side of the icon to render the tooltip
   * @default 'top'
   */
  side?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Additional CSS classes for the icon
   */
  className?: string;

  /**
   * Label for accessibility
   * @default 'More information'
   */
  ariaLabel?: string;
}

/**
 * InfoIcon Component
 *
 * A small info icon (ℹ️) that shows explanatory content in a tooltip on hover.
 * Use this to explain complex features, algorithms, or terminology without
 * cluttering the UI.
 *
 * @remarks
 * - **Accessible**: Includes proper ARIA label and keyboard focus
 * - **Inline Placement**: Designed to sit next to labels or badges
 * - **Dark Mode**: Full Tailwind dark mode support
 * - **Rich Content**: Supports text or React elements in tooltip
 * - **Touch Support**: Works on touch devices via focus
 *
 * @example
 * ```tsx
 * // Simple text explanation
 * <div className="flex items-center gap-1">
 *   <span>Trust Score</span>
 *   <InfoIcon content="Trust is calculated from your Ability, Benevolence, and Integrity ratings" />
 * </div>
 *
 * // Rich content with formatting
 * <InfoIcon
 *   content={
 *     <div>
 *       <strong>What is Trust Score?</strong>
 *       <p className="mt-1">Your trust score is based on:</p>
 *       <ul className="list-disc list-inside mt-1">
 *         <li>Ability - Your expertise and accuracy</li>
 *         <li>Benevolence - Your helpfulness to others</li>
 *         <li>Integrity - Your consistency and honesty</li>
 *       </ul>
 *     </div>
 *   }
 *   side="right"
 * />
 * ```
 */
export const InfoIcon: React.FC<InfoIconProps> = ({
  content,
  size = 'md',
  side = 'top',
  className = '',
  ariaLabel = 'More information',
}) => {
  // Size styles
  const sizeStyles = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Tooltip content={content} side={side}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center
          text-gray-400 dark:text-gray-500
          hover:text-gray-600 dark:hover:text-gray-300
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          rounded-full
          transition-colors
          ${className}
        `}
        aria-label={ariaLabel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={sizeStyles[size]}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
      </button>
    </Tooltip>
  );
};

export default InfoIcon;
