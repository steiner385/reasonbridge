/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Queue configuration for moderation service
 * Provides environment-based configuration for AWS SNS/SQS integration
 */

export interface QueueConfig {
  /** AWS region for SNS/SQS */
  awsRegion: string;

  /** SNS topic ARN for publishing moderation events */
  snsTopicArn: string;

  /** SQS queue URL for consuming moderation events */
  sqsQueueUrl: string;

  /** SQS DLQ URL for handling failed messages */
  dlqUrl: string;

  /** Maximum messages to receive per poll */
  maxMessages: number;

  /** SQS long polling wait time in seconds */
  waitTimeSeconds: number;

  /** Message visibility timeout in seconds */
  visibilityTimeout: number;

  /** Whether to enable queue processing */
  enabled: boolean;

  /** Service name for event metadata */
  serviceName: string;
}

/**
 * Load queue configuration from environment variables
 */
export function loadQueueConfig(): QueueConfig {
  return {
    awsRegion: process.env['AWS_REGION'] || 'us-east-1',
    snsTopicArn: process.env['MODERATION_SNS_TOPIC_ARN'] || '',
    sqsQueueUrl: process.env['MODERATION_QUEUE_URL'] || '',
    dlqUrl: process.env['MODERATION_DLQ_URL'] || '',
    maxMessages: parseInt(process.env['QUEUE_MAX_MESSAGES'] || '10', 10),
    waitTimeSeconds: parseInt(process.env['QUEUE_WAIT_TIME_SECONDS'] || '20', 10),
    visibilityTimeout: parseInt(process.env['QUEUE_VISIBILITY_TIMEOUT'] || '120', 10),
    enabled: process.env['QUEUE_ENABLED'] === 'true',
    serviceName: 'moderation-service',
  };
}

/**
 * Validate queue configuration
 */
export function validateQueueConfig(config: QueueConfig): void {
  if (!config.enabled) {
    return;
  }

  const errors: string[] = [];

  if (!config.awsRegion) {
    errors.push('AWS_REGION is required');
  }

  if (!config.snsTopicArn) {
    errors.push('MODERATION_SNS_TOPIC_ARN is required');
  }

  if (!config.sqsQueueUrl) {
    errors.push('MODERATION_QUEUE_URL is required');
  }

  if (!config.dlqUrl) {
    errors.push('MODERATION_DLQ_URL is required');
  }

  if (errors.length > 0) {
    throw new Error(`Queue configuration errors:\n${errors.join('\n')}`);
  }
}
