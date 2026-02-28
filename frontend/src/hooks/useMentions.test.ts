/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as mentionService from '../services/mentionService';
import { useMentions } from './useMentions';

// Mock the mention service
vi.mock('../services/mentionService', () => ({
  searchUsers: vi.fn(),
}));

describe('useMentions', () => {
  const mockUsers = [
    {
      id: 'user-1',
      username: 'johndoe',
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
    { id: 'user-2', username: 'janedoe', displayName: 'Jane Doe' },
    { id: 'user-3', username: 'bobsmith', displayName: 'Bob Smith' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(mentionService.searchUsers).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useMentions());

      expect(result.current.query).toBe('');
      expect(result.current.users).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isStale).toBe(false);
    });

    it('should accept custom options', () => {
      const { result } = renderHook(() =>
        useMentions({
          minQueryLength: 2,
          debounceDelay: 500,
          limit: 10,
          topicId: 'topic-123',
        }),
      );

      expect(result.current.query).toBe('');
      expect(result.current.users).toEqual([]);
    });
  });

  describe('search behavior', () => {
    it('should not search if query is shorter than minQueryLength', async () => {
      const { result } = renderHook(() => useMentions({ minQueryLength: 2 }));

      act(() => {
        result.current.setQuery('j');
      });

      // Advance timers past debounce delay
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(mentionService.searchUsers).not.toHaveBeenCalled();
    });

    it('should search after debounce delay when query is long enough', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useMentions({ minQueryLength: 1, debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      // Should not search immediately
      expect(mentionService.searchUsers).not.toHaveBeenCalled();

      // Advance timers to trigger debounce and flush promises
      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      // Should search after debounce
      expect(mentionService.searchUsers).toHaveBeenCalledWith('john', undefined, 5);
    });

    it('should pass topicId to search service', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() =>
        useMentions({ topicId: 'topic-123', debounceDelay: 300 }),
      );

      act(() => {
        result.current.setQuery('john');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(mentionService.searchUsers).toHaveBeenCalledWith('john', 'topic-123', 5);
    });

    it('should pass custom limit to search service', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useMentions({ limit: 10, debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(mentionService.searchUsers).toHaveBeenCalledWith('john', undefined, 10);
    });

    it('should update users when search succeeds', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(result.current.users).toEqual(mockUsers);
    });

    it('should set isLoading during search', async () => {
      let resolveSearch: (value: typeof mockUsers) => void;
      vi.mocked(mentionService.searchUsers).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve;
          }),
      );

      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      // Advance timers to trigger the effect but not resolve the promise
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Should be loading (search started but not resolved)
      expect(result.current.isLoading).toBe(true);

      // Resolve the search
      await act(async () => {
        resolveSearch!(mockUsers);
        await Promise.resolve(); // Flush microtasks
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on search failure', async () => {
      const testError = new Error('Network error');
      vi.mocked(mentionService.searchUsers).mockRejectedValue(testError);

      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.users).toEqual([]);
    });

    it('should handle non-Error rejection', async () => {
      vi.mocked(mentionService.searchUsers).mockRejectedValue('String error');

      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(result.current.error?.message).toBe('Failed to search users');
    });

    it('should mark results as stale when query changes before debounce', () => {
      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      // Results are stale because query changed but debounce hasn't fired
      expect(result.current.isStale).toBe(true);
    });
  });

  describe('clear functionality', () => {
    it('should clear all state', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      // Perform a search
      act(() => {
        result.current.setQuery('john');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(result.current.users.length).toBeGreaterThan(0);

      // Clear
      act(() => {
        result.current.clear();
      });

      expect(result.current.query).toBe('');
      expect(result.current.users).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid query changes', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      // Rapid typing
      act(() => {
        result.current.setQuery('j');
      });

      act(() => {
        result.current.setQuery('jo');
      });

      act(() => {
        result.current.setQuery('joh');
      });

      act(() => {
        result.current.setQuery('john');
      });

      // Advance timers
      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      // Should only have searched once with final query
      expect(mentionService.searchUsers).toHaveBeenCalledTimes(1);
      expect(mentionService.searchUsers).toHaveBeenCalledWith('john', undefined, 5);
    });

    it('should cancel pending search when query is cleared', async () => {
      const { result } = renderHook(() => useMentions({ debounceDelay: 300 }));

      act(() => {
        result.current.setQuery('john');
      });

      // Clear before debounce fires
      act(() => {
        result.current.setQuery('');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      // Should not have called search because query ended up empty
      expect(mentionService.searchUsers).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should clear users when query becomes shorter than minQueryLength', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useMentions({ minQueryLength: 2, debounceDelay: 300 }));

      // Search with valid query
      act(() => {
        result.current.setQuery('john');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(result.current.users).toEqual(mockUsers);

      // Shorten query below minimum
      act(() => {
        result.current.setQuery('j');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      expect(result.current.users).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should work with default options', async () => {
      vi.mocked(mentionService.searchUsers).mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useMentions());

      act(() => {
        result.current.setQuery('a');
      });

      // Default debounce is 300ms
      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();
      });

      // Default minQueryLength is 1, so single char should trigger search
      expect(mentionService.searchUsers).toHaveBeenCalled();
    });
  });
});
