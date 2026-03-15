/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TopicGenerator, TOPIC_CATEGORIES } from '../generators/topic-generator.js';
import type { SeedingLLMClient } from '../generators/llm-client.js';

describe('TopicGenerator', () => {
  let mockClient: SeedingLLMClient;
  let generator: TopicGenerator;

  beforeEach(() => {
    mockClient = {
      generateJSON: vi.fn().mockResolvedValue([
        {
          title: 'Should cities ban gas-powered leaf blowers?',
          description: 'Debate the environmental and noise impact of gas-powered leaf blowers.',
          crossCuttingThemes: ['environment', 'urban policy'],
        },
      ]),
      destroy: vi.fn(),
    } as unknown as SeedingLLMClient;

    generator = new TopicGenerator(mockClient);
  });

  it('should have 9 topic categories', () => {
    expect(TOPIC_CATEGORIES).toHaveLength(9);
  });

  it('should generate topics for a category', async () => {
    const topics = await generator.generateForCategory('Climate & Environment', 1, 113);
    expect(topics).toHaveLength(1);
    const topic = topics[0];
    expect(topic).toBeDefined();
    expect(topic!.title).toContain('Should');
    expect(topic!.id).toBe('11111111-0000-4000-8000-000000000113');
  });

  it('should assign deterministic IDs', async () => {
    // Mock to return 2 topics when count is 2
    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        title: 'Should cities ban facial recognition?',
        description: 'Debate privacy vs security implications of facial recognition.',
        crossCuttingThemes: ['privacy', 'technology'],
      },
      {
        title: 'Should tech companies be regulated as utilities?',
        description: 'Discuss regulation of large technology platforms.',
        crossCuttingThemes: ['regulation', 'technology'],
      },
    ]);

    const topics = await generator.generateForCategory('Technology & Privacy', 2, 120);
    expect(topics).toHaveLength(2);
    expect(topics[0]!.id).toBe('11111111-0000-4000-8000-000000000120');
    expect(topics[1]!.id).toBe('11111111-0000-4000-8000-000000000121');
  });

  it('should generate slug from title', async () => {
    const topics = await generator.generateForCategory('Climate & Environment', 1, 113);
    expect(topics).toHaveLength(1);
    expect(topics[0]!.slug).toMatch(/^should-cities-ban-gas-powered-leaf-blowers$/);
  });

  it('should assign expected engagement based on category', async () => {
    const topics = await generator.generateForCategory('Climate & Environment', 1, 113);
    expect(topics).toHaveLength(1);
    expect(['low', 'medium', 'high', 'very_high']).toContain(topics[0]!.expectedEngagement);
  });

  it('should assign correct tag IDs based on category', async () => {
    const topics = await generator.generateForCategory('Climate & Environment', 1, 113);
    expect(topics).toHaveLength(1);
    expect(topics[0]!.tagIds).toContain('11111111-0000-4000-8000-000000000201'); // ENVIRONMENT tag
  });

  it('should assign status with correct distribution', async () => {
    // Mock many topics to test distribution
    const manyTopics = Array.from({ length: 20 }, (_, i) => ({
      title: `Should we implement policy ${i}?`,
      description: `Description for policy ${i}`,
      crossCuttingThemes: ['policy'],
    }));
    (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockResolvedValueOnce(manyTopics);

    const topics = await generator.generateForCategory('Climate & Environment', 20, 200);

    // Count statuses
    const statusCounts = topics.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Should have mostly ACTIVE (85%), some SEEDING (10%), few ARCHIVED (5%)
    expect(statusCounts['ACTIVE']).toBeGreaterThanOrEqual(15); // ~85%
    expect(statusCounts['SEEDING'] ?? 0).toBeLessThanOrEqual(4); // ~10%
    expect(statusCounts['ARCHIVED'] ?? 0).toBeLessThanOrEqual(2); // ~5%
  });

  describe('generateAll', () => {
    it('should generate topics for all categories', async () => {
      // Mock to return topics for each category call
      const mockGenerateJSON = mockClient.generateJSON as ReturnType<typeof vi.fn>;

      // Set up mock to return appropriate number of topics for each category
      TOPIC_CATEGORIES.forEach((category) => {
        const categoryTopics = Array.from({ length: category.count }, (_, i) => ({
          title: `Should we do something about ${category.name} ${i}?`,
          description: `Description for ${category.name} ${i}`,
          crossCuttingThemes: ['test'],
        }));
        mockGenerateJSON.mockResolvedValueOnce(categoryTopics);
      });

      const topics = await generator.generateAll(200);

      // Total topics should be sum of all category counts
      const expectedTotal = TOPIC_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0);
      expect(topics).toHaveLength(expectedTotal);
    });

    it('should assign sequential IDs across all categories', async () => {
      const mockGenerateJSON = mockClient.generateJSON as ReturnType<typeof vi.fn>;

      // Return 2 topics for first category, 2 for second
      mockGenerateJSON.mockResolvedValueOnce([
        { title: 'Topic 1', description: 'Desc 1', crossCuttingThemes: [] },
        { title: 'Topic 2', description: 'Desc 2', crossCuttingThemes: [] },
      ]);

      // Mock remaining categories with empty arrays (or minimal topics)
      for (let i = 1; i < TOPIC_CATEGORIES.length; i++) {
        mockGenerateJSON.mockResolvedValueOnce([]);
      }

      const topics = await generator.generateAll(100);

      // First two topics should have sequential IDs
      expect(topics.length).toBeGreaterThanOrEqual(2);
      expect(topics[0]!.id).toBe('11111111-0000-4000-8000-000000000100');
      expect(topics[1]!.id).toBe('11111111-0000-4000-8000-000000000101');
    });
  });

  describe('error handling', () => {
    it('should propagate LLM client errors', async () => {
      (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('LLM API error'),
      );

      await expect(generator.generateForCategory('Climate & Environment', 1, 113)).rejects.toThrow(
        'LLM API error',
      );
    });
  });
});
