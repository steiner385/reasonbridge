/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * useKeyboardNavigation hook for global keyboard shortcuts
 *
 * @remarks
 * Provides a centralized system for keyboard navigation:
 * - J/K: Next/previous item navigation
 * - R: Reply to focused item
 * - /: Focus search
 * - ?: Show keyboard shortcuts help
 * - Escape: Close modals, deselect
 *
 * Context-aware: Shortcuts are disabled when typing in input fields.
 */

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Shortcut configuration
 */
export interface KeyboardShortcut {
  /**
   * The key to listen for (e.g., 'j', 'k', '/', '?')
   */
  key: string;

  /**
   * Callback when shortcut is triggered
   */
  handler: (event: KeyboardEvent) => void;

  /**
   * Whether to require Ctrl/Cmd key
   */
  ctrl?: boolean;

  /**
   * Whether to require Shift key
   */
  shift?: boolean;

  /**
   * Whether to require Alt/Option key
   */
  alt?: boolean;

  /**
   * Whether this shortcut works in input fields
   */
  allowInInput?: boolean;

  /**
   * Description for help modal
   */
  description?: string;
}

/**
 * Options for useKeyboardNavigation hook
 */
export interface UseKeyboardNavigationOptions {
  /**
   * Whether keyboard navigation is enabled
   */
  enabled?: boolean;

  /**
   * Custom shortcuts to register
   */
  shortcuts?: KeyboardShortcut[];
}

/**
 * Check if the event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isContentEditable = target.isContentEditable;

  return isInput || isContentEditable;
}

/**
 * Check if keyboard shortcut matches event
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const key = event.key.toLowerCase();
  const shortcutKey = shortcut.key.toLowerCase();

  // Check key match
  if (key !== shortcutKey) return false;

  // Check modifier keys
  if (shortcut.ctrl && !(event.ctrlKey || event.metaKey)) return false;
  if (shortcut.shift && !event.shiftKey) return false;
  if (shortcut.alt && !event.altKey) return false;

  // If modifiers are not required, make sure they're not pressed (for simple shortcuts)
  if (!shortcut.ctrl && !shortcut.shift && !shortcut.alt) {
    // Allow shift for '?' (which is Shift + /)
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
  }

  return true;
}

/**
 * Default shortcuts - common navigation patterns
 */
export const DEFAULT_SHORTCUTS: Record<string, Partial<KeyboardShortcut>> = {
  NEXT_ITEM: { key: 'j', description: 'Next response' },
  PREV_ITEM: { key: 'k', description: 'Previous response' },
  REPLY: { key: 'r', description: 'Reply to focused response' },
  FOCUS_SEARCH: { key: '/', description: 'Focus search bar' },
  SHOW_HELP: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  CLOSE: { key: 'Escape', allowInInput: true, description: 'Close modal / Deselect' },
};

/**
 * Hook return type
 */
export interface UseKeyboardNavigationReturn {
  /**
   * Currently focused item index (for J/K navigation)
   */
  focusedIndex: number;

  /**
   * Set the focused item index
   */
  setFocusedIndex: (index: number) => void;

  /**
   * Move focus to next item
   */
  focusNext: () => void;

  /**
   * Move focus to previous item
   */
  focusPrev: () => void;

  /**
   * Total number of items for navigation
   */
  itemCount: number;

  /**
   * Set the total number of items
   */
  setItemCount: (count: number) => void;

  /**
   * Whether keyboard navigation is active
   */
  isActive: boolean;
}

/**
 * useKeyboardNavigation hook
 *
 * Provides global keyboard navigation with context awareness.
 *
 * @param options - Configuration options
 * @returns Navigation state and controls
 *
 * @example
 * ```tsx
 * const { focusedIndex, focusNext, focusPrev } = useKeyboardNavigation({
 *   enabled: true,
 *   shortcuts: [
 *     { key: 'r', handler: () => openReplyModal(), description: 'Reply' },
 *   ],
 * });
 * ```
 */
export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions = {},
): UseKeyboardNavigationReturn {
  const { enabled = true, shortcuts = [] } = options;

  const [focusedIndex, setFocusedIndexState] = useState(-1);
  const [itemCount, setItemCountState] = useState(0);
  const itemCountRef = useRef(0);

  const setFocusedIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(-1, Math.min(index, itemCountRef.current - 1));
    setFocusedIndexState(clampedIndex);
  }, []);

  const setItemCount = useCallback((count: number) => {
    itemCountRef.current = count;
    setItemCountState(count);
  }, []);

  const focusNext = useCallback(() => {
    if (itemCountRef.current === 0) return;
    setFocusedIndexState((prev) => Math.min(prev + 1, itemCountRef.current - 1));
  }, []);

  const focusPrev = useCallback(() => {
    if (itemCountRef.current === 0) return;
    setFocusedIndexState((prev) => Math.max(prev - 1, 0));
  }, []);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const inInput = isInputElement(target);

      // Check custom shortcuts
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          // Skip if in input and shortcut doesn't allow it
          if (inInput && !shortcut.allowInInput) continue;

          event.preventDefault();
          shortcut.handler(event);
          return;
        }
      }

      // Skip default shortcuts if in input
      if (inInput) return;

      const key = event.key.toLowerCase();

      // J - Next item
      if (key === 'j' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        focusNext();
        return;
      }

      // K - Previous item
      if (key === 'k' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        focusPrev();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shortcuts, focusNext, focusPrev]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusNext,
    focusPrev,
    itemCount,
    setItemCount,
    isActive: enabled,
  };
}

export default useKeyboardNavigation;
