/**
 * Dead Letter Queue (DLQ) handler for processing failed messages.
 *
 * This module provides functionality for:
 * - Moving failed messages to a dead-letter queue
 * - Processing and analyzing failed messages
 * - Retrying messages from the DLQ
 * - Monitoring DLQ metrics
 */

import type { BaseEvent, EventEnvelope } from '@unite-discord/event-schemas';
import type { EventContext, ProcessingResult } from './EventSubscriber.js';

/**
 * Metadata about a failed message in the DLQ
 */
export interface DlqMessageMetadata {
  /**
   * Original queue URL where the message failed
   */
  sourceQueueUrl: string;

  /**
   * Number of times the message has been processed
   */
  receiveCount: number;

  /**
   * When the message first entered the source queue
   */
  originalTimestamp: Date;

  /**
   * When the message was moved to the DLQ
   */
  dlqTimestamp: Date;

  /**
   * The error that caused the message to be moved to DLQ
   */
  errorMessage?: string;

  /**
   * Stack trace of the error (if available)
   */
  errorStack?: string;

  /**
   * Event type that failed
   */
  eventType: string;

  /**
   * Event ID for tracking
   */
  eventId: string;
}

/**
 * Handler function for processing DLQ messages
 */
export type DlqMessageHandler = (
  envelope: EventEnvelope,
  metadata: DlqMessageMetadata,
  context: EventContext,
) => Promise<DlqProcessingResult>;

/**
 * Result of processing a DLQ message
 */
export interface DlqProcessingResult extends ProcessingResult {
  /**
   * Whether the message should be moved back to the source queue
   */
  shouldRequeue?: boolean;

  /**
   * Whether the message should be permanently deleted from DLQ
   */
  shouldDelete?: boolean;
}

/**
 * Configuration for DLQ handler
 */
export interface DlqHandlerConfig {
  /**
   * URL of the dead-letter queue
   */
  dlqUrl: string;

  /**
   * AWS region
   */
  region: string;

  /**
   * Service name for logging
   */
  serviceName: string;

  /**
   * Maximum number of messages to receive in a single poll
   */
  maxMessages?: number;

  /**
   * Wait time for long polling (0-20 seconds)
   */
  waitTimeSeconds?: number;

  /**
   * Visibility timeout in seconds
   */
  visibilityTimeout?: number;

  /**
   * Maximum number of times to retry processing a DLQ message
   */
  maxRetries?: number;

  /**
   * Whether to automatically delete successfully processed DLQ messages
   */
  autoDelete?: boolean;
}

/**
 * Statistics about DLQ processing
 */
export interface DlqStats {
  /**
   * Total messages processed
   */
  totalProcessed: number;

  /**
   * Messages successfully requeued
   */
  requeued: number;

  /**
   * Messages permanently deleted
   */
  deleted: number;

  /**
   * Messages that failed processing
   */
  failed: number;

  /**
   * Messages still pending
   */
  pending: number;
}

/**
 * Dead Letter Queue Handler for processing failed messages.
 *
 * Provides functionality for:
 * - Polling DLQ for failed messages
 * - Extracting failure metadata
 * - Requeuing messages to source queue after fixes
 * - Permanently deleting poison messages
 * - Monitoring and alerting on DLQ depth
 *
 * Example usage:
 * ```typescript
 * const dlqHandler = new DeadLetterQueueHandler({
 *   dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/events-dlq',
 *   region: 'us-east-1',
 *   serviceName: 'discussion-service'
 * });
 *
 * dlqHandler.onMessage(async (envelope, metadata, context) => {
 *   // Analyze the failure
 *   console.log('Failed event:', metadata.eventType, metadata.errorMessage);
 *
 *   // Decide what to do
 *   if (metadata.receiveCount < 3) {
 *     return { success: true, shouldRequeue: true }; // Try again
 *   } else {
 *     return { success: true, shouldDelete: true }; // Give up
 *   }
 * });
 *
 * await dlqHandler.start();
 * ```
 */
export class DeadLetterQueueHandler {
  private readonly config: Required<DlqHandlerConfig>;
  private sqsClient: any; // SQSClient from @aws-sdk/client-sqs
  private isRunning = false;
  private handler?: DlqMessageHandler;
  private stats: DlqStats = {
    totalProcessed: 0,
    requeued: 0,
    deleted: 0,
    failed: 0,
    pending: 0,
  };

  constructor(config: DlqHandlerConfig) {
    this.config = {
      maxMessages: 10,
      waitTimeSeconds: 20,
      visibilityTimeout: 30,
      maxRetries: 3,
      autoDelete: true,
      ...config,
    };
  }

  /**
   * Register a handler for processing DLQ messages
   */
  onMessage(handler: DlqMessageHandler): void {
    this.handler = handler;
  }

  /**
   * Get current DLQ statistics
   */
  getStats(): DlqStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      requeued: 0,
      deleted: 0,
      failed: 0,
      pending: 0,
    };
  }

  /**
   * Get the approximate number of messages in the DLQ
   */
  async getQueueDepth(): Promise<number> {
    const client = await this.getSqsClient();
    const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs');

    const command = new GetQueueAttributesCommand({
      QueueUrl: this.config.dlqUrl,
      AttributeNames: ['ApproximateNumberOfMessages'],
    });

    const response = await client.send(command);
    return parseInt(response.Attributes?.ApproximateNumberOfMessages ?? '0', 10);
  }

  /**
   * Start polling the DLQ for messages
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('DLQ handler is already running');
    }

    if (!this.handler) {
      throw new Error('No message handler registered. Call onMessage() first.');
    }

    this.isRunning = true;
    await this.poll();
  }

  /**
   * Stop polling the DLQ
   */
  async stop(): Promise<void> {
    this.isRunning = false;
  }

  /**
   * Lazy initialization of SQS client
   */
  private async getSqsClient() {
    if (!this.sqsClient) {
      const { SQSClient } = await import('@aws-sdk/client-sqs');
      this.sqsClient = new SQSClient({ region: this.config.region });
    }
    return this.sqsClient;
  }

  /**
   * Poll the DLQ for messages
   */
  private async poll(): Promise<void> {
    const client = await this.getSqsClient();
    const { ReceiveMessageCommand } = await import('@aws-sdk/client-sqs');

    while (this.isRunning) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.config.dlqUrl,
          MaxNumberOfMessages: this.config.maxMessages,
          WaitTimeSeconds: this.config.waitTimeSeconds,
          VisibilityTimeout: this.config.visibilityTimeout,
          MessageAttributeNames: ['All'],
          AttributeNames: ['All'],
        });

        const response = await client.send(command);

        if (!response.Messages || response.Messages.length === 0) {
          continue; // No messages, continue polling
        }

        // Update pending count
        this.stats.pending = response.Messages.length;

        // Process messages sequentially to avoid overwhelming the system
        for (const message of response.Messages) {
          await this.processMessage(message);
        }
      } catch (error) {
        console.error(`[${this.config.serviceName}] Error polling DLQ:`, error);
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process a single message from the DLQ
   */
  private async processMessage(message: any): Promise<void> {
    try {
      // Parse the message body
      const envelope = JSON.parse(message.Body ?? '{}') as EventEnvelope;

      // Extract metadata
      const metadata = this.extractMetadata(message, envelope);

      // Create context
      const context: EventContext = {
        messageId: message.MessageId ?? 'unknown',
        receiptHandle: message.ReceiptHandle,
        receiveCount: parseInt(message.Attributes?.ApproximateReceiveCount ?? '1', 10),
        ...(message.Attributes?.SentTimestamp && {
          sentTimestamp: new Date(parseInt(message.Attributes.SentTimestamp, 10)),
        }),
        ...(message.Attributes?.ApproximateFirstReceiveTimestamp && {
          firstReceiveTimestamp: new Date(
            parseInt(message.Attributes.ApproximateFirstReceiveTimestamp, 10),
          ),
        }),
      };

      this.stats.totalProcessed++;

      // Call the handler
      if (!this.handler) {
        throw new Error('No handler registered');
      }

      const result = await this.handler(envelope, metadata, context);

      // Handle the result
      if (result.success) {
        if (result.shouldRequeue) {
          await this.requeueMessage(envelope, metadata);
          this.stats.requeued++;
        } else if (result.shouldDelete || this.config.autoDelete) {
          await this.deleteMessage(message.ReceiptHandle);
          this.stats.deleted++;
        }
      } else {
        this.stats.failed++;
        // Don't delete failed messages - let them retry
        console.error(
          `[${this.config.serviceName}] Failed to process DLQ message ${context.messageId}:`,
          result.error,
        );
      }
    } catch (error) {
      console.error(`[${this.config.serviceName}] Error processing DLQ message:`, error);
      this.stats.failed++;
    }
  }

  /**
   * Extract metadata from a DLQ message
   */
  private extractMetadata(message: any, envelope: EventEnvelope): DlqMessageMetadata {
    const event = envelope.event;

    return {
      sourceQueueUrl: message.MessageAttributes?.SourceQueueUrl?.StringValue ?? 'unknown',
      receiveCount: parseInt(message.Attributes?.ApproximateReceiveCount ?? '1', 10),
      originalTimestamp: message.Attributes?.SentTimestamp
        ? new Date(parseInt(message.Attributes.SentTimestamp, 10))
        : new Date(),
      dlqTimestamp: message.Attributes?.ApproximateFirstReceiveTimestamp
        ? new Date(parseInt(message.Attributes.ApproximateFirstReceiveTimestamp, 10))
        : new Date(),
      errorMessage: message.MessageAttributes?.ErrorMessage?.StringValue,
      errorStack: message.MessageAttributes?.ErrorStack?.StringValue,
      eventType: event.type,
      eventId: event.id,
    };
  }

  /**
   * Requeue a message back to its source queue
   */
  private async requeueMessage(
    envelope: EventEnvelope,
    metadata: DlqMessageMetadata,
  ): Promise<void> {
    const client = await this.getSqsClient();
    const { SendMessageCommand } = await import('@aws-sdk/client-sqs');

    const command = new SendMessageCommand({
      QueueUrl: metadata.sourceQueueUrl,
      MessageBody: JSON.stringify(envelope),
      MessageAttributes: {
        RequeuedFromDLQ: {
          DataType: 'String',
          StringValue: 'true',
        },
        OriginalTimestamp: {
          DataType: 'String',
          StringValue: metadata.originalTimestamp.toISOString(),
        },
        DLQTimestamp: {
          DataType: 'String',
          StringValue: metadata.dlqTimestamp.toISOString(),
        },
        ReceiveCount: {
          DataType: 'Number',
          StringValue: metadata.receiveCount.toString(),
        },
      },
    });

    await client.send(command);
    console.log(
      `[${this.config.serviceName}] Requeued message ${metadata.eventId} to ${metadata.sourceQueueUrl}`,
    );
  }

  /**
   * Delete a message from the DLQ
   */
  private async deleteMessage(receiptHandle?: string): Promise<void> {
    if (!receiptHandle) {
      return;
    }

    const client = await this.getSqsClient();
    const { DeleteMessageCommand } = await import('@aws-sdk/client-sqs');

    const command = new DeleteMessageCommand({
      QueueUrl: this.config.dlqUrl,
      ReceiptHandle: receiptHandle,
    });

    await client.send(command);
  }
}

/**
 * Configuration for monitoring DLQ depth
 */
export interface DlqMonitorConfig {
  /**
   * URL of the dead-letter queue
   */
  dlqUrl: string;

  /**
   * AWS region
   */
  region: string;

  /**
   * Threshold for alerting (number of messages)
   */
  threshold?: number;

  /**
   * Check interval in milliseconds
   */
  checkInterval?: number;
}

/**
 * Monitor for DLQ depth and alerting.
 *
 * Periodically checks the DLQ depth and triggers callbacks when thresholds are exceeded.
 *
 * Example usage:
 * ```typescript
 * const monitor = new DlqMonitor({
 *   dlqUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/events-dlq',
 *   region: 'us-east-1',
 *   threshold: 100,
 *   checkInterval: 60000 // Check every minute
 * });
 *
 * monitor.onThresholdExceeded((depth) => {
 *   console.error(`DLQ depth exceeded threshold: ${depth} messages`);
 *   // Send alert to monitoring system
 * });
 *
 * await monitor.start();
 * ```
 */
export class DlqMonitor {
  private readonly config: Required<DlqMonitorConfig>;
  private sqsClient: any;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | undefined;
  private thresholdCallback?: (depth: number) => void | Promise<void>;

  constructor(config: DlqMonitorConfig) {
    this.config = {
      threshold: 100,
      checkInterval: 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Register a callback for when the threshold is exceeded
   */
  onThresholdExceeded(callback: (depth: number) => void | Promise<void>): void {
    this.thresholdCallback = callback;
  }

  /**
   * Start monitoring the DLQ
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('DLQ monitor is already running');
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => this.checkDepth(), this.config.checkInterval);

    // Check immediately on start
    await this.checkDepth();
  }

  /**
   * Stop monitoring the DLQ
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Lazy initialization of SQS client
   */
  private async getSqsClient() {
    if (!this.sqsClient) {
      const { SQSClient } = await import('@aws-sdk/client-sqs');
      this.sqsClient = new SQSClient({ region: this.config.region });
    }
    return this.sqsClient;
  }

  /**
   * Check the DLQ depth and trigger callback if threshold exceeded
   */
  private async checkDepth(): Promise<void> {
    try {
      const client = await this.getSqsClient();
      const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs');

      const command = new GetQueueAttributesCommand({
        QueueUrl: this.config.dlqUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      });

      const response = await client.send(command);
      const depth = parseInt(response.Attributes?.ApproximateNumberOfMessages ?? '0', 10);

      if (depth > this.config.threshold && this.thresholdCallback) {
        await this.thresholdCallback(depth);
      }
    } catch (error) {
      console.error('Error checking DLQ depth:', error);
    }
  }
}
