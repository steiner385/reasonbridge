/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for useTypingIndicator hook
 *
 * Tests the real-time typing indicator functionality including:
 * - WebSocket subscription and event handling
 * - Debounced typing event sending
 * - Automatic cleanup of stale typing users
 * - Message formatting for single/multiple users
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingIndicator } from './useTypingIndicator';
import type { UserTypingMessage } from './useWebSocket';

// Mock the useWebSocket hook
const mockSubscribe = vi.fn();
const mockSend = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('./useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: mockSubscribe,
    send: mockSend,
    isConnected: true,
  }),
}));

describe('useTypingIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default mock implementation for subscribe
    mockSubscribe.mockImplementation(() => mockUnsubscribe);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with empty typing users', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      expect(result.current.typingUsers).toEqual([]);
      expect(result.current.typingMessage).toBeNull();
    });

    it('should subscribe to USER_TYPING events', () => {
      renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      expect(mockSubscribe).toHaveBeenCalledWith('USER_TYPING', expect.any(Function));
    });

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('receiving typing events', () => {
    it('should add user to typingUsers when receiving isTyping: true', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      // Get the callback that was passed to subscribe
      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Simulate receiving a typing event
      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-1',
            userId: 'user-1',
            userName: 'Alice',
            isTyping: true,
          },
        } as UserTypingMessage);
      });

      expect(result.current.typingUsers).toHaveLength(1);
      expect(result.current.typingUsers[0]).toMatchObject({
        userId: 'user-1',
        userName: 'Alice',
      });
    });

    it('should remove user from typingUsers when receiving isTyping: false', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Add user first
      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-1',
            userId: 'user-1',
            userName: 'Alice',
            isTyping: true,
          },
        } as UserTypingMessage);
      });

      expect(result.current.typingUsers).toHaveLength(1);

      // Remove user
      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-1',
            userId: 'user-1',
            userName: 'Alice',
            isTyping: false,
          },
        } as UserTypingMessage);
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });

    it('should ignore events from different topics', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-2', // Different topic
            userId: 'user-1',
            userName: 'Alice',
            isTyping: true,
          },
        } as UserTypingMessage);
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });

    it('should update timestamp when user sends another typing event', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // First typing event
      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-1',
            userId: 'user-1',
            userName: 'Alice',
            isTyping: true,
          },
        } as UserTypingMessage);
      });

      const firstTimestamp = result.current.typingUsers[0]?.lastTypingAt;

      // Advance time slightly
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Second typing event
      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-1',
            userId: 'user-1',
            userName: 'Alice',
            isTyping: true,
          },
        } as UserTypingMessage);
      });

      expect(result.current.typingUsers).toHaveLength(1);
      expect(result.current.typingUsers[0]?.lastTypingAt).toBeGreaterThan(firstTimestamp!);
    });
  });

  describe('auto-cleanup of stale users', () => {
    it('should remove stale typing users after clearAfterMs', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({ topicId: 'topic-1', clearAfterMs: 3000 }),
      );

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Add user
      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-1',
            userId: 'user-1',
            userName: 'Alice',
            isTyping: true,
          },
        } as UserTypingMessage);
      });

      expect(result.current.typingUsers).toHaveLength(1);

      // Advance time past the cleanup threshold (clearAfterMs=3000 + cleanup interval check=1000)
      // The cleanup runs every 1000ms, checking if lastTypingAt is older than clearAfterMs
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // User should now be removed
      expect(result.current.typingUsers).toHaveLength(0);
    });
  });

  describe('sendTyping', () => {
    it('should send typing event with correct payload', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      act(() => {
        result.current.sendTyping();
      });

      expect(mockSend).toHaveBeenCalledWith({
        type: 'USER_TYPING',
        payload: {
          topicId: 'topic-1',
          userId: '',
          userName: '',
          isTyping: true,
        },
      });
    });

    it('should debounce multiple sendTyping calls', () => {
      const { result } = renderHook(() =>
        useTypingIndicator({ topicId: 'topic-1', debounceMs: 300 }),
      );

      // First call - should send immediately
      act(() => {
        result.current.sendTyping();
      });

      expect(mockSend).toHaveBeenCalledTimes(1);

      // Rapid subsequent calls within debounce period
      act(() => {
        result.current.sendTyping();
        result.current.sendTyping();
        result.current.sendTyping();
      });

      // Should still only have sent once (debounced)
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Advance past debounce period
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now the debounced call should have fired
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('typingMessage formatting', () => {
    it('should return null when no users are typing', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      expect(result.current.typingMessage).toBeNull();
    });

    it('should format single user typing', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: {
            topicId: 'topic-1',
            userId: 'user-1',
            userName: 'Alice',
            isTyping: true,
          },
        } as UserTypingMessage);
      });

      expect(result.current.typingMessage).toBe('Alice is typing...');
    });

    it('should format two users typing', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: { topicId: 'topic-1', userId: 'user-1', userName: 'Alice', isTyping: true },
        } as UserTypingMessage);
        subscribeCallback({
          type: 'USER_TYPING',
          payload: { topicId: 'topic-1', userId: 'user-2', userName: 'Bob', isTyping: true },
        } as UserTypingMessage);
      });

      expect(result.current.typingMessage).toBe('Alice and Bob are typing...');
    });

    it('should format three users typing', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      act(() => {
        subscribeCallback({
          type: 'USER_TYPING',
          payload: { topicId: 'topic-1', userId: 'user-1', userName: 'Alice', isTyping: true },
        } as UserTypingMessage);
        subscribeCallback({
          type: 'USER_TYPING',
          payload: { topicId: 'topic-1', userId: 'user-2', userName: 'Bob', isTyping: true },
        } as UserTypingMessage);
        subscribeCallback({
          type: 'USER_TYPING',
          payload: { topicId: 'topic-1', userId: 'user-3', userName: 'Charlie', isTyping: true },
        } as UserTypingMessage);
      });

      expect(result.current.typingMessage).toBe('Alice, Bob, and Charlie are typing...');
    });

    it('should show "Several people are typing..." for 4+ users', () => {
      const { result } = renderHook(() => useTypingIndicator({ topicId: 'topic-1' }));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      act(() => {
        ['Alice', 'Bob', 'Charlie', 'Diana'].forEach((userName, i) => {
          subscribeCallback({
            type: 'USER_TYPING',
            payload: {
              topicId: 'topic-1',
              userId: `user-${i}`,
              userName,
              isTyping: true,
            },
          } as UserTypingMessage);
        });
      });

      expect(result.current.typingMessage).toBe('Several people are typing...');
    });
  });
});
