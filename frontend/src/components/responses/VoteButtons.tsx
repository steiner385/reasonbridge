/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface VoteButtonsProps {
  /**
   * The current vote count (net upvotes - downvotes)
   */
  voteCount: number;

  /**
   * The user's current vote state ('up', 'down', or null)
   */
  userVote?: 'up' | 'down' | null;

  /**
   * Callback when user clicks upvote
   */
  onUpvote?: () => void;

  /**
   * Callback when user clicks downvote
   */
  onDownvote?: () => void;

  /**
   * Whether voting is disabled (e.g., not authenticated)
   */
  disabled?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Orientation of the vote buttons
   */
  orientation?: 'vertical' | 'horizontal';
}

const VoteButtons: React.FC<VoteButtonsProps> = ({
  voteCount,
  userVote = null,
  onUpvote,
  onDownvote,
  disabled = false,
  size = 'md',
  orientation = 'vertical',
}) => {
  // Size classes
  const sizeClasses = {
    sm: {
      button: 'w-6 h-6',
      icon: 'w-3 h-3',
      text: 'text-xs',
      gap: orientation === 'vertical' ? 'gap-0.5' : 'gap-1',
    },
    md: {
      button: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-sm',
      gap: orientation === 'vertical' ? 'gap-1' : 'gap-2',
    },
    lg: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-base',
      gap: orientation === 'vertical' ? 'gap-1.5' : 'gap-3',
    },
  };

  const currentSize = sizeClasses[size];

  // Button base styles
  const buttonBaseClasses = `
    ${currentSize.button}
    inline-flex items-center justify-center
    rounded-md
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  // Upvote button classes
  const upvoteClasses = `
    ${buttonBaseClasses}
    ${
      userVote === 'up'
        ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
        : 'text-gray-500 hover:bg-gray-100 hover:text-primary-600'
    }
  `;

  // Downvote button classes
  const downvoteClasses = `
    ${buttonBaseClasses}
    ${
      userVote === 'down'
        ? 'bg-red-100 text-red-700 hover:bg-red-200'
        : 'text-gray-500 hover:bg-gray-100 hover:text-red-600'
    }
  `;

  // Container orientation
  const containerClasses = `
    inline-flex items-center
    ${currentSize.gap}
    ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
  `;

  // Vote count color based on value
  const voteCountColor =
    voteCount > 0 ? 'text-primary-700' : voteCount < 0 ? 'text-red-700' : 'text-gray-600';

  const handleUpvote = () => {
    if (!disabled && onUpvote) {
      onUpvote();
    }
  };

  const handleDownvote = () => {
    if (!disabled && onDownvote) {
      onDownvote();
    }
  };

  return (
    <div className={containerClasses}>
      {/* Upvote Button */}
      <button
        onClick={handleUpvote}
        disabled={disabled}
        className={upvoteClasses}
        aria-label="Upvote"
        title="Upvote"
      >
        <svg
          className={currentSize.icon}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Vote Count */}
      <span
        className={`
          ${currentSize.text}
          font-semibold
          ${voteCountColor}
          min-w-[1.5rem]
          text-center
          select-none
        `}
      >
        {voteCount > 0 ? `+${voteCount}` : voteCount}
      </span>

      {/* Downvote Button */}
      <button
        onClick={handleDownvote}
        disabled={disabled}
        className={downvoteClasses}
        aria-label="Downvote"
        title="Downvote"
      >
        <svg
          className={currentSize.icon}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
};

export default VoteButtons;
