/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMentions } from '../../hooks/useMentions.js';
import type { MentionUser } from '../../services/mentionService.js';
import MentionDropdown from './MentionDropdown.js';

/**
 * Props for MentionInput component
 */
export interface MentionInputProps {
  /** Current textarea value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Topic ID for prioritizing participants in suggestions */
  topicId?: string;
  /** Additional CSS classes */
  className?: string;
  /** Minimum number of rows */
  minRows?: number;
  /** Maximum number of rows before scrolling */
  maxRows?: number;
  /** Unique ID for the textarea */
  id?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Maximum character limit */
  maxLength?: number;
  /** Called when the user presses Enter (without shift) */
  onSubmit?: () => void;
}

/**
 * Extract the mention query from text at a given cursor position.
 * Returns the query string after @ or null if not in a mention context.
 */
function extractMentionQuery(text: string, cursorPosition: number): string | null {
  // Look backwards from cursor to find @
  const textBeforeCursor = text.substring(0, cursorPosition);

  // Find the last @ before cursor
  const atIndex = textBeforeCursor.lastIndexOf('@');

  if (atIndex === -1) {
    return null;
  }

  // Check if @ is at start or preceded by whitespace
  const charBeforeAt = textBeforeCursor[atIndex - 1];
  if (atIndex > 0 && charBeforeAt !== undefined && !/\s/.test(charBeforeAt)) {
    return null;
  }

  // Get the text between @ and cursor
  const queryText = textBeforeCursor.substring(atIndex + 1);

  // Query should not contain spaces (mention is complete or user is typing new word)
  if (/\s/.test(queryText)) {
    return null;
  }

  return queryText;
}

/**
 * Textarea wrapper that detects @mentions and shows autocomplete suggestions.
 *
 * @remarks
 * - **Mention detection**: Automatically detects @ character and triggers search
 * - **Cursor tracking**: Shows dropdown positioned near the @ trigger
 * - **Mention format**: Inserts mentions as `@[displayName](userId)` format
 * - **Keyboard navigation**: Fully keyboard accessible (arrows, Enter, Escape)
 * - **Dark mode**: Full dark mode support via Tailwind `dark:` classes
 * - **Accessibility**: WCAG 2.1 AA compliant with proper ARIA attributes
 *
 * @param props - Component props
 * @returns Textarea with mention autocomplete functionality
 *
 * @example
 * ```tsx
 * const [content, setContent] = useState('');
 *
 * <MentionInput
 *   value={content}
 *   onChange={setContent}
 *   placeholder="Share your perspective..."
 *   topicId="topic-123"
 * />
 * ```
 */
const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  topicId,
  className = '',
  minRows = 3,
  maxRows = 10,
  id,
  ariaLabel,
  maxLength,
  onSubmit,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mention search state
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [mentionStartPosition, setMentionStartPosition] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Use the mentions hook for searching
  const { query, setQuery, users, isLoading, clear } = useMentions({
    topicId,
    debounceDelay: 300,
    limit: 5,
  });

  // Calculate dropdown position based on cursor
  const updateDropdownPosition = useCallback(() => {
    if (!textareaRef.current || mentionStartPosition === null) return;

    const textarea = textareaRef.current;

    // Create a hidden div to measure text dimensions
    const mirror = document.createElement('div');
    const styles = window.getComputedStyle(textarea);

    // Copy textarea styles to mirror
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.width = styles.width;
    mirror.style.font = styles.font;
    mirror.style.padding = styles.padding;
    mirror.style.border = styles.border;
    mirror.style.boxSizing = styles.boxSizing;
    mirror.style.lineHeight = styles.lineHeight;

    // Get text up to @ position
    const textBeforeAt = value.substring(0, mentionStartPosition);
    mirror.textContent = textBeforeAt;

    // Add a span for measuring position
    const marker = document.createElement('span');
    marker.textContent = '@';
    mirror.appendChild(marker);

    document.body.appendChild(mirror);

    // Get bounding rects
    const textareaRect = textarea.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || textareaRect;
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    // Calculate position relative to container
    const relativeLeft = markerRect.left - mirrorRect.left;
    const relativeTop = markerRect.top - mirrorRect.top + parseInt(styles.lineHeight, 10);

    // Account for scroll position
    const scrollTop = textarea.scrollTop;

    document.body.removeChild(mirror);

    setDropdownPosition({
      top: relativeTop - scrollTop + (textareaRect.top - containerRect.top),
      left: Math.min(relativeLeft, containerRect.width - 220), // Prevent overflow
    });
  }, [value, mentionStartPosition]);

  // Handle text changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;

      onChange(newValue);

      // Check for mention context
      const mentionQuery = extractMentionQuery(newValue, cursorPos);

      if (mentionQuery !== null) {
        // Find the @ position
        const textBeforeCursor = newValue.substring(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        setMentionStartPosition(atIndex);
        setQuery(mentionQuery);
        setShowDropdown(true);
        setHighlightedIndex(0);
      } else {
        setShowDropdown(false);
        setMentionStartPosition(null);
        clear();
      }
    },
    [onChange, setQuery, clear],
  );

  // Update dropdown position when showing
  useEffect(() => {
    if (showDropdown && mentionStartPosition !== null) {
      updateDropdownPosition();
    }
  }, [showDropdown, mentionStartPosition, updateDropdownPosition]);

  // Handle user selection from dropdown
  const handleSelectUser = useCallback(
    (user: MentionUser) => {
      if (mentionStartPosition === null) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      // Get current cursor position
      const cursorPos = textarea.selectionStart;

      // Build the mention string
      const mentionText = `@[${user.displayName}](${user.id})`;

      // Replace @query with mention
      const beforeMention = value.substring(0, mentionStartPosition);
      const afterMention = value.substring(cursorPos);
      const newValue = `${beforeMention}${mentionText} ${afterMention}`;

      onChange(newValue);

      // Close dropdown
      setShowDropdown(false);
      setMentionStartPosition(null);
      clear();

      // Focus textarea and set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionStartPosition + mentionText.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [value, onChange, mentionStartPosition, clear],
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showDropdown || users.length === 0) {
        // Handle submit on Enter (without shift)
        if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
          e.preventDefault();
          onSubmit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, users.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case 'Enter':
          e.preventDefault();
          if (users[highlightedIndex]) {
            handleSelectUser(users[highlightedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          setMentionStartPosition(null);
          clear();
          break;

        case 'Tab':
          // Close dropdown on tab
          setShowDropdown(false);
          setMentionStartPosition(null);
          clear();
          break;
      }
    },
    [showDropdown, users, highlightedIndex, handleSelectUser, clear, onSubmit],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setMentionStartPosition(null);
        clear();
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showDropdown, clear]);

  // Calculate min/max height based on rows
  const lineHeight = 24; // Approximate line height in pixels
  const padding = 24; // Vertical padding (12px top + 12px bottom)
  const minHeight = minRows * lineHeight + padding;
  const maxHeight = maxRows * lineHeight + padding;

  return (
    <div ref={containerRef} className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-autocomplete={showDropdown ? 'list' : undefined}
        aria-controls={showDropdown ? 'mention-dropdown' : undefined}
        aria-expanded={showDropdown}
        className={`
          w-full
          px-4 py-3
          rounded-lg
          border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          transition-colors duration-150
          resize-y
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-700
          ${className}
        `}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
        }}
      />

      {/* Mention dropdown */}
      {showDropdown && (
        <MentionDropdown
          users={users}
          highlightedIndex={highlightedIndex}
          onSelect={handleSelectUser}
          onHighlightChange={setHighlightedIndex}
          onClose={() => {
            setShowDropdown(false);
            setMentionStartPosition(null);
            clear();
          }}
          isLoading={isLoading && query.length > 0}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        />
      )}
    </div>
  );
};

export default MentionInput;
