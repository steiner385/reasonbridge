/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Quick reaction emojis available in the picker
 */
export const QUICK_REACTIONS = ['👍', '❤️', '🎉', '🤔', '👀', '🙌'] as const;

export type QuickReaction = (typeof QUICK_REACTIONS)[number];

export interface EmojiPickerProps {
  /**
   * Callback when an emoji is selected
   */
  onSelect: (emoji: string) => void;

  /**
   * List of emojis the user has already reacted with
   */
  selectedEmojis?: string[];

  /**
   * Whether the picker is disabled
   */
  disabled?: boolean;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional CSS classes for the trigger button
   */
  className?: string;

  /**
   * Position of the dropdown
   */
  position?: 'top' | 'bottom';
}

/**
 * EmojiPicker component for quick emoji reactions.
 *
 * @remarks
 * - **Quick reactions**: Pre-defined set of common emojis for fast access
 * - **Keyboard navigation**: Arrow keys to navigate, Enter to select, Escape to close
 * - **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes
 * - **Dark mode**: Full dark mode support
 * - **Selected state**: Visual indication for already-selected emojis
 *
 * @param props - Component props
 * @returns Rendered emoji picker
 *
 * @example
 * ```tsx
 * // Basic usage
 * <EmojiPicker onSelect={(emoji) => handleReaction(emoji)} />
 *
 * // With selected emojis highlighted
 * <EmojiPicker
 *   onSelect={toggleReaction}
 *   selectedEmojis={['👍', '❤️']}
 * />
 *
 * // Custom position
 * <EmojiPicker onSelect={handleSelect} position="top" />
 * ```
 */
const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelect,
  selectedEmojis = [],
  disabled = false,
  size = 'md',
  className = '',
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const emojiButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Size classes - all sizes maintain 44px minimum touch target
  const sizeClasses = {
    sm: {
      trigger: 'w-6 h-6 min-w-[44px] min-h-[44px]',
      triggerIcon: 'w-4 h-4',
      emojiButton: 'w-8 h-8 min-w-[44px] min-h-[44px] text-lg',
    },
    md: {
      trigger: 'w-8 h-8 min-w-[44px] min-h-[44px]',
      triggerIcon: 'w-5 h-5',
      emojiButton: 'w-10 h-10 text-xl',
    },
    lg: {
      trigger: 'w-10 h-10',
      triggerIcon: 'w-6 h-6',
      emojiButton: 'w-12 h-12 text-2xl',
    },
  };

  const currentSize = sizeClasses[size];

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  // Focus first emoji when picker opens
  useEffect(() => {
    if (isOpen && emojiButtonsRef.current[0]) {
      emojiButtonsRef.current[0].focus();
      // Reset focused index when opening - use setTimeout to avoid sync setState in effect
      setTimeout(() => setFocusedIndex(0), 0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;

        case 'ArrowRight':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = (prev + 1) % QUICK_REACTIONS.length;
            emojiButtonsRef.current[next]?.focus();
            return next;
          });
          break;

        case 'ArrowLeft':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = (prev - 1 + QUICK_REACTIONS.length) % QUICK_REACTIONS.length;
            emojiButtonsRef.current[next]?.focus();
            return next;
          });
          break;

        case 'ArrowDown':
          // Move to second row if present (for grid layouts)
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 3, QUICK_REACTIONS.length - 1);
            emojiButtonsRef.current[next]?.focus();
            return next;
          });
          break;

        case 'ArrowUp':
          // Move to first row if present (for grid layouts)
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = Math.max(prev - 3, 0);
            emojiButtonsRef.current[next]?.focus();
            return next;
          });
          break;

        case 'Tab':
          // Close picker on tab out
          setIsOpen(false);
          break;
      }
    },
    [isOpen],
  );

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  // Trigger button classes
  const triggerClasses = `
    ${currentSize.trigger}
    inline-flex items-center justify-center
    rounded-md
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
    disabled:opacity-40 disabled:cursor-not-allowed
    text-gray-500 dark:text-gray-400
    hover:bg-gray-100 dark:hover:bg-gray-700
    hover:text-gray-700 dark:hover:text-gray-300
    ${isOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}
    ${className}
  `;

  // Dropdown classes
  const dropdownClasses = `
    absolute z-50
    ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
    left-0
    bg-white dark:bg-gray-800
    border border-gray-200 dark:border-gray-700
    rounded-lg shadow-lg
    p-2
  `;

  return (
    <div ref={containerRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        disabled={disabled}
        className={triggerClasses}
        aria-label="Add reaction"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Add reaction"
      >
        {/* Plus/smile icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={currentSize.triggerIcon}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={dropdownClasses} role="menu" aria-label="Quick reactions">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji, index) => {
              const isSelected = selectedEmojis.includes(emoji);
              return (
                <button
                  key={emoji}
                  ref={(el) => {
                    emojiButtonsRef.current[index] = el;
                  }}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`
                    ${currentSize.emojiButton}
                    inline-flex items-center justify-center
                    rounded-md
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-primary-500
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    hover:scale-110
                    ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30 ring-1 ring-primary-500'
                        : ''
                    }
                  `}
                  role="menuitem"
                  aria-label={`React with ${emoji}${isSelected ? ' (already selected)' : ''}`}
                  tabIndex={focusedIndex === index ? 0 : -1}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
