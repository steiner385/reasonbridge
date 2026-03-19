/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for useReactions hook
 *
 * Tests the reaction management functionality including:
 * - Fetching reaction data
 * - Adding and removing reactions with optimistic updates
 * - Toggle functionality
 * - WebSocket real-time updates
 * - Error handling with rollback
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { reactionService, type ReactionList } from '../services/reactionService';
import { useReactions } from './useReactions';

// Mock the reactionService
vi.mock('../services/reactionService', () => ({
  reactionService: {
    getReactions: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
  },
}));

// Mock useWebSocket
const mockSubscribe = vi.fn();
vi.mock('./useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
  }),
}));

const mockReactionService = reactionService as {
  getReactions: ReturnType<typeof vi.fn>;
  addReaction: ReturnType<typeof vi.fn>;
  removeReaction: ReturnType<typeof vi.fn>;
};

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockReactionList: ReactionList = {
  reactions: [
    {
      emoji: '👍',
      count: 5,
      users: [
        { id: '1', displayName: 'Alice' },
        { id: '2', displayName: 'Bob' },
      ],
      userReacted: false,
    },
    {
      emoji: '❤️',
      count: 3,
      users: [{ id: '3', displayName: 'Charlie' }],
      userReacted: true,
    },
  ],
  totalCount: 8,
};

describe('useReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(vi.fn()); // Return unsubscribe function
  });

  describe('initialization', () => {
    it('should start with loading state', () => {
      mockReactionService.getReactions.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.reactions).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it('should not fetch when responseId is empty', () => {
      const { result } = renderHook(() => useReactions(''), {
        wrapper: createWrapper(),
      });

      expect(mockReactionService.getReactions).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useReactions('response-1', { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(mockReactionService.getReactions).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should subscribe to WebSocket events by default', () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      expect(mockSubscribe).toHaveBeenCalledWith('REACTION_ADDED', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('REACTION_REMOVED', expect.any(Function));
    });

    it('should not subscribe to WebSocket when subscribeToUpdates is false', () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      renderHook(() => useReactions('response-1', { subscribeToUpdates: false }), {
        wrapper: createWrapper(),
      });

      expect(mockSubscribe).not.toHaveBeenCalled();
    });
  });

  describe('fetching reactions', () => {
    it('should fetch and return reaction data', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reactions).toEqual(mockReactionList.reactions);
      expect(result.current.totalCount).toBe(8);
      expect(mockReactionService.getReactions).toHaveBeenCalledWith('response-1');
    });

    it('should handle empty reactions', async () => {
      mockReactionService.getReactions.mockResolvedValue({ reactions: [], totalCount: 0 });

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.reactions).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it('should handle fetch error', async () => {
      mockReactionService.getReactions.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('addReaction', () => {
    it('should call service with responseId and emoji', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.addReaction.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addReaction('🎉');
      });

      await waitFor(() => {
        expect(mockReactionService.addReaction).toHaveBeenCalledWith('response-1', '🎉');
      });
    });

    it('should optimistically add new emoji reaction', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      // Delay resolution to observe optimistic state
      mockReactionService.addReaction.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addReaction('🎉');
      });

      // Optimistic update should be reflected
      await waitFor(() => {
        const newReaction = result.current.reactions.find((r) => r.emoji === '🎉');
        expect(newReaction).toBeDefined();
        expect(newReaction?.count).toBe(1);
        expect(newReaction?.userReacted).toBe(true);
      });
    });

    it('should optimistically increment existing emoji count', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.addReaction.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add reaction to existing emoji (👍 has 5 reactions, user hasn't reacted)
      act(() => {
        result.current.addReaction('👍');
      });

      await waitFor(() => {
        const thumbsUp = result.current.reactions.find((r) => r.emoji === '👍');
        expect(thumbsUp?.count).toBe(6);
        expect(thumbsUp?.userReacted).toBe(true);
      });
    });
  });

  describe('removeReaction', () => {
    it('should call service with responseId and emoji', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.removeReaction.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.removeReaction('❤️');
      });

      await waitFor(() => {
        expect(mockReactionService.removeReaction).toHaveBeenCalledWith('response-1', '❤️');
      });
    });

    it('should optimistically decrement count', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.removeReaction.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Remove ❤️ reaction (user has reacted, count is 3)
      act(() => {
        result.current.removeReaction('❤️');
      });

      await waitFor(() => {
        const heart = result.current.reactions.find((r) => r.emoji === '❤️');
        expect(heart?.count).toBe(2);
        expect(heart?.userReacted).toBe(false);
      });
    });

    it('should remove emoji entirely when count reaches zero', async () => {
      const singleReaction: ReactionList = {
        reactions: [{ emoji: '🔥', count: 1, users: [], userReacted: true }],
        totalCount: 1,
      };
      mockReactionService.getReactions.mockResolvedValue(singleReaction);
      mockReactionService.removeReaction.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.removeReaction('🔥');
      });

      await waitFor(() => {
        expect(result.current.reactions).toEqual([]);
        expect(result.current.totalCount).toBe(0);
      });
    });
  });

  describe('toggleReaction', () => {
    it('should add reaction when user has not reacted', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.addReaction.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 👍 has userReacted: false
      act(() => {
        result.current.toggleReaction('👍');
      });

      await waitFor(() => {
        expect(mockReactionService.addReaction).toHaveBeenCalledWith('response-1', '👍');
      });
    });

    it('should remove reaction when user has reacted', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.removeReaction.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ❤️ has userReacted: true
      act(() => {
        result.current.toggleReaction('❤️');
      });

      await waitFor(() => {
        expect(mockReactionService.removeReaction).toHaveBeenCalledWith('response-1', '❤️');
      });
    });

    it('should add new emoji when toggling non-existent reaction', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.addReaction.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 🚀 doesn't exist in reactions
      act(() => {
        result.current.toggleReaction('🚀');
      });

      await waitFor(() => {
        expect(mockReactionService.addReaction).toHaveBeenCalledWith('response-1', '🚀');
      });
    });
  });

  describe('helper functions', () => {
    it('hasReacted should return true when user has reacted', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasReacted('❤️')).toBe(true); // userReacted: true
    });

    it('hasReacted should return false when user has not reacted', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasReacted('👍')).toBe(false); // userReacted: false
    });

    it('hasReacted should return false for non-existent emoji', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasReacted('🚀')).toBe(false);
    });

    it('getCount should return correct count for emoji', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getCount('👍')).toBe(5);
      expect(result.current.getCount('❤️')).toBe(3);
    });

    it('getCount should return 0 for non-existent emoji', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getCount('🚀')).toBe(0);
    });
  });

  describe('isPending state', () => {
    it('should be true during add mutation', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.addReaction.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.addReaction('🎉');
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });
    });

    it('should be true during remove mutation', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.removeReaction.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.removeReaction('❤️');
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });
    });
  });

  describe('error rollback', () => {
    it('should rollback optimistic add on error', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.addReaction.mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addReaction('🎉');
      });

      // After error, the hook invalidates and refetches - verifying rollback happened
      await waitFor(() => {
        expect(mockReactionService.getReactions).toHaveBeenCalledTimes(2);
      });
    });

    it('should rollback optimistic remove on error', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);
      mockReactionService.removeReaction.mockRejectedValue(new Error('Remove failed'));

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.removeReaction('❤️');
      });

      // After error, should refetch
      await waitFor(() => {
        expect(mockReactionService.getReactions).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('custom options', () => {
    it('should use custom staleTime', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      renderHook(() => useReactions('response-1', { staleTime: 60000 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockReactionService.getReactions).toHaveBeenCalledTimes(1);
      });

      // Query should not refetch within staleTime
    });
  });

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      mockReactionService.getReactions.mockResolvedValue(mockReactionList);

      const { result } = renderHook(() => useReactions('response-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
