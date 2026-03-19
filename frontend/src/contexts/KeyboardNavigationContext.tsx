/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * KeyboardNavigationContext provides global keyboard navigation state and handlers
 *
 * @remarks
 * Manages global keyboard shortcuts that work across the app:
 * - ? to show help modal
 * - / to focus search
 * - Escape to close modals
 * - J/K for response navigation (when applicable)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import KeyboardShortcutsHelp from '../components/ui/KeyboardShortcutsHelp';

/**
 * Keyboard navigation context value
 */
interface KeyboardNavigationContextValue {
  /**
   * Whether keyboard navigation is enabled
   */
  isEnabled: boolean;

  /**
   * Enable or disable keyboard navigation
   */
  setEnabled: (enabled: boolean) => void;

  /**
   * Current focused response index (-1 if none)
   */
  focusedResponseIndex: number;

  /**
   * Set the focused response index
   */
  setFocusedResponseIndex: (index: number) => void;

  /**
   * Total number of responses for J/K navigation
   */
  responseCount: number;

  /**
   * Set the total response count
   */
  setResponseCount: (count: number) => void;

  /**
   * Reference to search input for focus
   */
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  /**
   * Register a reply callback for when R is pressed on focused response
   * Returns an unregister function
   */
  registerReplyHandler: (handler: (responseId: string) => void) => () => void;

  /**
   * Current focused response ID
   */
  focusedResponseId?: string;

  /**
   * Set the focused response ID
   */
  setFocusedResponseId: (id: string | undefined) => void;

  /**
   * Show the keyboard shortcuts help modal
   */
  showHelp: () => void;

  /**
   * Hide the keyboard shortcuts help modal
   */
  hideHelp: () => void;

  /**
   * Whether the help modal is visible
   */
  isHelpVisible: boolean;
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextValue | null>(null);

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

export interface KeyboardNavigationProviderProps {
  children: React.ReactNode;
}

/**
 * KeyboardNavigationProvider wraps the app to provide global keyboard navigation
 */
export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({
  children,
}) => {
  const [isEnabled, setEnabled] = useState(true);
  const [focusedResponseIndex, setFocusedResponseIndex] = useState(-1);
  const [responseCount, setResponseCount] = useState(0);
  const [focusedResponseId, setFocusedResponseId] = useState<string | undefined>();
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const onReplyRef = useRef<((responseId: string) => void) | null>(null);

  const registerReplyHandler = useCallback((handler: (responseId: string) => void) => {
    onReplyRef.current = handler;
    return () => {
      onReplyRef.current = null;
    };
  }, []);

  const showHelp = useCallback(() => setIsHelpVisible(true), []);
  const hideHelp = useCallback(() => setIsHelpVisible(false), []);

  // Global keyboard event handler
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const inInput = isInputElement(target);

      // Escape - always works, closes modal or deselects
      if (event.key === 'Escape') {
        if (isHelpVisible) {
          setIsHelpVisible(false);
          event.preventDefault();
          return;
        }
        // Deselect response
        if (focusedResponseIndex >= 0) {
          setFocusedResponseIndex(-1);
          setFocusedResponseId(undefined);
          event.preventDefault();
          return;
        }
      }

      // Don't handle shortcuts when in input fields (except escape)
      if (inInput) return;

      // ? - Show help (Shift + /)
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setIsHelpVisible(true);
        return;
      }

      // / - Focus search
      if (event.key === '/' && !event.shiftKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // J - Next response
      if (event.key === 'j' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (responseCount > 0) {
          event.preventDefault();
          setFocusedResponseIndex((prev) => Math.min(prev + 1, responseCount - 1));
        }
        return;
      }

      // K - Previous response
      if (event.key === 'k' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (responseCount > 0) {
          event.preventDefault();
          setFocusedResponseIndex((prev) => Math.max(prev - 1, 0));
        }
        return;
      }

      // R - Reply to focused response
      if (event.key === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (focusedResponseId && onReplyRef.current) {
          event.preventDefault();
          onReplyRef.current(focusedResponseId);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, isHelpVisible, focusedResponseIndex, focusedResponseId, responseCount]);

  const value: KeyboardNavigationContextValue = {
    isEnabled,
    setEnabled,
    focusedResponseIndex,
    setFocusedResponseIndex,
    responseCount,
    setResponseCount,
    searchInputRef,
    registerReplyHandler,
    focusedResponseId,
    setFocusedResponseId,
    showHelp,
    hideHelp,
    isHelpVisible,
  };

  return (
    <KeyboardNavigationContext.Provider value={value}>
      {children}
      <KeyboardShortcutsHelp isOpen={isHelpVisible} onClose={hideHelp} />
    </KeyboardNavigationContext.Provider>
  );
};

/**
 * useKeyboardNavigationContext hook to access keyboard navigation state
 */
export function useKeyboardNavigationContext(): KeyboardNavigationContextValue {
  const context = useContext(KeyboardNavigationContext);
  if (!context) {
    throw new Error(
      'useKeyboardNavigationContext must be used within a KeyboardNavigationProvider',
    );
  }
  return context;
}

/**
 * Optional hook that doesn't throw if provider is missing
 */
export function useOptionalKeyboardNavigation(): KeyboardNavigationContextValue | null {
  return useContext(KeyboardNavigationContext);
}

export default KeyboardNavigationContext;
