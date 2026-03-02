/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/**
 * Props for the Tooltip component
 */
export interface TooltipProps {
  /**
   * The element that triggers the tooltip on hover/focus
   */
  children: React.ReactNode;

  /**
   * The content to display in the tooltip
   * Can be a string or React elements for rich content
   */
  content: React.ReactNode;

  /**
   * Preferred side of the trigger to render the tooltip
   * @default 'top'
   */
  side?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Alignment of the tooltip relative to the trigger
   * @default 'center'
   */
  align?: 'start' | 'center' | 'end';

  /**
   * Duration in milliseconds before the tooltip opens
   * @default 300
   */
  delayDuration?: number;

  /**
   * Duration in milliseconds before the tooltip closes after leaving
   * @default 0
   */
  skipDelayDuration?: number;

  /**
   * Whether the tooltip should stay open when hovering over it
   * @default false
   */
  disableHoverableContent?: boolean;

  /**
   * Whether the tooltip is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes for the tooltip content
   */
  className?: string;

  /**
   * The offset from the trigger element in pixels
   * @default 5
   */
  sideOffset?: number;

  /**
   * Whether to render an arrow pointing to the trigger
   * @default true
   */
  showArrow?: boolean;
}

/**
 * Tooltip Component
 *
 * A styled tooltip using Radix UI Tooltip primitives for accessible,
 * customizable hover/focus tooltips with proper ARIA attributes.
 *
 * @remarks
 * - **Accessible**: Uses Radix UI which handles all ARIA attributes automatically
 * - **Keyboard Support**: Shows on focus, hides on Escape
 * - **Configurable Delay**: 300ms default delay prevents accidental triggers
 * - **Dark Mode**: Full Tailwind dark mode support
 * - **Rich Content**: Supports text or React elements as content
 * - **Positioning**: Auto-repositions to stay in viewport
 *
 * @example
 * ```tsx
 * // Simple text tooltip
 * <Tooltip content="Save changes">
 *   <button>Save</button>
 * </Tooltip>
 *
 * // With custom positioning
 * <Tooltip content="More options" side="right" align="start">
 *   <IconButton>...</IconButton>
 * </Tooltip>
 *
 * // Rich content tooltip
 * <Tooltip content={
 *   <div>
 *     <strong>Trust Score</strong>
 *     <p>Calculated from Ability, Benevolence, and Integrity</p>
 *   </div>
 * }>
 *   <Badge>85%</Badge>
 * </Tooltip>
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  skipDelayDuration = 0,
  disableHoverableContent = false,
  disabled = false,
  className = '',
  sideOffset = 5,
  showArrow = true,
}) => {
  // Don't wrap if tooltip is disabled or content is empty
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={`
              z-50 overflow-hidden
              rounded-md px-3 py-1.5
              text-sm text-white
              bg-gray-900 dark:bg-gray-700
              shadow-lg
              animate-in fade-in-0 zoom-in-95
              data-[state=closed]:animate-out
              data-[state=closed]:fade-out-0
              data-[state=closed]:zoom-out-95
              data-[side=bottom]:slide-in-from-top-2
              data-[side=left]:slide-in-from-right-2
              data-[side=right]:slide-in-from-left-2
              data-[side=top]:slide-in-from-bottom-2
              max-w-xs
              ${className}
            `}
          >
            {content}
            {showArrow && <TooltipPrimitive.Arrow className="fill-gray-900 dark:fill-gray-700" />}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export default Tooltip;
