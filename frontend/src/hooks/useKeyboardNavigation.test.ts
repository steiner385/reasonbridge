/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for useKeyboardNavigation hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useKeyboardNavigation,
  DEFAULT_SHORTCUTS,
  type KeyboardShortcut,
} from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      expect(result.current.focusedIndex).toBe(-1);
      expect(result.current.itemCount).toBe(0);
      expect(result.current.isActive).toBe(true);
    });

    it('should allow setting item count', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(10);
      });

      expect(result.current.itemCount).toBe(10);
    });

    it('should allow setting focused index', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(10);
        result.current.setFocusedIndex(5);
      });

      expect(result.current.focusedIndex).toBe(5);
    });

    it('should clamp focused index to valid range', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(5);
        result.current.setFocusedIndex(10);
      });

      expect(result.current.focusedIndex).toBe(4); // Max is itemCount - 1
    });

    it('should not allow negative focused index below -1', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(5);
        result.current.setFocusedIndex(-5);
      });

      expect(result.current.focusedIndex).toBe(-1);
    });
  });

  describe('focusNext and focusPrev', () => {
    it('should increment focus index with focusNext', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(10);
        result.current.setFocusedIndex(0);
      });

      act(() => {
        result.current.focusNext();
      });

      expect(result.current.focusedIndex).toBe(1);
    });

    it('should decrement focus index with focusPrev', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(10);
        result.current.setFocusedIndex(5);
      });

      act(() => {
        result.current.focusPrev();
      });

      expect(result.current.focusedIndex).toBe(4);
    });

    it('should not exceed max index with focusNext', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(5);
        result.current.setFocusedIndex(4);
      });

      act(() => {
        result.current.focusNext();
      });

      expect(result.current.focusedIndex).toBe(4);
    });

    it('should not go below 0 with focusPrev', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(5);
        result.current.setFocusedIndex(0);
      });

      act(() => {
        result.current.focusPrev();
      });

      expect(result.current.focusedIndex).toBe(0);
    });

    it('should do nothing when item count is 0', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.focusNext();
      });

      expect(result.current.focusedIndex).toBe(-1);

      act(() => {
        result.current.focusPrev();
      });

      expect(result.current.focusedIndex).toBe(-1);
    });
  });

  describe('keyboard events', () => {
    it('should respond to J key for focusNext', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(10);
        result.current.setFocusedIndex(0);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        document.dispatchEvent(event);
      });

      expect(result.current.focusedIndex).toBe(1);
    });

    it('should respond to K key for focusPrev', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(10);
        result.current.setFocusedIndex(5);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k' });
        document.dispatchEvent(event);
      });

      expect(result.current.focusedIndex).toBe(4);
    });

    it('should ignore J/K when modifier keys are pressed', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.setItemCount(10);
        result.current.setFocusedIndex(0);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j', ctrlKey: true });
        document.dispatchEvent(event);
      });

      expect(result.current.focusedIndex).toBe(0); // Should not change
    });

    it('should not respond when disabled', () => {
      const { result } = renderHook(() => useKeyboardNavigation({ enabled: false }));

      act(() => {
        result.current.setItemCount(10);
        result.current.setFocusedIndex(0);
      });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'j' });
        document.dispatchEvent(event);
      });

      expect(result.current.focusedIndex).toBe(0); // Should not change
    });
  });

  describe('custom shortcuts', () => {
    it('should call custom shortcut handler', () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [{ key: 'r', handler, description: 'Reply' }];

      renderHook(() => useKeyboardNavigation({ shortcuts }));

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'r' });
        document.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle shortcut with ctrl modifier', () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 's', handler, ctrl: true, description: 'Save' },
      ];

      renderHook(() => useKeyboardNavigation({ shortcuts }));

      // Without ctrl - should not trigger
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 's' });
        document.dispatchEvent(event);
      });

      expect(handler).not.toHaveBeenCalled();

      // With ctrl - should trigger
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
        document.dispatchEvent(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should prevent default for custom shortcuts', () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [{ key: 'r', handler, description: 'Reply' }];

      renderHook(() => useKeyboardNavigation({ shortcuts }));

      const event = new KeyboardEvent('keydown', { key: 'r', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('DEFAULT_SHORTCUTS', () => {
    it('should have all expected default shortcuts', () => {
      expect(DEFAULT_SHORTCUTS.NEXT_ITEM).toBeDefined();
      expect(DEFAULT_SHORTCUTS.PREV_ITEM).toBeDefined();
      expect(DEFAULT_SHORTCUTS.REPLY).toBeDefined();
      expect(DEFAULT_SHORTCUTS.FOCUS_SEARCH).toBeDefined();
      expect(DEFAULT_SHORTCUTS.SHOW_HELP).toBeDefined();
      expect(DEFAULT_SHORTCUTS.CLOSE).toBeDefined();
    });

    it('should have correct keys for default shortcuts', () => {
      expect(DEFAULT_SHORTCUTS.NEXT_ITEM.key).toBe('j');
      expect(DEFAULT_SHORTCUTS.PREV_ITEM.key).toBe('k');
      expect(DEFAULT_SHORTCUTS.REPLY.key).toBe('r');
      expect(DEFAULT_SHORTCUTS.FOCUS_SEARCH.key).toBe('/');
      expect(DEFAULT_SHORTCUTS.SHOW_HELP.key).toBe('?');
      expect(DEFAULT_SHORTCUTS.CLOSE.key).toBe('Escape');
    });

    it('should allow Escape in input fields', () => {
      expect(DEFAULT_SHORTCUTS.CLOSE.allowInInput).toBe(true);
    });
  });
});
