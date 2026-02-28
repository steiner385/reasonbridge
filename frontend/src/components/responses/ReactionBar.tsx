/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { ReactionSummary } from '../../services/reactionService';
import EmojiPicker from './EmojiPicker';

export interface ReactionBarProps {
  /**
   * List of reaction summaries to display
   */
  reactions: ReactionSummary[];

  /**
   * Callback when a reaction is clicked (for toggle behavior)
   */
  onReactionClick: (emoji: string) => void;

  /**
   * Whether reactions are disabled (e.g., not authenticated)
   */
  disabled?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to show the emoji picker button
   */
  showPicker?: boolean;

  /**
   * Maximum number of user names to show in tooltip
   */
  maxTooltipUsers?: number;
}

/**
 * ReactionBar component for displaying and managing emoji reactions.
 *
 * @remarks
 * - **Grouped display**: Shows emoji reactions with counts
 * - **User reacted state**: Highlighted background when user has reacted
 * - **Tooltip**: Shows who reacted on hover
 * - **Emoji picker**: Add button at the end for new reactions
 * - **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes
 * - **Dark mode**: Full dark mode support
 *
 * @param props - Component props
 * @returns Rendered reaction bar
 *
 * @example
 * ```tsx
 * // Basic usage with useReactions hook
 * const { reactions, toggleReaction } = useReactions(responseId);
 *
 * <ReactionBar
 *   reactions={reactions}
 *   onReactionClick={toggleReaction}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Without picker, read-only display
 * <ReactionBar
 *   reactions={reactions}
 *   onReactionClick={() => {}}
 *   showPicker={false}
 *   disabled
 * />
 * ```
 */
const ReactionBar: React.FC<ReactionBarProps> = ({
  reactions,
  onReactionClick,
  disabled = false,
  size = 'md',
  className = '',
  showPicker = true,
  maxTooltipUsers = 5,
}) => {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

  // Size classes - all sizes maintain 44px minimum touch target
  const sizeClasses = {
    sm: {
      button: 'h-6 min-h-[44px] px-2 text-sm gap-1',
      emoji: 'text-base',
      count: 'text-xs',
    },
    md: {
      button: 'h-8 min-h-[44px] px-2.5 text-base gap-1.5',
      emoji: 'text-lg',
      count: 'text-sm',
    },
    lg: {
      button: 'h-10 px-3 text-lg gap-2',
      emoji: 'text-xl',
      count: 'text-base',
    },
  };

  const currentSize = sizeClasses[size];

  // Get tooltip text for a reaction
  const getTooltipText = (reaction: ReactionSummary): string => {
    const { users, count, userReacted } = reaction;

    if (count === 0) return '';

    // Build user name list
    const userNames = users.slice(0, maxTooltipUsers).map((u) => u.displayName);

    // Add "You" at the beginning if user reacted
    if (userReacted) {
      userNames.unshift('You');
    }

    // Calculate remaining count
    const displayedCount = userReacted ? users.length + 1 : users.length;
    const remaining = count - displayedCount;

    let text = userNames.join(', ');
    if (remaining > 0) {
      text += ` and ${remaining} other${remaining > 1 ? 's' : ''}`;
    }

    return text;
  };

  // Get selected emojis for the picker
  const selectedEmojis = reactions.filter((r) => r.userReacted).map((r) => r.emoji);

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Reaction buttons */}
      {reactions.map((reaction) => {
        const tooltipText = getTooltipText(reaction);

        return (
          <div key={reaction.emoji} className="relative group">
            <button
              onClick={() => onReactionClick(reaction.emoji)}
              disabled={disabled}
              className={`
                ${currentSize.button}
                inline-flex items-center justify-center
                rounded-full
                border
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
                disabled:opacity-40 disabled:cursor-not-allowed
                ${
                  reaction.userReacted
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              aria-label={`${reaction.emoji} reaction, ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}${reaction.userReacted ? ', you reacted' : ''}`}
              aria-pressed={reaction.userReacted}
              title={tooltipText}
            >
              <span className={currentSize.emoji} aria-hidden="true">
                {reaction.emoji}
              </span>
              <span className={`${currentSize.count} font-medium`}>{reaction.count}</span>
            </button>

            {/* Tooltip on hover */}
            {hoveredEmoji === reaction.emoji && tooltipText && (
              <div
                className="
                  absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                  px-3 py-1.5
                  bg-gray-900 dark:bg-gray-700
                  text-white text-xs
                  rounded-md shadow-lg
                  whitespace-nowrap
                  pointer-events-none
                "
                role="tooltip"
              >
                {tooltipText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
              </div>
            )}

            {/* Invisible hover area for tooltip */}
            <div
              className="absolute inset-0"
              onMouseEnter={() => setHoveredEmoji(reaction.emoji)}
              onMouseLeave={() => setHoveredEmoji(null)}
              aria-hidden="true"
            />
          </div>
        );
      })}

      {/* Add reaction button (emoji picker) */}
      {showPicker && (
        <EmojiPicker
          onSelect={onReactionClick}
          selectedEmojis={selectedEmojis}
          disabled={disabled}
          size={size}
          position="bottom"
        />
      )}
    </div>
  );
};

export default ReactionBar;
