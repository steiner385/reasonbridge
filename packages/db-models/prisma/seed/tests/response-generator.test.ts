/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseGenerator } from '../generators/response-generator.js';
import type { SeedingLLMClient } from '../generators/llm-client.js';
import type { GeneratedTopic } from '../generators/types.js';

describe('ResponseGenerator', () => {
  let mockClient: SeedingLLMClient;
  let generator: ResponseGenerator;

  const mockTopic: GeneratedTopic = {
    id: '11111111-0000-4000-8000-000000000113',
    title: 'Should cities ban gas-powered leaf blowers?',
    description: 'Test description',
    slug: 'should-cities-ban-gas-powered-leaf-blowers',
    creatorId: '11111111-0000-4000-8000-000000000003',
    category: 'Climate & Environment',
    status: 'ACTIVE',
    tagIds: [],
    crossCuttingThemes: [],
    expectedEngagement: 'medium',
    topicIndex: 113,
    createdAtOffset: 30,
  };

  beforeEach(() => {
    mockClient = {
      generateJSON: vi.fn().mockResolvedValue([
        {
          authorIndex: 0,
          parentIndex: null,
          content: 'I support banning these polluting machines.',
          viewpoint: 'support',
          citedSources: [],
        },
        {
          authorIndex: 1,
          parentIndex: 0,
          content: 'But what about landscaping businesses?',
          viewpoint: 'oppose',
          citedSources: [],
        },
      ]),
      destroy: vi.fn(),
    } as unknown as SeedingLLMClient;

    generator = new ResponseGenerator(mockClient);
  });

  it('should generate responses for a topic', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    expect(responses.length).toBeGreaterThan(0);
    expect(responses[0]!.topicId).toBe(mockTopic.id);
  });

  it('should create proper threading relationships', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    const reply = responses.find((r) => r.parentId !== null);
    expect(reply).toBeDefined();
    expect(reply?.parentId).toBe(responses[0]!.id);
  });

  it('should generate deterministic response IDs', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    expect(responses[0]!.id).toBe('11111111-0000-4000-8000-000113000001');
    expect(responses[1]!.id).toBe('11111111-0000-4000-8000-000113000002');
  });

  it('should assign author IDs from DEMO_USER_IDS', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    // Authors should be valid demo user IDs
    expect(responses[0]!.authorId).toMatch(/^11111111-0000-4000-8000-00000000000\d$/);
    expect(responses[1]!.authorId).toMatch(/^11111111-0000-4000-8000-00000000000\d$/);
  });

  it('should handle viewpoint types correctly', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    expect(['support', 'oppose', 'nuanced']).toContain(responses[0]!.viewpoint);
    expect(['support', 'oppose', 'nuanced']).toContain(responses[1]!.viewpoint);
  });

  it('should include citedSources array', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    expect(Array.isArray(responses[0]!.citedSources)).toBe(true);
    expect(Array.isArray(responses[1]!.citedSources)).toBe(true);
  });

  describe('generateForAllTopics', () => {
    it('should generate responses for multiple topics', async () => {
      const topics: GeneratedTopic[] = [
        mockTopic,
        {
          ...mockTopic,
          id: '11111111-0000-4000-8000-000000000114',
          title: 'Should AI require disclosure?',
          topicIndex: 114,
        },
      ];

      const responses = await generator.generateForAllTopics(topics);
      expect(responses.length).toBeGreaterThan(0);

      // Responses should be for both topics
      const topicIds = new Set(responses.map((r) => r.topicId));
      expect(topicIds.size).toBe(2);
    });

    it('should maintain sequential IDs across topics', async () => {
      const topics: GeneratedTopic[] = [
        { ...mockTopic, topicIndex: 113 },
        {
          ...mockTopic,
          id: '11111111-0000-4000-8000-000000000114',
          topicIndex: 114,
        },
      ];

      const responses = await generator.generateForAllTopics(topics);

      // First topic responses should use topicIndex 113
      const topic1Responses = responses.filter((r) => r.topicId === mockTopic.id);
      expect(topic1Responses[0]?.id).toBe('11111111-0000-4000-8000-000113000001');

      // Second topic responses should use topicIndex 114
      const topic2Responses = responses.filter(
        (r) => r.topicId === '11111111-0000-4000-8000-000000000114',
      );
      expect(topic2Responses[0]?.id).toBe('11111111-0000-4000-8000-000114000001');
    });
  });

  describe('error handling', () => {
    it('should propagate LLM client errors', async () => {
      (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('LLM API error'),
      );

      await expect(generator.generateForTopic(mockTopic, 113)).rejects.toThrow('LLM API error');
    });
  });
});
