/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommonGroundGenerator } from '../generators/common-ground-generator.js';
import type { SeedingLLMClient } from '../generators/llm-client.js';
import type {
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
} from '../generators/types.js';

describe('CommonGroundGenerator', () => {
  let mockClient: SeedingLLMClient;
  let generator: CommonGroundGenerator;

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

  beforeEach(() => {
    mockClient = {
      generateJSON: vi.fn().mockResolvedValue({
        agreementZones: [
          {
            proposition: 'Noise pollution is a legitimate concern',
            participantCount: 4,
            supportingEvidence: ['Multiple users mentioned noise'],
            agreementPercentage: 80,
          },
        ],
        misunderstandings: [],
        genuineDisagreements: [
          {
            proposition: 'Economic impact on landscapers',
            viewpoints: [
              { position: 'Jobs matter', reasoning: ['Employment'], participantCount: 2 },
              { position: 'Health matters more', reasoning: ['Air quality'], participantCount: 2 },
            ],
            underlyingValues: ['Economic security', 'Public health'],
          },
        ],
        overallConsensusScore: 0.65,
      }),
      destroy: vi.fn(),
    } as unknown as SeedingLLMClient;

    generator = new CommonGroundGenerator(mockClient);
  });

  it('should generate common ground analysis', async () => {
    const analysis = await generator.generateForTopic(mockTopic, [], [], 113);
    expect(analysis).toBeDefined();
    expect(analysis.topicId).toBe(mockTopic.id);
  });

  it('should include agreement zones', async () => {
    const analysis = await generator.generateForTopic(mockTopic, [], [], 113);
    expect(analysis.agreementZones.length).toBeGreaterThan(0);
  });
});
