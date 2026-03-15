/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { SeedingLLMClient, createSeedingClient } from '../generators/llm-client.js';

// Define mock client type
interface MockBedrockClient {
  complete: Mock;
  destroy: Mock;
}

// Track the mock complete function for test manipulation
let mockComplete: Mock;
let mockDestroy: Mock;

// Mock the ai-client module
vi.mock('@reason-bridge/ai-client', () => ({
  BedrockClient: vi.fn().mockImplementation(() => {
    mockComplete = vi.fn().mockResolvedValue({
      content: '{"test": "data"}',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      stopReason: 'end_turn',
    });
    mockDestroy = vi.fn();
    return {
      complete: mockComplete,
      destroy: mockDestroy,
    } as MockBedrockClient;
  }),
}));

describe('SeedingLLMClient', () => {
  let client: SeedingLLMClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createSeedingClient();
  });

  afterEach(() => {
    client.destroy();
  });

  describe('createSeedingClient', () => {
    it('should create a client with default configuration', () => {
      const newClient = createSeedingClient();
      expect(newClient).toBeInstanceOf(SeedingLLMClient);
      newClient.destroy();
    });

    it('should create a client with custom configuration', () => {
      const customClient = createSeedingClient({
        modelId: 'custom-model',
        region: 'us-west-2',
        maxTokens: 4096,
        temperature: 0.5,
      });
      expect(customClient).toBeInstanceOf(SeedingLLMClient);
      customClient.destroy();
    });
  });

  describe('generateJSON', () => {
    it('should generate JSON response', async () => {
      const result = await client.generateJSON<{ test: string }>('test prompt', {
        test: 'string',
      });
      expect(result).toEqual({ test: 'data' });
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      // Create a new client with markdown-wrapped response
      mockComplete.mockResolvedValueOnce({
        content: '```json\n{"wrapped": "value"}\n```',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        stopReason: 'end_turn',
      });

      const result = await client.generateJSON<{ wrapped: string }>('test prompt', {
        wrapped: 'string',
      });
      expect(result).toEqual({ wrapped: 'value' });
    });

    it('should handle plain code blocks', async () => {
      mockComplete.mockResolvedValueOnce({
        content: '```\n{"plain": "block"}\n```',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        stopReason: 'end_turn',
      });

      const result = await client.generateJSON<{ plain: string }>('test prompt', {
        plain: 'string',
      });
      expect(result).toEqual({ plain: 'block' });
    });
  });

  describe('retry logic', () => {
    it('should retry on failure and eventually succeed', async () => {
      let callCount = 0;
      mockComplete.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          content: '{"retry": "success"}',
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          stopReason: 'end_turn',
        });
      });

      const result = await client.generateJSON<{ retry: string }>('test prompt', {
        retry: 'string',
      });
      expect(result).toEqual({ retry: 'success' });
      expect(callCount).toBe(3);
    });

    it('should throw after all retry attempts fail', async () => {
      mockComplete.mockRejectedValue(new Error('Persistent failure'));

      await expect(client.generateJSON('test prompt', { test: 'string' })).rejects.toThrow(
        'Persistent failure',
      );
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      const destroyClient = createSeedingClient();
      destroyClient.destroy();
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});
