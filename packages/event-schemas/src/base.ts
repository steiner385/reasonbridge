/**
 * Base event type definitions for the event-driven architecture.
 * All domain events should extend BaseEvent.
 */

/**
 * Unique identifier for an event
 */
export type EventId = string;

/**
 * ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * Base interface for all domain events.
 * Provides common metadata for event tracking and processing.
 */
export interface BaseEvent<TType extends string = string, TPayload = unknown> {
  /** Unique event identifier (UUID v4) */
  id: EventId;
  /** Event type discriminator (e.g., 'response.created') */
  type: TType;
  /** ISO 8601 timestamp when event was created */
  timestamp: Timestamp;
  /** Schema version for backwards compatibility */
  version: number;
  /** Event payload containing domain-specific data */
  payload: TPayload;
  /** Optional metadata for tracing and debugging */
  metadata?: EventMetadata;
}

/**
 * Optional metadata attached to events for observability
 */
export interface EventMetadata {
  /** Correlation ID for tracing related events */
  correlationId?: string;
  /** Causation ID - the event that caused this event */
  causationId?: string;
  /** Service that published the event */
  source?: string;
  /** User ID that triggered the action (if applicable) */
  userId?: string;
}

/**
 * Event envelope used for transport (SNS/SQS messages)
 */
export interface EventEnvelope<TEvent extends BaseEvent = BaseEvent> {
  /** The wrapped event */
  event: TEvent;
  /** Message deduplication ID for FIFO queues */
  deduplicationId?: string;
  /** Message group ID for FIFO queues */
  messageGroupId?: string;
}

/**
 * Type helper to extract the payload type from an event
 */
export type EventPayload<T extends BaseEvent> = T['payload'];

/**
 * Type helper to extract the event type string from an event
 */
export type EventType<T extends BaseEvent> = T['type'];
