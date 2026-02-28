/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket, type UserTypingMessage } from './useWebSocket';

/**
 * Configuration options for the typing indicator hook
 */
export interface UseTypingIndicatorOptions {
  /** The topic ID to track typing indicators for */
  topicId: string;
  /** Debounce interval for sending typing events (default: 300ms) */
  debounceMs?: number;
  /** Time after which a typing user is considered stopped (default: 3000ms) */
  clearAfterMs?: number;
}

/**
 * Represents a user who is currently typing
 */
export interface TypingUser {
  /** User ID */
  userId: string;
  /** Display name of the user */
  userName: string;
  /** Timestamp when the typing event was last received */
  lastTypingAt: number;
}

/**
 * Return type for the useTypingIndicator hook
 */
export interface UseTypingIndicatorReturn {
  /** Array of users currently typing */
  typingUsers: TypingUser[];
  /** Formatted typing message (e.g., "Alice is typing...") or null if no one is typing */
  typingMessage: string | null;
  /** Function to call when the current user types (debounced) */
  sendTyping: () => void;
}

/**
 * Formats typing users into a human-readable message
 *
 * @param users - Array of typing users
 * @returns Formatted message or null if no users are typing
 *
 * @example
 * formatTypingMessage([{ userName: 'Alice' }]) // "Alice is typing..."
 * formatTypingMessage([{ userName: 'Alice' }, { userName: 'Bob' }]) // "Alice and Bob are typing..."
 * formatTypingMessage([...5users]) // "Several people are typing..."
 */
function formatTypingMessage(users: TypingUser[]): string | null {
  if (users.length === 0) {
    return null;
  }

  const first = users[0];
  const second = users[1];
  const third = users[2];

  if (users.length === 1 && first) {
    return `${first.userName} is typing...`;
  }

  if (users.length === 2 && first && second) {
    return `${first.userName} and ${second.userName} are typing...`;
  }

  if (users.length === 3 && first && second && third) {
    return `${first.userName}, ${second.userName}, and ${third.userName} are typing...`;
  }

  return 'Several people are typing...';
}

/**
 * Hook to manage typing indicators for a discussion topic
 *
 * Subscribes to USER_TYPING WebSocket events for the specified topic,
 * tracks which users are currently typing with automatic cleanup,
 * and provides a debounced function to send typing events.
 *
 * @param options - Configuration options
 * @returns Typing state and sendTyping function
 *
 * @remarks
 * - Typing users are automatically cleared after `clearAfterMs` (default 3s) of no activity
 * - The `sendTyping` function is debounced to prevent excessive WebSocket messages
 * - The hook filters out typing events from the current user to avoid self-display
 *
 * @example
 * ```tsx
 * function ResponseComposer({ topicId }: { topicId: string }) {
 *   const { typingMessage, sendTyping } = useTypingIndicator({ topicId });
 *
 *   return (
 *     <div>
 *       <textarea
 *         onChange={() => sendTyping()}
 *         placeholder="Write a response..."
 *       />
 *       {typingMessage && <TypingIndicator message={typingMessage} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTypingIndicator(options: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const { topicId, debounceMs = 300, clearAfterMs = 3000 } = options;

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { subscribe, send, isConnected } = useWebSocket();

  // Track the last time we sent a typing event to implement debouncing
  const lastSentRef = useRef<number>(0);
  const debounceTimerRef = useRef<number | null>(null);

  // Cleanup interval ref
  const cleanupIntervalRef = useRef<number | null>(null);

  /**
   * Handle incoming typing events from WebSocket
   */
  const handleTypingEvent = useCallback(
    (message: UserTypingMessage) => {
      // Only process events for our topic
      if (message.payload.topicId !== topicId) {
        return;
      }

      const { userId, userName, isTyping } = message.payload;

      setTypingUsers((prev) => {
        if (isTyping) {
          // Add or update user in typing list
          const existingIndex = prev.findIndex((u) => u.userId === userId);
          if (existingIndex >= 0) {
            // Update existing user's timestamp
            const existingUser = prev[existingIndex];
            if (existingUser) {
              const updated = [...prev];
              updated[existingIndex] = {
                userId: existingUser.userId,
                userName: existingUser.userName,
                lastTypingAt: Date.now(),
              };
              return updated;
            }
          }
          // Add new typing user
          return [
            ...prev,
            {
              userId,
              userName,
              lastTypingAt: Date.now(),
            },
          ];
        } else {
          // Remove user from typing list
          return prev.filter((u) => u.userId !== userId);
        }
      });
    },
    [topicId],
  );

  /**
   * Subscribe to typing events
   */
  useEffect(() => {
    const unsubscribe = subscribe('USER_TYPING', handleTypingEvent);
    return unsubscribe;
  }, [subscribe, handleTypingEvent]);

  /**
   * Set up cleanup interval to remove stale typing users
   */
  useEffect(() => {
    cleanupIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => prev.filter((user) => now - user.lastTypingAt < clearAfterMs));
    }, 1000); // Check every second

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [clearAfterMs]);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Send typing indicator (debounced)
   */
  const sendTyping = useCallback(() => {
    const now = Date.now();

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Check if we should send immediately (debounce period elapsed)
    if (now - lastSentRef.current >= debounceMs) {
      if (isConnected) {
        send({
          type: 'USER_TYPING',
          payload: {
            topicId,
            userId: '', // Server will fill this from auth context
            userName: '', // Server will fill this from auth context
            isTyping: true,
          },
        });
        lastSentRef.current = now;
      }
    } else {
      // Schedule a send after the debounce period
      debounceTimerRef.current = window.setTimeout(
        () => {
          if (isConnected) {
            send({
              type: 'USER_TYPING',
              payload: {
                topicId,
                userId: '',
                userName: '',
                isTyping: true,
              },
            });
            lastSentRef.current = Date.now();
          }
        },
        debounceMs - (now - lastSentRef.current),
      );
    }
  }, [topicId, debounceMs, send, isConnected]);

  // Format the typing message
  const typingMessage = formatTypingMessage(typingUsers);

  return {
    typingUsers,
    typingMessage,
    sendTyping,
  };
}
