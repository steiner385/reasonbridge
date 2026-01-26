/**
 * Discussion service event definitions
 */

import type { BaseEvent } from './base';

/**
 * Event types for discussion service
 */
export const DISCUSSION_EVENT_TYPES = {
  RESPONSE_CREATED: 'response.created',
  TOPIC_PARTICIPANT_JOINED: 'topic.participant.joined',
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
export interface ResponseCreatedEvent
  extends BaseEvent<typeof DISCUSSION_EVENT_TYPES.RESPONSE_CREATED, ResponseCreatedPayload> {
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
export interface TopicParticipantJoinedEvent
  extends BaseEvent<
    typeof DISCUSSION_EVENT_TYPES.TOPIC_PARTICIPANT_JOINED,
    TopicParticipantJoinedPayload
  > {
  type: typeof DISCUSSION_EVENT_TYPES.TOPIC_PARTICIPANT_JOINED;
}

/**
 * Union type of all discussion service events
 */
export type DiscussionEvent = ResponseCreatedEvent | TopicParticipantJoinedEvent;
