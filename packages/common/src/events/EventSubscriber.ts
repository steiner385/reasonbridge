/**
 * EventSubscriber base class and implementations for consuming domain events.
 *
 * This module provides abstractions for subscribing to and processing events
 * from message queues (SQS, RabbitMQ, etc.) in the event-driven architecture.
 */

import type { BaseEvent, EventEnvelope } from '@reason-bridge/event-schemas';

/**
 * Context provided to event handlers with metadata about the message
 */
export interface EventContext {
  /**
   * Unique message ID from the message broker
   */
  messageId: string;

  /**
   * Receipt handle for acknowledging/deleting the message (SQS-specific)
   */
  receiptHandle?: string;

  /**
   * Number of times this message has been received (for retry tracking)
   */
  receiveCount: number;

  /**
   * When the message was first sent to the queue
   */
  sentTimestamp?: Date;

  /**
   * Approximate time the message was first received from the queue
   */
  firstReceiveTimestamp?: Date;
}

/**
 * Result of processing an event
 */
export interface ProcessingResult {
  /**
   * Whether the event was processed successfully
   */
  success: boolean;

  /**
   * Optional error if processing failed
   */
  error?: Error;

  /**
   * Whether to retry the message (if supported by the broker)
   */
  shouldRetry?: boolean;
}

/**
 * Handler function for processing events
 */
export type EventHandler<TEvent extends BaseEvent = BaseEvent> = (
  event: TEvent,
  context: EventContext,
) => Promise<ProcessingResult | void>;

/**
 * Configuration for event subscription
 */
export interface SubscriptionConfig {
  /**
   * Maximum number of messages to receive in a single poll
   */
  maxMessages?: number;

  /**
   * Visibility timeout in seconds (how long message is hidden after receiving)
   */
  visibilityTimeout?: number;

  /**
   * Wait time for long polling in seconds (0-20)
   */
  waitTimeSeconds?: number;

  /**
   * Whether to automatically acknowledge messages after successful processing
   */
  autoAck?: boolean;
}

/**
 * Abstract base class for event subscribers.
 *
 * Provides a framework for consuming events from message queues with:
 * - Event deserialization from envelopes
 * - Handler registration by event type
 * - Automatic message acknowledgement
 * - Error handling and retry logic
 * - Graceful shutdown
 *
 * Subclasses must implement the broker-specific polling and acknowledgement logic.
 */
export abstract class EventSubscriber {
  protected handlers: Map<string, EventHandler[]> = new Map();
  protected isRunning = false;
  protected config: SubscriptionConfig;

  constructor(config: SubscriptionConfig = {}) {
    this.config = {
      maxMessages: 10,
      visibilityTimeout: 30,
      waitTimeSeconds: 20,
      autoAck: true,
      ...config,
    };
  }

  /**
   * Registers a handler for a specific event type.
   *
   * Multiple handlers can be registered for the same event type.
   * They will be executed sequentially in registration order.
   *
   * @param eventType - The event type to handle (e.g., 'response.created')
   * @param handler - The handler function to process the event
   */
  public on<TEvent extends BaseEvent>(eventType: string, handler: EventHandler<TEvent>): void {
    const existingHandlers = this.handlers.get(eventType) ?? [];
    existingHandlers.push(handler as EventHandler);
    this.handlers.set(eventType, existingHandlers);
  }

  /**
   * Removes a specific handler for an event type.
   *
   * @param eventType - The event type
   * @param handler - The handler to remove
   */
  public off<TEvent extends BaseEvent>(eventType: string, handler: EventHandler<TEvent>): void {
    const existingHandlers = this.handlers.get(eventType) ?? [];
    const filtered = existingHandlers.filter((h) => h !== handler);

    if (filtered.length > 0) {
      this.handlers.set(eventType, filtered);
    } else {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Starts polling for messages and processing events.
   *
   * Runs continuously until stop() is called.
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Subscriber is already running');
    }

    this.isRunning = true;
    await this.poll();
  }

  /**
   * Stops polling for new messages and waits for in-flight processing to complete.
   */
  public async stop(): Promise<void> {
    this.isRunning = false;
    await this.cleanup();
  }

  /**
   * Processes an event envelope by extracting the event and invoking registered handlers.
   *
   * @param envelope - The event envelope from the message broker
   * @param context - Message context with metadata
   * @returns Processing result indicating success/failure
   */
  protected async processEnvelope(
    envelope: EventEnvelope,
    context: EventContext,
  ): Promise<ProcessingResult> {
    const { event } = envelope;
    const handlers = this.handlers.get(event.type);

    if (!handlers || handlers.length === 0) {
      // No handlers registered - this is not an error, just skip
      return { success: true };
    }

    try {
      // Execute all handlers sequentially
      for (const handler of handlers) {
        const result = await handler(event, context);

        // If handler explicitly returns failure, stop processing
        if (result && !result.success) {
          return result;
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        shouldRetry: true,
      };
    }
  }

  /**
   * Subclass hook: Poll for messages from the message broker.
   *
   * Implementations should:
   * 1. Poll for messages using broker-specific API
   * 2. Parse message body as EventEnvelope
   * 3. Call processEnvelope() for each message
   * 4. Acknowledge successful messages (if autoAck is true)
   * 5. Handle failures appropriately (retry, DLQ, etc.)
   * 6. Continue polling while isRunning is true
   */
  protected abstract poll(): Promise<void>;

  /**
   * Subclass hook: Acknowledge successful message processing.
   *
   * @param messageId - The message ID to acknowledge
   * @param receiptHandle - Broker-specific receipt handle (e.g., SQS receipt handle)
   */
  protected abstract acknowledge(messageId: string, receiptHandle?: string): Promise<void>;

  /**
   * Subclass hook: Perform cleanup during shutdown.
   *
   * Implementations should wait for in-flight messages to complete
   * and release any resources.
   */
  protected abstract cleanup(): Promise<void>;
}

/**
 * Configuration for SQS-based EventSubscriber
 */
export interface SqsSubscriberConfig extends SubscriptionConfig {
  /**
   * URL of the SQS queue to poll
   */
  queueUrl: string;

  /**
   * AWS region for the SQS client
   */
  region: string;

  /**
   * Service name for logging/monitoring
   */
  serviceName: string;
}

/**
 * SQS-based implementation of EventSubscriber.
 *
 * Polls an AWS SQS queue for messages containing event envelopes.
 * Supports long polling, automatic acknowledgement, and graceful shutdown.
 *
 * Example usage:
 * ```typescript
 * const subscriber = new SqsEventSubscriber({
 *   queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/events',
 *   region: 'us-east-1',
 *   serviceName: 'discussion-service',
 *   maxMessages: 10,
 *   waitTimeSeconds: 20
 * });
 *
 * subscriber.on('response.created', async (event, context) => {
 *   console.log('Processing response:', event.payload.responseId);
 *   // Process the event...
 *   return { success: true };
 * });
 *
 * await subscriber.start();
 *
 * // Later, for graceful shutdown:
 * await subscriber.stop();
 * ```
 */
export class SqsEventSubscriber extends EventSubscriber {
  private readonly sqsConfig: SqsSubscriberConfig;
  private sqsClient: any; // SQSClient from @aws-sdk/client-sqs
  private inFlightMessages = 0;

  constructor(config: SqsSubscriberConfig) {
    super(config);
    this.sqsConfig = config;
  }

  /**
   * Lazy initialization of SQS client.
   * Only imports AWS SDK when actually needed.
   */
  private async getSqsClient(): Promise<any> {
    if (!this.sqsClient) {
      const { SQSClient } = await import('@aws-sdk/client-sqs');
      this.sqsClient = new SQSClient({ region: this.sqsConfig.region });
    }
    return this.sqsClient;
  }

  protected async poll(): Promise<void> {
    const client = await this.getSqsClient();
    const { ReceiveMessageCommand, DeleteMessageCommand } = await import('@aws-sdk/client-sqs');

    while (this.isRunning) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.sqsConfig.queueUrl,
          MaxNumberOfMessages: this.config.maxMessages,
          WaitTimeSeconds: this.config.waitTimeSeconds,
          VisibilityTimeout: this.config.visibilityTimeout,
          MessageAttributeNames: ['All'],
        });

        const response = await client.send(command);

        if (!response.Messages || response.Messages.length === 0) {
          continue; // No messages, continue polling
        }

        // Process messages concurrently
        const processingPromises = response.Messages.map(async (message: any) => {
          this.inFlightMessages++;
          try {
            const envelope = JSON.parse(message.Body ?? '{}') as EventEnvelope;

            const context: EventContext = {
              messageId: message.MessageId!,
              receiptHandle: message.ReceiptHandle,
              receiveCount: 1, // SQS doesn't expose this easily without attributes
              ...(message.Attributes?.SentTimestamp && {
                sentTimestamp: new Date(parseInt(message.Attributes.SentTimestamp, 10)),
              }),
              ...(message.Attributes?.ApproximateFirstReceiveTimestamp && {
                firstReceiveTimestamp: new Date(
                  parseInt(message.Attributes.ApproximateFirstReceiveTimestamp, 10),
                ),
              }),
            };

            const result = await this.processEnvelope(envelope, context);

            // Acknowledge message if processing succeeded and autoAck is enabled
            if (result.success && this.config.autoAck && message.ReceiptHandle) {
              await this.acknowledge(message.MessageId!, message.ReceiptHandle);
            }

            // If processing failed and shouldn't retry, acknowledge to remove from queue
            if (
              !result.success &&
              !result.shouldRetry &&
              this.config.autoAck &&
              message.ReceiptHandle
            ) {
              await this.acknowledge(message.MessageId!, message.ReceiptHandle);
            }

            // If shouldRetry is true, message will become visible again after timeout
          } catch (error) {
            // Failed to parse or process message - log but continue polling
            console.error(`Error processing message ${message.MessageId}:`, error);
          } finally {
            this.inFlightMessages--;
          }
        });

        await Promise.all(processingPromises);
      } catch (error) {
        console.error('Error polling SQS queue:', error);
        // Wait a bit before retrying on polling errors
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  protected async acknowledge(messageId: string, receiptHandle?: string): Promise<void> {
    if (!receiptHandle) {
      return;
    }

    const client = await this.getSqsClient();
    const { DeleteMessageCommand } = await import('@aws-sdk/client-sqs');

    const command = new DeleteMessageCommand({
      QueueUrl: this.sqsConfig.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await client.send(command);
  }

  protected async cleanup(): Promise<void> {
    // Wait for in-flight messages to complete (with timeout)
    const maxWaitMs = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.inFlightMessages > 0 && Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.inFlightMessages > 0) {
      console.warn(
        `Shutdown timeout: ${this.inFlightMessages} messages still in flight after ${maxWaitMs}ms`,
      );
    }
  }
}
