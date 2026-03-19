/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { authService } from '../services/authService';

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
  const {
    autoConnect = true,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
  } = options;

  const { user, isAuthenticated } = useAuthContext();
  const [state, setState] = useState<WebSocketState>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const handlersRef = useRef<Map<WebSocketMessageType, Set<WebSocketMessageHandler>>>(new Map());

  /**
   * Get WebSocket URL from environment or construct from current location
   */
  const getWebSocketUrl = useCallback(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env['VITE_WS_HOST'] || window.location.host;
    const wsPath = import.meta.env['VITE_WS_PATH'] || '/ws';

    return `${wsProtocol}//${wsHost}${wsPath}`;
  }, []);

  /**
   * Start heartbeat to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  /**
   * Stop heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle incoming WebSocket message
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as { type: string };

      // Ignore PONG responses
      if (data.type === 'PONG') {
        return;
      }

      // Cast to WebSocketMessage after PONG check
      const message = data as WebSocketMessage;

      // Route message to subscribed handlers
      const handlers = handlersRef.current.get(message.type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (err) {
            console.error(`Error in WebSocket handler for ${message.type}:`, err);
          }
        });
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || state === 'connecting') {
      return;
    }

    // Don't connect if not authenticated
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return;
    }

    // Get auth token for WebSocket authentication
    const token = authService.getAuthToken();

    setState('connecting');
    setError(null);

    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();

        // Send authentication token
        if (token) {
          ws.send(JSON.stringify({ type: 'AUTH', token }));
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        setState('error');
        setError('WebSocket connection error');
        stopHeartbeat();
      };

      ws.onclose = () => {
        setState('disconnected');
        stopHeartbeat();

        // Auto-reconnect if enabled and not max attempts
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to connect to WebSocket');
    }
  }, [
    user,
    isAuthenticated,
    state,
    getWebSocketUrl,
    handleMessage,
    startHeartbeat,
    stopHeartbeat,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
  ]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState('disconnected');
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, [stopHeartbeat]);

  /**
   * Subscribe to WebSocket message type
   * Returns unsubscribe function
   */
  const subscribe = useCallback(
    <T extends keyof WebSocketMessageMap>(
      type: T,
      handler: WebSocketMessageHandler<WebSocketMessageMap[T]>,
    ) => {
      const handlers = handlersRef.current.get(type) || new Set();
      handlers.add(handler as WebSocketMessageHandler);
      handlersRef.current.set(type, handlers);

      // Return unsubscribe function
      return () => {
        const currentHandlers = handlersRef.current.get(type);
        if (currentHandlers) {
          currentHandlers.delete(handler as WebSocketMessageHandler);
          if (currentHandlers.size === 0) {
            handlersRef.current.delete(type);
          }
        }
      };
    },
    [],
  );

  /**
   * Send message to WebSocket server
   */
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  /**
   * Auto-connect on mount if enabled and authenticated
   */
  useEffect(() => {
    if (autoConnect && isAuthenticated) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, isAuthenticated]); // Only depend on autoConnect and isAuthenticated, not connect/disconnect

  return {
    state,
    isConnected: state === 'connected',
    error,
    connect,
    disconnect,
    subscribe,
    send,
  };
}
