/**
 * Queue service for managing event publishing and subscription
 */

import { Injectable, Logger } from '@nestjs/common';
import { SnsEventPublisher } from '@reason-bridge/common';
import { SqsEventSubscriber } from '@reason-bridge/common';
import { DeadLetterQueueHandler } from '@reason-bridge/common';
import type { BaseEvent } from '@reason-bridge/event-schemas';
import type { EventHandler } from '@reason-bridge/common';
import type { QueueConfig } from './queue.config.js';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private publisher: SnsEventPublisher | null = null;
  private subscriber: SqsEventSubscriber | null = null;
  private dlqHandler: DeadLetterQueueHandler | null = null;

  constructor(private readonly config: QueueConfig) {}

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Queue service is disabled');
      return;
    }

    try {
      // Initialize event publisher
      this.publisher = new SnsEventPublisher({
        topicArn: this.config.snsTopicArn,
        region: this.config.awsRegion,
        serviceName: this.config.serviceName,
      });

      this.logger.log(`Event publisher initialized for topic: ${this.config.snsTopicArn}`);

      // Initialize event subscriber
      this.subscriber = new SqsEventSubscriber({
        queueUrl: this.config.sqsQueueUrl,
        region: this.config.awsRegion,
        serviceName: this.config.serviceName,
        maxMessages: this.config.maxMessages,
        waitTimeSeconds: this.config.waitTimeSeconds,
        visibilityTimeout: this.config.visibilityTimeout,
      });

      this.logger.log(`Event subscriber initialized for queue: ${this.config.sqsQueueUrl}`);

      // Initialize DLQ handler
      this.dlqHandler = new DeadLetterQueueHandler({
        dlqUrl: this.config.dlqUrl,
        region: this.config.awsRegion,
        serviceName: this.config.serviceName,
      });

      this.logger.log(`DLQ handler initialized for queue: ${this.config.dlqUrl}`);
    } catch (error) {
      this.logger.error('Failed to initialize queue service', error);
      throw error;
    }
  }

  /**
   * Publish an event to SNS topic
   */
  async publishEvent<TEvent extends BaseEvent>(event: TEvent): Promise<string> {
    if (!this.publisher) {
      this.logger.warn('Publisher not initialized, skipping event publication');
      return '';
    }

    try {
      const result = await this.publisher.publish(event);
      this.logger.debug(`Event published: ${event.type} (messageId: ${result.messageId})`);
      return result.messageId;
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Register an event handler for a specific event type
   */
  registerEventHandler<TEvent extends BaseEvent>(
    eventType: string,
    handler: EventHandler<TEvent>,
  ): void {
    if (!this.subscriber) {
      this.logger.warn('Subscriber not initialized, cannot register handler');
      return;
    }

    this.subscriber.on(eventType, handler);
    this.logger.debug(`Event handler registered for: ${eventType}`);
  }

  /**
   * Start consuming events from the queue
   */
  async startConsuming(): Promise<void> {
    if (!this.subscriber) {
      this.logger.warn('Subscriber not initialized, cannot start consuming');
      return;
    }

    try {
      await this.subscriber.start();
      this.logger.log('Started consuming events from moderation queue');
    } catch (error) {
      this.logger.error('Failed to start event subscriber', error);
      throw error;
    }
  }

  /**
   * Stop consuming events from the queue
   */
  async stopConsuming(): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    try {
      await this.subscriber.stop();
      this.logger.log('Stopped consuming events from moderation queue');
    } catch (error) {
      this.logger.error('Failed to stop event subscriber', error);
      throw error;
    }
  }

  /**
   * Get queue health status
   */
  getHealthStatus(): Record<string, boolean> {
    return {
      publisherReady: this.publisher !== null,
      subscriberReady: this.subscriber !== null,
      dlqHandlerReady: this.dlqHandler !== null,
      enabled: this.config.enabled,
    };
  }

  /**
   * Get queue configuration
   */
  getConfig(): QueueConfig {
    return this.config;
  }
}
