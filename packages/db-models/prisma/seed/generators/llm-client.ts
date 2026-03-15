/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LLM Client Wrapper for Seeding
 *
 * Provides JSON generation with retry logic and rate limiting
 * for the seeding framework.
 */

import { BedrockClient } from '@reason-bridge/ai-client';

const DEFAULT_MODEL = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.7;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 500;

export interface LLMClientConfig {
  modelId?: string;
  region?: string;
  maxTokens?: number;
  temperature?: number;
}

export class SeedingLLMClient {
  private client: BedrockClient;
  private config: Required<LLMClientConfig>;
  private lastRequestTime = 0;

  constructor(config: LLMClientConfig = {}) {
    this.config = {
      modelId: config.modelId ?? DEFAULT_MODEL,
      region: config.region ?? DEFAULT_REGION,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    };

    this.client = new BedrockClient({
      region: this.config.region,
      modelId: this.config.modelId,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });
  }

  /**
   * Generate a JSON response from the LLM.
   *
   * @param prompt - The prompt to send
   * @param schema - Expected JSON schema (for documentation)
   * @returns Parsed JSON response
   */
  async generateJSON<T>(prompt: string, schema: Record<string, unknown>): Promise<T> {
    const systemPrompt = `You are a data generator for a discussion platform.
Generate realistic, topic-specific content.
IMPORTANT: Respond ONLY with valid JSON matching the requested schema.
Do not include markdown code blocks or any other text.`;

    const fullPrompt = `${prompt}

Output Schema:
${JSON.stringify(schema, null, 2)}

Respond with valid JSON only:`;

    return this.executeWithRetry(async () => {
      await this.enforceRateLimit();

      const response = await this.client.complete({
        systemPrompt,
        messages: [{ role: 'user', content: fullPrompt }],
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      // Parse JSON, handling potential markdown code blocks
      let content = response.content.trim();
      if (content.startsWith('```json')) {
        content = content.slice(7);
      }
      if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }

      return JSON.parse(content.trim()) as T;
    });
  }

  /**
   * Execute a function with retry logic.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // eslint-disable-next-line no-console -- Intentional retry logging for seeding operations
        console.warn(`Attempt ${attempt}/${RETRY_ATTEMPTS} failed: ${lastError.message}`);

        if (attempt < RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('All retry attempts failed');
  }

  /**
   * Enforce rate limiting between requests.
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await this.sleep(RATE_LIMIT_DELAY_MS - elapsed);
    }

    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.client.destroy();
  }
}

/**
 * Create a seeding LLM client with default configuration.
 */
export function createSeedingClient(config?: LLMClientConfig): SeedingLLMClient {
  return new SeedingLLMClient(config);
}
