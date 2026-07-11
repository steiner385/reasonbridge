/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { discussionRealtime } from '../lib/discussionRealtime';

/**
 * WebSocket message types for real-time updates
 */
export type WebSocketMessageType =
  | 'NEW_RESPONSE'
  | 'COMMON_GROUND_UPDATE'
  | 'TOPIC_STATUS_CHANGE'
  | 'RESPONSE_DELETED'
  | 'RESPONSE_UPDATED'
  | 'USER_TYPING'
  | 'REACTION_ADDED'
  | 'REACTION_REMOVED';

/**
 * WebSocket message payload for new response
 */
export interface NewResponseMessage {
  type: 'NEW_RESPONSE';
  payload: {
    topicId: string;
    responseId: string;
    authorId: string;
    authorName: string;
    parentId?: string;
    timestamp: string;
  };
}

/**
 * WebSocket message payload for common ground update
 */
export interface CommonGroundUpdateMessage {
  type: 'COMMON_GROUND_UPDATE';
  payload: {
    topicId: string;
    analysisId: string;
    timestamp: string;
  };
}

/**
 * WebSocket message payload for topic status change
 */
export interface TopicStatusChangeMessage {
  type: 'TOPIC_STATUS_CHANGE';
  payload: {
    topicId: string;
    oldStatus: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';
    newStatus: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';
    timestamp: string;
  };
}

/**
 * WebSocket message payload for user typing indicator
 */
export interface UserTypingMessage {
  type: 'USER_TYPING';
  payload: {
    topicId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  };
}

/**
 * WebSocket message payload for reaction added
 */
export interface ReactionAddedMessage {
  type: 'REACTION_ADDED';
  payload: {
    responseId: string;
    userId: string;
    userName: string;
    emoji: string;
  };
}

/**
 * WebSocket message payload for reaction removed
 */
export interface ReactionRemovedMessage {
  type: 'REACTION_REMOVED';
  payload: {
    responseId: string;
    userId: string;
    emoji: string;
  };
}

/**
 * Union type for all WebSocket messages
 */
export type WebSocketMessage =
  | NewResponseMessage
  | CommonGroundUpdateMessage
  | TopicStatusChangeMessage
  | UserTypingMessage
  | ReactionAddedMessage
  | ReactionRemovedMessage;

/**
 * Type mapping from message type string to message interface
 * Used for type-safe subscription
 */
export interface WebSocketMessageMap {
  NEW_RESPONSE: NewResponseMessage;
  COMMON_GROUND_UPDATE: CommonGroundUpdateMessage;
  TOPIC_STATUS_CHANGE: TopicStatusChangeMessage;
  USER_TYPING: UserTypingMessage;
  REACTION_ADDED: ReactionAddedMessage;
  REACTION_REMOVED: ReactionRemovedMessage;
}

/**
 * WebSocket message handler function
 */
export type WebSocketMessageHandler<T extends WebSocketMessage = WebSocketMessage> = (
  message: T,
) => void;

/**
 * WebSocket connection options
 */
export interface UseWebSocketOptions {
  /** Whether to auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds (default: 3000) */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;
}

/**
 * WebSocket connection state
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Hook return value
 */
export interface UseWebSocketReturn {
  /** Current connection state */
  state: WebSocketState;
  /** Whether socket is connected */
  isConnected: boolean;
  /** Last error message */
  error: string | null;
  /** Manually connect to WebSocket */
  connect: () => void;
  /** Manually disconnect from WebSocket */
  disconnect: () => void;
  /** Subscribe to message type */
  subscribe: <T extends keyof WebSocketMessageMap>(
    type: T,
    handler: WebSocketMessageHandler<WebSocketMessageMap[T]>,
  ) => () => void;
  /** Join a topic room to receive its realtime events (ref-counted) */
  subscribeToTopic: (topicId: string) => () => void;
  /** Send a message to the server */
  send: (message: WebSocketMessage) => void;
}

/**
 * Custom hook for WebSocket real-time updates
 * Manages connection, reconnection, heartbeat, and message routing
 *
 * @param options - WebSocket configuration options
 * @returns WebSocket state and control functions
 *
 * @example
 * ```tsx
 * const { state, isConnected, subscribe } = useWebSocket();
 *
 * useEffect(() => {
 *   const unsubscribe = subscribe('NEW_RESPONSE', (message) => {
 *     // Handle new response message
 *     refetch(); // Trigger data refetch
 *   });
 *   return unsubscribe;
 * }, [subscribe]);
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true } = options;

  const { isAuthenticated } = useAuthContext();
  const [state, setState] = useState<WebSocketState>(() => discussionRealtime.getState());

  // Mirror the shared connection's state into local component state. The lazy
  // useState initializer already reads the current state, and acquire() (which
  // triggers connecting/connected) runs in a later effect, so subscribing here
  // reliably captures subsequent transitions.
  useEffect(() => discussionRealtime.onStateChange(setState), []);

  // Acquire a reference to the single shared connection while mounted and
  // authenticated. Ref-counting means every consumer shares ONE socket per tab
  // instead of opening its own (issue #1360). Releasing on unmount closes the
  // socket only when the last consumer leaves, and never reconnects afterward.
  useEffect(() => {
    if (!autoConnect || !isAuthenticated) return undefined;
    discussionRealtime.acquire();
    return () => discussionRealtime.release();
  }, [autoConnect, isAuthenticated]);

  const subscribe = useCallback(
    <T extends keyof WebSocketMessageMap>(
      type: T,
      handler: WebSocketMessageHandler<WebSocketMessageMap[T]>,
    ) => discussionRealtime.subscribe(type, handler),
    [],
  );

  const subscribeToTopic = useCallback(
    (topicId: string) => discussionRealtime.subscribeToTopic(topicId),
    [],
  );

  const send = useCallback((message: WebSocketMessage) => discussionRealtime.send(message), []);

  // connect/disconnect are retained for API compatibility; the connection is
  // managed automatically via ref-counting, so they map to acquire/release.
  const connect = useCallback(() => discussionRealtime.acquire(), []);
  const disconnect = useCallback(() => discussionRealtime.release(), []);

  return {
    state,
    isConnected: state === 'connected',
    error: state === 'error' ? 'WebSocket connection error' : null,
    connect,
    disconnect,
    subscribe,
    subscribeToTopic,
    send,
  };
}
