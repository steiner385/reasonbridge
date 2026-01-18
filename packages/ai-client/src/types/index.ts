/**
 * AI Client Types
 *
 * Common types for AI client interactions.
 */

/**
 * Configuration options for AI clients.
 */
export interface AIClientConfig {
  /** AWS region for Bedrock service */
  readonly region: string;
  /** Model ID to use (e.g., 'anthropic.claude-3-sonnet-20240229-v1:0') */
  readonly modelId: string;
  /** Maximum tokens for response */
  readonly maxTokens?: number | undefined;
  /** Temperature for response generation (0-1) */
  readonly temperature?: number | undefined;
  /** Optional request timeout in milliseconds */
  readonly timeoutMs?: number | undefined;
}

/**
 * Message role in a conversation.
 */
export type MessageRole = 'user' | 'assistant';

/**
 * A message in a conversation.
 */
export interface Message {
  readonly role: MessageRole;
  readonly content: string;
}

/**
 * Request to generate a completion.
 */
export interface CompletionRequest {
  /** System prompt for the model */
  readonly systemPrompt?: string | undefined;
  /** Messages in the conversation */
  readonly messages: readonly Message[];
  /** Maximum tokens for this specific request (overrides config) */
  readonly maxTokens?: number | undefined;
  /** Temperature for this specific request (overrides config) */
  readonly temperature?: number | undefined;
}

/**
 * Response from a completion request.
 */
export interface CompletionResponse {
  /** The generated content */
  readonly content: string;
  /** Token usage information */
  readonly usage: TokenUsage;
  /** Stop reason */
  readonly stopReason: StopReason;
}

/**
 * Token usage statistics.
 */
export interface TokenUsage {
  /** Number of input tokens */
  readonly inputTokens: number;
  /** Number of output tokens */
  readonly outputTokens: number;
  /** Total tokens used */
  readonly totalTokens: number;
}

/**
 * Reason why the model stopped generating.
 */
export type StopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'content_filtered'
  | 'unknown';

/**
 * Error codes for AI client operations.
 */
export type AIClientErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'MODEL_ERROR'
  | 'TIMEOUT_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Error thrown by AI client operations.
 */
export class AIClientError extends Error {
  public override readonly name = 'AIClientError' as const;
  public readonly code: AIClientErrorCode;
  public override readonly cause?: Error | undefined;

  constructor(message: string, code: AIClientErrorCode, cause?: Error | undefined) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Interface for AI clients.
 */
export interface IAIClient {
  /**
   * Generate a completion for the given request.
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Check if the client is configured and ready.
   */
  isReady(): Promise<boolean>;
}
