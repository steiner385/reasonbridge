# Enhanced Demo Seed Data Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale demo seed data from ~400 entries to ~70,000+ entries with AI-generated content, calculated rankings, and power-law activity distribution.

**Architecture:** Extend existing seed infrastructure with AI generators, corpus caching, and post-seed calculators. Preserve current patterns (deterministic IDs, upsert semantics) while adding scale.

**Tech Stack:** TypeScript, Prisma, Anthropic Claude API, Node.js streams for batching

**Spec:** `docs/superpowers/specs/2026-03-13-enhanced-demo-seed-data-design.md`

---

## Chunk 1: Foundation - Configuration & ID Generation

### Task 1.1: Create Distribution Configuration

**Files:**
- Create: `packages/db-models/prisma/seed/config/distribution.ts`

- [ ] **Step 1: Write the configuration file**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Distribution Configuration for Demo Seed Data
 *
 * Defines scale targets and power-law distribution parameters.
 */

export type ScaleProfile = 'small' | 'medium' | 'large';

export interface ScaleConfig {
  users: { power: number; regular: number; casual: number };
  topicsPerCategory: number;
  discussionsPerTopic: { high: number; medium: number; low: number };
  responsesPerUser: { power: [number, number]; regular: [number, number]; casual: [number, number] };
  votesPerResponse: [number, number];
  reactionsPerResponse: [number, number];
}

export const SCALE_PROFILES: Record<ScaleProfile, ScaleConfig> = {
  small: {
    users: { power: 5, regular: 15, casual: 30 },
    topicsPerCategory: 5,
    discussionsPerTopic: { high: 2, medium: 1, low: 1 },
    responsesPerUser: { power: [20, 50], regular: [5, 20], casual: [1, 5] },
    votesPerResponse: [1, 5],
    reactionsPerResponse: [0, 3],
  },
  medium: {
    users: { power: 10, regular: 30, casual: 60 },
    topicsPerCategory: 10,
    discussionsPerTopic: { high: 3, medium: 2, low: 1 },
    responsesPerUser: { power: [30, 100], regular: [10, 30], casual: [1, 10] },
    votesPerResponse: [2, 8],
    reactionsPerResponse: [1, 5],
  },
  large: {
    users: { power: 20, regular: 60, casual: 120 },
    topicsPerCategory: 20,
    discussionsPerTopic: { high: 4, medium: 2, low: 1 },
    responsesPerUser: { power: [50, 200], regular: [10, 50], casual: [1, 10] },
    votesPerResponse: [3, 10],
    reactionsPerResponse: [1, 8],
  },
};

export const ACTIVITY_TIERS = ['power', 'regular', 'casual'] as const;
export type ActivityTier = typeof ACTIVITY_TIERS[number];

export const CATEGORIES = [
  'Technology & Innovation',
  'Environment & Climate',
  'Healthcare & Medicine',
  'Education & Learning',
  'Economics & Business',
  'Politics & Governance',
  'Science & Research',
  'Ethics & Society',
  'Law & Justice',
  'Media & Communication',
  'Arts & Culture',
  'International Relations',
  'Philosophy & Logic',
  'Personal Finance',
  'Sports & Recreation',
] as const;

export type Category = typeof CATEGORIES[number];

export function getScaleConfig(profile: ScaleProfile = 'large'): ScaleConfig {
  return SCALE_PROFILES[profile];
}

export function getTotalUsers(config: ScaleConfig): number {
  return config.users.power + config.users.regular + config.users.casual;
}

export function getTotalTopics(config: ScaleConfig): number {
  return CATEGORIES.length * config.topicsPerCategory;
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/config/distribution.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/config/distribution.ts
git commit -m "feat(seed): add distribution configuration for enhanced demo data"
```

---

### Task 1.2: Create Extended ID Generator

**Files:**
- Modify: `packages/db-models/prisma/seed/demo-ids.ts`

- [ ] **Step 1: Add extended ID generation functions**

Add to the existing file after line 130:

```typescript
// =============================================================================
// EXTENDED DEMO IDS (for enhanced seed data)
// =============================================================================

/**
 * Demo namespace UUID for deterministic generation
 * Uses UUID v5 with this namespace for reproducible IDs
 */
export const DEMO_NAMESPACE = '11111111-0000-4000-8000-000000000000';

/**
 * Generate a deterministic user ID for enhanced demo data
 * Format: 11111111-0000-4000-8000-100NNNNNNNNN
 * NNN = user index (000000001-000000999)
 */
export function generateEnhancedUserId(index: number): string {
  const indexPart = index.toString().padStart(9, '0');
  return `11111111-0000-4000-8000-100${indexPart}`;
}

/**
 * Generate a deterministic topic ID for enhanced demo data
 * Format: 11111111-0000-4000-8000-200CCCTTTTTT
 * CCC = category index (001-015)
 * TTTTTT = topic index within category (000001-000999)
 */
export function generateEnhancedTopicId(categoryIndex: number, topicIndex: number): string {
  const catPart = categoryIndex.toString().padStart(3, '0');
  const topicPart = topicIndex.toString().padStart(6, '0');
  return `11111111-0000-4000-8000-200${catPart}${topicPart}`;
}

/**
 * Generate a deterministic discussion ID
 * Format: 11111111-0000-4000-8000-300TTTDDDDDD
 * TTT = topic number (001-999)
 * DDDDDD = discussion index (000001-999999)
 */
export function generateDiscussionId(topicIndex: number, discussionIndex: number): string {
  const topicPart = topicIndex.toString().padStart(3, '0');
  const discPart = discussionIndex.toString().padStart(6, '0');
  return `11111111-0000-4000-8000-300${topicPart}${discPart}`;
}

/**
 * Generate a deterministic enhanced response ID
 * Format: 11111111-0000-4000-8000-400DDDRRRRRRR
 * DDD = discussion index (001-999)
 * RRRRRRR = response index (0000001-9999999)
 */
export function generateEnhancedResponseId(discussionIndex: number, responseIndex: number): string {
  const discPart = discussionIndex.toString().padStart(3, '0');
  const respPart = responseIndex.toString().padStart(7, '0');
  return `11111111-0000-4000-8000-4${discPart}${respPart}`;
}

/**
 * Generate a deterministic vote ID
 * Format: 11111111-0000-4000-8000-500UUURRRRRRR
 * UUU = user index (001-999)
 * RRRRRRR = response/target index
 */
export function generateVoteId(userIndex: number, targetIndex: number): string {
  const userPart = userIndex.toString().padStart(3, '0');
  const targetPart = targetIndex.toString().padStart(7, '0');
  return `11111111-0000-4000-8000-5${userPart}${targetPart}`;
}

/**
 * Generate a deterministic reaction ID
 * Format: 11111111-0000-4000-8000-600UUURRRRRRR
 */
export function generateReactionId(userIndex: number, targetIndex: number): string {
  const userPart = userIndex.toString().padStart(3, '0');
  const targetPart = targetIndex.toString().padStart(7, '0');
  return `11111111-0000-4000-8000-6${userPart}${targetPart}`;
}

/**
 * Generate a deterministic bookmark ID
 * Format: 11111111-0000-4000-8000-700UUUTTTTTTT
 */
export function generateBookmarkId(userIndex: number, targetIndex: number): string {
  const userPart = userIndex.toString().padStart(3, '0');
  const targetPart = targetIndex.toString().padStart(7, '0');
  return `11111111-0000-4000-8000-7${userPart}${targetPart}`;
}

/**
 * Generate a deterministic connection ID
 * Format: 11111111-0000-4000-8000-800UUUFFFFF
 * UUU = user index, FFFFF = followed user index
 */
export function generateConnectionId(userIndex: number, followedIndex: number): string {
  const userPart = userIndex.toString().padStart(3, '0');
  const followedPart = followedIndex.toString().padStart(7, '0');
  return `11111111-0000-4000-8000-8${userPart}${followedPart}`;
}

/**
 * Check if an ID is from the enhanced demo set (100+ prefix in last segment)
 */
export function isEnhancedDemoId(uuid: string): boolean {
  return uuid.startsWith('11111111-') && uuid.includes('-100');
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/demo-ids.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/demo-ids.ts
git commit -m "feat(seed): add extended ID generators for enhanced demo data"
```

---

### Task 1.3: Create Categories Configuration

**Files:**
- Create: `packages/db-models/prisma/seed/config/categories.ts`

- [ ] **Step 1: Write the categories configuration**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Category definitions for enhanced demo seed data
 */

export interface CategoryDefinition {
  name: string;
  slug: string;
  description: string;
  topicPrompts: {
    evergreen: string[];
    current: string[];
    emerging: string[];
  };
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description: 'Digital transformation, AI, software, hardware, and emerging tech',
    topicPrompts: {
      evergreen: ['privacy vs convenience', 'open source vs proprietary', 'automation and jobs'],
      current: ['AI regulation', 'social media algorithms', 'cryptocurrency adoption'],
      emerging: ['brain-computer interfaces', 'quantum computing ethics', 'AGI safety'],
    },
  },
  {
    name: 'Environment & Climate',
    slug: 'environment-climate',
    description: 'Climate change, sustainability, conservation, and environmental policy',
    topicPrompts: {
      evergreen: ['economic growth vs environment', 'individual vs systemic change', 'nuclear energy'],
      current: ['carbon pricing', 'EV mandates', 'renewable energy subsidies'],
      emerging: ['geoengineering ethics', 'climate migration rights', 'ocean farming'],
    },
  },
  {
    name: 'Healthcare & Medicine',
    slug: 'healthcare-medicine',
    description: 'Medical ethics, healthcare systems, public health, and medical technology',
    topicPrompts: {
      evergreen: ['universal healthcare', 'end-of-life decisions', 'organ donation'],
      current: ['vaccine mandates', 'telehealth expansion', 'drug pricing'],
      emerging: ['genetic enhancement', 'AI diagnostics liability', 'longevity treatments'],
    },
  },
  {
    name: 'Education & Learning',
    slug: 'education-learning',
    description: 'Educational systems, pedagogy, academic freedom, and lifelong learning',
    topicPrompts: {
      evergreen: ['standardized testing', 'school choice', 'liberal arts value'],
      current: ['student debt', 'remote learning', 'curriculum debates'],
      emerging: ['AI tutoring', 'micro-credentials', 'VR classrooms'],
    },
  },
  {
    name: 'Economics & Business',
    slug: 'economics-business',
    description: 'Economic policy, labor markets, corporate governance, and trade',
    topicPrompts: {
      evergreen: ['minimum wage', 'wealth inequality', 'free trade'],
      current: ['remote work policies', 'gig economy', 'antitrust enforcement'],
      emerging: ['four-day workweek', 'UBI pilots', 'stakeholder capitalism'],
    },
  },
  {
    name: 'Politics & Governance',
    slug: 'politics-governance',
    description: 'Political systems, voting, representation, and civic engagement',
    topicPrompts: {
      evergreen: ['electoral reform', 'term limits', 'federalism'],
      current: ['voting access', 'campaign finance', 'partisan gerrymandering'],
      emerging: ['digital democracy', 'AI in governance', 'citizen assemblies'],
    },
  },
  {
    name: 'Science & Research',
    slug: 'science-research',
    description: 'Scientific method, research ethics, funding, and science communication',
    topicPrompts: {
      evergreen: ['peer review', 'research funding', 'science communication'],
      current: ['gain-of-function research', 'reproducibility crisis', 'preprints'],
      emerging: ['AI-assisted research', 'open science mandates', 'citizen science'],
    },
  },
  {
    name: 'Ethics & Society',
    slug: 'ethics-society',
    description: 'Moral philosophy, social norms, cultural values, and ethical dilemmas',
    topicPrompts: {
      evergreen: ['free speech limits', 'privacy rights', 'moral relativism'],
      current: ['cancel culture', 'content moderation', 'algorithmic fairness'],
      emerging: ['AI rights', 'digital afterlife', 'synthetic media ethics'],
    },
  },
  {
    name: 'Law & Justice',
    slug: 'law-justice',
    description: 'Legal systems, criminal justice, rights, and legal reform',
    topicPrompts: {
      evergreen: ['death penalty', 'drug legalization', 'judicial independence'],
      current: ['police reform', 'prison reform', 'surveillance law'],
      emerging: ['AI judges', 'algorithmic sentencing', 'digital evidence standards'],
    },
  },
  {
    name: 'Media & Communication',
    slug: 'media-communication',
    description: 'Journalism, social media, information quality, and media ethics',
    topicPrompts: {
      evergreen: ['media bias', 'press freedom', 'advertising ethics'],
      current: ['misinformation', 'platform liability', 'local news decline'],
      emerging: ['AI-generated news', 'deepfake regulation', 'attention economy'],
    },
  },
  {
    name: 'Arts & Culture',
    slug: 'arts-culture',
    description: 'Creative expression, cultural heritage, arts funding, and cultural policy',
    topicPrompts: {
      evergreen: ['arts funding', 'cultural appropriation', 'censorship in art'],
      current: ['AI art copyright', 'museum repatriation', 'streaming economics'],
      emerging: ['NFT art', 'virtual museums', 'AI creativity'],
    },
  },
  {
    name: 'International Relations',
    slug: 'international-relations',
    description: 'Diplomacy, global governance, international law, and geopolitics',
    topicPrompts: {
      evergreen: ['humanitarian intervention', 'UN reform', 'sovereignty'],
      current: ['sanctions effectiveness', 'alliance systems', 'trade wars'],
      emerging: ['space governance', 'cyber warfare rules', 'climate refugees'],
    },
  },
  {
    name: 'Philosophy & Logic',
    slug: 'philosophy-logic',
    description: 'Philosophical inquiry, logical reasoning, epistemology, and metaphysics',
    topicPrompts: {
      evergreen: ['free will', 'consciousness', 'moral realism'],
      current: ['epistemic humility', 'tribal epistemology', 'expertise trust'],
      emerging: ['machine consciousness', 'simulation hypothesis', 'post-truth'],
    },
  },
  {
    name: 'Personal Finance',
    slug: 'personal-finance',
    description: 'Financial literacy, investing, retirement, and economic security',
    topicPrompts: {
      evergreen: ['debt vs investing', 'home ownership', 'retirement age'],
      current: ['inflation strategies', 'crypto investing', 'financial education'],
      emerging: ['AI financial advisors', 'programmable money', 'wealth taxes'],
    },
  },
  {
    name: 'Sports & Recreation',
    slug: 'sports-recreation',
    description: 'Athletics, leisure, competition, and sports policy',
    topicPrompts: {
      evergreen: ['youth sports', 'performance enhancement', 'amateur vs pro'],
      current: ['athlete compensation', 'esports recognition', 'sports betting'],
      emerging: ['genetic advantages', 'AI coaching', 'virtual sports'],
    },
  },
];

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return CATEGORY_DEFINITIONS.find(c => c.slug === slug);
}

export function getCategoryIndex(name: string): number {
  return CATEGORY_DEFINITIONS.findIndex(c => c.name === name);
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/config/categories.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/config/categories.ts
git commit -m "feat(seed): add category definitions for 15 topic categories"
```

---

## Chunk 2: AI Client & User Generation

### Task 2.1: Create AI Client Wrapper

**Files:**
- Create: `packages/db-models/prisma/seed/generators/ai-client.ts`

- [ ] **Step 1: Write the AI client**

```typescript
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
  return new Promise(resolve => setTimeout(resolve, ms));
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

        const textBlock = response.content.find(block => block.type === 'text');
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

  async function generateBatch(prompts: string[], options: AIGenerationOptions = {}): Promise<string[]> {
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
      return Promise.all(prompts.map(p => this.generate(p)));
    },
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default createAIClient;
```

- [ ] **Step 2: Install Anthropic SDK if not present**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/packages/db-models && pnpm add @anthropic-ai/sdk`

- [ ] **Step 3: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/generators/ai-client.ts 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add packages/db-models/prisma/seed/generators/ai-client.ts packages/db-models/package.json pnpm-lock.yaml
git commit -m "feat(seed): add AI client wrapper for content generation"
```

---

### Task 2.2: Create User Persona Generator

**Files:**
- Create: `packages/db-models/prisma/seed/generators/user-generator.ts`

- [ ] **Step 1: Write the user generator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * User Persona Generator
 *
 * Generates diverse user personas with realistic attributes.
 */

import { generateEnhancedUserId } from '../demo-ids.js';
import { ActivityTier, ScaleConfig, CATEGORIES } from '../config/distribution.js';
import type { AIClient } from './ai-client.js';

export interface GeneratedUserPersona {
  id: string;
  index: number;
  email: string;
  displayName: string;
  bio: string;
  cognitoSub: string;
  activityTier: ActivityTier;
  writingStyle: 'formal' | 'conversational' | 'academic' | 'passionate';
  argumentationStyle: 'evidence-based' | 'principle-driven' | 'pragmatic';
  topicInterests: string[];
  registrationOffset: number;
  activityPattern: 'consistent' | 'burst' | 'declining' | 'growing';
  passwordHash: string;
}

const WRITING_STYLES = ['formal', 'conversational', 'academic', 'passionate'] as const;
const ARGUMENTATION_STYLES = ['evidence-based', 'principle-driven', 'pragmatic'] as const;
const ACTIVITY_PATTERNS = ['consistent', 'burst', 'declining', 'growing'] as const;

// Pre-computed bcrypt hash for "DemoUser2026!"
const DEFAULT_PASSWORD_HASH = '$2b$10$dJPE1gjx.bzf1x4qtXlukOnOARg60n9eTYdpYTnXxwA/3v6EKP9wC';

export interface UserGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

/**
 * Generate user personas based on scale config
 */
export async function generateUserPersonas(
  config: ScaleConfig,
  options: UserGeneratorOptions = {}
): Promise<GeneratedUserPersona[]> {
  const personas: GeneratedUserPersona[] = [];
  let userIndex = 1;

  // Generate power users
  for (let i = 0; i < config.users.power; i++) {
    personas.push(createPersona(userIndex++, 'power', options));
  }

  // Generate regular users
  for (let i = 0; i < config.users.regular; i++) {
    personas.push(createPersona(userIndex++, 'regular', options));
  }

  // Generate casual users
  for (let i = 0; i < config.users.casual; i++) {
    personas.push(createPersona(userIndex++, 'casual', options));
  }

  // If AI client provided, generate richer bios
  if (options.aiClient && !options.useMockData) {
    await enrichPersonasWithAI(personas, options.aiClient);
  }

  return personas;
}

function createPersona(index: number, tier: ActivityTier, _options: UserGeneratorOptions): GeneratedUserPersona {
  const id = generateEnhancedUserId(index);
  const displayName = generateDisplayName(index);

  // Deterministic but varied selections based on index
  const writingStyle = WRITING_STYLES[index % WRITING_STYLES.length];
  const argumentationStyle = ARGUMENTATION_STYLES[index % ARGUMENTATION_STYLES.length];
  const activityPattern = ACTIVITY_PATTERNS[index % ACTIVITY_PATTERNS.length];

  // Select 2-4 topic interests based on index
  const numInterests = 2 + (index % 3);
  const topicInterests: string[] = [];
  for (let i = 0; i < numInterests; i++) {
    const catIndex = (index + i * 3) % CATEGORIES.length;
    topicInterests.push(CATEGORIES[catIndex]);
  }

  // Registration offset: power users joined earlier
  const maxOffset = 180; // 6 months
  let registrationOffset: number;
  switch (tier) {
    case 'power':
      registrationOffset = Math.floor((index / 20) * 150) + 30; // 30-180 days ago
      break;
    case 'regular':
      registrationOffset = Math.floor((index / 60) * 120) + 14; // 14-134 days ago
      break;
    case 'casual':
      registrationOffset = Math.floor((index / 120) * 90); // 0-90 days ago
      break;
  }

  return {
    id,
    index,
    email: `demo-user-${index.toString().padStart(3, '0')}@reasonbridge.demo`,
    displayName,
    bio: generateDefaultBio(displayName, tier, topicInterests),
    cognitoSub: `demo-enhanced-${index}`,
    activityTier: tier,
    writingStyle,
    argumentationStyle,
    topicInterests,
    registrationOffset: Math.min(registrationOffset, maxOffset),
    activityPattern,
    passwordHash: DEFAULT_PASSWORD_HASH,
  };
}

function generateDisplayName(index: number): string {
  // Diverse name pool
  const firstNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
    'Skyler', 'Dakota', 'Reese', 'Finley', 'Rowan', 'Sage', 'Emerson', 'Blake',
    'Cameron', 'Drew', 'Jamie', 'Kendall', 'Logan', 'Parker', 'Peyton', 'Sydney',
    'Aiden', 'Amara', 'Chen', 'Davi', 'Elena', 'Fatima', 'Gia', 'Hiroshi',
    'Imani', 'Javier', 'Kai', 'Leila', 'Marco', 'Nadia', 'Omar', 'Priya',
    'Raj', 'Sana', 'Tariq', 'Uma', 'Viktor', 'Wei', 'Xena', 'Yuki', 'Zara',
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Chen', 'Kim', 'Patel', 'Singh', 'Kumar', 'Tanaka', 'Nakamura', 'Sato',
    'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner',
  ];

  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];

  return `${firstName} ${lastName}`;
}

function generateDefaultBio(name: string, tier: ActivityTier, interests: string[]): string {
  const tierDescriptions = {
    power: 'Active community contributor passionate about',
    regular: 'Engaged participant interested in',
    casual: 'Curious learner exploring',
  };

  const interestList = interests.slice(0, 2).join(' and ');
  return `${tierDescriptions[tier]} ${interestList}. Believes in evidence-based discourse.`;
}

async function enrichPersonasWithAI(personas: GeneratedUserPersona[], aiClient: AIClient): Promise<void> {
  console.log('🤖 Enriching user bios with AI...');

  // Batch process to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < personas.length; i += batchSize) {
    const batch = personas.slice(i, i + batchSize);
    const prompts = batch.map(p =>
      `Generate a 1-2 sentence bio for a discussion platform user named "${p.displayName}". ` +
      `They are ${p.activityTier === 'power' ? 'very active' : p.activityTier === 'regular' ? 'moderately active' : 'occasionally active'}. ` +
      `Their interests include: ${p.topicInterests.join(', ')}. ` +
      `Writing style: ${p.writingStyle}. Keep it natural and brief.`
    );

    const bios = await aiClient.generateBatch(prompts);
    batch.forEach((p, j) => {
      p.bio = bios[j];
    });

    console.log(`  Processed ${Math.min(i + batchSize, personas.length)}/${personas.length} users`);
  }
}

export default generateUserPersonas;
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/generators/user-generator.ts 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/generators/user-generator.ts
git commit -m "feat(seed): add user persona generator with diversity and AI enrichment"
```

---

## Chunk 3: Topic & Response Generators

### Task 3.1: Create Topic Generator

**Files:**
- Create: `packages/db-models/prisma/seed/generators/topic-generator.ts`

- [ ] **Step 1: Write the topic generator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Generator
 *
 * Generates discussion topics across all categories.
 */

import { generateEnhancedTopicId, generateDiscussionId } from '../demo-ids.js';
import { CATEGORY_DEFINITIONS, CategoryDefinition } from '../config/categories.js';
import { ScaleConfig } from '../config/distribution.js';
import type { AIClient } from './ai-client.js';
import type { GeneratedUserPersona } from './user-generator.js';

export interface GeneratedTopic {
  id: string;
  categoryIndex: number;
  topicIndex: number;
  title: string;
  description: string;
  slug: string;
  creatorId: string;
  category: string;
  topicType: 'evergreen' | 'current' | 'emerging';
  status: 'ACTIVE' | 'ARCHIVED' | 'SEEDING';
  crossCuttingThemes: string[];
  createdAtOffset: number; // Days ago
}

export interface GeneratedDiscussion {
  id: string;
  topicId: string;
  topicIndex: number;
  discussionIndex: number;
  title: string;
  creatorId: string;
  createdAtOffset: number;
}

export interface TopicGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

/**
 * Generate topics across all categories
 */
export async function generateTopics(
  config: ScaleConfig,
  users: GeneratedUserPersona[],
  options: TopicGeneratorOptions = {}
): Promise<GeneratedTopic[]> {
  const topics: GeneratedTopic[] = [];
  let globalTopicIndex = 0;

  for (let catIndex = 0; catIndex < CATEGORY_DEFINITIONS.length; catIndex++) {
    const category = CATEGORY_DEFINITIONS[catIndex];
    const topicsInCategory = config.topicsPerCategory;

    // Distribution: 25% evergreen, 50% current, 25% emerging
    const evergreenCount = Math.floor(topicsInCategory * 0.25);
    const currentCount = Math.floor(topicsInCategory * 0.5);
    const emergingCount = topicsInCategory - evergreenCount - currentCount;

    for (let i = 0; i < topicsInCategory; i++) {
      globalTopicIndex++;

      let topicType: 'evergreen' | 'current' | 'emerging';
      if (i < evergreenCount) topicType = 'evergreen';
      else if (i < evergreenCount + currentCount) topicType = 'current';
      else topicType = 'emerging';

      const topic = createTopic(
        catIndex,
        i,
        globalTopicIndex,
        category,
        topicType,
        users,
        options
      );
      topics.push(topic);
    }
  }

  // Enrich with AI if available
  if (options.aiClient && !options.useMockData) {
    await enrichTopicsWithAI(topics, options.aiClient);
  }

  return topics;
}

function createTopic(
  catIndex: number,
  indexInCategory: number,
  globalIndex: number,
  category: CategoryDefinition,
  topicType: 'evergreen' | 'current' | 'emerging',
  users: GeneratedUserPersona[],
  _options: TopicGeneratorOptions
): GeneratedTopic {
  const id = generateEnhancedTopicId(catIndex + 1, indexInCategory + 1);

  // Select a creator - prefer users interested in this category
  const interestedUsers = users.filter(u => u.topicInterests.includes(category.name));
  const creator = interestedUsers.length > 0
    ? interestedUsers[globalIndex % interestedUsers.length]
    : users[globalIndex % users.length];

  // Get prompt hint for this topic type
  const prompts = category.topicPrompts[topicType];
  const promptHint = prompts[indexInCategory % prompts.length];

  // Generate title from prompt hint
  const title = generateTitleFromHint(promptHint, category.name);
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);

  // Topic age: evergreen older, emerging newer
  let createdAtOffset: number;
  switch (topicType) {
    case 'evergreen':
      createdAtOffset = 90 + (globalIndex % 90); // 90-180 days ago
      break;
    case 'current':
      createdAtOffset = 14 + (globalIndex % 76); // 14-90 days ago
      break;
    case 'emerging':
      createdAtOffset = globalIndex % 14; // 0-14 days ago
      break;
  }

  // Most topics ACTIVE, some ARCHIVED or SEEDING
  let status: 'ACTIVE' | 'ARCHIVED' | 'SEEDING' = 'ACTIVE';
  if (topicType === 'evergreen' && globalIndex % 10 === 0) status = 'ARCHIVED';
  if (topicType === 'emerging' && globalIndex % 5 === 0) status = 'SEEDING';

  return {
    id,
    categoryIndex: catIndex,
    topicIndex: indexInCategory,
    title,
    description: generateDefaultDescription(title, category.name, promptHint),
    slug,
    creatorId: creator.id,
    category: category.name,
    topicType,
    status,
    crossCuttingThemes: [promptHint, category.slug],
    createdAtOffset,
  };
}

function generateTitleFromHint(hint: string, _category: string): string {
  // Transform hint into a debatable question
  const prefixes = [
    'Should we reconsider',
    'Is it time to rethink',
    'What are the implications of',
    'How should we approach',
    'Should society embrace',
  ];
  const prefix = prefixes[hint.length % prefixes.length];
  return `${prefix} ${hint}?`;
}

function generateDefaultDescription(title: string, category: string, hint: string): string {
  return `This topic explores ${hint} within the context of ${category}. ` +
    `Consider the various perspectives, trade-offs, and evidence relevant to this debate. ` +
    `What are the strongest arguments on each side?`;
}

async function enrichTopicsWithAI(topics: GeneratedTopic[], aiClient: AIClient): Promise<void> {
  console.log('🤖 Enriching topic descriptions with AI...');

  const batchSize = 10;
  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize);
    const prompts = batch.map(t =>
      `Write a 2-3 sentence description for a discussion topic titled "${t.title}" ` +
      `in the ${t.category} category. The description should provide neutral context ` +
      `and invite multiple perspectives. Keep it concise and engaging.`
    );

    const descriptions = await aiClient.generateBatch(prompts);
    batch.forEach((t, j) => {
      t.description = descriptions[j];
    });

    console.log(`  Processed ${Math.min(i + batchSize, topics.length)}/${topics.length} topics`);
  }
}

/**
 * Generate discussions for topics
 */
export function generateDiscussions(
  topics: GeneratedTopic[],
  users: GeneratedUserPersona[],
  config: ScaleConfig
): GeneratedDiscussion[] {
  const discussions: GeneratedDiscussion[] = [];
  let globalDiscussionIndex = 0;

  for (const topic of topics) {
    // Determine discussion count based on topic type
    let discussionCount: number;
    switch (topic.topicType) {
      case 'current':
        discussionCount = config.discussionsPerTopic.high;
        break;
      case 'evergreen':
        discussionCount = config.discussionsPerTopic.medium;
        break;
      case 'emerging':
        discussionCount = config.discussionsPerTopic.low;
        break;
    }

    // Skip discussions for SEEDING topics
    if (topic.status === 'SEEDING') continue;

    for (let i = 0; i < discussionCount; i++) {
      globalDiscussionIndex++;

      // Select creator from interested users
      const interestedUsers = users.filter(u => u.topicInterests.includes(topic.category));
      const creator = interestedUsers.length > 0
        ? interestedUsers[globalDiscussionIndex % interestedUsers.length]
        : users[globalDiscussionIndex % users.length];

      discussions.push({
        id: generateDiscussionId(topic.topicIndex + 1, i + 1),
        topicId: topic.id,
        topicIndex: topic.topicIndex,
        discussionIndex: i,
        title: `Discussion ${i + 1}: ${topic.title.substring(0, 40)}...`,
        creatorId: creator.id,
        createdAtOffset: topic.createdAtOffset - i, // Slightly newer than topic
      });
    }
  }

  return discussions;
}

export default generateTopics;
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/generators/topic-generator.ts 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/generators/topic-generator.ts
git commit -m "feat(seed): add topic and discussion generators"
```

---

This plan continues with more chunks for:
- **Chunk 4**: Response generator with threading
- **Chunk 5**: Engagement generators (votes, reactions, bookmarks)
- **Chunk 6**: Calculators (trust scores, rankings, badges)
- **Chunk 7**: Corpus caching and main orchestrator
- **Chunk 8**: Integration with existing seed infrastructure

---

## Chunk 4: Response Generator

### Task 4.1: Create Response Generator

**Files:**
- Create: `packages/db-models/prisma/seed/generators/response-generator.ts`

- [ ] **Step 1: Write the response generator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Response Generator
 *
 * Generates threaded responses with realistic conversation flow.
 */

import { generateEnhancedResponseId } from '../demo-ids.js';
import { ScaleConfig } from '../config/distribution.js';
import type { AIClient } from './ai-client.js';
import type { GeneratedUserPersona } from './user-generator.js';
import type { GeneratedTopic, GeneratedDiscussion } from './topic-generator.js';

export type ResponseType = 'thesis' | 'agreement' | 'disagreement' | 'question' | 'synthesis' | 'evidence';
export type ViewpointType = 'support' | 'oppose' | 'nuanced';

export interface GeneratedResponse {
  id: string;
  discussionId: string;
  topicId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  responseType: ResponseType;
  viewpoint: ViewpointType;
  createdAtOffset: number;
  citedSources: Array<{ url: string; title: string }>;
}

export interface ResponseGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

/**
 * Generate responses for all discussions
 */
export async function generateResponses(
  discussions: GeneratedDiscussion[],
  topics: GeneratedTopic[],
  users: GeneratedUserPersona[],
  config: ScaleConfig,
  options: ResponseGeneratorOptions = {}
): Promise<GeneratedResponse[]> {
  const responses: GeneratedResponse[] = [];
  let globalResponseIndex = 0;

  // Build topic lookup
  const topicMap = new Map(topics.map(t => [t.id, t]));

  // Assign response counts to users based on activity tier
  const userResponseCounts = assignResponseCounts(users, config);

  for (const discussion of discussions) {
    const topic = topicMap.get(discussion.topicId);
    if (!topic) continue;

    // Generate thread structure for this discussion
    const threadResponses = generateThreadStructure(
      discussion,
      topic,
      users,
      userResponseCounts,
      globalResponseIndex,
      options
    );

    responses.push(...threadResponses);
    globalResponseIndex += threadResponses.length;
  }

  // Enrich with AI if available
  if (options.aiClient && !options.useMockData) {
    await enrichResponsesWithAI(responses, topics, options.aiClient);
  }

  return responses;
}

function assignResponseCounts(
  users: GeneratedUserPersona[],
  config: ScaleConfig
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const user of users) {
    const range = config.responsesPerUser[user.activityTier];
    // Deterministic count based on user index
    const count = range[0] + (user.index % (range[1] - range[0] + 1));
    counts.set(user.id, count);
  }

  return counts;
}

function generateThreadStructure(
  discussion: GeneratedDiscussion,
  topic: GeneratedTopic,
  users: GeneratedUserPersona[],
  userResponseCounts: Map<string, number>,
  startIndex: number,
  _options: ResponseGeneratorOptions
): GeneratedResponse[] {
  const responses: GeneratedResponse[] = [];
  let responseIndex = startIndex;

  // Get users who have responses left to give
  const availableUsers = users.filter(u => {
    const remaining = userResponseCounts.get(u.id) || 0;
    return remaining > 0;
  });

  if (availableUsers.length === 0) return responses;

  // Thread structure: root -> replies -> nested replies
  const threadDepth = 3;
  const responsesPerLevel = [2, 4, 3]; // 2 roots, 4 direct replies, 3 nested

  const rootResponses: GeneratedResponse[] = [];

  // Generate root responses (thesis statements)
  for (let i = 0; i < Math.min(responsesPerLevel[0], availableUsers.length); i++) {
    const author = availableUsers[responseIndex % availableUsers.length];
    decrementUserCount(userResponseCounts, author.id);

    const response = createResponse(
      responseIndex++,
      discussion,
      topic,
      author,
      null,
      'thesis',
      discussion.createdAtOffset - i
    );
    responses.push(response);
    rootResponses.push(response);
  }

  // Generate direct replies
  const level1Responses: GeneratedResponse[] = [];
  for (let i = 0; i < responsesPerLevel[1] && rootResponses.length > 0; i++) {
    const author = availableUsers[responseIndex % availableUsers.length];
    if ((userResponseCounts.get(author.id) || 0) <= 0) continue;
    decrementUserCount(userResponseCounts, author.id);

    const parent = rootResponses[i % rootResponses.length];
    const responseType = getReplyType(i);

    const response = createResponse(
      responseIndex++,
      discussion,
      topic,
      author,
      parent.id,
      responseType,
      parent.createdAtOffset - 1 - (i % 3)
    );
    responses.push(response);
    level1Responses.push(response);
  }

  // Generate nested replies
  for (let i = 0; i < responsesPerLevel[2] && level1Responses.length > 0; i++) {
    const author = availableUsers[responseIndex % availableUsers.length];
    if ((userResponseCounts.get(author.id) || 0) <= 0) continue;
    decrementUserCount(userResponseCounts, author.id);

    const parent = level1Responses[i % level1Responses.length];
    const responseType = i === responsesPerLevel[2] - 1 ? 'synthesis' : getReplyType(i);

    const response = createResponse(
      responseIndex++,
      discussion,
      topic,
      author,
      parent.id,
      responseType,
      parent.createdAtOffset - 1
    );
    responses.push(response);
  }

  return responses;
}

function decrementUserCount(counts: Map<string, number>, userId: string): void {
  const current = counts.get(userId) || 0;
  counts.set(userId, Math.max(0, current - 1));
}

function getReplyType(index: number): ResponseType {
  const types: ResponseType[] = ['agreement', 'disagreement', 'question', 'evidence'];
  return types[index % types.length];
}

function createResponse(
  index: number,
  discussion: GeneratedDiscussion,
  topic: GeneratedTopic,
  author: GeneratedUserPersona,
  parentId: string | null,
  responseType: ResponseType,
  createdAtOffset: number
): GeneratedResponse {
  const viewpoint = getViewpointForType(responseType, index);

  return {
    id: generateEnhancedResponseId(discussion.discussionIndex + 1, index),
    discussionId: discussion.id,
    topicId: topic.id,
    authorId: author.id,
    parentId,
    content: generateMockContent(topic.title, responseType, author),
    responseType,
    viewpoint,
    createdAtOffset: Math.max(0, createdAtOffset),
    citedSources: responseType === 'evidence' ? generateMockSources(index) : [],
  };
}

function getViewpointForType(type: ResponseType, index: number): ViewpointType {
  switch (type) {
    case 'thesis':
      return index % 2 === 0 ? 'support' : 'oppose';
    case 'agreement':
      return 'support';
    case 'disagreement':
      return 'oppose';
    case 'synthesis':
    case 'question':
      return 'nuanced';
    case 'evidence':
      return index % 3 === 0 ? 'support' : index % 3 === 1 ? 'oppose' : 'nuanced';
  }
}

function generateMockContent(
  topicTitle: string,
  type: ResponseType,
  author: GeneratedUserPersona
): string {
  const templates: Record<ResponseType, string[]> = {
    thesis: [
      `This is an important topic. ${topicTitle.replace('?', '')} deserves careful consideration from multiple angles.`,
      `I've thought about this extensively. The key issue is understanding the underlying principles.`,
    ],
    agreement: [
      `I agree with this perspective. The evidence supports this position.`,
      `Well said. This aligns with my understanding of the issue.`,
    ],
    disagreement: [
      `I respectfully disagree. There are alternative viewpoints worth considering.`,
      `While I understand this position, I think there are stronger arguments on the other side.`,
    ],
    question: [
      `Can you elaborate on the evidence for this claim?`,
      `What would change your mind about this position?`,
    ],
    synthesis: [
      `Looking at both perspectives, there may be common ground here.`,
      `Perhaps we can find a middle path that addresses concerns from both sides.`,
    ],
    evidence: [
      `Research suggests a more nuanced picture. Studies have shown varied results.`,
      `The data on this topic is worth examining carefully.`,
    ],
  };

  const options = templates[type];
  return options[author.index % options.length];
}

function generateMockSources(index: number): Array<{ url: string; title: string }> {
  return [
    {
      url: `https://example.com/research-${index}`,
      title: `Research Study ${index}: Evidence and Analysis`,
    },
  ];
}

async function enrichResponsesWithAI(
  responses: GeneratedResponse[],
  topics: GeneratedTopic[],
  aiClient: AIClient
): Promise<void> {
  console.log('🤖 Enriching responses with AI content...');

  const topicMap = new Map(topics.map(t => [t.id, t]));
  const batchSize = 20;

  for (let i = 0; i < responses.length; i += batchSize) {
    const batch = responses.slice(i, i + batchSize);

    const prompts = batch.map(r => {
      const topic = topicMap.get(r.topicId);
      return `Write a ${r.responseType} response (${r.viewpoint} viewpoint) to a discussion about: "${topic?.title || 'this topic'}". ` +
        `Keep it 2-4 sentences, natural and substantive. No greeting or sign-off.`;
    });

    const contents = await aiClient.generateBatch(prompts);
    batch.forEach((r, j) => {
      r.content = contents[j];
    });

    if ((i + batchSize) % 100 === 0 || i + batchSize >= responses.length) {
      console.log(`  Processed ${Math.min(i + batchSize, responses.length)}/${responses.length} responses`);
    }
  }
}

export default generateResponses;
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/generators/response-generator.ts 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/generators/response-generator.ts
git commit -m "feat(seed): add response generator with threaded conversations"
```

---

## Chunk 5: Engagement Generators

### Task 5.1: Create Engagement Generator

**Files:**
- Create: `packages/db-models/prisma/seed/generators/engagement-generator.ts`

- [ ] **Step 1: Write the engagement generator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Engagement Generator
 *
 * Generates votes, reactions, bookmarks, and connections.
 */

import { generateVoteId, generateReactionId, generateBookmarkId, generateConnectionId } from '../demo-ids.js';
import { ScaleConfig } from '../config/distribution.js';
import type { GeneratedUserPersona } from './user-generator.js';
import type { GeneratedResponse } from './response-generator.js';
import type { GeneratedTopic } from './topic-generator.js';

export interface GeneratedVote {
  id: string;
  userId: string;
  responseId: string;
  value: 1 | -1;
  createdAtOffset: number;
}

export interface GeneratedReaction {
  id: string;
  userId: string;
  responseId: string;
  emoji: string;
  createdAtOffset: number;
}

export interface GeneratedBookmark {
  id: string;
  userId: string;
  topicId: string;
  createdAtOffset: number;
}

export interface GeneratedConnection {
  id: string;
  followerId: string;
  followedId: string;
  createdAtOffset: number;
}

const REACTION_EMOJIS = ['👍', '💡', '🤔', '❤️', '🎯', '👏', '🙌', '💯'];

/**
 * Generate all engagement data
 */
export function generateEngagement(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  topics: GeneratedTopic[],
  config: ScaleConfig
): {
  votes: GeneratedVote[];
  reactions: GeneratedReaction[];
  bookmarks: GeneratedBookmark[];
  connections: GeneratedConnection[];
} {
  return {
    votes: generateVotes(users, responses, config),
    reactions: generateReactions(users, responses, config),
    bookmarks: generateBookmarks(users, topics),
    connections: generateConnections(users),
  };
}

function generateVotes(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  config: ScaleConfig
): GeneratedVote[] {
  const votes: GeneratedVote[] = [];
  let voteIndex = 0;

  for (let responseIdx = 0; responseIdx < responses.length; responseIdx++) {
    const response = responses[responseIdx];
    const voteRange = config.votesPerResponse;
    const numVotes = voteRange[0] + (responseIdx % (voteRange[1] - voteRange[0] + 1));

    // Select voters (exclude author)
    const eligibleVoters = users.filter(u => u.id !== response.authorId);

    for (let i = 0; i < numVotes && i < eligibleVoters.length; i++) {
      const voter = eligibleVoters[(responseIdx + i) % eligibleVoters.length];

      // Vote direction based on viewpoint alignment
      const value: 1 | -1 = (voter.index + responseIdx) % 3 === 0 ? -1 : 1;

      votes.push({
        id: generateVoteId(voter.index, voteIndex++),
        userId: voter.id,
        responseId: response.id,
        value,
        createdAtOffset: Math.max(0, response.createdAtOffset - 1),
      });
    }
  }

  return votes;
}

function generateReactions(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  config: ScaleConfig
): GeneratedReaction[] {
  const reactions: GeneratedReaction[] = [];
  let reactionIndex = 0;

  for (let responseIdx = 0; responseIdx < responses.length; responseIdx++) {
    const response = responses[responseIdx];
    const reactionRange = config.reactionsPerResponse;
    const numReactions = reactionRange[0] + (responseIdx % (reactionRange[1] - reactionRange[0] + 1));

    const eligibleReactors = users.filter(u => u.id !== response.authorId);

    for (let i = 0; i < numReactions && i < eligibleReactors.length; i++) {
      const reactor = eligibleReactors[(responseIdx + i * 2) % eligibleReactors.length];
      const emoji = REACTION_EMOJIS[(responseIdx + i) % REACTION_EMOJIS.length];

      reactions.push({
        id: generateReactionId(reactor.index, reactionIndex++),
        userId: reactor.id,
        responseId: response.id,
        emoji,
        createdAtOffset: Math.max(0, response.createdAtOffset - 1),
      });
    }
  }

  return reactions;
}

function generateBookmarks(
  users: GeneratedUserPersona[],
  topics: GeneratedTopic[]
): GeneratedBookmark[] {
  const bookmarks: GeneratedBookmark[] = [];
  let bookmarkIndex = 0;

  // Power users bookmark more
  for (const user of users) {
    const bookmarkCount = user.activityTier === 'power' ? 20 :
                          user.activityTier === 'regular' ? 10 : 3;

    const interestedTopics = topics.filter(t =>
      user.topicInterests.includes(t.category)
    );

    for (let i = 0; i < bookmarkCount && i < interestedTopics.length; i++) {
      const topic = interestedTopics[(user.index + i) % interestedTopics.length];

      bookmarks.push({
        id: generateBookmarkId(user.index, bookmarkIndex++),
        userId: user.id,
        topicId: topic.id,
        createdAtOffset: Math.max(0, topic.createdAtOffset - 5),
      });
    }
  }

  return bookmarks;
}

function generateConnections(users: GeneratedUserPersona[]): GeneratedConnection[] {
  const connections: GeneratedConnection[] = [];
  let connectionIndex = 0;

  // Users follow others based on activity tier
  for (const user of users) {
    const followCount = user.activityTier === 'power' ? 30 :
                        user.activityTier === 'regular' ? 15 : 5;

    // Follow users with similar interests
    const candidates = users.filter(u =>
      u.id !== user.id &&
      u.topicInterests.some(interest => user.topicInterests.includes(interest))
    );

    for (let i = 0; i < followCount && i < candidates.length; i++) {
      const followed = candidates[(user.index + i * 3) % candidates.length];

      connections.push({
        id: generateConnectionId(user.index, connectionIndex++),
        followerId: user.id,
        followedId: followed.id,
        createdAtOffset: Math.max(user.registrationOffset, followed.registrationOffset) - 5,
      });
    }
  }

  return connections;
}

export default generateEngagement;
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/generators/engagement-generator.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/generators/engagement-generator.ts
git commit -m "feat(seed): add engagement generator for votes, reactions, bookmarks, connections"
```

---

## Chunk 6: Calculators

### Task 6.1: Create Trust Score Calculator

**Files:**
- Create: `packages/db-models/prisma/seed/calculators/trust-score-calculator.ts`

- [ ] **Step 1: Write the trust score calculator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Trust Score Calculator
 *
 * Calculates trust scores from user activity.
 */

import type { GeneratedUserPersona } from '../generators/user-generator.js';
import type { GeneratedResponse } from '../generators/response-generator.js';
import type { GeneratedVote, GeneratedReaction } from '../generators/engagement-generator.js';

export interface TrustScores {
  ability: number;
  benevolence: number;
  integrity: number;
  overall: number;
}

export interface UserTrustData {
  userId: string;
  scores: TrustScores;
  rank: 'NEWCOMER' | 'MEMBER' | 'ESTABLISHED' | 'EXPERT';
}

/**
 * Calculate trust scores for all users
 */
export function calculateTrustScores(
  users: GeneratedUserPersona[],
  responses: GeneratedResponse[],
  votes: GeneratedVote[],
  reactions: GeneratedReaction[]
): UserTrustData[] {
  const results: UserTrustData[] = [];

  // Build lookup maps
  const responsesByUser = new Map<string, GeneratedResponse[]>();
  const votesByResponse = new Map<string, GeneratedVote[]>();
  const reactionsByResponse = new Map<string, GeneratedReaction[]>();

  for (const response of responses) {
    const list = responsesByUser.get(response.authorId) || [];
    list.push(response);
    responsesByUser.set(response.authorId, list);
  }

  for (const vote of votes) {
    const list = votesByResponse.get(vote.responseId) || [];
    list.push(vote);
    votesByResponse.set(vote.responseId, list);
  }

  for (const reaction of reactions) {
    const list = reactionsByResponse.get(reaction.responseId) || [];
    list.push(reaction);
    reactionsByResponse.set(reaction.responseId, list);
  }

  for (const user of users) {
    const userResponses = responsesByUser.get(user.id) || [];
    const scores = calculateUserScores(
      user,
      userResponses,
      votesByResponse,
      reactionsByResponse
    );

    results.push({
      userId: user.id,
      scores,
      rank: getRankFromScore(scores.overall),
    });
  }

  return results;
}

function calculateUserScores(
  user: GeneratedUserPersona,
  responses: GeneratedResponse[],
  votesByResponse: Map<string, GeneratedVote[]>,
  reactionsByResponse: Map<string, GeneratedReaction[]>
): TrustScores {
  // Ability: based on upvote ratio and response quality
  const ability = calculateAbility(responses, votesByResponse);

  // Benevolence: based on helpful reactions and synthesis contributions
  const benevolence = calculateBenevolence(responses, reactionsByResponse);

  // Integrity: based on consistency and source usage
  const integrity = calculateIntegrity(user, responses);

  // Overall: weighted combination
  const overall = (ability * 0.4) + (benevolence * 0.3) + (integrity * 0.3);

  return {
    ability: Math.round(ability * 100) / 100,
    benevolence: Math.round(benevolence * 100) / 100,
    integrity: Math.round(integrity * 100) / 100,
    overall: Math.round(overall * 100) / 100,
  };
}

function calculateAbility(
  responses: GeneratedResponse[],
  votesByResponse: Map<string, GeneratedVote[]>
): number {
  if (responses.length === 0) return 0.5;

  let totalUpvotes = 0;
  let totalVotes = 0;

  for (const response of responses) {
    const votes = votesByResponse.get(response.id) || [];
    for (const vote of votes) {
      totalVotes++;
      if (vote.value === 1) totalUpvotes++;
    }
  }

  const upvoteRatio = totalVotes > 0 ? totalUpvotes / totalVotes : 0.5;
  const responseVolume = Math.min(responses.length / 50, 1); // Cap at 50 responses

  return (upvoteRatio * 0.7) + (responseVolume * 0.3);
}

function calculateBenevolence(
  responses: GeneratedResponse[],
  reactionsByResponse: Map<string, GeneratedReaction[]>
): number {
  if (responses.length === 0) return 0.5;

  let helpfulReactions = 0;
  let synthesisResponses = 0;

  for (const response of responses) {
    const reactions = reactionsByResponse.get(response.id) || [];
    helpfulReactions += reactions.filter(r => ['💡', '🎯', '👏'].includes(r.emoji)).length;

    if (response.responseType === 'synthesis') synthesisResponses++;
  }

  const reactionScore = Math.min(helpfulReactions / (responses.length * 3), 1);
  const synthesisScore = Math.min(synthesisResponses / 5, 1);

  return (reactionScore * 0.6) + (synthesisScore * 0.4);
}

function calculateIntegrity(
  user: GeneratedUserPersona,
  responses: GeneratedResponse[]
): number {
  // Base score from account age
  const accountAge = user.registrationOffset / 180; // 0-1 based on 6 months

  // Evidence usage
  const evidenceResponses = responses.filter(r => r.citedSources.length > 0).length;
  const evidenceScore = responses.length > 0 ? evidenceResponses / responses.length : 0;

  return (accountAge * 0.4) + (evidenceScore * 0.4) + 0.2; // 0.2 base
}

function getRankFromScore(score: number): 'NEWCOMER' | 'MEMBER' | 'ESTABLISHED' | 'EXPERT' {
  if (score >= 0.85) return 'EXPERT';
  if (score >= 0.70) return 'ESTABLISHED';
  if (score >= 0.50) return 'MEMBER';
  return 'NEWCOMER';
}

export default calculateTrustScores;
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/calculators/trust-score-calculator.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/calculators/trust-score-calculator.ts
git commit -m "feat(seed): add trust score calculator"
```

---

### Task 6.2: Create Badge Calculator

**Files:**
- Create: `packages/db-models/prisma/seed/calculators/badge-calculator.ts`

- [ ] **Step 1: Write the badge calculator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Badge Calculator
 *
 * Derives badges from user activity thresholds.
 */

import type { GeneratedResponse } from '../generators/response-generator.js';
import type { UserTrustData } from './trust-score-calculator.js';

export interface UserBadges {
  userId: string;
  badges: string[];
}

export const BADGE_DEFINITIONS = {
  FIRST_POST: { name: 'First Post', threshold: 1 },
  CONTRIBUTOR: { name: 'Contributor', threshold: 10 },
  PROLIFIC: { name: 'Prolific', threshold: 50 },
  BRIDGE_BUILDER: { name: 'Bridge Builder', threshold: 10, type: 'synthesis' },
  EVIDENCE_CHAMPION: { name: 'Evidence Champion', threshold: 20, type: 'evidence' },
  EXPERT: { name: 'Expert', rank: 'EXPERT' },
  ESTABLISHED: { name: 'Established Member', rank: 'ESTABLISHED' },
} as const;

/**
 * Calculate badges for all users
 */
export function calculateBadges(
  responses: GeneratedResponse[],
  trustData: UserTrustData[]
): UserBadges[] {
  const results: UserBadges[] = [];

  // Build response counts by user
  const responsesByUser = new Map<string, GeneratedResponse[]>();
  for (const response of responses) {
    const list = responsesByUser.get(response.authorId) || [];
    list.push(response);
    responsesByUser.set(response.authorId, list);
  }

  // Build trust lookup
  const trustByUser = new Map(trustData.map(t => [t.userId, t]));

  for (const [userId, userResponses] of responsesByUser) {
    const badges: string[] = [];
    const trust = trustByUser.get(userId);

    // Response count badges
    if (userResponses.length >= 1) badges.push('FIRST_POST');
    if (userResponses.length >= 10) badges.push('CONTRIBUTOR');
    if (userResponses.length >= 50) badges.push('PROLIFIC');

    // Type-specific badges
    const synthesisCount = userResponses.filter(r => r.responseType === 'synthesis').length;
    if (synthesisCount >= 10) badges.push('BRIDGE_BUILDER');

    const evidenceCount = userResponses.filter(r => r.citedSources.length > 0).length;
    if (evidenceCount >= 20) badges.push('EVIDENCE_CHAMPION');

    // Rank badges
    if (trust?.rank === 'EXPERT') badges.push('EXPERT');
    else if (trust?.rank === 'ESTABLISHED') badges.push('ESTABLISHED');

    results.push({ userId, badges });
  }

  return results;
}

export default calculateBadges;
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/calculators/badge-calculator.ts 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/calculators/badge-calculator.ts
git commit -m "feat(seed): add badge calculator"
```

---

## Chunk 7: Main Orchestrator

### Task 7.1: Create Enhanced Seed Orchestrator

**Files:**
- Create: `packages/db-models/prisma/seed/enhanced-demo-seed.ts`

- [ ] **Step 1: Write the orchestrator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enhanced Demo Seed Orchestrator
 *
 * Main entry point for seeding large-scale demo data.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { getScaleConfig, ScaleProfile } from './config/distribution.js';
import { createAIClient } from './generators/ai-client.js';
import { generateUserPersonas } from './generators/user-generator.js';
import { generateTopics, generateDiscussions } from './generators/topic-generator.js';
import { generateResponses } from './generators/response-generator.js';
import { generateEngagement } from './generators/engagement-generator.js';
import { calculateTrustScores } from './calculators/trust-score-calculator.js';
import { calculateBadges } from './calculators/badge-calculator.js';

export interface EnhancedSeedOptions {
  scale?: ScaleProfile;
  useAI?: boolean;
  batchSize?: number;
  verbose?: boolean;
}

const DEFAULT_OPTIONS: EnhancedSeedOptions = {
  scale: 'large',
  useAI: true,
  batchSize: 100,
  verbose: true,
};

/**
 * Seed enhanced demo data
 */
export async function seedEnhancedDemo(
  prisma: PrismaClient,
  options: EnhancedSeedOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const config = getScaleConfig(opts.scale!);
  const log = opts.verbose ? console.log.bind(console) : () => {};

  log('🚀 Starting enhanced demo seed...');
  log(`   Scale: ${opts.scale}`);
  log(`   AI: ${opts.useAI ? 'enabled' : 'disabled'}`);
  log('');

  const aiClient = opts.useAI ? createAIClient() : undefined;

  // Phase 1: Generate data
  log('📦 Phase 1: Generating data...');

  log('  👥 Generating users...');
  const users = await generateUserPersonas(config, { aiClient, useMockData: !opts.useAI });
  log(`     Generated ${users.length} users`);

  log('  📋 Generating topics...');
  const topics = await generateTopics(config, users, { aiClient, useMockData: !opts.useAI });
  log(`     Generated ${topics.length} topics`);

  log('  💬 Generating discussions...');
  const discussions = generateDiscussions(topics, users, config);
  log(`     Generated ${discussions.length} discussions`);

  log('  📝 Generating responses...');
  const responses = await generateResponses(discussions, topics, users, config, { aiClient, useMockData: !opts.useAI });
  log(`     Generated ${responses.length} responses`);

  log('  ⭐ Generating engagement...');
  const engagement = generateEngagement(users, responses, topics, config);
  log(`     Generated ${engagement.votes.length} votes, ${engagement.reactions.length} reactions`);
  log(`     Generated ${engagement.bookmarks.length} bookmarks, ${engagement.connections.length} connections`);

  // Phase 2: Calculate derived data
  log('');
  log('📊 Phase 2: Calculating derived data...');

  log('  🎯 Calculating trust scores...');
  const trustData = calculateTrustScores(users, responses, engagement.votes, engagement.reactions);

  log('  🏅 Calculating badges...');
  const badges = calculateBadges(responses, trustData);

  // Phase 3: Persist to database
  log('');
  log('💾 Phase 3: Persisting to database...');

  await persistUsers(prisma, users, trustData, badges, opts.batchSize!, log);
  await persistTopics(prisma, topics, opts.batchSize!, log);
  await persistDiscussions(prisma, discussions, opts.batchSize!, log);
  await persistResponses(prisma, responses, opts.batchSize!, log);
  await persistEngagement(prisma, engagement, opts.batchSize!, log);

  // Summary
  log('');
  log('✅ Enhanced demo seed complete!');
  log('');
  log('📊 Summary:');
  log(`   Users: ${users.length}`);
  log(`   Topics: ${topics.length}`);
  log(`   Discussions: ${discussions.length}`);
  log(`   Responses: ${responses.length}`);
  log(`   Votes: ${engagement.votes.length}`);
  log(`   Reactions: ${engagement.reactions.length}`);
  log(`   Bookmarks: ${engagement.bookmarks.length}`);
  log(`   Connections: ${engagement.connections.length}`);
}

async function persistUsers(
  prisma: PrismaClient,
  users: Awaited<ReturnType<typeof generateUserPersonas>>,
  trustData: ReturnType<typeof calculateTrustScores>,
  badges: ReturnType<typeof calculateBadges>,
  batchSize: number,
  log: typeof console.log
): Promise<void> {
  log(`  👥 Persisting ${users.length} users...`);

  const trustMap = new Map(trustData.map(t => [t.userId, t]));
  const badgeMap = new Map(badges.map(b => [b.userId, b.badges]));

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map(user => {
        const trust = trustMap.get(user.id);
        const userBadges = badgeMap.get(user.id) || [];

        return prisma.user.upsert({
          where: { id: user.id },
          update: {
            displayName: user.displayName,
            bio: user.bio,
            trustScoreAbility: trust?.scores.ability ?? 0.5,
            trustScoreBenevolence: trust?.scores.benevolence ?? 0.5,
            trustScoreIntegrity: trust?.scores.integrity ?? 0.5,
          },
          create: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            bio: user.bio,
            cognitoSub: user.cognitoSub,
            passwordHash: user.passwordHash,
            emailVerified: true,
            accountStatus: 'ACTIVE',
            status: 'ACTIVE',
            trustScoreAbility: trust?.scores.ability ?? 0.5,
            trustScoreBenevolence: trust?.scores.benevolence ?? 0.5,
            trustScoreIntegrity: trust?.scores.integrity ?? 0.5,
          },
        });
      })
    );

    log(`     Persisted ${Math.min(i + batchSize, users.length)}/${users.length}`);
  }
}

async function persistTopics(
  prisma: PrismaClient,
  topics: Awaited<ReturnType<typeof generateTopics>>,
  batchSize: number,
  log: typeof console.log
): Promise<void> {
  log(`  📋 Persisting ${topics.length} topics...`);

  const now = new Date();

  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map(topic => {
        const createdAt = new Date(now.getTime() - topic.createdAtOffset * 24 * 60 * 60 * 1000);

        return prisma.discussionTopic.upsert({
          where: { id: topic.id },
          update: {
            title: topic.title,
            description: topic.description,
            status: topic.status,
          },
          create: {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            slug: topic.slug,
            creatorId: topic.creatorId,
            status: topic.status,
            crossCuttingThemes: topic.crossCuttingThemes,
            createdAt,
            activatedAt: topic.status !== 'SEEDING' ? createdAt : null,
          },
        });
      })
    );

    log(`     Persisted ${Math.min(i + batchSize, topics.length)}/${topics.length}`);
  }
}

async function persistDiscussions(
  prisma: PrismaClient,
  discussions: ReturnType<typeof generateDiscussions>,
  batchSize: number,
  log: typeof console.log
): Promise<void> {
  log(`  💬 Persisting ${discussions.length} discussions...`);
  // Discussion persistence would go here - depends on schema
  log(`     (Discussions are embedded in topics in current schema)`);
}

async function persistResponses(
  prisma: PrismaClient,
  responses: Awaited<ReturnType<typeof generateResponses>>,
  batchSize: number,
  log: typeof console.log
): Promise<void> {
  log(`  📝 Persisting ${responses.length} responses...`);

  const now = new Date();

  // Sort to ensure parents before children
  const sorted = [...responses].sort((a, b) => {
    if (a.parentId === null && b.parentId !== null) return -1;
    if (a.parentId !== null && b.parentId === null) return 1;
    return 0;
  });

  for (let i = 0; i < sorted.length; i += batchSize) {
    const batch = sorted.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map(response => {
        const createdAt = new Date(now.getTime() - response.createdAtOffset * 24 * 60 * 60 * 1000);

        return prisma.response.upsert({
          where: { id: response.id },
          update: {
            content: response.content,
            citedSources: response.citedSources as unknown as Prisma.InputJsonValue,
          },
          create: {
            id: response.id,
            topicId: response.topicId,
            authorId: response.authorId,
            parentId: response.parentId,
            content: response.content,
            citedSources: response.citedSources as unknown as Prisma.InputJsonValue,
            createdAt,
          },
        });
      })
    );

    log(`     Persisted ${Math.min(i + batchSize, sorted.length)}/${sorted.length}`);
  }
}

async function persistEngagement(
  prisma: PrismaClient,
  engagement: ReturnType<typeof generateEngagement>,
  batchSize: number,
  log: typeof console.log
): Promise<void> {
  log(`  ⭐ Persisting engagement data...`);

  const now = new Date();

  // Votes
  for (let i = 0; i < engagement.votes.length; i += batchSize) {
    const batch = engagement.votes.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map(vote => {
        const createdAt = new Date(now.getTime() - vote.createdAtOffset * 24 * 60 * 60 * 1000);

        return prisma.vote.upsert({
          where: { id: vote.id },
          update: { value: vote.value },
          create: {
            id: vote.id,
            userId: vote.userId,
            responseId: vote.responseId,
            value: vote.value,
            createdAt,
          },
        });
      })
    );
  }
  log(`     Votes: ${engagement.votes.length}`);

  // Reactions
  for (let i = 0; i < engagement.reactions.length; i += batchSize) {
    const batch = engagement.reactions.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map(reaction => {
        const createdAt = new Date(now.getTime() - reaction.createdAtOffset * 24 * 60 * 60 * 1000);

        return prisma.reaction.upsert({
          where: { id: reaction.id },
          update: { emoji: reaction.emoji },
          create: {
            id: reaction.id,
            userId: reaction.userId,
            responseId: reaction.responseId,
            emoji: reaction.emoji,
            createdAt,
          },
        });
      })
    );
  }
  log(`     Reactions: ${engagement.reactions.length}`);

  log(`     Bookmarks and connections: skipped (schema dependent)`);
}

export default seedEnhancedDemo;
```

- [ ] **Step 2: Add npm script**

Add to `packages/db-models/package.json`:

```json
"scripts": {
  "seed:demo:enhanced": "tsx prisma/seed/enhanced-demo-seed.ts"
}
```

- [ ] **Step 3: Verify file compiles**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge && pnpm exec tsc --noEmit packages/db-models/prisma/seed/enhanced-demo-seed.ts 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add packages/db-models/prisma/seed/enhanced-demo-seed.ts packages/db-models/package.json
git commit -m "feat(seed): add enhanced demo seed orchestrator"
```

---

## Chunk 8: Propositions & Alignments

### Task 8.1: Create Proposition Generator

**Files:**
- Create: `packages/db-models/prisma/seed/generators/proposition-generator.ts`

- [ ] **Step 1: Write the proposition generator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Proposition Generator
 *
 * Extracts propositions from substantive responses.
 */

import { generatePropositionId } from '../demo-ids.js';
import type { GeneratedResponse } from './response-generator.js';
import type { AIClient } from './ai-client.js';

export type PropositionType = 'claim' | 'value' | 'policy' | 'definition' | 'causal';

export interface GeneratedProposition {
  id: string;
  topicId: string;
  responseId: string;
  statement: string;
  type: PropositionType;
  supportCount: number;
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number;
  createdAtOffset: number;
}

const PROPOSITION_TYPES: PropositionType[] = ['claim', 'value', 'policy', 'definition', 'causal'];

export interface PropositionGeneratorOptions {
  aiClient?: AIClient;
  useMockData?: boolean;
}

/**
 * Generate propositions from responses
 * Substantive responses (>100 words) get 1-2 propositions
 */
export async function generatePropositions(
  responses: GeneratedResponse[],
  options: PropositionGeneratorOptions = {}
): Promise<GeneratedProposition[]> {
  const propositions: GeneratedProposition[] = [];
  let propIndex = 0;

  for (const response of responses) {
    const wordCount = response.content.split(/\s+/).length;

    // Substantive responses get 1-2 propositions
    const propCount = wordCount > 100 ? (propIndex % 2 === 0 ? 2 : 1) : (wordCount > 50 ? 1 : 0);

    for (let i = 0; i < propCount; i++) {
      propIndex++;
      const type = PROPOSITION_TYPES[propIndex % PROPOSITION_TYPES.length];

      propositions.push({
        id: generatePropositionId(100, propIndex),
        topicId: response.topicId,
        responseId: response.id,
        statement: extractMockProposition(response.content, type),
        type,
        supportCount: Math.floor(propIndex % 10) + 1,
        opposeCount: Math.floor(propIndex % 5),
        nuancedCount: Math.floor(propIndex % 3),
        consensusScore: 0.5 + (propIndex % 50) / 100,
        createdAtOffset: response.createdAtOffset,
      });
    }
  }

  // Enrich with AI if available
  if (options.aiClient && !options.useMockData) {
    await enrichPropositionsWithAI(propositions, responses, options.aiClient);
  }

  return propositions;
}

function extractMockProposition(content: string, type: PropositionType): string {
  const templates: Record<PropositionType, string> = {
    claim: 'Evidence suggests that the central argument has merit.',
    value: 'This approach better serves the common good.',
    policy: 'Implementation should proceed with appropriate safeguards.',
    definition: 'The key concept should be understood in this context.',
    causal: 'This factor directly influences the outcome.',
  };
  return templates[type];
}

async function enrichPropositionsWithAI(
  propositions: GeneratedProposition[],
  responses: GeneratedResponse[],
  aiClient: AIClient
): Promise<void> {
  console.log('🤖 Enriching propositions with AI...');

  const responseMap = new Map(responses.map(r => [r.id, r]));
  const batchSize = 20;

  for (let i = 0; i < propositions.length; i += batchSize) {
    const batch = propositions.slice(i, i + batchSize);

    const prompts = batch.map(p => {
      const response = responseMap.get(p.responseId);
      return `Extract a single ${p.type} proposition (one clear statement) from this text: "${response?.content || ''}"`;
    });

    const statements = await aiClient.generateBatch(prompts);
    batch.forEach((p, j) => {
      p.statement = statements[j];
    });

    if ((i + batchSize) % 100 === 0) {
      console.log(`  Processed ${Math.min(i + batchSize, propositions.length)}/${propositions.length}`);
    }
  }
}

export default generatePropositions;
```

- [ ] **Step 2: Commit**

```bash
git add packages/db-models/prisma/seed/generators/proposition-generator.ts
git commit -m "feat(seed): add proposition generator"
```

---

### Task 8.2: Create Alignment Generator

**Files:**
- Create: `packages/db-models/prisma/seed/generators/alignment-generator.ts`

- [ ] **Step 1: Write the alignment generator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Alignment Generator
 *
 * Generates moral foundation alignments for propositions.
 */

import type { GeneratedUserPersona } from './user-generator.js';
import type { GeneratedProposition } from './proposition-generator.js';

export type MoralFoundation = 'care' | 'fairness' | 'loyalty' | 'authority' | 'sanctity' | 'liberty';
export type AlignmentStance = 'SUPPORT' | 'OPPOSE' | 'NUANCED';

export interface GeneratedAlignment {
  id: string;
  userId: string;
  propositionId: string;
  stance: AlignmentStance;
  foundations: Record<MoralFoundation, number>;
  nuanceExplanation: string | null;
  createdAtOffset: number;
}

const FOUNDATIONS: MoralFoundation[] = ['care', 'fairness', 'loyalty', 'authority', 'sanctity', 'liberty'];

/**
 * Generate alignments (user stances on propositions)
 * Target: ~5,000 alignments (2-3 per proposition)
 */
export function generateAlignments(
  propositions: GeneratedProposition[],
  users: GeneratedUserPersona[]
): GeneratedAlignment[] {
  const alignments: GeneratedAlignment[] = [];
  let alignmentIndex = 0;

  for (const prop of propositions) {
    // 2-3 alignments per proposition
    const alignmentCount = 2 + (alignmentIndex % 2);

    for (let i = 0; i < alignmentCount && i < users.length; i++) {
      alignmentIndex++;
      const user = users[(alignmentIndex * 7) % users.length];

      // Stance based on user and proposition
      const stanceVal = (alignmentIndex + user.index) % 3;
      const stance: AlignmentStance = stanceVal === 0 ? 'SUPPORT' : stanceVal === 1 ? 'OPPOSE' : 'NUANCED';

      // Foundation scores based on user's moral profile
      const foundations: Record<MoralFoundation, number> = {
        care: 0.3 + (alignmentIndex % 7) / 10,
        fairness: 0.4 + (alignmentIndex % 6) / 10,
        loyalty: 0.3 + (alignmentIndex % 5) / 10,
        authority: 0.2 + (alignmentIndex % 8) / 10,
        sanctity: 0.2 + (alignmentIndex % 9) / 10,
        liberty: 0.4 + (alignmentIndex % 4) / 10,
      };

      alignments.push({
        id: `11111111-0000-4000-8000-900${alignmentIndex.toString().padStart(9, '0')}`,
        userId: user.id,
        propositionId: prop.id,
        stance,
        foundations,
        nuanceExplanation: stance === 'NUANCED' ? 'This requires careful consideration of multiple factors.' : null,
        createdAtOffset: prop.createdAtOffset,
      });
    }
  }

  return alignments;
}

export default generateAlignments;
```

- [ ] **Step 2: Commit**

```bash
git add packages/db-models/prisma/seed/generators/alignment-generator.ts
git commit -m "feat(seed): add alignment generator for moral foundations"
```

---

## Chunk 9: Expertise Calculator & Corpus Caching

### Task 9.1: Create Expertise Calculator

**Files:**
- Create: `packages/db-models/prisma/seed/calculators/expertise-calculator.ts`

- [ ] **Step 1: Write the expertise calculator**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Expertise Calculator
 *
 * Calculates per-category expertise levels for users.
 */

import { CATEGORIES } from '../config/distribution.js';
import type { GeneratedResponse } from '../generators/response-generator.js';
import type { GeneratedTopic } from '../generators/topic-generator.js';
import type { GeneratedVote } from '../generators/engagement-generator.js';

export type ExpertiseLevel = 'NOVICE' | 'FAMILIAR' | 'PROFICIENT' | 'EXPERT';

export interface UserExpertise {
  userId: string;
  category: string;
  level: ExpertiseLevel;
  responseCount: number;
  positiveRatio: number;
}

/**
 * Calculate expertise per category for all users
 */
export function calculateExpertise(
  responses: GeneratedResponse[],
  topics: GeneratedTopic[],
  votes: GeneratedVote[]
): UserExpertise[] {
  const results: UserExpertise[] = [];

  // Build lookups
  const topicMap = new Map(topics.map(t => [t.id, t]));
  const votesByResponse = new Map<string, GeneratedVote[]>();
  for (const vote of votes) {
    const list = votesByResponse.get(vote.responseId) || [];
    list.push(vote);
    votesByResponse.set(vote.responseId, list);
  }

  // Group responses by user and category
  const userCategoryResponses = new Map<string, Map<string, GeneratedResponse[]>>();

  for (const response of responses) {
    const topic = topicMap.get(response.topicId);
    if (!topic) continue;

    const userId = response.authorId;
    const category = topic.category;

    if (!userCategoryResponses.has(userId)) {
      userCategoryResponses.set(userId, new Map());
    }
    const userMap = userCategoryResponses.get(userId)!;

    if (!userMap.has(category)) {
      userMap.set(category, []);
    }
    userMap.get(category)!.push(response);
  }

  // Calculate expertise for each user-category pair
  for (const [userId, categoryMap] of userCategoryResponses) {
    for (const [category, catResponses] of categoryMap) {
      const responseCount = catResponses.length;

      // Calculate positive reception ratio
      let totalVotes = 0;
      let positiveVotes = 0;
      for (const response of catResponses) {
        const votes = votesByResponse.get(response.id) || [];
        for (const vote of votes) {
          totalVotes++;
          if (vote.value === 1) positiveVotes++;
        }
      }
      const positiveRatio = totalVotes > 0 ? positiveVotes / totalVotes : 0.5;

      // Determine level based on thresholds from spec
      let level: ExpertiseLevel;
      if (responseCount >= 50 && positiveRatio >= 0.8) {
        level = 'EXPERT';
      } else if (responseCount >= 20 && positiveRatio >= 0.7) {
        level = 'PROFICIENT';
      } else if (responseCount >= 5) {
        level = 'FAMILIAR';
      } else {
        level = 'NOVICE';
      }

      results.push({
        userId,
        category,
        level,
        responseCount,
        positiveRatio: Math.round(positiveRatio * 100) / 100,
      });
    }
  }

  return results;
}

export default calculateExpertise;
```

- [ ] **Step 2: Commit**

```bash
git add packages/db-models/prisma/seed/calculators/expertise-calculator.ts
git commit -m "feat(seed): add expertise calculator for per-category levels"
```

---

### Task 9.2: Create Corpus Cache Manager

**Files:**
- Create: `packages/db-models/prisma/seed/corpus/cache-manager.ts`

- [ ] **Step 1: Write the cache manager**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Corpus Cache Manager
 *
 * Saves and loads generated content for instant re-seeding.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = __dirname;

export interface CorpusManifest {
  version: string;
  generatedAt: string;
  scale: string;
  counts: {
    users: number;
    topics: number;
    discussions: number;
    responses: number;
    propositions: number;
    alignments: number;
  };
}

export interface CorpusData<T> {
  manifest: CorpusManifest;
  data: T;
}

/**
 * Save data to corpus cache
 */
export function saveToCorpus<T>(filename: string, data: T, manifest: CorpusManifest): void {
  const filepath = path.join(CORPUS_DIR, filename);
  const content: CorpusData<T> = { manifest, data };

  fs.mkdirSync(CORPUS_DIR, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(content, null, 2));
  console.log(`  💾 Saved ${filename}`);
}

/**
 * Load data from corpus cache
 */
export function loadFromCorpus<T>(filename: string): CorpusData<T> | null {
  const filepath = path.join(CORPUS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as CorpusData<T>;
}

/**
 * Check if cached corpus exists and matches scale
 */
export function hasValidCorpus(scale: string): boolean {
  const manifestPath = path.join(CORPUS_DIR, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  try {
    const manifest: CorpusManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return manifest.scale === scale;
  } catch {
    return false;
  }
}

/**
 * Save manifest
 */
export function saveManifest(manifest: CorpusManifest): void {
  const filepath = path.join(CORPUS_DIR, 'manifest.json');
  fs.writeFileSync(filepath, JSON.stringify(manifest, null, 2));
}

/**
 * Clear corpus cache
 */
export function clearCorpus(): void {
  const files = ['users.json', 'topics.json', 'discussions.json', 'responses.json', 'propositions.json', 'alignments.json', 'manifest.json'];

  for (const file of files) {
    const filepath = path.join(CORPUS_DIR, file);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
  console.log('  🗑️  Cleared corpus cache');
}

export default { saveToCorpus, loadFromCorpus, hasValidCorpus, saveManifest, clearCorpus };
```

- [ ] **Step 2: Add .gitignore for corpus JSON files**

Create `packages/db-models/prisma/seed/corpus/.gitignore`:
```
*.json
!cache-manager.ts
```

- [ ] **Step 3: Commit**

```bash
git add packages/db-models/prisma/seed/corpus/
git commit -m "feat(seed): add corpus cache manager for instant re-seeding"
```

---

## Chunk 10: Integration & Testing

### Task 10.1: Create Seed CLI Entry Point

**Files:**
- Create: `packages/db-models/prisma/seed/cli.ts`

- [ ] **Step 1: Write CLI entry point**

```typescript
#!/usr/bin/env node
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Seed CLI
 *
 * Usage:
 *   pnpm seed:demo                    # Seed with cached corpus
 *   pnpm seed:demo --generate         # Generate new content with AI
 *   pnpm seed:demo --scale=small      # Use smaller scale
 */

import { PrismaClient } from '@prisma/client';
import { seedEnhancedDemo } from './enhanced-demo-seed.js';
import type { ScaleProfile } from './config/distribution.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options = {
    scale: (args.find(a => a.startsWith('--scale='))?.split('=')[1] || 'large') as ScaleProfile,
    useAI: args.includes('--generate'),
    verbose: !args.includes('--quiet'),
  };

  const prisma = new PrismaClient();

  try {
    await seedEnhancedDemo(prisma, options);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
```

- [ ] **Step 2: Update package.json scripts**

```json
"scripts": {
  "seed:demo": "tsx prisma/seed/cli.ts",
  "seed:demo:generate": "tsx prisma/seed/cli.ts --generate"
}
```

- [ ] **Step 3: Run seed with small scale to verify**

Run: `cd /mnt/ssk-ssd/tony/GitHub/reasonbridge/packages/db-models && pnpm seed:demo --scale=small --quiet`

- [ ] **Step 4: Commit**

```bash
git add packages/db-models/prisma/seed/cli.ts packages/db-models/package.json
git commit -m "feat(seed): add CLI entry point for enhanced demo seeding"
```

---

### Task 10.2: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add enhanced seed documentation**

Add section under "## Troubleshooting":

```markdown
## Demo Seed Data

### Enhanced Demo Seeding

The project includes comprehensive demo seed data for development and testing:

```bash
# Seed with default large scale (200 users, 300 topics, ~10K responses)
cd packages/db-models && pnpm seed:demo

# Generate fresh AI content (requires ANTHROPIC_API_KEY)
pnpm seed:demo --generate

# Use smaller scale for quick testing
pnpm seed:demo --scale=small
```

**Scale profiles:**
- `small`: 50 users, 75 topics, ~500 responses
- `medium`: 100 users, 150 topics, ~3,000 responses
- `large`: 200 users, 300 topics, ~10,000 responses

**Features:**
- Power-law activity distribution (10% users = 60% content)
- 15 topic categories with diverse content
- Threaded conversations with varied viewpoints
- Calculated trust scores and badges
- Deterministic IDs for test stability
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add enhanced demo seed documentation"
```

---

## Verification

After completing all tasks:

1. **Run small-scale seed**:
   ```bash
   cd packages/db-models && pnpm seed:demo --scale=small
   ```

2. **Verify data in database**:
   ```bash
   cd packages/db-models && pnpm prisma studio
   ```
   Check User, DiscussionTopic, Response tables for new demo data.

3. **Run E2E tests with seeded data**:
   ```bash
   cd frontend && npx playwright test --grep "demo" --reporter=list
   ```

4. **Commit final changes**:
   ```bash
   git add -A
   git commit -m "feat: complete enhanced demo seed data implementation"
   ```
