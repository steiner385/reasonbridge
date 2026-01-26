/**
 * AWS Bedrock Client Implementation
 *
 * A wrapper around the AWS Bedrock Runtime SDK that provides
 * a simplified interface for AI completions.
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message as BedrockMessage,
  type ContentBlock,
  type ConversationRole,
} from '@aws-sdk/client-bedrock-runtime';

import type {
  AIClientConfig,
  IAIClient,
  CompletionRequest,
  CompletionResponse,
  StopReason,
} from '../types/index.js';
import { AIClientError } from '../types/index.js';

/**
 * Bedrock-specific configuration options.
 */
export interface BedrockClientConfig extends AIClientConfig {
  /** AWS credentials profile name (optional, uses default chain if not provided) */
  readonly profile?: string | undefined;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
  maxTokens: 4096,
  temperature: 0.7,
  timeoutMs: 30000,
} as const;

/**
 * Map Bedrock stop reasons to our StopReason type.
 */
function mapStopReason(reason: string | undefined): StopReason {
  switch (reason) {
    case 'end_turn':
      return 'end_turn';
    case 'max_tokens':
      return 'max_tokens';
    case 'stop_sequence':
      return 'stop_sequence';
    case 'content_filtered':
      return 'content_filtered';
    default:
      return 'unknown';
  }
}

/**
 * AWS Bedrock client wrapper.
 *
 * Provides a simplified interface for generating AI completions
 * using AWS Bedrock's Converse API.
 *
 * @example
 * ```typescript
 * const client = new BedrockClient({
 *   region: 'us-east-1',
 *   modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
 * });
 *
 * const response = await client.complete({
 *   systemPrompt: 'You are a helpful assistant.',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 *
 * // Response content: response.content
 * ```
 */
export class BedrockClient implements IAIClient {
  private readonly client: BedrockRuntimeClient;
  private readonly config: BedrockClientConfig;

  constructor(config: BedrockClientConfig) {
    this.config = config;
    this.client = new BedrockRuntimeClient({
      region: config.region,
    });
  }

  /**
   * Generate a completion using AWS Bedrock's Converse API.
   *
   * @param request - The completion request
   * @returns The completion response
   * @throws AIClientError on failure
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const maxTokens = request.maxTokens ?? this.config.maxTokens ?? DEFAULT_CONFIG.maxTokens;
    const temperature =
      request.temperature ?? this.config.temperature ?? DEFAULT_CONFIG.temperature;

    const messages: BedrockMessage[] = request.messages.map((msg) => ({
      role: msg.role as ConversationRole,
      content: [{ text: msg.content } as ContentBlock],
    }));

    try {
      const command = new ConverseCommand({
        modelId: this.config.modelId,
        messages,
        system: request.systemPrompt ? [{ text: request.systemPrompt }] : undefined,
        inferenceConfig: {
          maxTokens,
          temperature,
        },
      });

      const response = await this.client.send(command);

      const outputContent = response.output?.message?.content?.[0];
      const content = outputContent && 'text' in outputContent ? (outputContent.text ?? '') : '';

      return {
        content,
        usage: {
          inputTokens: response.usage?.inputTokens ?? 0,
          outputTokens: response.usage?.outputTokens ?? 0,
          totalTokens: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
        },
        stopReason: mapStopReason(response.stopReason),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if the client is configured and can reach AWS Bedrock.
   *
   * @returns true if ready, false otherwise
   */
  async isReady(): Promise<boolean> {
    // For now, just verify we have required configuration
    // A more robust check would make a lightweight API call
    return Boolean(this.config.region && this.config.modelId);
  }

  /**
   * Convert SDK errors to AIClientError.
   */
  private handleError(error: unknown): AIClientError {
    if (error instanceof Error) {
      const name = error.name;

      if (name === 'AccessDeniedException' || name === 'UnrecognizedClientException') {
        return new AIClientError(
          'Authentication failed. Check AWS credentials.',
          'AUTHENTICATION_ERROR',
          error,
        );
      }

      if (name === 'ThrottlingException' || name === 'ServiceQuotaExceededException') {
        return new AIClientError(
          'Rate limit exceeded. Try again later.',
          'RATE_LIMIT_ERROR',
          error,
        );
      }

      if (name === 'ModelTimeoutException' || name === 'TimeoutError') {
        return new AIClientError('Request timed out.', 'TIMEOUT_ERROR', error);
      }

      if (name === 'ValidationException' || name === 'ModelErrorException') {
        return new AIClientError(`Model error: ${error.message}`, 'MODEL_ERROR', error);
      }

      return new AIClientError(error.message, 'UNKNOWN_ERROR', error);
    }

    return new AIClientError('Unknown error occurred', 'UNKNOWN_ERROR');
  }
}
