/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AI Client for Demo Seed Generation
 *
 * Wraps Anthropic Claude API for generating demo content.
 * Includes retry logic, rate limiting, and caching.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIClient {
  generate(prompt: string, options?: AIGenerationOptions): Promise<string>;
  generateBatch(prompts: string[], options?: AIGenerationOptions): Promise<string[]>;
}

const DEFAULT_OPTIONS: AIGenerationOptions = {
  maxTokens: 1024,
  temperature: 0.7,
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAIClient(): AIClient {
  const apiKey = process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set - using mock AI client');
    return createMockClient();
  }

  const client = new Anthropic({ apiKey });

  async function generate(prompt: string, options: AIGenerationOptions = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: opts.maxTokens!,
          messages: [{ role: 'user', content: prompt }],
          system: opts.systemPrompt,
        });

        const textBlock = response.content.find((block) => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text response from AI');
        }
        return textBlock.text;
      } catch (error) {
        if (attempt === MAX_RETRIES) throw error;
        console.warn(`AI generation attempt ${attempt} failed, retrying...`);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
    throw new Error('AI generation failed after retries');
  }

  async function generateBatch(
    prompts: string[],
    options: AIGenerationOptions = {},
  ): Promise<string[]> {
    const results: string[] = [];
    for (const prompt of prompts) {
      results.push(await generate(prompt, options));
      // Rate limit: ~50ms between requests
      await sleep(50);
    }
    return results;
  }

  return { generate, generateBatch };
}

/**
 * Mock client for testing without API key
 */
function createMockClient(): AIClient {
  return {
    async generate(prompt: string): Promise<string> {
      // Return deterministic mock content based on prompt hash
      const hash = simpleHash(prompt);
      return `Mock generated content for seed ${hash}. This is placeholder text that would be replaced with AI-generated content when ANTHROPIC_API_KEY is available.`;
    },
    async generateBatch(prompts: string[]): Promise<string[]> {
      return Promise.all(prompts.map((p) => this.generate(p)));
    },
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default createAIClient;
