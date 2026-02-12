/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Discussion service event definitions
 */

import type { BaseEvent } from './base.js';

/**
 * Event types for discussion service
 */
export const DISCUSSION_EVENT_TYPES = {
  RESPONSE_CREATED: 'response.created',
  TOPIC_PARTICIPANT_JOINED: 'topic.participant.joined',
  TOPIC_CREATED: 'topic.created',
  TOPIC_UPDATED: 'topic.updated',
  TOPIC_DELETED: 'topic.deleted',
  TOPIC_STATUS_CHANGED: 'topic.status.changed',
} as const;

/**
 * Payload for response.created event
 * Published when a user submits a new response to a discussion topic
 */
export interface ResponseCreatedPayload {
  /** Unique identifier of the response */
  responseId: string;
  /** Topic the response belongs to */
  topicId: string;
  /** User who authored the response */
  authorId: string;
  /** Response content */
  content: string;
  /** URLs cited in the response */
  citedSources: Array<{
    url: string;
    title?: string;
  }>;
  /** Whether user marked response as opinion */
  containsOpinion: boolean;
  /** When the response was created */
  createdAt: string;
}

/**
 * Event published when a new response is created in a discussion
 */
export interface ResponseCreatedEvent extends BaseEvent<
  typeof DISCUSSION_EVENT_TYPES.RESPONSE_CREATED,
  ResponseCreatedPayload
> {
  type: typeof DISCUSSION_EVENT_TYPES.RESPONSE_CREATED;
}

/**
 * Payload for topic.participant.joined event
 * Published when a user joins a discussion topic for the first time
 */
export interface TopicParticipantJoinedPayload {
  /** Topic the user joined */
  topicId: string;
  /** User who joined */
  userId: string;
  /** User's position fingerprint for diversity calculation */
  positionFingerprint?: {
    topicPositions: Array<{
      topicId: string;
      propositions: Array<{
        id: string;
        stance: 'support' | 'oppose' | 'nuanced';
      }>;
    }>;
  };
  /** Current participant count after joining */
  participantCount: number;
  /** When the user joined */
  joinedAt: string;
}

/**
 * Event published when a user joins a discussion topic
 */
export interface TopicParticipantJoinedEvent extends BaseEvent<
  typeof DISCUSSION_EVENT_TYPES.TOPIC_PARTICIPANT_JOINED,
  TopicParticipantJoinedPayload
> {
  type: typeof DISCUSSION_EVENT_TYPES.TOPIC_PARTICIPANT_JOINED;
}

/**
 * Payload for topic.created event
 * Published when a new discussion topic is created
 */
export interface TopicCreatedPayload {
  /** Unique identifier of the topic */
  topicId: string;
  /** Topic title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Topic description */
  description: string;
  /** User who created the topic */
  authorId: string;
  /** Initial propositions for the topic */
  propositions: Array<{
    id: string;
    text: string;
    type: 'thesis' | 'antithesis' | 'synthesis';
  }>;
  /** Tags associated with the topic */
  tags: Array<{
    id: string;
    name: string;
  }>;
  /** Topic visibility setting */
  visibility: 'public' | 'private' | 'unlisted';
  /** Whether the topic contains mature content */
  isMatureContent: boolean;
  /** When the topic was created */
  createdAt: string;
}

/**
 * Event published when a new discussion topic is created
 */
export interface TopicCreatedEvent extends BaseEvent<
  typeof DISCUSSION_EVENT_TYPES.TOPIC_CREATED,
  TopicCreatedPayload
> {
  type: typeof DISCUSSION_EVENT_TYPES.TOPIC_CREATED;
}

/**
 * Payload for topic.updated event
 * Published when an existing topic is updated
 */
export interface TopicUpdatedPayload {
  /** Unique identifier of the topic */
  topicId: string;
  /** User who made the update */
  updatedBy: string;
  /** Fields that were changed */
  changes: {
    title?: { old: string; new: string };
    description?: { old: string; new: string };
    visibility?: { old: string; new: string };
    isMatureContent?: { old: boolean; new: boolean };
  };
  /** Reason for the edit (required for older topics) */
  editReason?: string;
  /** When the topic was updated */
  updatedAt: string;
}

/**
 * Event published when a topic is updated
 */
export interface TopicUpdatedEvent extends BaseEvent<
  typeof DISCUSSION_EVENT_TYPES.TOPIC_UPDATED,
  TopicUpdatedPayload
> {
  type: typeof DISCUSSION_EVENT_TYPES.TOPIC_UPDATED;
}

/**
 * Payload for topic.deleted event
 * Published when a topic is deleted
 */
export interface TopicDeletedPayload {
  /** Unique identifier of the deleted topic */
  topicId: string;
  /** User who deleted the topic */
  deletedBy: string;
  /** Reason for deletion */
  reason?: string;
  /** When the topic was deleted */
  deletedAt: string;
}

/**
 * Event published when a topic is deleted
 */
export interface TopicDeletedEvent extends BaseEvent<
  typeof DISCUSSION_EVENT_TYPES.TOPIC_DELETED,
  TopicDeletedPayload
> {
  type: typeof DISCUSSION_EVENT_TYPES.TOPIC_DELETED;
}

/**
 * Topic status values
 */
export type TopicStatus = 'active' | 'archived' | 'locked' | 'hidden';

/**
 * Payload for topic.status.changed event
 * Published when a topic's status changes
 */
export interface TopicStatusChangedPayload {
  /** Unique identifier of the topic */
  topicId: string;
  /** Previous status */
  previousStatus: TopicStatus;
  /** New status */
  newStatus: TopicStatus;
  /** User who changed the status */
  changedBy: string;
  /** Reason for the status change */
  reason?: string;
  /** When the status was changed */
  changedAt: string;
}

/**
 * Event published when a topic's status changes
 */
export interface TopicStatusChangedEvent extends BaseEvent<
  typeof DISCUSSION_EVENT_TYPES.TOPIC_STATUS_CHANGED,
  TopicStatusChangedPayload
> {
  type: typeof DISCUSSION_EVENT_TYPES.TOPIC_STATUS_CHANGED;
}

/**
 * Union type of all discussion service events
 */
export type DiscussionEvent =
  | ResponseCreatedEvent
  | TopicParticipantJoinedEvent
  | TopicCreatedEvent
  | TopicUpdatedEvent
  | TopicDeletedEvent
  | TopicStatusChangedEvent;
