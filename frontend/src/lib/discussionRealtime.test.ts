/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for the shared discussion realtime connection manager.
 *
 * Validates the core guarantees behind issues #1359 and #1360:
 * - A single shared socket is created regardless of how many consumers acquire.
 * - Backend Socket.io events are translated to the WebSocketMessage contract
 *   and dispatched to type subscribers.
 * - Topic-room membership is emitted over the shared socket.
 * - Teardown happens only when the last consumer releases.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { discussionRealtime } from './discussionRealtime';

interface MockSocket {
  connected: boolean;
  on: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  trigger: (event: string, data: unknown) => void;
}

function makeMockSocket(): MockSocket {
  const listeners = new Map<string, (data: unknown) => void>();
  return {
    connected: true,
    on: vi.fn((event: string, cb: (data: unknown) => void) => {
      listeners.set(event, cb);
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    trigger: (event: string, data: unknown) => listeners.get(event)?.(data),
  };
}

describe('discussionRealtime manager', () => {
  let mock: MockSocket;

  beforeEach(() => {
    mock = makeMockSocket();
    (window as unknown as { __wsTestMode: boolean }).__wsTestMode = true;
    (window as unknown as { __testSocket: MockSocket }).__testSocket = mock;
  });

  afterEach(() => {
    // Ensure the singleton is torn down between tests
    while (discussionRealtime.isConnected() || discussionRealtime.getState() !== 'disconnected') {
      discussionRealtime.release();
    }
    // Extra releases are safe (clamped at zero)
    discussionRealtime.release();
    delete (window as unknown as { __wsTestMode?: boolean }).__wsTestMode;
    delete (window as unknown as { __testSocket?: MockSocket }).__testSocket;
  });

  it('creates only ONE shared socket regardless of acquire count', () => {
    discussionRealtime.acquire();
    discussionRealtime.acquire();
    discussionRealtime.acquire();

    // bindRelayEvents registers exactly one set of listeners for one socket
    const relayEventCount = 5; // user:typing, reaction:added/removed, response:new, topic:status
    expect(mock.on).toHaveBeenCalledTimes(relayEventCount);

    discussionRealtime.release();
    discussionRealtime.release();
    // Still one consumer left → socket not torn down
    expect(mock.disconnect).not.toHaveBeenCalled();
  });

  it('dispatches translated backend events to type subscribers', () => {
    discussionRealtime.acquire();

    const handler = vi.fn();
    const unsubscribe = discussionRealtime.subscribe('REACTION_ADDED', handler);

    mock.trigger('reaction:added', {
      type: 'REACTION_ADDED',
      payload: { responseId: 'r1', userId: 'u1', userName: 'Alice', emoji: '👍' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'REACTION_ADDED' }));

    unsubscribe();
    mock.trigger('reaction:added', {
      type: 'REACTION_ADDED',
      payload: { responseId: 'r1', userId: 'u1', userName: 'Alice', emoji: '👍' },
    });
    // No further calls after unsubscribe
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('joins and leaves topic rooms over the shared socket', () => {
    discussionRealtime.acquire();

    const leave = discussionRealtime.subscribeToTopic('topic-42');
    expect(mock.emit).toHaveBeenCalledWith('subscribe:topic', { topicId: 'topic-42' });

    leave();
    expect(mock.emit).toHaveBeenCalledWith('unsubscribe:topic', { topicId: 'topic-42' });
  });

  it('translates USER_TYPING sends into a user:typing emit', () => {
    discussionRealtime.acquire();

    discussionRealtime.send({
      type: 'USER_TYPING',
      payload: { topicId: 't1', userId: '', userName: '', isTyping: true },
    });

    expect(mock.emit).toHaveBeenCalledWith('user:typing', {
      topicId: 't1',
      userId: '',
      userName: '',
      isTyping: true,
    });
  });
});
