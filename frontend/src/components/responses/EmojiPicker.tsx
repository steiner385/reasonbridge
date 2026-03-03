/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from '../ui/Tooltip';

/**
 * Quick reaction emojis available in the picker
 */
// eslint-disable-next-line react-refresh/only-export-components
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
 * Default position is 'top' (opens above trigger) to prevent dropdown from
 * being clipped by subsequent content in vertically scrolling containers.
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
  position = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // Calculate dropdown position based on trigger button
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 56; // Approximate height of emoji picker
    const dropdownWidth = 280; // Approximate width of emoji picker
    const padding = 8;

    let top: number;
    let left: number;

    // Calculate vertical position
    if (position === 'top') {
      // Position above trigger
      top = rect.top - dropdownHeight - padding;
      // If it would go above viewport, flip to bottom
      if (top < padding) {
        top = rect.bottom + padding;
      }
    } else {
      // Position below trigger
      top = rect.bottom + padding;
      // If it would go below viewport, flip to top
      if (top + dropdownHeight > window.innerHeight - padding) {
        top = rect.top - dropdownHeight - padding;
      }
    }

    // Calculate horizontal position - align left edge with trigger
    left = rect.left;
    // If it would go off right edge, adjust
    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }
    // If it would go off left edge, adjust
    if (left < padding) {
      left = padding;
    }

    setDropdownPosition({ top, left });
  }, [position]);

  // Close picker when clicking outside (check both container and portal dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    // Calculate initial position on next frame to avoid sync setState in effect
    const initialPositionFrame = requestAnimationFrame(() => {
      updateDropdownPosition();
    });

    const handleScrollOrResize = () => {
      updateDropdownPosition();
    };

    // Listen for scroll on any ancestor that might scroll
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      cancelAnimationFrame(initialPositionFrame);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateDropdownPosition]);

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

  // Dropdown classes (now positioned via fixed positioning in portal)
  const dropdownClasses = `
    fixed z-[9999]
    bg-white dark:bg-gray-800
    border border-gray-200 dark:border-gray-700
    rounded-lg shadow-lg
    p-2
  `;

  return (
    <div ref={containerRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <Tooltip content="Add an emoji reaction" disabled={isOpen}>
        <button
          ref={triggerRef}
          onClick={handleTriggerClick}
          disabled={disabled}
          className={triggerClasses}
          aria-label="Add reaction"
          aria-expanded={isOpen}
          aria-haspopup="true"
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
      </Tooltip>

      {/* Dropdown Menu - rendered via portal to escape overflow clipping */}
      {isOpen &&
        dropdownPosition &&
        createPortal(
          <div
            ref={dropdownRef}
            className={dropdownClasses}
            role="menu"
            aria-label="Quick reactions"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
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
          </div>,
          document.body,
        )}
    </div>
  );
};

export default EmojiPicker;
