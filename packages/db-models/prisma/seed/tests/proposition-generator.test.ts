/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropositionGenerator } from '../generators/proposition-generator.js';
import type { SeedingLLMClient } from '../generators/llm-client.js';
import type { GeneratedTopic, GeneratedResponse } from '../generators/types.js';

describe('PropositionGenerator', () => {
  let mockClient: SeedingLLMClient;
  let generator: PropositionGenerator;

  const mockTopic: GeneratedTopic = {
    id: '11111111-0000-4000-8000-000000000113',
    title: 'Should cities ban gas-powered leaf blowers?',
    description: 'Test description',
    slug: 'test',
    creatorId: '11111111-0000-4000-8000-000000000003',
    category: 'Climate & Environment',
    status: 'ACTIVE',
    tagIds: [],
    crossCuttingThemes: [],
    expectedEngagement: 'medium',
    topicIndex: 113,
    createdAtOffset: 30,
  };

  const mockResponses: GeneratedResponse[] = [
    {
      id: 'r1',
      topicId: mockTopic.id,
      authorId: 'u1',
      parentId: null,
      content: 'Gas leaf blowers harm air quality.',
      viewpoint: 'support',
      citedSources: [],
    },
    {
      id: 'r2',
      topicId: mockTopic.id,
      authorId: 'u2',
      parentId: null,
      content: 'Electric alternatives are too expensive.',
      viewpoint: 'oppose',
      citedSources: [],
    },
  ];

  beforeEach(() => {
    mockClient = {
      generateJSON: vi.fn().mockResolvedValue([
        {
          statement: 'Gas-powered leaf blowers significantly harm local air quality',
          source: 'AI_IDENTIFIED',
        },
        {
          statement: 'Electric alternatives are not economically viable for professionals',
          source: 'USER_CREATED',
        },
      ]),
      destroy: vi.fn(),
    } as unknown as SeedingLLMClient;

    generator = new PropositionGenerator(mockClient);
  });

  it('should generate propositions from responses', async () => {
    const props = await generator.generateForTopic(mockTopic, mockResponses, 113);
    expect(props.length).toBeGreaterThan(0);
    expect(props[0]!.topicId).toBe(mockTopic.id);
  });

  it('should calculate consensus scores', async () => {
    const props = await generator.generateForTopic(mockTopic, mockResponses, 113);
    props.forEach((p) => {
      expect(p.consensusScore).toBeGreaterThanOrEqual(0);
      expect(p.consensusScore).toBeLessThanOrEqual(1);
    });
  });

  it('should generate deterministic proposition IDs', async () => {
    const props = await generator.generateForTopic(mockTopic, mockResponses, 113);
    expect(props[0]!.id).toBe('11111111-0000-4000-8000-001113000001');
    expect(props[1]!.id).toBe('11111111-0000-4000-8000-001113000002');
  });

  it('should include required proposition fields', async () => {
    const props = await generator.generateForTopic(mockTopic, mockResponses, 113);
    const prop = props[0]!;
    expect(prop).toHaveProperty('id');
    expect(prop).toHaveProperty('topicId');
    expect(prop).toHaveProperty('statement');
    expect(prop).toHaveProperty('source');
    expect(prop).toHaveProperty('supportCount');
    expect(prop).toHaveProperty('opposeCount');
    expect(prop).toHaveProperty('nuancedCount');
    expect(prop).toHaveProperty('consensusScore');
    expect(prop).toHaveProperty('status');
  });

  it('should support both AI_IDENTIFIED and USER_CREATED sources', async () => {
    const props = await generator.generateForTopic(mockTopic, mockResponses, 113);
    const sources = new Set(props.map((p) => p.source));
    expect(sources.has('AI_IDENTIFIED') || sources.has('USER_CREATED')).toBe(true);
    props.forEach((p) => {
      expect(['AI_IDENTIFIED', 'USER_CREATED']).toContain(p.source);
    });
  });

  it('should return empty array if no responses for topic', async () => {
    const props = await generator.generateForTopic(mockTopic, [], 113);
    expect(props).toEqual([]);
  });

  it('should set proposition status to ACTIVE', async () => {
    const props = await generator.generateForTopic(mockTopic, mockResponses, 113);
    props.forEach((p) => {
      expect(p.status).toBe('ACTIVE');
    });
  });

  describe('generateForAllTopics', () => {
    it('should generate propositions for multiple topics', async () => {
      const topics: GeneratedTopic[] = [
        mockTopic,
        {
          ...mockTopic,
          id: '11111111-0000-4000-8000-000000000114',
          title: 'Should AI require disclosure?',
          topicIndex: 114,
        },
      ];

      const responsesForBothTopics: GeneratedResponse[] = [
        ...mockResponses,
        {
          id: 'r3',
          topicId: '11111111-0000-4000-8000-000000000114',
          authorId: 'u1',
          parentId: null,
          content: 'AI disclosure protects consumers.',
          viewpoint: 'support',
          citedSources: [],
        },
        {
          id: 'r4',
          topicId: '11111111-0000-4000-8000-000000000114',
          authorId: 'u2',
          parentId: null,
          content: 'Disclosure requirements slow innovation.',
          viewpoint: 'oppose',
          citedSources: [],
        },
      ];

      const props = await generator.generateForAllTopics(topics, responsesForBothTopics);
      expect(props.length).toBeGreaterThan(0);

      // Propositions should be for both topics
      const topicIds = new Set(props.map((p) => p.topicId));
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

      const responsesForBothTopics: GeneratedResponse[] = [
        ...mockResponses,
        {
          id: 'r3',
          topicId: '11111111-0000-4000-8000-000000000114',
          authorId: 'u1',
          parentId: null,
          content: 'AI disclosure protects consumers.',
          viewpoint: 'support',
          citedSources: [],
        },
      ];

      const props = await generator.generateForAllTopics(topics, responsesForBothTopics);

      // First topic propositions should use topicIndex 113
      const topic1Props = props.filter((p) => p.topicId === mockTopic.id);
      expect(topic1Props[0]?.id).toBe('11111111-0000-4000-8000-001113000001');

      // Second topic propositions should use topicIndex 114
      const topic2Props = props.filter((p) => p.topicId === '11111111-0000-4000-8000-000000000114');
      expect(topic2Props[0]?.id).toBe('11111111-0000-4000-8000-001114000001');
    });

    it('should skip topics with no responses', async () => {
      const topics: GeneratedTopic[] = [
        mockTopic,
        {
          ...mockTopic,
          id: '11111111-0000-4000-8000-000000000114',
          title: 'Topic with no responses',
          topicIndex: 114,
        },
      ];

      // Only responses for first topic
      const props = await generator.generateForAllTopics(topics, mockResponses);

      // Only first topic should have propositions
      const topicIds = new Set(props.map((p) => p.topicId));
      expect(topicIds.size).toBe(1);
      expect(topicIds.has(mockTopic.id)).toBe(true);
    });
  });

  describe('consensus score calculation', () => {
    it('should calculate higher consensus for balanced viewpoints', async () => {
      const balancedResponses: GeneratedResponse[] = [
        { ...mockResponses[0]!, viewpoint: 'support' },
        { ...mockResponses[1]!, viewpoint: 'oppose' },
        {
          id: 'r3',
          topicId: mockTopic.id,
          authorId: 'u3',
          parentId: null,
          content: 'There are valid points on both sides.',
          viewpoint: 'nuanced',
          citedSources: [],
        },
      ];

      const props = await generator.generateForTopic(mockTopic, balancedResponses, 113);
      // With nuanced responses, consensus should be moderate
      props.forEach((p) => {
        expect(p.consensusScore).toBeGreaterThanOrEqual(0.3);
        expect(p.consensusScore).toBeLessThanOrEqual(0.8);
      });
    });
  });

  describe('error handling', () => {
    it('should propagate LLM client errors', async () => {
      (mockClient.generateJSON as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('LLM API error'),
      );

      await expect(generator.generateForTopic(mockTopic, mockResponses, 113)).rejects.toThrow(
        'LLM API error',
      );
    });
  });
});
