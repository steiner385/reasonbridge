# LLM-Powered Seeding Framework Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale demo data seeding from 12 to ~75 topics with LLM-generated, topic-specific content for all discussion elements.

**Architecture:** Generator modules call AWS Bedrock (Claude 3.5 Sonnet) to generate topics, responses, propositions, common ground, and bridging suggestions. Content is cached to JSON files to avoid repeated API calls. The existing `demo-fixtures.ts` orchestrator is updated to use cached or generated content.

**Tech Stack:** TypeScript, AWS Bedrock (@reason-bridge/ai-client), Prisma ORM, Node.js fs for caching

**Spec:** `docs/superpowers/specs/2026-03-15-llm-seeding-framework-design.md`

---

## Prerequisites

**CRITICAL**: The spec mentions bridging suggestions, but no `BridgingSuggestion` table exists in the Prisma schema. For this plan, bridging suggestions will be stored in the JSON cache only and NOT seeded to the database. A future migration can add the database model if needed.

**Scope Adjustment**: The spec mentions `engagement-generator.ts` but this is deferred - votes and read states are handled by the existing E2E test framework.

---

## File Structure

### New Files to Create

| File                                              | Responsibility                                           |
| ------------------------------------------------- | -------------------------------------------------------- |
| `prisma/seed/generators/types.ts`                 | Shared TypeScript interfaces for all generators          |
| `prisma/seed/generators/llm-client.ts`            | Thin wrapper around @reason-bridge/ai-client for seeding |
| `prisma/seed/generators/topic-generator.ts`       | Generate 63 new topics across 9 categories               |
| `prisma/seed/generators/response-generator.ts`    | Generate 5-8 responses per topic with threading          |
| `prisma/seed/generators/proposition-generator.ts` | Extract 3-5 propositions per topic                       |
| `prisma/seed/generators/bridging-generator.ts`    | Generate 2-3 bridging suggestions per topic (cache only) |
| `prisma/seed/generators/orchestrator.ts`          | Coordinate generation flow, manage cache                 |
| `prisma/seed/cache/.gitkeep`                      | Empty file to ensure cache directory exists              |
| `prisma/seed/tests/*.test.ts`                     | Unit tests for generators                                |
| `prisma/seed/cli/generate.ts`                     | CLI for regeneration commands                            |

### Files to Modify

| File                                                | Changes                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| `prisma/seed/demo-ids.ts`                           | Add ID generators for topics 113-200, bridging   |
| `prisma/seed/demo-fixtures.ts`                      | Use orchestrator, add cache loading              |
| `prisma/seed/generators/common-ground-generator.ts` | Replace template-based with LLM-based generation |
| `packages/db-models/package.json`                   | Add @reason-bridge/ai-client dependency          |

---

## Chunk 1: Infrastructure Setup

### Task 1: Add Dependencies and Create Directory Structure

**Files:**

- Modify: `packages/db-models/package.json`
- Create: `packages/db-models/prisma/seed/cache/.gitkeep`
- Create: `packages/db-models/prisma/seed/generators/types.ts`

- [ ] **Step 1: Add ai-client dependency to db-models**

```bash
cd packages/db-models && pnpm add @reason-bridge/ai-client
```

- [ ] **Step 2: Create cache directory with .gitkeep**

```bash
mkdir -p packages/db-models/prisma/seed/cache
touch packages/db-models/prisma/seed/cache/.gitkeep
```

- [ ] **Step 3: Create types.ts with shared interfaces**

Create file `packages/db-models/prisma/seed/generators/types.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared Types for LLM-Powered Generators
 */

// =============================================================================
// TOPIC TYPES
// =============================================================================

export type TopicStatus = 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
export type EngagementLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface GeneratedTopic {
  id: string;
  title: string;
  description: string;
  slug: string;
  creatorId: string;
  category: string;
  status: TopicStatus;
  tagIds: string[];
  crossCuttingThemes: string[];
  expectedEngagement: EngagementLevel;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export type ViewpointType = 'support' | 'oppose' | 'nuanced';

export interface CitedSource {
  url: string;
  title: string;
  author?: string;
}

export interface GeneratedResponse {
  id: string;
  topicId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  viewpoint: ViewpointType;
  citedSources: CitedSource[];
}

// =============================================================================
// PROPOSITION TYPES
// =============================================================================

export type PropositionSource = 'AI_IDENTIFIED' | 'USER_CREATED';
export type PropositionStatus = 'ACTIVE' | 'MERGED' | 'ARCHIVED';

export interface GeneratedProposition {
  id: string;
  topicId: string;
  statement: string;
  source: PropositionSource;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number;
  status: PropositionStatus;
}

// =============================================================================
// COMMON GROUND TYPES
// =============================================================================

export interface AgreementZone {
  proposition: string;
  participantCount: number;
  supportingEvidence: string[];
  agreementPercentage: number;
}

export interface Interpretation {
  interpretation: string;
  participantCount: number;
}

export interface Misunderstanding {
  topic: string;
  clarification: string;
  interpretations: Interpretation[];
}

export interface Viewpoint {
  position: string;
  reasoning: string[];
  participantCount: number;
}

export interface GenuineDisagreement {
  proposition: string;
  viewpoints: Viewpoint[];
  underlyingValues: string[];
}

export interface GeneratedCommonGround {
  id: string;
  topicId: string;
  version: number;
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
  overallConsensusScore: number;
  participantCountAtGeneration: number;
  responseCountAtGeneration: number;
  modelVersion: string;
}

// =============================================================================
// BRIDGING TYPES
// =============================================================================

export type BridgingType = 'reframe' | 'question' | 'shared_value' | 'compromise';
export type TargetAudience = 'support' | 'oppose' | 'both';

export interface GeneratedBridgingSuggestion {
  id: string;
  topicId: string;
  commonGroundAnalysisId: string;
  suggestionText: string;
  targetAudience: TargetAudience;
  relatedPropositionIds: string[];
  potentialCommonGround: string;
  confidenceScore: number;
  suggestionType: BridgingType;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface GenerationMetadata {
  generatedAt: string;
  modelVersion: string;
  topicCount: number;
  responseCount: number;
  propositionCount: number;
  commonGroundCount: number;
  bridgingCount: number;
  generationDurationMs: number;
  cacheVersion: number;
}

export interface CachedData {
  metadata: GenerationMetadata;
  topics: GeneratedTopic[];
  responses: GeneratedResponse[];
  propositions: GeneratedProposition[];
  commonGround: GeneratedCommonGround[];
  bridging: GeneratedBridgingSuggestion[];
}
```

- [ ] **Step 4: Update vitest config to include seed tests**

Add `'prisma/seed/**/*.test.ts'` to the vitest include array in `packages/db-models/vitest.config.ts`:

```typescript
include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts', 'prisma/seed/**/*.test.ts'],
```

- [ ] **Step 5: Create tests directory with .gitkeep**

```bash
mkdir -p packages/db-models/prisma/seed/tests
touch packages/db-models/prisma/seed/tests/.gitkeep
```

- [ ] **Step 6: Commit infrastructure setup**

```bash
git add packages/db-models/package.json packages/db-models/prisma/seed/cache/.gitkeep packages/db-models/prisma/seed/generators/types.ts packages/db-models/prisma/seed/tests/.gitkeep packages/db-models/vitest.config.ts
git commit -m "feat(db-models): add LLM seeding infrastructure

- Add @reason-bridge/ai-client dependency
- Create cache directory for generated content
- Create tests directory for generator tests
- Update vitest config to include seed tests
- Add shared TypeScript interfaces for all generators"
```

---

### Task 2: Extend ID Generation for New Topics

**Files:**

- Modify: `packages/db-models/prisma/seed/demo-ids.ts`
- Test: `packages/db-models/prisma/seed/tests/demo-ids.test.ts`

- [ ] **Step 1: Write failing test for new ID generators**

Create file `packages/db-models/prisma/seed/tests/demo-ids.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateTopicId,
  generateBridgingId,
  generateResponseId,
  generatePropositionId,
  generateCommonGroundId,
} from '../demo-ids.js';

describe('ID Generation', () => {
  describe('generateTopicId', () => {
    it('should generate deterministic topic IDs', () => {
      const id1 = generateTopicId(113);
      const id2 = generateTopicId(113);
      expect(id1).toBe(id2);
      expect(id1).toBe('11111111-0000-4000-8000-000000000113');
    });

    it('should generate unique IDs for different topics', () => {
      const id1 = generateTopicId(113);
      const id2 = generateTopicId(114);
      expect(id1).not.toBe(id2);
    });

    it('should support topic numbers up to 999', () => {
      const id = generateTopicId(999);
      expect(id).toBe('11111111-0000-4000-8000-000000000999');
    });
  });

  describe('generateBridgingId', () => {
    it('should generate deterministic bridging IDs', () => {
      const id1 = generateBridgingId(101, 1);
      const id2 = generateBridgingId(101, 1);
      expect(id1).toBe(id2);
    });

    it('should use 004 prefix for bridging', () => {
      const id = generateBridgingId(101, 1);
      expect(id).toMatch(/^11111111-0000-4000-8000-004/);
    });
  });

  describe('existing ID generators', () => {
    it('should maintain backward compatibility', () => {
      expect(generateResponseId(101, 1)).toBe('11111111-0000-4000-8000-000101000001');
      expect(generatePropositionId(101, 1)).toBe('11111111-0000-4000-8000-001101000001');
      expect(generateCommonGroundId(101, 1)).toBe('11111111-0000-4000-8000-003101000001');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/demo-ids.test.ts
```

Expected: FAIL with "generateTopicId is not exported"

- [ ] **Step 3: Add new ID generators to demo-ids.ts**

Add to `packages/db-models/prisma/seed/demo-ids.ts` after existing functions:

```typescript
/**
 * Generate a deterministic topic ID
 * Format: 11111111-0000-4000-8000-000000000TTT
 * TTT = topic number (101-999)
 */
export function generateTopicId(topicNumber: number): string {
  const topicPart = topicNumber.toString().padStart(3, '0');
  return `11111111-0000-4000-8000-000000000${topicPart}`;
}

/**
 * Generate a deterministic bridging suggestion ID
 * Format: 11111111-0000-4000-8000-004TTTBBBBBB
 * TTT = topic number (101-999)
 * BBBBBB = bridging sequence (000001-999999)
 */
export function generateBridgingId(topicNumber: number, bridgingSequence: number): string {
  const topicPart = topicNumber.toString().padStart(3, '0');
  const bridgingPart = bridgingSequence.toString().padStart(6, '0');
  return `11111111-0000-4000-8000-004${topicPart}${bridgingPart}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/demo-ids.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit ID generation**

```bash
git add packages/db-models/prisma/seed/demo-ids.ts packages/db-models/prisma/seed/tests/demo-ids.test.ts
git commit -m "feat(db-models): add ID generators for topics and bridging

- generateTopicId: deterministic topic IDs (101-999)
- generateBridgingId: bridging suggestion IDs (004 prefix)"
```

---

### Task 3: Create LLM Client Wrapper

**Files:**

- Create: `packages/db-models/prisma/seed/generators/llm-client.ts`
- Test: `packages/db-models/prisma/seed/tests/llm-client.test.ts`

- [ ] **Step 1: Write failing test for LLM client**

Create file `packages/db-models/prisma/seed/tests/llm-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeedingLLMClient, createSeedingClient } from '../generators/llm-client.js';

// Mock the ai-client module
vi.mock('@reason-bridge/ai-client', () => ({
  BedrockClient: vi.fn().mockImplementation(() => ({
    complete: vi.fn().mockResolvedValue({
      content: '{"test": "data"}',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      stopReason: 'end_turn',
    }),
    destroy: vi.fn(),
  })),
}));

describe('SeedingLLMClient', () => {
  let client: SeedingLLMClient;

  beforeEach(() => {
    client = createSeedingClient();
  });

  it('should generate JSON response', async () => {
    const result = await client.generateJSON('test prompt', { test: 'string' });
    expect(result).toEqual({ test: 'data' });
  });

  it('should retry on failure', async () => {
    // Implementation will handle retries
    const result = await client.generateJSON('test prompt', {});
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/llm-client.test.ts
```

Expected: FAIL with "llm-client.js not found"

- [ ] **Step 3: Implement LLM client wrapper**

Create file `packages/db-models/prisma/seed/generators/llm-client.ts`:

````typescript
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
````

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/llm-client.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit LLM client**

```bash
git add packages/db-models/prisma/seed/generators/llm-client.ts packages/db-models/prisma/seed/tests/llm-client.test.ts
git commit -m "feat(db-models): add LLM client wrapper for seeding

- JSON generation with schema validation
- Retry logic with exponential backoff
- Rate limiting between requests"
```

---

## Chunk 2: Topic Generator

### Task 4: Implement Topic Generator

**Files:**

- Create: `packages/db-models/prisma/seed/generators/topic-generator.ts`
- Test: `packages/db-models/prisma/seed/tests/topic-generator.test.ts`

- [ ] **Step 1: Write failing test for topic generator**

Create file `packages/db-models/prisma/seed/tests/topic-generator.test.ts`:

```typescript
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
    expect(topics[0].title).toContain('Should');
    expect(topics[0].id).toBe('11111111-0000-4000-8000-000000000113');
  });

  it('should assign deterministic IDs', async () => {
    const topics = await generator.generateForCategory('Technology & Privacy', 2, 120);
    expect(topics[0].id).toBe('11111111-0000-4000-8000-000000000120');
    expect(topics[1].id).toBe('11111111-0000-4000-8000-000000000121');
  });

  it('should generate slug from title', async () => {
    const topics = await generator.generateForCategory('Climate & Environment', 1, 113);
    expect(topics[0].slug).toMatch(/^should-cities-ban-gas-powered-leaf-blowers$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/topic-generator.test.ts
```

Expected: FAIL with "topic-generator.js not found"

- [ ] **Step 3: Implement topic generator**

Create file `packages/db-models/prisma/seed/generators/topic-generator.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Generator
 *
 * Generates discussion topics using LLM for each category.
 */

import { generateTopicId } from '../demo-ids.js';
import { DEMO_USER_IDS, DEMO_TAG_IDS } from '../demo-ids.js';
import type { GeneratedTopic, TopicStatus, EngagementLevel } from './types.js';
import type { SeedingLLMClient } from './llm-client.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export const TOPIC_CATEGORIES = [
  { name: 'Climate & Environment', count: 10, tags: [DEMO_TAG_IDS.ENVIRONMENT] },
  { name: 'Technology & Privacy', count: 10, tags: [DEMO_TAG_IDS.TECHNOLOGY] },
  { name: 'Education & Youth', count: 8, tags: [DEMO_TAG_IDS.EDUCATION] },
  { name: 'Work & Economy', count: 10, tags: [DEMO_TAG_IDS.ECONOMY] },
  { name: 'Healthcare & Policy', count: 8, tags: [DEMO_TAG_IDS.HEALTHCARE] },
  { name: 'Ethics & Society', count: 10, tags: [DEMO_TAG_IDS.ETHICS, DEMO_TAG_IDS.SOCIETY] },
  { name: 'Government & Civic', count: 8, tags: [DEMO_TAG_IDS.GOVERNMENT] },
  { name: 'Science & Research', count: 6, tags: [DEMO_TAG_IDS.SCIENCE] },
  { name: 'Business & Innovation', count: 5, tags: [DEMO_TAG_IDS.BUSINESS] },
] as const;

const DEMO_USERS = Object.values(DEMO_USER_IDS);

const STATUS_DISTRIBUTION: { status: TopicStatus; weight: number }[] = [
  { status: 'ACTIVE', weight: 85 },
  { status: 'SEEDING', weight: 10 },
  { status: 'ARCHIVED', weight: 5 },
];

const ENGAGEMENT_LEVELS: EngagementLevel[] = ['low', 'medium', 'high', 'very_high'];

// =============================================================================
// GENERATOR
// =============================================================================

interface LLMTopicResponse {
  title: string;
  description: string;
  crossCuttingThemes: string[];
}

export class TopicGenerator {
  constructor(private client: SeedingLLMClient) {}

  /**
   * Generate topics for a specific category.
   */
  async generateForCategory(
    category: string,
    count: number,
    startingTopicNumber: number,
  ): Promise<GeneratedTopic[]> {
    const categoryConfig = TOPIC_CATEGORIES.find((c) => c.name === category);
    if (!categoryConfig) {
      throw new Error(`Unknown category: ${category}`);
    }

    const prompt = this.buildPrompt(category, count);
    const schema = {
      type: 'array',
      items: {
        title: 'string (max 100 chars, "Should X?" format)',
        description: 'string (150-300 chars, 2-3 sentences)',
        crossCuttingThemes: 'string[] (2-3 themes)',
      },
    };

    const rawTopics = await this.client.generateJSON<LLMTopicResponse[]>(prompt, schema);

    return rawTopics.map((raw, index) =>
      this.transformTopic(raw, startingTopicNumber + index, category, categoryConfig.tags),
    );
  }

  /**
   * Generate all topics for all categories.
   */
  async generateAll(startingTopicNumber: number = 113): Promise<GeneratedTopic[]> {
    const allTopics: GeneratedTopic[] = [];
    let currentNumber = startingTopicNumber;

    for (const category of TOPIC_CATEGORIES) {
      console.log(`Generating ${category.count} topics for ${category.name}...`);
      const topics = await this.generateForCategory(category.name, category.count, currentNumber);
      allTopics.push(...topics);
      currentNumber += category.count;
    }

    return allTopics;
  }

  private buildPrompt(category: string, count: number): string {
    return `Generate ${count} discussion topics for the category "${category}".

Requirements:
- Format as clear yes/no questions ("Should X?", "Is Y necessary?", "Does X need Y?")
- Topics should be contemporary and debatable
- Avoid highly partisan or inflammatory framing
- Include mix of local and national scope
- Each topic needs: title, description (2-3 sentences), 2-3 relevant themes

IMPORTANT: Each response must be unique. Do not repeat topics from other categories.`;
  }

  private transformTopic(
    raw: LLMTopicResponse,
    topicNumber: number,
    category: string,
    tagIds: readonly string[],
  ): GeneratedTopic {
    return {
      id: generateTopicId(topicNumber),
      title: raw.title,
      description: raw.description,
      slug: this.generateSlug(raw.title),
      creatorId: this.selectRandomUser(topicNumber),
      category,
      status: this.selectStatus(topicNumber),
      tagIds: [...tagIds],
      crossCuttingThemes: raw.crossCuttingThemes,
      expectedEngagement: this.selectEngagement(topicNumber),
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private selectRandomUser(seed: number): string {
    return DEMO_USERS[seed % DEMO_USERS.length]!;
  }

  private selectStatus(seed: number): TopicStatus {
    const roll = seed % 100;
    let cumulative = 0;
    for (const { status, weight } of STATUS_DISTRIBUTION) {
      cumulative += weight;
      if (roll < cumulative) return status;
    }
    return 'ACTIVE';
  }

  private selectEngagement(seed: number): EngagementLevel {
    return ENGAGEMENT_LEVELS[seed % ENGAGEMENT_LEVELS.length]!;
  }
}

export default TopicGenerator;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/topic-generator.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit topic generator**

```bash
git add packages/db-models/prisma/seed/generators/topic-generator.ts packages/db-models/prisma/seed/tests/topic-generator.test.ts
git commit -m "feat(db-models): add topic generator

- Generate topics across 9 categories via LLM
- Deterministic ID assignment (113+)
- Status distribution: 85% ACTIVE, 10% SEEDING, 5% ARCHIVED
- Slug generation from titles"
```

---

## Chunk 3: Response Generator

### Task 5: Implement Response Generator

**Files:**

- Create: `packages/db-models/prisma/seed/generators/response-generator.ts`
- Test: `packages/db-models/prisma/seed/tests/response-generator.test.ts`

- [ ] **Step 1: Write failing test for response generator**

Create file `packages/db-models/prisma/seed/tests/response-generator.test.ts`:

```typescript
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
    expect(responses[0].topicId).toBe(mockTopic.id);
  });

  it('should create proper threading relationships', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    const reply = responses.find((r) => r.parentId !== null);
    expect(reply).toBeDefined();
    expect(reply?.parentId).toBe(responses[0].id);
  });

  it('should generate deterministic response IDs', async () => {
    const responses = await generator.generateForTopic(mockTopic, 113);
    expect(responses[0].id).toBe('11111111-0000-4000-8000-000113000001');
    expect(responses[1].id).toBe('11111111-0000-4000-8000-000113000002');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/response-generator.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement response generator**

Create file `packages/db-models/prisma/seed/generators/response-generator.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response Generator
 *
 * Generates threaded discussion responses for topics using LLM.
 */

import { generateResponseId, DEMO_USER_IDS } from '../demo-ids.js';
import type { GeneratedResponse, GeneratedTopic, ViewpointType, CitedSource } from './types.js';
import type { SeedingLLMClient } from './llm-client.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEMO_USERS = Object.values(DEMO_USER_IDS);

const AUTHOR_PERSONAS = [
  { name: 'Alice Anderson', style: 'Analytical, data-driven, progressive leaning' },
  { name: 'Bob Builder', style: 'Pragmatic, solution-oriented, moderate' },
  { name: 'Admin Adams', style: 'Balanced moderator perspective' },
  { name: 'Mod Martinez', style: 'Community-focused, empathetic' },
  { name: 'New User', style: 'Curious, asks clarifying questions' },
];

// =============================================================================
// GENERATOR
// =============================================================================

interface LLMResponseOutput {
  authorIndex: number;
  parentIndex: number | null;
  content: string;
  viewpoint: ViewpointType;
  citedSources: CitedSource[];
}

export class ResponseGenerator {
  constructor(private client: SeedingLLMClient) {}

  /**
   * Generate responses for a single topic.
   */
  async generateForTopic(topic: GeneratedTopic, topicNumber: number): Promise<GeneratedResponse[]> {
    const prompt = this.buildPrompt(topic);
    const schema = {
      type: 'array',
      items: {
        authorIndex: 'number (0-4)',
        parentIndex: 'number | null (index of parent response, null for root)',
        content: 'string (50-200 words)',
        viewpoint: '"support" | "oppose" | "nuanced"',
        citedSources: '[{ url: string, title: string, author?: string }]',
      },
    };

    const rawResponses = await this.client.generateJSON<LLMResponseOutput[]>(prompt, schema);

    // Transform with proper IDs and threading
    const responses: GeneratedResponse[] = [];
    const idMap = new Map<number, string>();

    for (let i = 0; i < rawResponses.length; i++) {
      const raw = rawResponses[i]!;
      const responseId = generateResponseId(topicNumber, i + 1);
      idMap.set(i, responseId);

      responses.push({
        id: responseId,
        topicId: topic.id,
        authorId: DEMO_USERS[raw.authorIndex % DEMO_USERS.length]!,
        parentId: raw.parentIndex !== null ? (idMap.get(raw.parentIndex) ?? null) : null,
        content: raw.content,
        viewpoint: raw.viewpoint,
        citedSources: raw.citedSources || [],
      });
    }

    return responses;
  }

  /**
   * Generate responses for all topics.
   */
  async generateForAllTopics(topics: GeneratedTopic[]): Promise<GeneratedResponse[]> {
    const allResponses: GeneratedResponse[] = [];

    for (const topic of topics) {
      // Extract topic number from ID (last 3 digits before final segment)
      const topicNumber = parseInt(topic.id.slice(-3), 10);
      console.log(`Generating responses for: ${topic.title.slice(0, 50)}...`);

      const responses = await this.generateForTopic(topic, topicNumber);
      allResponses.push(...responses);
    }

    return allResponses;
  }

  private buildPrompt(topic: GeneratedTopic): string {
    return `Generate a realistic discussion thread for this topic:

Title: "${topic.title}"
Description: "${topic.description}"

Generate 6 responses with this structure:
- 3 root responses with different viewpoints (1 support, 1 oppose, 1 nuanced)
- 2 direct replies to root responses
- 1 nested reply (reply to a reply)

Each response should:
- Be 50-200 words
- Use conversational tone appropriate for online discussion
- Reference real-world examples when relevant
- Vary writing style per author
- Include occasional cited sources (fabricated but realistic URLs)

Author personas (use authorIndex 0-4):
${AUTHOR_PERSONAS.map((p, i) => `${i}: ${p.name} - ${p.style}`).join('\n')}

IMPORTANT:
- Each response must be unique
- Do not repeat arguments or examples
- Maintain realistic conversation flow
- parentIndex must reference a previous response index (0-based)`;
  }
}

export default ResponseGenerator;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/response-generator.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit response generator**

```bash
git add packages/db-models/prisma/seed/generators/response-generator.ts packages/db-models/prisma/seed/tests/response-generator.test.ts
git commit -m "feat(db-models): add response generator

- Generate 6 threaded responses per topic via LLM
- Proper parent-child relationships
- Author persona variety
- Viewpoint distribution (support/oppose/nuanced)"
```

---

### Task 6: Implement Proposition Generator

**Files:**

- Create: `packages/db-models/prisma/seed/generators/proposition-generator.ts`
- Test: `packages/db-models/prisma/seed/tests/proposition-generator.test.ts`

- [ ] **Step 1: Write failing test for proposition generator**

Create file `packages/db-models/prisma/seed/tests/proposition-generator.test.ts`:

```typescript
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
    expect(props[0].topicId).toBe(mockTopic.id);
  });

  it('should calculate consensus scores', async () => {
    const props = await generator.generateForTopic(mockTopic, mockResponses, 113);
    props.forEach((p) => {
      expect(p.consensusScore).toBeGreaterThanOrEqual(0);
      expect(p.consensusScore).toBeLessThanOrEqual(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/proposition-generator.test.ts
```

- [ ] **Step 3: Implement proposition generator**

Create file `packages/db-models/prisma/seed/generators/proposition-generator.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Proposition Generator
 *
 * Extracts key propositions from discussion responses.
 */

import { generatePropositionId } from '../demo-ids.js';
import type {
  GeneratedProposition,
  GeneratedTopic,
  GeneratedResponse,
  PropositionSource,
} from './types.js';
import type { SeedingLLMClient } from './llm-client.js';

// =============================================================================
// GENERATOR
// =============================================================================

interface LLMPropositionOutput {
  statement: string;
  source: PropositionSource;
}

export class PropositionGenerator {
  constructor(private client: SeedingLLMClient) {}

  /**
   * Generate propositions for a topic based on its responses.
   */
  async generateForTopic(
    topic: GeneratedTopic,
    responses: GeneratedResponse[],
    topicNumber: number,
  ): Promise<GeneratedProposition[]> {
    const topicResponses = responses.filter((r) => r.topicId === topic.id);
    if (topicResponses.length === 0) return [];

    const prompt = this.buildPrompt(topic, topicResponses);
    const schema = {
      type: 'array',
      items: {
        statement: 'string (clear claim, max 150 chars)',
        source: '"AI_IDENTIFIED" | "USER_CREATED"',
      },
    };

    const rawProps = await this.client.generateJSON<LLMPropositionOutput[]>(prompt, schema);

    // Calculate viewpoint distribution from responses
    const viewpoints = this.calculateViewpoints(topicResponses);

    return rawProps.map((raw, index) =>
      this.transformProposition(raw, topicNumber, index + 1, topic.id, viewpoints),
    );
  }

  /**
   * Generate propositions for all topics.
   */
  async generateForAllTopics(
    topics: GeneratedTopic[],
    responses: GeneratedResponse[],
  ): Promise<GeneratedProposition[]> {
    const allPropositions: GeneratedProposition[] = [];

    for (const topic of topics) {
      const topicNumber = parseInt(topic.id.slice(-3), 10);
      console.log(`Generating propositions for: ${topic.title.slice(0, 50)}...`);

      const props = await this.generateForTopic(topic, responses, topicNumber);
      allPropositions.push(...props);
    }

    return allPropositions;
  }

  private buildPrompt(topic: GeneratedTopic, responses: GeneratedResponse[]): string {
    const responsesSummary = responses
      .map((r) => `[${r.viewpoint}] ${r.content.slice(0, 200)}...`)
      .join('\n\n');

    return `Extract 4 key propositions from this discussion:

Topic: "${topic.title}"

Responses:
${responsesSummary}

Extract 4 propositions:
- Each should be a clear, debatable claim
- Mix of AI_IDENTIFIED (extracted from discussion) and USER_CREATED (explicit claims)
- Max 150 characters each
- Should represent the main points of contention`;
  }

  private calculateViewpoints(responses: GeneratedResponse[]): {
    support: number;
    oppose: number;
    nuanced: number;
  } {
    return {
      support: responses.filter((r) => r.viewpoint === 'support').length,
      oppose: responses.filter((r) => r.viewpoint === 'oppose').length,
      nuanced: responses.filter((r) => r.viewpoint === 'nuanced').length,
    };
  }

  private transformProposition(
    raw: LLMPropositionOutput,
    topicNumber: number,
    sequence: number,
    topicId: string,
    viewpoints: { support: number; oppose: number; nuanced: number },
  ): GeneratedProposition {
    // Distribute viewpoint counts with some variation
    const total = viewpoints.support + viewpoints.oppose + viewpoints.nuanced;
    const supportCount = Math.max(1, Math.round(viewpoints.support * (1 + (sequence % 3) * 0.2)));
    const opposeCount = Math.max(
      1,
      Math.round(viewpoints.oppose * (1 + ((sequence + 1) % 3) * 0.2)),
    );
    const nuancedCount = Math.max(
      0,
      Math.round(viewpoints.nuanced * (1 + ((sequence + 2) % 3) * 0.2)),
    );

    // Calculate consensus: higher when one side dominates or nuanced is high
    const maxSide = Math.max(supportCount, opposeCount);
    const consensusScore = Math.round(((maxSide + nuancedCount * 0.5) / (total + 1)) * 100) / 100;

    return {
      id: generatePropositionId(topicNumber, sequence),
      topicId,
      statement: raw.statement,
      source: raw.source,
      supportCount,
      opposeCount,
      nuancedCount,
      consensusScore: Math.min(0.95, Math.max(0.2, consensusScore)),
      status: 'ACTIVE',
    };
  }
}

export default PropositionGenerator;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/proposition-generator.test.ts
```

- [ ] **Step 5: Commit proposition generator**

```bash
git add packages/db-models/prisma/seed/generators/proposition-generator.ts packages/db-models/prisma/seed/tests/proposition-generator.test.ts
git commit -m "feat(db-models): add proposition generator

- Extract key claims from responses via LLM
- Calculate consensus scores from viewpoint distribution
- Support AI_IDENTIFIED and USER_CREATED sources"
```

---

## Chunk 4: Common Ground & Bridging Generators

### Task 7: Enhance Common Ground Generator with LLM

**Files:**

- Modify: `packages/db-models/prisma/seed/generators/common-ground-generator.ts`
- Test: `packages/db-models/prisma/seed/tests/common-ground-generator.test.ts`

- [ ] **Step 1: Write test for enhanced common ground generator**

Create file `packages/db-models/prisma/seed/tests/common-ground-generator.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify current state**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/common-ground-generator.test.ts
```

- [ ] **Step 3: Rewrite common-ground-generator.ts with LLM support**

Replace `packages/db-models/prisma/seed/generators/common-ground-generator.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Common Ground Generator
 *
 * Generates topic-specific common ground analyses using LLM.
 */

import { generateCommonGroundId } from '../demo-ids.js';
import type {
  GeneratedCommonGround,
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
  AgreementZone,
  Misunderstanding,
  GenuineDisagreement,
} from './types.js';
import type { SeedingLLMClient } from './llm-client.js';

// =============================================================================
// GENERATOR
// =============================================================================

interface LLMCommonGroundOutput {
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
  overallConsensusScore: number;
}

export class CommonGroundGenerator {
  constructor(private client: SeedingLLMClient) {}

  /**
   * Generate common ground analysis for a topic.
   */
  async generateForTopic(
    topic: GeneratedTopic,
    responses: GeneratedResponse[],
    propositions: GeneratedProposition[],
    topicNumber: number,
  ): Promise<GeneratedCommonGround> {
    const topicResponses = responses.filter((r) => r.topicId === topic.id);
    const topicPropositions = propositions.filter((p) => p.topicId === topic.id);

    const prompt = this.buildPrompt(topic, topicResponses, topicPropositions);
    const schema = {
      agreementZones:
        '[{ proposition, participantCount, supportingEvidence, agreementPercentage }]',
      misunderstandings:
        '[{ topic, clarification, interpretations: [{ interpretation, participantCount }] }]',
      genuineDisagreements:
        '[{ proposition, viewpoints: [{ position, reasoning, participantCount }], underlyingValues }]',
      overallConsensusScore: 'number (0.0-1.0)',
    };

    const raw = await this.client.generateJSON<LLMCommonGroundOutput>(prompt, schema);

    const uniqueAuthors = new Set(topicResponses.map((r) => r.authorId));

    return {
      id: generateCommonGroundId(topicNumber, 1),
      topicId: topic.id,
      version: 1,
      agreementZones: raw.agreementZones,
      misunderstandings: raw.misunderstandings,
      genuineDisagreements: raw.genuineDisagreements,
      overallConsensusScore: Math.min(0.95, Math.max(0.2, raw.overallConsensusScore)),
      participantCountAtGeneration: uniqueAuthors.size,
      responseCountAtGeneration: topicResponses.length,
      modelVersion: 'claude-3-5-sonnet',
    };
  }

  /**
   * Generate common ground for all topics.
   */
  async generateForAllTopics(
    topics: GeneratedTopic[],
    responses: GeneratedResponse[],
    propositions: GeneratedProposition[],
  ): Promise<GeneratedCommonGround[]> {
    const allCommonGround: GeneratedCommonGround[] = [];

    for (const topic of topics) {
      const topicResponses = responses.filter((r) => r.topicId === topic.id);
      if (topicResponses.length < 3) continue; // Skip topics with too few responses

      const topicNumber = parseInt(topic.id.slice(-3), 10);
      console.log(`Generating common ground for: ${topic.title.slice(0, 50)}...`);

      const cg = await this.generateForTopic(topic, responses, propositions, topicNumber);
      allCommonGround.push(cg);
    }

    return allCommonGround;
  }

  private buildPrompt(
    topic: GeneratedTopic,
    responses: GeneratedResponse[],
    propositions: GeneratedProposition[],
  ): string {
    const responseSummary = responses
      .map((r) => `[${r.viewpoint}] ${r.content.slice(0, 150)}...`)
      .join('\n');

    const propSummary = propositions
      .map((p) => `- ${p.statement} (${p.supportCount} support, ${p.opposeCount} oppose)`)
      .join('\n');

    return `Analyze this discussion and generate a common ground analysis:

Topic: "${topic.title}"
Description: "${topic.description}"

Responses:
${responseSummary}

Propositions:
${propSummary}

Identify:
1. Agreement zones (1-3): Where do most participants agree?
2. Misunderstandings (0-2): What points of confusion exist?
3. Genuine disagreements (1-2): What are fundamental value differences?

For each agreement zone, cite specific evidence from responses.
For disagreements, identify the underlying values in tension.
Calculate an overall consensus score (0.0-1.0) based on the analysis.`;
  }
}

export default CommonGroundGenerator;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/common-ground-generator.test.ts
```

- [ ] **Step 5: Commit enhanced common ground generator**

```bash
git add packages/db-models/prisma/seed/generators/common-ground-generator.ts packages/db-models/prisma/seed/tests/common-ground-generator.test.ts
git commit -m "feat(db-models): enhance common ground generator with LLM

- Replace template-based generation with LLM
- Analyze actual responses and propositions
- Generate topic-specific agreement zones and disagreements"
```

---

### Task 8: Implement Bridging Suggestion Generator

**Files:**

- Create: `packages/db-models/prisma/seed/generators/bridging-generator.ts`
- Test: `packages/db-models/prisma/seed/tests/bridging-generator.test.ts`

- [ ] **Step 1: Write failing test for bridging generator**

Create file `packages/db-models/prisma/seed/tests/bridging-generator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BridgingGenerator } from '../generators/bridging-generator.js';
import type { SeedingLLMClient } from '../generators/llm-client.js';
import type {
  GeneratedTopic,
  GeneratedProposition,
  GeneratedCommonGround,
} from '../generators/types.js';

describe('BridgingGenerator', () => {
  let mockClient: SeedingLLMClient;
  let generator: BridgingGenerator;

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
  };

  const mockCommonGround: GeneratedCommonGround = {
    id: '11111111-0000-4000-8000-003113000001',
    topicId: mockTopic.id,
    version: 1,
    agreementZones: [],
    misunderstandings: [],
    genuineDisagreements: [
      {
        proposition: 'Economic impact',
        viewpoints: [],
        underlyingValues: ['Jobs', 'Health'],
      },
    ],
    overallConsensusScore: 0.6,
    participantCountAtGeneration: 5,
    responseCountAtGeneration: 6,
    modelVersion: 'test',
  };

  beforeEach(() => {
    mockClient = {
      generateJSON: vi.fn().mockResolvedValue([
        {
          suggestionText: 'Consider subsidies for electric equipment transition',
          targetAudience: 'both',
          relatedPropositionIndices: [0],
          potentialCommonGround: 'Both sides value economic stability',
          confidenceScore: 0.75,
          suggestionType: 'compromise',
        },
      ]),
      destroy: vi.fn(),
    } as unknown as SeedingLLMClient;

    generator = new BridgingGenerator(mockClient);
  });

  it('should generate bridging suggestions', async () => {
    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].topicId).toBe(mockTopic.id);
  });

  it('should link to common ground analysis', async () => {
    const suggestions = await generator.generateForTopic(mockTopic, [], mockCommonGround, 113);
    expect(suggestions[0].commonGroundAnalysisId).toBe(mockCommonGround.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/bridging-generator.test.ts
```

- [ ] **Step 3: Implement bridging generator**

Create file `packages/db-models/prisma/seed/generators/bridging-generator.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Bridging Suggestion Generator
 *
 * Generates suggestions to help bridge perspectives in discussions.
 */

import { generateBridgingId } from '../demo-ids.js';
import type {
  GeneratedBridgingSuggestion,
  GeneratedTopic,
  GeneratedProposition,
  GeneratedCommonGround,
  BridgingType,
  TargetAudience,
} from './types.js';
import type { SeedingLLMClient } from './llm-client.js';

// =============================================================================
// GENERATOR
// =============================================================================

interface LLMBridgingOutput {
  suggestionText: string;
  targetAudience: TargetAudience;
  relatedPropositionIndices: number[];
  potentialCommonGround: string;
  confidenceScore: number;
  suggestionType: BridgingType;
}

export class BridgingGenerator {
  constructor(private client: SeedingLLMClient) {}

  /**
   * Generate bridging suggestions for a topic.
   */
  async generateForTopic(
    topic: GeneratedTopic,
    propositions: GeneratedProposition[],
    commonGround: GeneratedCommonGround,
    topicNumber: number,
  ): Promise<GeneratedBridgingSuggestion[]> {
    const topicPropositions = propositions.filter((p) => p.topicId === topic.id);

    const prompt = this.buildPrompt(topic, topicPropositions, commonGround);
    const schema = {
      type: 'array',
      items: {
        suggestionText: 'string (action-oriented suggestion)',
        targetAudience: '"support" | "oppose" | "both"',
        relatedPropositionIndices: 'number[] (indices into propositions array)',
        potentialCommonGround: 'string (what agreement this could unlock)',
        confidenceScore: 'number (0.5-0.95)',
        suggestionType: '"reframe" | "question" | "shared_value" | "compromise"',
      },
    };

    const rawSuggestions = await this.client.generateJSON<LLMBridgingOutput[]>(prompt, schema);

    return rawSuggestions.map((raw, index) =>
      this.transformSuggestion(
        raw,
        topicNumber,
        index + 1,
        topic.id,
        commonGround.id,
        topicPropositions,
      ),
    );
  }

  /**
   * Generate bridging suggestions for all topics.
   */
  async generateForAllTopics(
    topics: GeneratedTopic[],
    propositions: GeneratedProposition[],
    commonGroundAnalyses: GeneratedCommonGround[],
  ): Promise<GeneratedBridgingSuggestion[]> {
    const allBridging: GeneratedBridgingSuggestion[] = [];

    for (const topic of topics) {
      const commonGround = commonGroundAnalyses.find((cg) => cg.topicId === topic.id);
      if (!commonGround) continue;

      const topicNumber = parseInt(topic.id.slice(-3), 10);
      console.log(`Generating bridging suggestions for: ${topic.title.slice(0, 50)}...`);

      const suggestions = await this.generateForTopic(
        topic,
        propositions,
        commonGround,
        topicNumber,
      );
      allBridging.push(...suggestions);
    }

    return allBridging;
  }

  private buildPrompt(
    topic: GeneratedTopic,
    propositions: GeneratedProposition[],
    commonGround: GeneratedCommonGround,
  ): string {
    const propSummary = propositions.map((p, i) => `${i}: ${p.statement}`).join('\n');

    const disagreementSummary = commonGround.genuineDisagreements
      .map((d) => `- ${d.proposition}: ${d.underlyingValues.join(' vs ')}`)
      .join('\n');

    return `Generate 3 bridging suggestions for this discussion:

Topic: "${topic.title}"

Propositions:
${propSummary}

Key Disagreements:
${disagreementSummary}

Consensus Score: ${commonGround.overallConsensusScore}

Generate 3 suggestions that could help bridge perspectives:
- Each should target supporters, opponents, or both
- Reference specific propositions by index
- Identify what common ground could be unlocked
- Types: reframe, question, shared_value, compromise

IMPORTANT: Suggestions should be actionable and specific to this topic.`;
  }

  private transformSuggestion(
    raw: LLMBridgingOutput,
    topicNumber: number,
    sequence: number,
    topicId: string,
    commonGroundId: string,
    propositions: GeneratedProposition[],
  ): GeneratedBridgingSuggestion {
    // Map proposition indices to IDs
    const relatedPropIds = raw.relatedPropositionIndices
      .filter((i) => i >= 0 && i < propositions.length)
      .map((i) => propositions[i]!.id);

    return {
      id: generateBridgingId(topicNumber, sequence),
      topicId,
      commonGroundAnalysisId: commonGroundId,
      suggestionText: raw.suggestionText,
      targetAudience: raw.targetAudience,
      relatedPropositionIds: relatedPropIds,
      potentialCommonGround: raw.potentialCommonGround,
      confidenceScore: Math.min(0.95, Math.max(0.5, raw.confidenceScore)),
      suggestionType: raw.suggestionType,
    };
  }
}

export default BridgingGenerator;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/bridging-generator.test.ts
```

- [ ] **Step 5: Commit bridging generator**

```bash
git add packages/db-models/prisma/seed/generators/bridging-generator.ts packages/db-models/prisma/seed/tests/bridging-generator.test.ts
git commit -m "feat(db-models): add bridging suggestion generator

- Generate 3 bridging suggestions per topic via LLM
- Link to propositions and common ground analysis
- Support reframe, question, shared_value, compromise types"
```

---

## Chunk 5: Orchestrator and Integration

### Task 9: Implement Generation Orchestrator

**Files:**

- Create: `packages/db-models/prisma/seed/generators/orchestrator.ts`
- Test: `packages/db-models/prisma/seed/tests/orchestrator.test.ts`

- [ ] **Step 1: Write test for orchestrator**

Create file `packages/db-models/prisma/seed/tests/orchestrator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerationOrchestrator, isCacheValid } from '../generators/orchestrator.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('GenerationOrchestrator', () => {
  describe('isCacheValid', () => {
    it('should return false when cache does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const result = await isCacheValid('/fake/path');
      expect(result).toBe(false);
    });

    it('should return true when metadata exists and version matches', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ cacheVersion: 1, topicCount: 75 }));
      const result = await isCacheValid('/fake/path', 1);
      expect(result).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/orchestrator.test.ts
```

- [ ] **Step 3: Implement orchestrator**

Create file `packages/db-models/prisma/seed/generators/orchestrator.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generation Orchestrator
 *
 * Coordinates the full generation pipeline and manages caching.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { TopicGenerator } from './topic-generator.js';
import { ResponseGenerator } from './response-generator.js';
import { PropositionGenerator } from './proposition-generator.js';
import { CommonGroundGenerator } from './common-ground-generator.js';
import { BridgingGenerator } from './bridging-generator.js';
import { createSeedingClient, type SeedingLLMClient } from './llm-client.js';
import type {
  CachedData,
  GenerationMetadata,
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
  GeneratedCommonGround,
  GeneratedBridgingSuggestion,
} from './types.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const CACHE_VERSION = 1;
const CACHE_DIR = new URL('../cache', import.meta.url).pathname;

const CACHE_FILES = {
  metadata: 'generation-metadata.json',
  topics: 'generated-topics.json',
  responses: 'generated-responses.json',
  propositions: 'generated-propositions.json',
  commonGround: 'generated-common-ground.json',
  bridging: 'generated-bridging.json',
} as const;

// =============================================================================
// CACHE FUNCTIONS
// =============================================================================

export async function isCacheValid(
  cacheDir: string,
  expectedVersion: number = CACHE_VERSION,
): Promise<boolean> {
  try {
    const metadataPath = path.join(cacheDir, CACHE_FILES.metadata);
    await fs.access(metadataPath);
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata: GenerationMetadata = JSON.parse(content);
    return metadata.cacheVersion === expectedVersion;
  } catch {
    return false;
  }
}

async function loadCache(cacheDir: string): Promise<CachedData | null> {
  try {
    const [metadata, topics, responses, propositions, commonGround, bridging] = await Promise.all([
      fs.readFile(path.join(cacheDir, CACHE_FILES.metadata), 'utf-8').then(JSON.parse),
      fs.readFile(path.join(cacheDir, CACHE_FILES.topics), 'utf-8').then(JSON.parse),
      fs.readFile(path.join(cacheDir, CACHE_FILES.responses), 'utf-8').then(JSON.parse),
      fs.readFile(path.join(cacheDir, CACHE_FILES.propositions), 'utf-8').then(JSON.parse),
      fs.readFile(path.join(cacheDir, CACHE_FILES.commonGround), 'utf-8').then(JSON.parse),
      fs.readFile(path.join(cacheDir, CACHE_FILES.bridging), 'utf-8').then(JSON.parse),
    ]);

    return { metadata, topics, responses, propositions, commonGround, bridging };
  } catch {
    return null;
  }
}

async function saveCache(cacheDir: string, data: CachedData): Promise<void> {
  await fs.mkdir(cacheDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(cacheDir, CACHE_FILES.metadata), JSON.stringify(data.metadata, null, 2)),
    fs.writeFile(path.join(cacheDir, CACHE_FILES.topics), JSON.stringify(data.topics, null, 2)),
    fs.writeFile(
      path.join(cacheDir, CACHE_FILES.responses),
      JSON.stringify(data.responses, null, 2),
    ),
    fs.writeFile(
      path.join(cacheDir, CACHE_FILES.propositions),
      JSON.stringify(data.propositions, null, 2),
    ),
    fs.writeFile(
      path.join(cacheDir, CACHE_FILES.commonGround),
      JSON.stringify(data.commonGround, null, 2),
    ),
    fs.writeFile(path.join(cacheDir, CACHE_FILES.bridging), JSON.stringify(data.bridging, null, 2)),
  ]);
}

// =============================================================================
// ORCHESTRATOR
// =============================================================================

export interface OrchestratorOptions {
  forceRegenerate?: boolean;
  cacheDir?: string;
  startingTopicNumber?: number;
}

export class GenerationOrchestrator {
  private client: SeedingLLMClient;
  private topicGenerator: TopicGenerator;
  private responseGenerator: ResponseGenerator;
  private propositionGenerator: PropositionGenerator;
  private commonGroundGenerator: CommonGroundGenerator;
  private bridgingGenerator: BridgingGenerator;

  constructor(client?: SeedingLLMClient) {
    this.client = client ?? createSeedingClient();
    this.topicGenerator = new TopicGenerator(this.client);
    this.responseGenerator = new ResponseGenerator(this.client);
    this.propositionGenerator = new PropositionGenerator(this.client);
    this.commonGroundGenerator = new CommonGroundGenerator(this.client);
    this.bridgingGenerator = new BridgingGenerator(this.client);
  }

  /**
   * Get all generated data, either from cache or by generating.
   */
  async getData(options: OrchestratorOptions = {}): Promise<CachedData> {
    const cacheDir = options.cacheDir ?? CACHE_DIR;
    const startingTopicNumber = options.startingTopicNumber ?? 113;

    // Check cache first (unless force regenerate)
    if (!options.forceRegenerate) {
      const cacheValid = await isCacheValid(cacheDir);
      if (cacheValid) {
        console.log('Loading from cache...');
        const cached = await loadCache(cacheDir);
        if (cached) return cached;
      }
    }

    // Generate all data
    console.log('Generating new content via LLM...');
    const startTime = Date.now();

    const topics = await this.topicGenerator.generateAll(startingTopicNumber);
    const responses = await this.responseGenerator.generateForAllTopics(topics);
    const propositions = await this.propositionGenerator.generateForAllTopics(topics, responses);
    const commonGround = await this.commonGroundGenerator.generateForAllTopics(
      topics,
      responses,
      propositions,
    );
    const bridging = await this.bridgingGenerator.generateForAllTopics(
      topics,
      propositions,
      commonGround,
    );

    const metadata: GenerationMetadata = {
      generatedAt: new Date().toISOString(),
      modelVersion: 'claude-3-5-sonnet-20241022',
      topicCount: topics.length,
      responseCount: responses.length,
      propositionCount: propositions.length,
      commonGroundCount: commonGround.length,
      bridgingCount: bridging.length,
      generationDurationMs: Date.now() - startTime,
      cacheVersion: CACHE_VERSION,
    };

    const data: CachedData = { metadata, topics, responses, propositions, commonGround, bridging };

    // Save to cache
    console.log('Saving to cache...');
    await saveCache(cacheDir, data);

    console.log(`Generation complete in ${metadata.generationDurationMs}ms`);
    console.log(`  Topics: ${topics.length}`);
    console.log(`  Responses: ${responses.length}`);
    console.log(`  Propositions: ${propositions.length}`);
    console.log(`  Common Ground: ${commonGround.length}`);
    console.log(`  Bridging: ${bridging.length}`);

    return data;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.client.destroy();
  }
}

export default GenerationOrchestrator;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/db-models && pnpm test prisma/seed/tests/orchestrator.test.ts
```

- [ ] **Step 5: Commit orchestrator**

```bash
git add packages/db-models/prisma/seed/generators/orchestrator.ts packages/db-models/prisma/seed/tests/orchestrator.test.ts
git commit -m "feat(db-models): add generation orchestrator

- Coordinate full generation pipeline
- Load from cache when valid
- Save generated content to JSON cache files
- Track generation metadata"
```

---

### Task 10: Update demo-fixtures.ts to Use Orchestrator

**Files:**

- Modify: `packages/db-models/prisma/seed/demo-fixtures.ts`

- [ ] **Step 1: Read current demo-fixtures.ts**

```bash
cd packages/db-models && head -100 prisma/seed/demo-fixtures.ts
```

- [ ] **Step 2: Add imports and update seedDemo function**

Add to top of `packages/db-models/prisma/seed/demo-fixtures.ts`:

```typescript
import { GenerationOrchestrator } from './generators/orchestrator.js';
import type { CachedData } from './generators/types.js';
```

Add new function before `seedDemo`:

```typescript
/**
 * Get generated content (from cache or LLM)
 */
async function getGeneratedContent(options: { force?: boolean } = {}): Promise<CachedData | null> {
  const useGenerated = process.env['USE_GENERATED_CONTENT'] !== 'false';
  if (!useGenerated) {
    console.log('USE_GENERATED_CONTENT=false, using hand-crafted data only');
    return null;
  }

  try {
    const orchestrator = new GenerationOrchestrator();
    const data = await orchestrator.getData({ forceRegenerate: options.force });
    orchestrator.destroy();
    return data;
  } catch (error) {
    console.warn('Failed to get generated content, falling back to hand-crafted:', error);
    return null;
  }
}
```

Update the `seedDemo` function to merge generated content:

```typescript
export async function seedDemo(
  prisma: PrismaClient,
  options: { force?: boolean } = {},
): Promise<void> {
  console.log('🌱 Starting demo environment seed...');
  console.log('');

  if (options.force) {
    await truncateDemoData(prisma);
    console.log('');
  }

  // Try to get generated content
  const generated = await getGeneratedContent(options);

  // Phase 2: Foundational
  await seedDemoPersonas(prisma);
  console.log('');

  // Phase 3: Content
  await seedDemoTags(prisma);

  // Seed topics (hand-crafted + generated)
  await seedDemoTopics(prisma);
  if (generated) {
    await seedGeneratedTopics(prisma, generated.topics);
  }

  // Seed responses (hand-crafted + generated)
  await seedDemoResponses(prisma);
  if (generated) {
    await seedGeneratedResponses(prisma, generated.responses);
  }

  // Seed propositions (hand-crafted + generated)
  await seedDemoPropositions(prisma);
  if (generated) {
    await seedGeneratedPropositions(prisma, generated.propositions);
  }

  // Seed alignments and common ground
  await seedDemoAlignments(prisma);
  await seedDemoCommonGround(prisma);
  if (generated) {
    await seedGeneratedCommonGround(prisma, generated.commonGround);
    await seedGeneratedBridging(prisma, generated.bridging);
  }
  console.log('');

  // Phase 5: AI Feedback
  await seedDemoAIFeedback(prisma);
  console.log('');

  // Summary
  const topicCount = DEMO_TOPICS.length + (generated?.topics.length ?? 0);
  const responseCount = DEMO_RESPONSES.length + (generated?.responses.length ?? 0);

  console.log('🎉 Demo environment seed complete!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  • ${DEMO_PERSONAS.length} personas`);
  console.log(`  • ${DEMO_TAGS.length} tags`);
  console.log(
    `  • ${topicCount} topics (${DEMO_TOPICS.length} hand-crafted + ${generated?.topics.length ?? 0} generated)`,
  );
  console.log(`  • ${responseCount} responses`);
  // ... rest of summary
}
```

- [ ] **Step 3: Add helper functions for seeding generated content**

Add these functions to `demo-fixtures.ts`:

```typescript
import type {
  GeneratedTopic,
  GeneratedResponse,
  GeneratedProposition,
  GeneratedCommonGround,
  GeneratedBridgingSuggestion,
} from './generators/types.js';

async function seedGeneratedTopics(prisma: PrismaClient, topics: GeneratedTopic[]): Promise<void> {
  console.log(`📋 Seeding ${topics.length} generated topics...`);

  for (const topic of topics) {
    await prisma.discussionTopic.upsert({
      where: { id: topic.id },
      update: {
        title: topic.title,
        description: topic.description,
        status: topic.status,
        crossCuttingThemes: topic.crossCuttingThemes,
      },
      create: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        slug: topic.slug,
        creatorId: topic.creatorId,
        status: topic.status,
        crossCuttingThemes: topic.crossCuttingThemes,
      },
    });

    // Create tag associations
    for (const tagId of topic.tagIds) {
      await prisma.topicTag.upsert({
        where: { topicId_tagId: { topicId: topic.id, tagId } },
        update: {},
        create: { topicId: topic.id, tagId, source: 'CREATOR' },
      });
    }
  }

  console.log(`✅ Seeded ${topics.length} generated topics`);
}

async function seedGeneratedResponses(
  prisma: PrismaClient,
  responses: GeneratedResponse[],
): Promise<void> {
  console.log(`💬 Seeding ${responses.length} generated responses...`);

  for (const response of responses) {
    await prisma.response.upsert({
      where: { id: response.id },
      update: {
        content: response.content,
        viewpoint: response.viewpoint,
        citedSources: response.citedSources,
      },
      create: {
        id: response.id,
        topicId: response.topicId,
        authorId: response.authorId,
        parentId: response.parentId,
        content: response.content,
        viewpoint: response.viewpoint,
        citedSources: response.citedSources,
      },
    });
  }

  console.log(`✅ Seeded ${responses.length} generated responses`);
}

async function seedGeneratedPropositions(
  prisma: PrismaClient,
  propositions: GeneratedProposition[],
): Promise<void> {
  console.log(`📝 Seeding ${propositions.length} generated propositions...`);

  for (const prop of propositions) {
    await prisma.proposition.upsert({
      where: { id: prop.id },
      update: {
        statement: prop.statement,
        source: prop.source,
        supportCount: prop.supportCount,
        opposeCount: prop.opposeCount,
        nuancedCount: prop.nuancedCount,
        consensusScore: prop.consensusScore,
        status: prop.status,
      },
      create: {
        id: prop.id,
        topicId: prop.topicId,
        statement: prop.statement,
        source: prop.source,
        supportCount: prop.supportCount,
        opposeCount: prop.opposeCount,
        nuancedCount: prop.nuancedCount,
        consensusScore: prop.consensusScore,
        status: prop.status,
      },
    });
  }

  console.log(`✅ Seeded ${propositions.length} generated propositions`);
}

async function seedGeneratedCommonGround(
  prisma: PrismaClient,
  commonGroundList: GeneratedCommonGround[],
): Promise<void> {
  console.log(`🤝 Seeding ${commonGroundList.length} generated common ground analyses...`);

  for (const cg of commonGroundList) {
    await prisma.commonGroundAnalysis.upsert({
      where: { id: cg.id },
      update: {
        version: cg.version,
        agreementZones: cg.agreementZones,
        misunderstandings: cg.misunderstandings,
        genuineDisagreements: cg.genuineDisagreements,
        overallConsensusScore: cg.overallConsensusScore,
        participantCountAtGeneration: cg.participantCountAtGeneration,
        responseCountAtGeneration: cg.responseCountAtGeneration,
        modelVersion: cg.modelVersion,
      },
      create: {
        id: cg.id,
        topicId: cg.topicId,
        version: cg.version,
        agreementZones: cg.agreementZones,
        misunderstandings: cg.misunderstandings,
        genuineDisagreements: cg.genuineDisagreements,
        overallConsensusScore: cg.overallConsensusScore,
        participantCountAtGeneration: cg.participantCountAtGeneration,
        responseCountAtGeneration: cg.responseCountAtGeneration,
        modelVersion: cg.modelVersion,
      },
    });
  }

  console.log(`✅ Seeded ${commonGroundList.length} generated common ground analyses`);
}

async function seedGeneratedBridging(
  prisma: PrismaClient,
  bridgingList: GeneratedBridgingSuggestion[],
): Promise<void> {
  // NOTE: BridgingSuggestion table does not exist in Prisma schema.
  // This function stores bridging suggestions in cache only (via orchestrator).
  // When a BridgingSuggestion model is added, uncomment the upsert logic below.
  console.log(`🌉 Bridging suggestions: ${bridgingList.length} (cache only, no DB table yet)`);

  // Future implementation when BridgingSuggestion table exists:
  // for (const bridging of bridgingList) {
  //   await prisma.bridgingSuggestion.upsert({
  //     where: { id: bridging.id },
  //     update: {
  //       suggestionText: bridging.suggestionText,
  //       targetAudience: bridging.targetAudience,
  //       relatedPropositionIds: bridging.relatedPropositionIds,
  //       potentialCommonGround: bridging.potentialCommonGround,
  //       confidenceScore: bridging.confidenceScore,
  //       suggestionType: bridging.suggestionType,
  //     },
  //     create: {
  //       id: bridging.id,
  //       topicId: bridging.topicId,
  //       commonGroundAnalysisId: bridging.commonGroundAnalysisId,
  //       suggestionText: bridging.suggestionText,
  //       targetAudience: bridging.targetAudience,
  //       relatedPropositionIds: bridging.relatedPropositionIds,
  //       potentialCommonGround: bridging.potentialCommonGround,
  //       confidenceScore: bridging.confidenceScore,
  //       suggestionType: bridging.suggestionType,
  //     },
  //   });
  // }
}
```

- [ ] **Step 4: Run typecheck and tests**

```bash
cd packages/db-models && pnpm typecheck && pnpm test
```

- [ ] **Step 5: Commit demo-fixtures update**

```bash
git add packages/db-models/prisma/seed/demo-fixtures.ts
git commit -m "feat(db-models): integrate LLM generation into demo seeding

- Load generated content from cache or LLM
- Merge with existing hand-crafted content
- Support USE_GENERATED_CONTENT=false fallback
- Update summary to show combined counts"
```

---

### Task 11: Add CLI Commands for Regeneration

**Files:**

- Modify: `packages/db-models/package.json`
- Create: `packages/db-models/prisma/seed/cli/generate.ts`

- [ ] **Step 1: Create CLI script**

Create file `packages/db-models/prisma/seed/cli/generate.ts`:

```typescript
#!/usr/bin/env tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CLI for generating seeding content.
 *
 * Usage:
 *   pnpm seed:generate          # Generate if cache invalid
 *   pnpm seed:generate --force  # Force regeneration
 */

import { GenerationOrchestrator } from '../generators/orchestrator.js';

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  console.log('🤖 LLM Seeding Content Generator');
  console.log('================================');
  console.log('');

  const orchestrator = new GenerationOrchestrator();

  try {
    const data = await orchestrator.getData({ forceRegenerate: force });

    console.log('');
    console.log('✅ Generation complete!');
    console.log('');
    console.log('Cache files written to: prisma/seed/cache/');
    console.log(`  • ${data.metadata.topicCount} topics`);
    console.log(`  • ${data.metadata.responseCount} responses`);
    console.log(`  • ${data.metadata.propositionCount} propositions`);
    console.log(`  • ${data.metadata.commonGroundCount} common ground analyses`);
    console.log(`  • ${data.metadata.bridgingCount} bridging suggestions`);
  } finally {
    orchestrator.destroy();
  }
}

main().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Add script to package.json**

Add to `packages/db-models/package.json` scripts:

```json
"seed:generate": "tsx prisma/seed/cli/generate.ts"
```

- [ ] **Step 3: Test CLI**

```bash
cd packages/db-models && pnpm seed:generate --help
```

- [ ] **Step 4: Commit CLI**

```bash
git add packages/db-models/prisma/seed/cli/generate.ts packages/db-models/package.json
git commit -m "feat(db-models): add seed generation CLI

- pnpm seed:generate: generate if cache invalid
- pnpm seed:generate --force: force regeneration"
```

---

### Task 12: Final Integration Test

- [ ] **Step 1: Run full test suite**

```bash
cd packages/db-models && pnpm test
```

Expected: All tests pass

- [ ] **Step 2: Build the package**

```bash
cd packages/db-models && pnpm build
```

Expected: Build succeeds

- [ ] **Step 3: Test with USE_GENERATED_CONTENT=false**

```bash
cd packages/db-models && USE_GENERATED_CONTENT=false pnpm db:seed
```

Expected: Seeds with hand-crafted data only

- [ ] **Step 4: Create final commit**

```bash
git add .
git commit -m "feat(db-models): complete LLM seeding framework

Implementation of LLM-powered demo data generation:
- TopicGenerator: 63 topics across 9 categories
- ResponseGenerator: 5-8 threaded responses per topic
- PropositionGenerator: 3-5 propositions per topic
- CommonGroundGenerator: LLM-based analysis
- BridgingGenerator: 2-3 suggestions per topic
- Orchestrator: Cache management, fallback support

Closes #XXX"
```

---

## Summary

This plan implements the LLM-powered seeding framework in 5 chunks:

1. **Infrastructure Setup** (Tasks 1-3): Dependencies, types, ID generation, LLM client
2. **Topic Generator** (Task 4): Generate 63 topics across 9 categories
3. **Response Generator** (Tasks 5-6): Generate responses and propositions
4. **Common Ground & Bridging** (Tasks 7-8): LLM-based analysis generation
5. **Integration** (Tasks 9-12): Orchestrator, demo-fixtures, CLI, testing

Total estimated tasks: 12 major tasks with ~60 steps
