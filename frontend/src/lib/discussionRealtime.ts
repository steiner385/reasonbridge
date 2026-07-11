/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * discussionRealtime - Single shared Socket.io connection for discussion realtime.
 *
 * @remarks
 * Previously every `useWebSocket()` caller opened its OWN raw `new WebSocket()`
 * to a `/ws` endpoint that no backend implements (issues #1359, #1360). On a
 * discussion page that meant ~14-20+ dead sockets per tab (one per ResponseItem
 * via useReactions, plus Sidebar/ConversationPanel/MetadataPanel/typing), each
 * with its own heartbeat and reconnect loop, and a disconnect() that could
 * reconnect *after* unmount.
 *
 * This module replaces that with a single, module-scoped, ref-counted Socket.io
 * connection to the discussion-service `/discussions` namespace (the transport
 * the backend actually speaks). All hooks share it:
 * - One socket per browser tab regardless of how many components subscribe.
 * - Backend Socket.io events (`user:typing`, `reaction:added`, `reaction:removed`,
 *   `response:new`, `topic:status`) are translated into the existing
 *   `WebSocketMessage` contract so consumers need no changes.
 * - Topic-room membership is ref-counted and re-joined automatically on
 *   reconnect.
 * - Teardown is intentional: when the last consumer releases, the socket is
 *   disconnected and never reconnects (Socket.io does not resurrect a socket
 *   we called `disconnect()` on), eliminating the reconnect-after-unmount leak.
 */

import { io, type Socket } from 'socket.io-client';
import type {
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketMessageHandler,
  WebSocketMessageMap,
  WebSocketState,
} from '../hooks/useWebSocket';

type StateListener = (state: WebSocketState) => void;

/**
 * Backend Socket.io event names emitted into `topic:{id}` rooms. Each carries a
 * `{ type, payload, timestamp }` envelope matching the WebSocketMessage shape.
 */
const RELAY_EVENTS = [
  'user:typing',
  'reaction:added',
  'reaction:removed',
  'response:new',
  'topic:status',
] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */

class DiscussionRealtimeManager {
  private socket: Socket | null = null;
  private usingMockSocket = false;
  private refCount = 0;
  private state: WebSocketState = 'disconnected';

  private readonly handlers = new Map<WebSocketMessageType, Set<WebSocketMessageHandler>>();
  private readonly stateListeners = new Set<StateListener>();
  private readonly topicRefCounts = new Map<string, number>();

  getState(): WebSocketState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  /** Subscribe to connection-state changes. Returns an unsubscribe function. */
  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(state: WebSocketState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  /** Acquire a reference to the shared connection, connecting on the first one. */
  acquire(): void {
    this.refCount += 1;
    if (this.refCount === 1) {
      this.connect();
    }
  }

  /** Release a reference; the shared connection closes when the count hits zero. */
  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.disconnect();
    }
  }

  private connect(): void {
    // Single shared connection guard — never create a duplicate socket.
    if (this.socket) return;

    // E2E mock socket support (mirrors useCommonGroundUpdates)
    const isTestMode = (window as any).__wsTestMode === true;
    const mockSocket = (window as any).__testSocket;

    if (isTestMode && mockSocket) {
      this.socket = mockSocket as Socket;
      this.usingMockSocket = true;
      this.bindRelayEvents(this.socket);
      // Defer state update to avoid cascading renders inside an effect
      queueMicrotask(() => this.setState('connected'));
      this.rejoinTopics();
      return;
    }

    // Same-origin by default; nginx proxies the discussion-service Socket.io path.
    const origin = import.meta.env['VITE_DISCUSSION_SERVICE_URL'] || '';
    const path = import.meta.env['VITE_DISCUSSION_WS_PATH'] || '/discussions-ws';

    this.setState('connecting');

    const socket = io(`${origin}/discussions`, {
      path,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket = socket;
    this.usingMockSocket = false;

    socket.on('connect', () => {
      this.setState('connected');
      this.rejoinTopics();
    });
    socket.on('disconnect', () => this.setState('disconnected'));
    socket.on('connect_error', () => this.setState('error'));

    this.bindRelayEvents(socket);
  }

  private bindRelayEvents(socket: Socket): void {
    RELAY_EVENTS.forEach((event) => {
      socket.on(event, (data: unknown) => this.dispatch(data));
    });
  }

  private dispatch(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const message = data as WebSocketMessage;
    if (!message.type) return;

    const set = this.handlers.get(message.type);
    if (!set) return;

    set.forEach((handler) => {
      try {
        handler(message);
      } catch (err) {
        console.error(`Error in realtime handler for ${message.type}:`, err);
      }
    });
  }

  /** Subscribe to a message type. Returns an unsubscribe function. */
  subscribe<T extends keyof WebSocketMessageMap>(
    type: T,
    handler: WebSocketMessageHandler<WebSocketMessageMap[T]>,
  ): () => void {
    const set = this.handlers.get(type) ?? new Set<WebSocketMessageHandler>();
    set.add(handler as WebSocketMessageHandler);
    this.handlers.set(type, set);

    return () => {
      const current = this.handlers.get(type);
      if (!current) return;
      current.delete(handler as WebSocketMessageHandler);
      if (current.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  /**
   * Join a topic room to receive its typing / reaction / new-response / status
   * events. Ref-counted per topic; the room is left when the last subscriber
   * for that topic unsubscribes. Returns an unsubscribe function.
   */
  subscribeToTopic(topicId: string): () => void {
    if (!topicId) return () => {};

    const count = this.topicRefCounts.get(topicId) ?? 0;
    this.topicRefCounts.set(topicId, count + 1);
    if (count === 0 && this.socket?.connected) {
      this.socket.emit('subscribe:topic', { topicId });
    }

    return () => {
      const current = this.topicRefCounts.get(topicId) ?? 0;
      if (current <= 1) {
        this.topicRefCounts.delete(topicId);
        if (this.socket?.connected) {
          this.socket.emit('unsubscribe:topic', { topicId });
        }
      } else {
        this.topicRefCounts.set(topicId, current - 1);
      }
    };
  }

  private rejoinTopics(): void {
    if (!this.socket) return;
    this.topicRefCounts.forEach((_count, topicId) => {
      this.socket?.emit('subscribe:topic', { topicId });
    });
  }

  /** Send a client-originated message (currently only typing indicators). */
  send(message: WebSocketMessage): void {
    if (!this.socket) {
      console.warn('Discussion realtime socket is not connected. Message not sent:', message);
      return;
    }

    switch (message.type) {
      case 'USER_TYPING':
        this.socket.emit('user:typing', message.payload);
        break;
      default:
        // All other message types are server-emitted; nothing to send.
        break;
    }
  }

  private disconnect(): void {
    // Intentional teardown — do NOT let Socket.io reconnect after the last
    // consumer unmounts (the core of the reconnect-after-unmount leak, #1360).
    if (this.socket && !this.usingMockSocket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.usingMockSocket = false;
    this.topicRefCounts.clear();
    this.setState('disconnected');
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** The single shared discussion realtime connection for this browser tab. */
export const discussionRealtime = new DiscussionRealtimeManager();
