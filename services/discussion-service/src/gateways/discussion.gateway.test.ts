/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Server } from 'socket.io';
import { DiscussionGateway } from './discussion.gateway.js';

/**
 * Verifies the realtime emit surface added for issue #1359: a posted response
 * (and a topic status change / reaction) must produce a client-visible event
 * broadcast into the correct `topic:{id}` room.
 */
describe('DiscussionGateway realtime emits', () => {
  let gateway: DiscussionGateway;
  let emit: ReturnType<typeof vi.fn>;
  let to: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gateway = new DiscussionGateway();
    emit = vi.fn();
    to = vi.fn().mockReturnValue({ emit });
    // Inject a mock Socket.io server
    gateway.server = { to } as unknown as Server;
  });

  it('emitNewResponse broadcasts NEW_RESPONSE to the topic room', () => {
    gateway.emitNewResponse({
      topicId: 'topic-1',
      responseId: 'resp-1',
      authorId: 'user-1',
      authorName: 'Alice',
    });

    expect(to).toHaveBeenCalledWith('topic:topic-1');
    expect(emit).toHaveBeenCalledWith(
      'response:new',
      expect.objectContaining({
        type: 'NEW_RESPONSE',
        payload: expect.objectContaining({
          topicId: 'topic-1',
          responseId: 'resp-1',
          authorId: 'user-1',
          authorName: 'Alice',
        }),
      }),
    );
  });

  it('emitTopicStatusChange broadcasts TOPIC_STATUS_CHANGE to the topic room', () => {
    gateway.emitTopicStatusChange({
      topicId: 'topic-9',
      oldStatus: 'ACTIVE',
      newStatus: 'ARCHIVED',
    });

    expect(to).toHaveBeenCalledWith('topic:topic-9');
    expect(emit).toHaveBeenCalledWith(
      'topic:status',
      expect.objectContaining({
        type: 'TOPIC_STATUS_CHANGE',
        payload: expect.objectContaining({
          topicId: 'topic-9',
          oldStatus: 'ACTIVE',
          newStatus: 'ARCHIVED',
        }),
      }),
    );
  });

  it('emitReactionAdded broadcasts REACTION_ADDED to the topic room', () => {
    gateway.emitReactionAdded('topic-2', {
      responseId: 'resp-2',
      userId: 'user-2',
      userName: 'Bob',
      emoji: '👍',
    });

    expect(to).toHaveBeenCalledWith('topic:topic-2');
    expect(emit).toHaveBeenCalledWith(
      'reaction:added',
      expect.objectContaining({ type: 'REACTION_ADDED' }),
    );
  });
});
