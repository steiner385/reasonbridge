/**
 * Event publishing utilities for the event-driven architecture.
 *
 * This module provides interfaces and implementations for publishing
 * domain events to message brokers (SNS, EventBridge, etc.).
 *
 * @example
 * ```typescript
 * import { SnsEventPublisher } from '@unite-discord/common/events';
 *
 * const publisher = new SnsEventPublisher({
 *   topicArn: process.env.SNS_TOPIC_ARN!,
 *   region: process.env.AWS_REGION!,
 *   serviceName: 'discussion-service'
 * });
 *
 * await publisher.publish({
 *   id: crypto.randomUUID(),
 *   type: 'response.created',
 *   timestamp: new Date().toISOString(),
 *   version: 1,
 *   payload: { responseId: 'resp-123', ... }
 * });
 * ```
 */

export type {
  EventPublisher,
  PublishOptions,
  PublishResult,
  SnsPublisherConfig,
} from './EventPublisher.js';

export { SnsEventPublisher } from './EventPublisher.js';
