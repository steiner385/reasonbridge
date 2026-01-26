/**
 * Event publishing and subscribing utilities for the event-driven architecture.
 *
 * This module provides interfaces and implementations for publishing and
 * consuming domain events via message brokers (SNS, SQS, EventBridge, etc.).
 *
 * @example Publishing events
 * ```typescript
 * import { SnsEventPublisher } from '@reason-bridge/common/events';
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
 *
 * @example Subscribing to events
 * ```typescript
 * import { SqsEventSubscriber } from '@reason-bridge/common/events';
 *
 * const subscriber = new SqsEventSubscriber({
 *   queueUrl: process.env.SQS_QUEUE_URL!,
 *   region: process.env.AWS_REGION!,
 *   serviceName: 'discussion-service'
 * });
 *
 * subscriber.on('response.created', async (event, context) => {
 *   console.log('Processing response:', event.payload.responseId);
 *   return { success: true };
 * });
 *
 * await subscriber.start();
 * ```
 */

// EventPublisher exports
export type {
  EventPublisher,
  PublishOptions,
  PublishResult,
  SnsPublisherConfig,
} from './EventPublisher';

export { SnsEventPublisher } from './EventPublisher';

// EventSubscriber exports
export type {
  EventContext,
  EventHandler,
  ProcessingResult,
  SubscriptionConfig,
  SqsSubscriberConfig,
} from './EventSubscriber';

export { EventSubscriber, SqsEventSubscriber } from './EventSubscriber';

// Dead Letter Queue exports
export type {
  DlqHandlerConfig,
  DlqMessageHandler,
  DlqMessageMetadata,
  DlqMonitorConfig,
  DlqProcessingResult,
  DlqStats,
} from './DeadLetterQueueHandler';

export { DeadLetterQueueHandler, DlqMonitor } from './DeadLetterQueueHandler';
