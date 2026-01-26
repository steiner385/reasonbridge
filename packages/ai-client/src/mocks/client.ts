/**
 * Mock AI Client Implementation
 *
 * A mock implementation of IAIClient for testing purposes.
 * Supports configurable responses, delays, and error scenarios.
 */

import type {
  IAIClient,
  CompletionRequest,
  CompletionResponse,
  StopReason,
} from '../types/index.js';
import { AIClientError } from '../types/index.js';

/**
 * Configuration options for the mock client.
 */
export interface MockAIClientConfig {
  /** Mock response to return */
  readonly mockResponse?: string | undefined;
  /** Stop reason to return */
  readonly stopReason?: StopReason | undefined;
  /** Delay in milliseconds before responding */
  readonly delayMs?: number | undefined;
  /** Error to throw (if set, overrides normal response) */
  readonly error?: AIClientError | undefined;
  /** Whether the client should report as ready */
  readonly isReady?: boolean | undefined;
  /** Custom response generator function */
  readonly responseGenerator?: ((request: CompletionRequest) => string) | undefined;
}

/**
 * Default mock configuration.
 */
const DEFAULT_MOCK_CONFIG = {
  mockResponse: 'This is a mock AI response.',
  stopReason: 'end_turn' as StopReason,
  delayMs: 0,
  isReady: true,
} as const;

/**
 * Mock AI client for testing.
 *
 * Provides a configurable mock implementation of IAIClient that can simulate
 * various response scenarios, delays, and error conditions.
 *
 * @example
 * ```typescript
 * // Simple mock with default response
 * const client = new MockAIClient();
 *
 * // Mock with custom response
 * const customClient = new MockAIClient({
 *   mockResponse: 'Custom mock response',
 *   delayMs: 100,
 * });
 *
 * // Mock that throws an error
 * const errorClient = new MockAIClient({
 *   error: new AIClientError('Test error', 'MODEL_ERROR'),
 * });
 *
 * // Mock with dynamic response generator
 * const dynamicClient = new MockAIClient({
 *   responseGenerator: (req) => `You said: ${req.messages[0]?.content}`,
 * });
 * ```
 */
export class MockAIClient implements IAIClient {
  private readonly config: MockAIClientConfig;

  constructor(config: MockAIClientConfig = {}) {
    this.config = config;
  }

  /**
   * Generate a mock completion response.
   *
   * @param request - The completion request
   * @returns The mock completion response
   * @throws AIClientError if configured to throw an error
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Simulate delay if configured
    if (this.config.delayMs) {
      await this.delay(this.config.delayMs);
    }

    // Throw error if configured
    if (this.config.error) {
      throw this.config.error;
    }

    // Generate response content
    const content = this.generateContent(request);

    // Calculate mock token usage based on content length
    const inputTokens = this.estimateTokens(request.messages.map((m) => m.content).join(' '));
    const outputTokens = this.estimateTokens(content);

    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      stopReason: this.config.stopReason ?? DEFAULT_MOCK_CONFIG.stopReason,
    };
  }

  /**
   * Check if the mock client is ready.
   *
   * @returns true if configured as ready, false otherwise
   */
  async isReady(): Promise<boolean> {
    return this.config.isReady !== undefined ? this.config.isReady : DEFAULT_MOCK_CONFIG.isReady;
  }

  /**
   * Generate response content based on configuration or request.
   */
  private generateContent(request: CompletionRequest): string {
    // Use custom response generator if provided
    if (this.config.responseGenerator) {
      return this.config.responseGenerator(request);
    }

    // Use configured mock response or default
    return this.config.mockResponse !== undefined
      ? this.config.mockResponse
      : DEFAULT_MOCK_CONFIG.mockResponse;
  }

  /**
   * Estimate token count for a string (rough approximation).
   * Uses simple heuristic: ~4 characters per token.
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Delay execution for specified milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Pre-configured mock clients for common testing scenarios.
 */
export const MockScenarios = {
  /**
   * Standard successful response with default content.
   */
  success: () =>
    new MockAIClient({
      mockResponse: 'This is a successful mock response.',
      stopReason: 'end_turn',
    }),

  /**
   * Response that hits max tokens limit.
   */
  maxTokens: () =>
    new MockAIClient({
      mockResponse: 'This response was truncated due to max tokens.',
      stopReason: 'max_tokens',
    }),

  /**
   * Response with content filtering.
   */
  contentFiltered: () =>
    new MockAIClient({
      mockResponse: '[Content was filtered]',
      stopReason: 'content_filtered',
    }),

  /**
   * Response with artificial delay (useful for testing loading states).
   */
  delayed: (delayMs: number = 1000) =>
    new MockAIClient({
      mockResponse: 'This response was delayed.',
      stopReason: 'end_turn',
      delayMs,
    }),

  /**
   * Echo client that returns user's message.
   */
  echo: () =>
    new MockAIClient({
      responseGenerator: (req) => {
        const lastMessage = req.messages[req.messages.length - 1];
        return lastMessage ? `Echo: ${lastMessage.content}` : 'Echo: (no message)';
      },
      stopReason: 'end_turn',
    }),

  /**
   * Client that throws authentication error.
   */
  authError: () =>
    new MockAIClient({
      error: new AIClientError('Mock authentication failed', 'AUTHENTICATION_ERROR'),
    }),

  /**
   * Client that throws rate limit error.
   */
  rateLimitError: () =>
    new MockAIClient({
      error: new AIClientError('Mock rate limit exceeded', 'RATE_LIMIT_ERROR'),
    }),

  /**
   * Client that throws timeout error.
   */
  timeoutError: () =>
    new MockAIClient({
      error: new AIClientError('Mock request timed out', 'TIMEOUT_ERROR'),
    }),

  /**
   * Client that throws model error.
   */
  modelError: () =>
    new MockAIClient({
      error: new AIClientError('Mock model error occurred', 'MODEL_ERROR'),
    }),

  /**
   * Client that is not ready.
   */
  notReady: () =>
    new MockAIClient({
      isReady: false,
    }),
} as const;
