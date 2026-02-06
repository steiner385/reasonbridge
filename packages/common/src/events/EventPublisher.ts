/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * EventPublisher interface and implementations for publishing domain events.
 *
 * This module provides an abstraction for publishing events to various
 * message brokers (SNS, EventBridge, etc.) used in the event-driven architecture.
 */

import type { BaseEvent, EventEnvelope } from '@reason-bridge/event-schemas';

/**
 * Configuration for publishing events
 */
export interface PublishOptions {
  /**
   * Message deduplication ID for FIFO topics/queues.
   * Required for exactly-once delivery semantics.
   */
  deduplicationId?: string;

  /**
   * Message group ID for FIFO topics/queues.
   * Events with the same group ID are processed in order.
   */
  messageGroupId?: string;

  /**
   * Additional attributes to attach to the message for filtering
   */
  attributes?: Record<string, string>;
}

/**
 * Result of publishing an event
 */
export interface PublishResult {
  /**
   * Message ID assigned by the message broker
   */
  messageId: string;

  /**
   * Sequence number (for FIFO topics/queues)
   */
  sequenceNumber?: string;
}

/**
 * Interface for publishing domain events to a message broker.
 *
 * Implementations should handle:
 * - Event serialization
 * - Error handling and retries
 * - Message deduplication (for FIFO queues)
 * - Message ordering (via message group IDs)
 */
export interface EventPublisher {
  /**
   * Publishes a domain event to the configured topic/exchange.
   *
   * @param event - The domain event to publish
   * @param options - Optional publishing configuration
   * @returns Promise resolving to publish result with message ID
   * @throws {Error} If publishing fails after retries
   */
  publish<TEvent extends BaseEvent>(
    event: TEvent,
    options?: PublishOptions,
  ): Promise<PublishResult>;

  /**
   * Publishes multiple events in a batch for efficiency.
   * Implementations may support partial success.
   *
   * @param events - Array of events to publish
   * @param options - Optional publishing configuration applied to all events
   * @returns Promise resolving to array of results (same order as input)
   * @throws {Error} If batch publishing fails
   */
  publishBatch<TEvent extends BaseEvent>(
    events: TEvent[],
    options?: PublishOptions,
  ): Promise<PublishResult[]>;
}

/**
 * Configuration for SNS-based EventPublisher
 */
export interface SnsPublisherConfig {
  /**
   * ARN of the SNS topic to publish to
   */
  topicArn: string;

  /**
   * AWS region for the SNS client
   */
  region: string;

  /**
   * Service name to include in event metadata
   */
  serviceName: string;
}

/**
 * SNS-based implementation of EventPublisher.
 *
 * Publishes events to an AWS SNS topic. Requires AWS SDK credentials
 * to be configured in the environment (via environment variables,
 * EC2 instance profile, or ECS task role).
 *
 * Example usage:
 * ```typescript
 * const publisher = new SnsEventPublisher({
 *   topicArn: 'arn:aws:sns:us-east-1:123456789012:events',
 *   region: 'us-east-1',
 *   serviceName: 'discussion-service'
 * });
 *
 * await publisher.publish({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   type: 'response.created',
 *   timestamp: new Date().toISOString(),
 *   version: 1,
 *   payload: { responseId: 'resp-123', ... },
 *   metadata: { source: 'discussion-service' }
 * });
 * ```
 */
export class SnsEventPublisher implements EventPublisher {
  private readonly config: SnsPublisherConfig;
  private snsClient: any; // SNSClient from @aws-sdk/client-sns

  constructor(config: SnsPublisherConfig) {
    this.config = config;
  }

  /**
   * Lazy initialization of SNS client.
   * Only imports AWS SDK when actually needed.
   */
  private async getSnsClient(): Promise<any> {
    if (!this.snsClient) {
      const { SNSClient } = await import('@aws-sdk/client-sns');
      this.snsClient = new SNSClient({ region: this.config.region });
    }
    return this.snsClient;
  }

  async publish<TEvent extends BaseEvent>(
    event: TEvent,
    options?: PublishOptions,
  ): Promise<PublishResult> {
    const client = await this.getSnsClient();
    const { PublishCommand } = await import('@aws-sdk/client-sns');

    // Enrich event metadata with source service
    const enrichedEvent: TEvent = {
      ...event,
      metadata: {
        ...event.metadata,
        source: event.metadata?.source ?? this.config.serviceName,
      },
    };

    // Wrap event in envelope for transport
    const envelope: EventEnvelope<TEvent> = {
      event: enrichedEvent,
      ...(options?.deduplicationId !== undefined && { deduplicationId: options.deduplicationId }),
      ...(options?.messageGroupId !== undefined && { messageGroupId: options.messageGroupId }),
    };

    // Build message attributes for filtering
    const messageAttributes: Record<string, any> = {
      eventType: {
        DataType: 'String',
        StringValue: event.type,
      },
      version: {
        DataType: 'Number',
        StringValue: String(event.version),
      },
    };

    // Add custom attributes
    if (options?.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        messageAttributes[key] = {
          DataType: 'String',
          StringValue: value,
        };
      }
    }

    const command = new PublishCommand({
      TopicArn: this.config.topicArn,
      Message: JSON.stringify(envelope),
      MessageAttributes: messageAttributes,
      MessageDeduplicationId: options?.deduplicationId,
      MessageGroupId: options?.messageGroupId,
    });

    const response = await client.send(command);

    return {
      messageId: response.MessageId!,
      sequenceNumber: response.SequenceNumber,
    };
  }

  async publishBatch<TEvent extends BaseEvent>(
    events: TEvent[],
    options?: PublishOptions,
  ): Promise<PublishResult[]> {
    // SNS doesn't have native batch publishing, so publish sequentially
    // For better performance, services should use SQS batch publishing
    // or implement parallel publishing with Promise.all
    const results: PublishResult[] = [];

    for (const event of events) {
      const result = await this.publish(event, options);
      results.push(result);
    }

    return results;
  }
}
