# Discussion Simulator: Manual Response Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the discussion simulator into an interactive debate practice tool with AI personas, argument analysis, and learning insights.

**Architecture:** Stateless client-driven approach. Frontend manages conversation state, backend provides AI generation endpoints. No database migrations needed.

**Tech Stack:** React 18, TypeScript, NestJS, AWS Bedrock (Claude), Vitest, Playwright

---

## Phase 1: Backend DTOs and Types

### Task 1: Create Conversation Mode Types

**Files:**

- Create: `services/ai-service/src/simulator/types/conversation-mode.types.ts`
- Test: `services/ai-service/src/simulator/types/conversation-mode.types.spec.ts`

**Step 1: Write the type definitions**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConversationMode = 'socratic' | 'debate' | 'steelman' | 'common_ground';

export type DifficultyLevel = 'novice' | 'intermediate' | 'expert';

export type PersonaTone = 'measured' | 'analytical' | 'passionate' | 'confrontational';

export interface PresetPersona {
  id: string;
  name: string;
  description: string;
  position: string;
  tone: PersonaTone;
  modeAffinity: ConversationMode;
  systemPromptTemplate: string;
}

export interface CustomPersonaConfig {
  name: string;
  position: string;
  background: string;
  tone: PersonaTone;
  receptiveness: number;
  argumentation: {
    usesEmotionalAppeals: boolean;
    citesData: boolean;
    asksQuestions: boolean;
  };
  exampleArguments?: string[];
}

export interface Fallacy {
  type: string;
  description: string;
  excerpt: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface ArgumentAnalysis {
  fallacies: Fallacy[];
  unsupportedClaims: string[];
  toneScore: number;
  evidenceScore: number;
  coherenceScore: number;
  suggestions: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'persona';
  content: string;
  timestamp: string;
  analysis?: ArgumentAnalysis;
}

export interface LearningInsights {
  strengths: string[];
  improvements: string[];
  fallaciesCommitted: { type: string; exchange: number; excerpt: string }[];
  recommendedReadings: { title: string; reason: string }[];
  overallAssessment: string;
}
```

**Step 2: Commit**

```bash
git add services/ai-service/src/simulator/types/
git commit -m "feat(ai-service): add conversation mode types for simulator"
```

---

### Task 2: Create Chat Request DTO

**Files:**

- Create: `services/ai-service/src/simulator/dto/chat-request.dto.ts`
- Test: `services/ai-service/src/simulator/dto/chat-request.dto.spec.ts`

**Step 1: Write the failing test**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { ChatRequestDto } from './chat-request.dto.js';

describe('ChatRequestDto', () => {
  it('should validate a valid chat request', async () => {
    const dto = new ChatRequestDto();
    dto.persona = {
      name: 'The Skeptic',
      position: 'Questions all claims',
      background: 'Analytical thinker',
      tone: 'analytical',
      receptiveness: 0.5,
      argumentation: {
        usesEmotionalAppeals: false,
        citesData: true,
        asksQuestions: true,
      },
    };
    dto.mode = 'socratic';
    dto.difficulty = 'intermediate';
    dto.userMessage = 'I believe climate change is real.';
    dto.conversationHistory = [];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid mode', async () => {
    const dto = new ChatRequestDto();
    dto.persona = {
      name: 'Test',
      position: 'Test',
      background: 'Test',
      tone: 'analytical',
      receptiveness: 0.5,
      argumentation: { usesEmotionalAppeals: false, citesData: false, asksQuestions: false },
    };
    dto.mode = 'invalid' as any;
    dto.difficulty = 'novice';
    dto.userMessage = 'Test';
    dto.conversationHistory = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject empty user message', async () => {
    const dto = new ChatRequestDto();
    dto.persona = {
      name: 'Test',
      position: 'Test',
      background: 'Test',
      tone: 'analytical',
      receptiveness: 0.5,
      argumentation: { usesEmotionalAppeals: false, citesData: false, asksQuestions: false },
    };
    dto.mode = 'debate';
    dto.difficulty = 'novice';
    dto.userMessage = '';
    dto.conversationHistory = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test -- --run chat-request.dto.spec.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  ConversationMode,
  DifficultyLevel,
  PersonaTone,
} from '../types/conversation-mode.types.js';

class ArgumentationConfigDto {
  @IsBoolean()
  usesEmotionalAppeals: boolean;

  @IsBoolean()
  citesData: boolean;

  @IsBoolean()
  asksQuestions: boolean;
}

class PersonaConfigDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsString()
  @IsNotEmpty()
  background: string;

  @IsEnum(['measured', 'analytical', 'passionate', 'confrontational'])
  tone: PersonaTone;

  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  receptiveness: number;

  @ValidateNested()
  @Type(() => ArgumentationConfigDto)
  argumentation: ArgumentationConfigDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exampleArguments?: string[];
}

class MessageDto {
  @IsString()
  role: 'user' | 'persona';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @ValidateNested()
  @Type(() => PersonaConfigDto)
  persona: PersonaConfigDto;

  @IsEnum(['socratic', 'debate', 'steelman', 'common_ground'])
  mode: ConversationMode;

  @IsEnum(['novice', 'intermediate', 'expert'])
  difficulty: DifficultyLevel;

  @IsString()
  @IsNotEmpty()
  userMessage: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversationHistory: MessageDto[];

  @IsOptional()
  @IsString()
  topicContext?: string;
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test -- --run chat-request.dto.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/simulator/dto/chat-request.dto.ts services/ai-service/src/simulator/dto/chat-request.dto.spec.ts
git commit -m "feat(ai-service): add ChatRequestDto with validation"
```

---

### Task 3: Create Analyze Argument DTO

**Files:**

- Create: `services/ai-service/src/simulator/dto/analyze-argument.dto.ts`
- Test: `services/ai-service/src/simulator/dto/analyze-argument.dto.spec.ts`

**Step 1: Write the failing test**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { AnalyzeArgumentDto } from './analyze-argument.dto.js';

describe('AnalyzeArgumentDto', () => {
  it('should validate a valid analyze request', async () => {
    const dto = new AnalyzeArgumentDto();
    dto.userMessage = 'Climate change is a hoax because it snowed yesterday.';
    dto.conversationContext = [
      { role: 'persona', content: 'What evidence supports your position?' },
    ];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject empty user message', async () => {
    const dto = new AnalyzeArgumentDto();
    dto.userMessage = '';
    dto.conversationContext = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test -- --run analyze-argument.dto.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ContextMessageDto {
  @IsString()
  role: 'user' | 'persona';

  @IsString()
  content: string;
}

export class AnalyzeArgumentDto {
  @IsString()
  @IsNotEmpty()
  userMessage: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContextMessageDto)
  conversationContext: ContextMessageDto[];
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test -- --run analyze-argument.dto.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/simulator/dto/analyze-argument.dto.ts services/ai-service/src/simulator/dto/analyze-argument.dto.spec.ts
git commit -m "feat(ai-service): add AnalyzeArgumentDto"
```

---

### Task 4: Create Generate Insights DTO

**Files:**

- Create: `services/ai-service/src/simulator/dto/generate-insights.dto.ts`
- Test: `services/ai-service/src/simulator/dto/generate-insights.dto.spec.ts`

**Step 1: Write the DTO**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsEnum, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import type { ConversationMode, PersonaTone } from '../types/conversation-mode.types.js';

class TranscriptMessageDto {
  @IsString()
  id: string;

  @IsString()
  role: 'user' | 'persona';

  @IsString()
  content: string;

  @IsString()
  timestamp: string;
}

class PersonaSummaryDto {
  @IsString()
  name: string;

  @IsString()
  position: string;

  @IsEnum(['measured', 'analytical', 'passionate', 'confrontational'])
  tone: PersonaTone;
}

export class GenerateInsightsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptMessageDto)
  transcript: TranscriptMessageDto[];

  @IsEnum(['socratic', 'debate', 'steelman', 'common_ground'])
  mode: ConversationMode;

  @ValidateNested()
  @Type(() => PersonaSummaryDto)
  persona: PersonaSummaryDto;

  @IsOptional()
  @IsString()
  topicContext?: string;
}
```

**Step 2: Write test and verify**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { GenerateInsightsDto } from './generate-insights.dto.js';

describe('GenerateInsightsDto', () => {
  it('should validate a valid insights request', async () => {
    const dto = new GenerateInsightsDto();
    dto.transcript = [
      { id: '1', role: 'user', content: 'Test message', timestamp: new Date().toISOString() },
    ];
    dto.mode = 'debate';
    dto.persona = { name: 'Skeptic', position: 'Questions claims', tone: 'analytical' };

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

**Step 3: Commit**

```bash
git add services/ai-service/src/simulator/dto/generate-insights.dto.ts services/ai-service/src/simulator/dto/generate-insights.dto.spec.ts
git commit -m "feat(ai-service): add GenerateInsightsDto"
```

---

## Phase 2: Backend Services

### Task 5: Create Preset Personas Data

**Files:**

- Create: `services/ai-service/src/simulator/data/preset-personas.ts`

**Step 1: Write the preset personas**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PresetPersona } from '../types/conversation-mode.types.js';

export const PRESET_PERSONAS: PresetPersona[] = [
  {
    id: 'skeptic',
    name: 'The Skeptic',
    description: 'Questions all claims and demands evidence for every assertion.',
    position: 'Requires proof before accepting any claim',
    tone: 'analytical',
    modeAffinity: 'socratic',
    systemPromptTemplate: `You are The Skeptic, a rigorous analytical thinker who questions every claim.
Your approach:
- Never accept assertions without evidence
- Ask probing questions to expose assumptions
- Remain neutral but demanding
- Point out logical gaps without being dismissive
- Use phrases like "What evidence supports that?" and "How do we know this is true?"`,
  },
  {
    id: 'advocate',
    name: 'The Advocate',
    description: 'Passionately defends a chosen position with conviction.',
    position: 'Strongly believes in and argues for the opposing view',
    tone: 'passionate',
    modeAffinity: 'debate',
    systemPromptTemplate: `You are The Advocate, a passionate defender of your position.
Your approach:
- Argue with conviction and energy
- Use compelling rhetoric and examples
- Appeal to values and principles
- Acknowledge counterpoints but reframe them
- Stay respectful while being persuasive`,
  },
  {
    id: 'devils-advocate',
    name: "Devil's Advocate",
    description: 'Takes the opposite position to stress-test arguments.',
    position: 'Deliberately argues against the user to find weaknesses',
    tone: 'confrontational',
    modeAffinity: 'steelman',
    systemPromptTemplate: `You are the Devil's Advocate, deliberately taking the opposing position.
Your approach:
- Present the strongest possible counter-arguments
- Challenge every assumption ruthlessly
- Find weaknesses in reasoning
- Don't concede easily
- Help the user strengthen their argument by attacking it`,
  },
  {
    id: 'mediator',
    name: 'The Mediator',
    description: 'Seeks common ground and bridges between viewpoints.',
    position: 'Focuses on finding shared values and compromise',
    tone: 'measured',
    modeAffinity: 'common_ground',
    systemPromptTemplate: `You are The Mediator, focused on finding common ground.
Your approach:
- Identify shared values and goals
- Reframe disagreements as different approaches to shared ends
- Acknowledge valid points on all sides
- Suggest compromise positions
- Maintain calm, balanced tone`,
  },
  {
    id: 'expert',
    name: 'The Expert',
    description: 'Brings deep knowledge and cites research.',
    position: 'Argues from expertise and empirical evidence',
    tone: 'analytical',
    modeAffinity: 'debate',
    systemPromptTemplate: `You are The Expert, arguing from deep knowledge and research.
Your approach:
- Cite studies and data (simulated but realistic)
- Use technical language appropriately
- Distinguish between established facts and interpretations
- Acknowledge limitations of evidence
- Maintain intellectual rigor`,
  },
  {
    id: 'idealist',
    name: 'The Idealist',
    description: 'Appeals to principles, values, and higher ideals.',
    position: 'Argues from moral and ethical foundations',
    tone: 'passionate',
    modeAffinity: 'common_ground',
    systemPromptTemplate: `You are The Idealist, grounded in values and principles.
Your approach:
- Appeal to shared human values
- Frame arguments in moral terms
- Inspire rather than just convince
- Acknowledge pragmatic concerns but return to ideals
- Use stories and examples that illustrate principles`,
  },
];

export function getPresetPersona(id: string): PresetPersona | undefined {
  return PRESET_PERSONAS.find((p) => p.id === id);
}
```

**Step 2: Commit**

```bash
git add services/ai-service/src/simulator/data/preset-personas.ts
git commit -m "feat(ai-service): add preset personas data"
```

---

### Task 6: Create Mode Prompt Builder

**Files:**

- Create: `services/ai-service/src/simulator/services/mode-prompt-builder.ts`
- Test: `services/ai-service/src/simulator/services/mode-prompt-builder.spec.ts`

**Step 1: Write the failing test**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ModePromptBuilder } from './mode-prompt-builder.js';

describe('ModePromptBuilder', () => {
  const builder = new ModePromptBuilder();

  describe('buildModeInstructions', () => {
    it('should generate socratic mode instructions', () => {
      const instructions = builder.buildModeInstructions('socratic');
      expect(instructions).toContain('clarifying questions');
      expect(instructions).toContain('assumptions');
      expect(instructions).not.toContain('counter-argument');
    });

    it('should generate debate mode instructions', () => {
      const instructions = builder.buildModeInstructions('debate');
      expect(instructions).toContain('counter-argument');
      expect(instructions).toContain('evidence');
    });

    it('should generate steelman mode instructions', () => {
      const instructions = builder.buildModeInstructions('steelman');
      expect(instructions).toContain('strongest');
      expect(instructions).toContain('opposing');
    });

    it('should generate common_ground mode instructions', () => {
      const instructions = builder.buildModeInstructions('common_ground');
      expect(instructions).toContain('agreement');
      expect(instructions).toContain('shared');
    });
  });

  describe('buildDifficultyInstructions', () => {
    it('should generate novice difficulty instructions', () => {
      const instructions = builder.buildDifficultyInstructions('novice');
      expect(instructions).toContain('simple');
      expect(instructions).toContain('patient');
    });

    it('should generate expert difficulty instructions', () => {
      const instructions = builder.buildDifficultyInstructions('expert');
      expect(instructions).toContain('sophisticated');
      expect(instructions).toContain('demanding');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test -- --run mode-prompt-builder.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import type { ConversationMode, DifficultyLevel } from '../types/conversation-mode.types.js';

@Injectable()
export class ModePromptBuilder {
  private readonly modeInstructions: Record<ConversationMode, string> = {
    socratic: `CONVERSATION MODE: Socratic Questioning
Your role is to help the user examine their beliefs through questions.
- Ask clarifying questions to probe assumptions
- Never state your own position directly
- Guide the user to discover contradictions or gaps
- Use "Why do you think...?" and "What if...?" style questions
- Remain curious and non-judgmental`,

    debate: `CONVERSATION MODE: Formal Debate
Your role is to present counter-arguments and defend your position.
- Present clear counter-arguments with evidence
- Directly rebut the user's claims
- Defend your assigned position consistently
- Use logical structure (claim, evidence, reasoning)
- Acknowledge strong points but pivot to weaknesses`,

    steelman: `CONVERSATION MODE: Steelmanning
Your role is to present the strongest possible version of the opposing view.
- Articulate the opposing position more strongly than its proponents might
- Force engagement with the best arguments, not weak ones
- Don't create strawmen - build steel men
- Help the user understand why smart people disagree`,

    common_ground: `CONVERSATION MODE: Common Ground Discovery
Your role is to find areas of agreement and shared values.
- Actively seek points of agreement first
- Reframe disagreements as shared goals with different methods
- Identify underlying values both sides share
- Suggest synthesis positions when possible
- Maintain collaborative rather than adversarial tone`,
  };

  private readonly difficultyInstructions: Record<DifficultyLevel, string> = {
    novice: `DIFFICULTY: Novice
- Use simple, clear arguments without jargon
- Be patient and explain your reasoning step-by-step
- Point out obvious logical errors gently
- Offer encouragement while challenging
- Keep responses concise (2-3 paragraphs max)`,

    intermediate: `DIFFICULTY: Intermediate
- Use moderately complex arguments with some nuance
- Expect familiarity with basic logical concepts
- Challenge assumptions more directly
- Balance support with constructive criticism
- Responses can be more detailed (3-4 paragraphs)`,

    expert: `DIFFICULTY: Expert
- Use sophisticated arguments with subtle distinctions
- Assume advanced reasoning capability
- Be demanding about evidence quality
- Challenge even well-constructed arguments
- Use technical terminology when appropriate
- No hand-holding - treat as intellectual peer`,
  };

  buildModeInstructions(mode: ConversationMode): string {
    return this.modeInstructions[mode];
  }

  buildDifficultyInstructions(difficulty: DifficultyLevel): string {
    return this.difficultyInstructions[difficulty];
  }

  buildFullSystemPrompt(
    personaPrompt: string,
    mode: ConversationMode,
    difficulty: DifficultyLevel,
  ): string {
    return `${personaPrompt}

${this.modeInstructions[mode]}

${this.difficultyInstructions[difficulty]}

RESPONSE FORMAT:
- Respond in character as the persona
- Keep responses focused and engaging
- End with something that invites further discussion`;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test -- --run mode-prompt-builder.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/simulator/services/mode-prompt-builder.ts services/ai-service/src/simulator/services/mode-prompt-builder.spec.ts
git commit -m "feat(ai-service): add ModePromptBuilder service"
```

---

### Task 7: Create Argument Analyzer Service

**Files:**

- Create: `services/ai-service/src/simulator/services/argument-analyzer.service.ts`
- Test: `services/ai-service/src/simulator/services/argument-analyzer.service.spec.ts`

**Step 1: Write the failing test**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentAnalyzerService } from './argument-analyzer.service.js';

describe('ArgumentAnalyzerService', () => {
  let service: ArgumentAnalyzerService;
  let mockBedrockService: any;

  beforeEach(() => {
    mockBedrockService = {
      isReady: vi.fn().mockResolvedValue(true),
      complete: vi.fn(),
    };
    service = new ArgumentAnalyzerService(mockBedrockService);
  });

  it('should analyze an argument and detect fallacies', async () => {
    mockBedrockService.complete.mockResolvedValue({
      content: JSON.stringify({
        fallacies: [
          {
            type: 'ad_hominem',
            description: 'Attacks the person',
            excerpt: 'People who believe X are stupid',
            severity: 'major',
          },
        ],
        unsupportedClaims: ['All scientists agree'],
        toneScore: 4,
        evidenceScore: 3,
        coherenceScore: 6,
        suggestions: ['Avoid personal attacks', 'Cite specific sources'],
      }),
    });

    const result = await service.analyze({
      userMessage: 'People who believe X are stupid. All scientists agree with me.',
      conversationContext: [],
    });

    expect(result.fallacies).toHaveLength(1);
    expect(result.fallacies[0].type).toBe('ad_hominem');
    expect(result.toneScore).toBe(4);
  });

  it('should return empty analysis when AI unavailable', async () => {
    mockBedrockService.isReady.mockResolvedValue(false);

    const result = await service.analyze({
      userMessage: 'Test message',
      conversationContext: [],
    });

    expect(result.fallacies).toEqual([]);
    expect(result.suggestions).toContain('Analysis unavailable');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test -- --run argument-analyzer.service.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../ai/bedrock.service.js';
import type { ArgumentAnalysis } from '../types/conversation-mode.types.js';
import type { AnalyzeArgumentDto } from '../dto/analyze-argument.dto.js';

@Injectable()
export class ArgumentAnalyzerService {
  private readonly logger = new Logger(ArgumentAnalyzerService.name);

  constructor(private readonly bedrockService: BedrockService) {}

  async analyze(dto: AnalyzeArgumentDto): Promise<ArgumentAnalysis> {
    const isReady = await this.bedrockService.isReady();
    if (!isReady) {
      return this.getFallbackAnalysis();
    }

    try {
      const systemPrompt = this.buildAnalysisPrompt();
      const userPrompt = this.buildUserPrompt(dto);

      const response = await this.bedrockService.complete({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1024,
        temperature: 0.3,
      });

      return this.parseAnalysisResponse(response.content);
    } catch (error) {
      this.logger.error('Failed to analyze argument', error);
      return this.getFallbackAnalysis();
    }
  }

  private buildAnalysisPrompt(): string {
    return `You are an argument analysis engine. Analyze the user's message for:

1. LOGICAL FALLACIES: Identify any logical fallacies (ad hominem, strawman, slippery slope, false dichotomy, appeal to authority, etc.)
2. UNSUPPORTED CLAIMS: List claims made without evidence
3. TONE: Score civility 0-10 (10 = perfectly civil)
4. EVIDENCE: Score evidence quality 0-10 (10 = well-supported)
5. COHERENCE: Score logical coherence 0-10 (10 = perfectly coherent)
6. SUGGESTIONS: Provide 2-3 actionable improvements

Respond ONLY with valid JSON in this exact format:
{
  "fallacies": [{"type": "string", "description": "string", "excerpt": "string", "severity": "minor|moderate|major"}],
  "unsupportedClaims": ["string"],
  "toneScore": number,
  "evidenceScore": number,
  "coherenceScore": number,
  "suggestions": ["string"]
}`;
  }

  private buildUserPrompt(dto: AnalyzeArgumentDto): string {
    let prompt = `Analyze this argument:\n\n"${dto.userMessage}"`;

    if (dto.conversationContext.length > 0) {
      const context = dto.conversationContext
        .slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
      prompt += `\n\nConversation context:\n${context}`;
    }

    return prompt;
  }

  private parseAnalysisResponse(content: string): ArgumentAnalysis {
    try {
      const parsed = JSON.parse(content);
      return {
        fallacies: parsed.fallacies || [],
        unsupportedClaims: parsed.unsupportedClaims || [],
        toneScore: parsed.toneScore ?? 5,
        evidenceScore: parsed.evidenceScore ?? 5,
        coherenceScore: parsed.coherenceScore ?? 5,
        suggestions: parsed.suggestions || [],
      };
    } catch {
      return this.getFallbackAnalysis();
    }
  }

  private getFallbackAnalysis(): ArgumentAnalysis {
    return {
      fallacies: [],
      unsupportedClaims: [],
      toneScore: 5,
      evidenceScore: 5,
      coherenceScore: 5,
      suggestions: ['Analysis unavailable - AI service temporarily down'],
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test -- --run argument-analyzer.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/simulator/services/argument-analyzer.service.ts services/ai-service/src/simulator/services/argument-analyzer.service.spec.ts
git commit -m "feat(ai-service): add ArgumentAnalyzerService"
```

---

### Task 8: Create Chat Service

**Files:**

- Create: `services/ai-service/src/simulator/services/chat.service.ts`
- Test: `services/ai-service/src/simulator/services/chat.service.spec.ts`

**Step 1: Write the failing test**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from './chat.service.js';
import { ModePromptBuilder } from './mode-prompt-builder.js';

describe('ChatService', () => {
  let service: ChatService;
  let mockBedrockService: any;
  let modePromptBuilder: ModePromptBuilder;

  beforeEach(() => {
    mockBedrockService = {
      isReady: vi.fn().mockResolvedValue(true),
      complete: vi.fn(),
    };
    modePromptBuilder = new ModePromptBuilder();
    service = new ChatService(mockBedrockService, modePromptBuilder);
  });

  it('should generate a persona response', async () => {
    mockBedrockService.complete.mockResolvedValue({
      content: 'That is an interesting claim. What evidence supports it?',
    });

    const result = await service.generateResponse({
      persona: {
        name: 'The Skeptic',
        position: 'Questions all claims',
        background: 'Analytical',
        tone: 'analytical',
        receptiveness: 0.5,
        argumentation: { usesEmotionalAppeals: false, citesData: true, asksQuestions: true },
      },
      mode: 'socratic',
      difficulty: 'intermediate',
      userMessage: 'Climate change is real.',
      conversationHistory: [],
    });

    expect(result.content).toContain('evidence');
    expect(mockBedrockService.complete).toHaveBeenCalled();
  });

  it('should include conversation history in context', async () => {
    mockBedrockService.complete.mockResolvedValue({
      content: 'Building on our previous discussion...',
    });

    await service.generateResponse({
      persona: {
        name: 'Test',
        position: 'Test',
        background: 'Test',
        tone: 'measured',
        receptiveness: 0.5,
        argumentation: { usesEmotionalAppeals: false, citesData: false, asksQuestions: false },
      },
      mode: 'debate',
      difficulty: 'novice',
      userMessage: 'My follow-up point',
      conversationHistory: [
        { role: 'user', content: 'First message' },
        { role: 'persona', content: 'First response' },
      ],
    });

    const call = mockBedrockService.complete.mock.calls[0][0];
    expect(call.messages.length).toBeGreaterThan(1);
  });

  it('should return fallback when AI unavailable', async () => {
    mockBedrockService.isReady.mockResolvedValue(false);

    const result = await service.generateResponse({
      persona: {
        name: 'Test',
        position: 'Test',
        background: 'Test',
        tone: 'measured',
        receptiveness: 0.5,
        argumentation: { usesEmotionalAppeals: false, citesData: false, asksQuestions: false },
      },
      mode: 'debate',
      difficulty: 'novice',
      userMessage: 'Test',
      conversationHistory: [],
    });

    expect(result.degradedMode).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test -- --run chat.service.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../ai/bedrock.service.js';
import { ModePromptBuilder } from './mode-prompt-builder.js';
import type { ChatRequestDto } from '../dto/chat-request.dto.js';

export interface ChatResponse {
  content: string;
  degradedMode?: boolean;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly modePromptBuilder: ModePromptBuilder,
  ) {}

  async generateResponse(dto: ChatRequestDto): Promise<ChatResponse> {
    const isReady = await this.bedrockService.isReady();
    if (!isReady) {
      return this.getFallbackResponse(dto.persona.name);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(dto);
      const messages = this.buildMessages(dto);

      const response = await this.bedrockService.complete({
        systemPrompt,
        messages,
        maxTokens: 2048,
        temperature: 0.8,
      });

      return { content: response.content };
    } catch (error) {
      this.logger.error('Failed to generate chat response', error);
      return this.getFallbackResponse(dto.persona.name);
    }
  }

  private buildSystemPrompt(dto: ChatRequestDto): string {
    const personaPrompt = this.buildPersonaPrompt(dto.persona);
    return this.modePromptBuilder.buildFullSystemPrompt(personaPrompt, dto.mode, dto.difficulty);
  }

  private buildPersonaPrompt(persona: ChatRequestDto['persona']): string {
    const receptivenessDesc =
      persona.receptiveness >= 0.7
        ? 'very open to opposing views'
        : persona.receptiveness >= 0.4
          ? 'moderately open to different perspectives'
          : 'strongly committed to your position';

    return `You are ${persona.name}.

POSITION: ${persona.position}
BACKGROUND: ${persona.background}
TONE: ${persona.tone}
RECEPTIVENESS: ${receptivenessDesc}

COMMUNICATION STYLE:
- Uses emotional appeals: ${persona.argumentation.usesEmotionalAppeals ? 'Yes' : 'No'}
- Cites data/statistics: ${persona.argumentation.citesData ? 'Yes' : 'No'}
- Asks clarifying questions: ${persona.argumentation.asksQuestions ? 'Yes' : 'No'}`;
  }

  private buildMessages(
    dto: ChatRequestDto,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add conversation history (last 10 exchanges)
    const history = dto.conversationHistory.slice(-20);
    for (const msg of history) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current user message with optional topic context
    let userMessage = dto.userMessage;
    if (dto.topicContext && messages.length === 0) {
      userMessage = `[Topic context: ${dto.topicContext}]\n\n${userMessage}`;
    }
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  private getFallbackResponse(personaName: string): ChatResponse {
    return {
      content: `[${personaName} is temporarily unavailable. The AI service is experiencing issues. Please try again in a moment.]`,
      degradedMode: true,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test -- --run chat.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/simulator/services/chat.service.ts services/ai-service/src/simulator/services/chat.service.spec.ts
git commit -m "feat(ai-service): add ChatService for persona responses"
```

---

### Task 9: Create Insights Generator Service

**Files:**

- Create: `services/ai-service/src/simulator/services/insights-generator.service.ts`
- Test: `services/ai-service/src/simulator/services/insights-generator.service.spec.ts`

**Step 1: Write the failing test**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightsGeneratorService } from './insights-generator.service.js';

describe('InsightsGeneratorService', () => {
  let service: InsightsGeneratorService;
  let mockBedrockService: any;

  beforeEach(() => {
    mockBedrockService = {
      isReady: vi.fn().mockResolvedValue(true),
      complete: vi.fn(),
    };
    service = new InsightsGeneratorService(mockBedrockService);
  });

  it('should generate learning insights from transcript', async () => {
    mockBedrockService.complete.mockResolvedValue({
      content: JSON.stringify({
        strengths: ['Good use of evidence', 'Civil tone throughout'],
        improvements: ['Could challenge assumptions more'],
        fallaciesCommitted: [{ type: 'strawman', exchange: 3, excerpt: 'You think...' }],
        recommendedReadings: [
          { title: 'A Rulebook for Arguments', reason: 'Strengthen logical structure' },
        ],
        overallAssessment: 'Solid performance with room for improvement.',
      }),
    });

    const result = await service.generateInsights({
      transcript: [
        { id: '1', role: 'user', content: 'I believe X', timestamp: '2026-02-21T10:00:00Z' },
        {
          id: '2',
          role: 'persona',
          content: 'Why do you believe that?',
          timestamp: '2026-02-21T10:01:00Z',
        },
      ],
      mode: 'socratic',
      persona: { name: 'Skeptic', position: 'Questions claims', tone: 'analytical' },
    });

    expect(result.strengths).toHaveLength(2);
    expect(result.fallaciesCommitted).toHaveLength(1);
    expect(result.overallAssessment).toBeTruthy();
  });
});
```

**Step 2: Write minimal implementation**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../ai/bedrock.service.js';
import type { LearningInsights } from '../types/conversation-mode.types.js';
import type { GenerateInsightsDto } from '../dto/generate-insights.dto.js';

@Injectable()
export class InsightsGeneratorService {
  private readonly logger = new Logger(InsightsGeneratorService.name);

  constructor(private readonly bedrockService: BedrockService) {}

  async generateInsights(dto: GenerateInsightsDto): Promise<LearningInsights> {
    const isReady = await this.bedrockService.isReady();
    if (!isReady) {
      return this.getFallbackInsights();
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(dto);

      const response = await this.bedrockService.complete({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2048,
        temperature: 0.5,
      });

      return this.parseInsightsResponse(response.content);
    } catch (error) {
      this.logger.error('Failed to generate insights', error);
      return this.getFallbackInsights();
    }
  }

  private buildSystemPrompt(): string {
    return `You are a debate coach analyzing a practice conversation. Provide constructive feedback.

Analyze the USER's messages only (not the persona's). Identify:
1. STRENGTHS: What the user did well (2-4 points)
2. IMPROVEMENTS: Areas to work on (2-4 points)
3. FALLACIES: Specific logical fallacies committed with exchange number and excerpt
4. READINGS: 2-3 book/article recommendations based on weaknesses
5. OVERALL: 2-3 sentence summary assessment

Respond ONLY with valid JSON:
{
  "strengths": ["string"],
  "improvements": ["string"],
  "fallaciesCommitted": [{"type": "string", "exchange": number, "excerpt": "string"}],
  "recommendedReadings": [{"title": "string", "reason": "string"}],
  "overallAssessment": "string"
}`;
  }

  private buildUserPrompt(dto: GenerateInsightsDto): string {
    const transcript = dto.transcript
      .map((m, i) => `[${i + 1}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    return `Analyze this practice debate:

CONVERSATION MODE: ${dto.mode}
PERSONA: ${dto.persona.name} (${dto.persona.position})

TRANSCRIPT:
${transcript}

${dto.topicContext ? `TOPIC CONTEXT: ${dto.topicContext}` : ''}`;
  }

  private parseInsightsResponse(content: string): LearningInsights {
    try {
      const parsed = JSON.parse(content);
      return {
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        fallaciesCommitted: parsed.fallaciesCommitted || [],
        recommendedReadings: parsed.recommendedReadings || [],
        overallAssessment: parsed.overallAssessment || 'Analysis complete.',
      };
    } catch {
      return this.getFallbackInsights();
    }
  }

  private getFallbackInsights(): LearningInsights {
    return {
      strengths: ['Engaged with the topic'],
      improvements: ['Insights unavailable - try again later'],
      fallaciesCommitted: [],
      recommendedReadings: [],
      overallAssessment: 'AI analysis temporarily unavailable.',
    };
  }
}
```

**Step 3: Run test and commit**

```bash
git add services/ai-service/src/simulator/services/insights-generator.service.ts services/ai-service/src/simulator/services/insights-generator.service.spec.ts
git commit -m "feat(ai-service): add InsightsGeneratorService"
```

---

### Task 10: Update Simulator Controller

**Files:**

- Modify: `services/ai-service/src/simulator/simulator.controller.ts`
- Test: `services/ai-service/src/simulator/simulator.controller.spec.ts`

**Step 1: Update controller with new endpoints**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, Get } from '@nestjs/common';
import { SimulatorService } from './simulator.service.js';
import { ChatService } from './services/chat.service.js';
import { ArgumentAnalyzerService } from './services/argument-analyzer.service.js';
import { InsightsGeneratorService } from './services/insights-generator.service.js';
import { GeneratePositionsDto } from './dto/generate-positions.dto.js';
import { GenerateResponseDto } from './dto/generate-response.dto.js';
import { GeneratePromptDto } from './dto/generate-prompt.dto.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import { AnalyzeArgumentDto } from './dto/analyze-argument.dto.js';
import { GenerateInsightsDto } from './dto/generate-insights.dto.js';
import { PRESET_PERSONAS } from './data/preset-personas.js';

@Controller('simulator')
export class SimulatorController {
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly chatService: ChatService,
    private readonly argumentAnalyzer: ArgumentAnalyzerService,
    private readonly insightsGenerator: InsightsGeneratorService,
  ) {}

  // Existing endpoints
  @Post('generate-positions')
  async generatePositions(@Body() dto: GeneratePositionsDto) {
    return this.simulatorService.generatePositions(dto);
  }

  @Post('generate-response')
  async generateResponse(@Body() dto: GenerateResponseDto) {
    return this.simulatorService.generateResponse(dto);
  }

  @Post('generate-prompt')
  async generatePrompt(@Body() dto: GeneratePromptDto) {
    return this.simulatorService.generatePrompt(dto);
  }

  // New endpoints for #784
  @Get('personas')
  getPresetPersonas() {
    return { personas: PRESET_PERSONAS };
  }

  @Post('chat')
  async chat(@Body() dto: ChatRequestDto) {
    return this.chatService.generateResponse(dto);
  }

  @Post('analyze')
  async analyzeArgument(@Body() dto: AnalyzeArgumentDto) {
    return this.argumentAnalyzer.analyze(dto);
  }

  @Post('insights')
  async generateInsights(@Body() dto: GenerateInsightsDto) {
    return this.insightsGenerator.generateInsights(dto);
  }
}
```

**Step 2: Update simulator module**

```typescript
// simulator.module.ts - add new services to providers
import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller.js';
import { SimulatorService } from './simulator.service.js';
import { ChatService } from './services/chat.service.js';
import { ArgumentAnalyzerService } from './services/argument-analyzer.service.js';
import { InsightsGeneratorService } from './services/insights-generator.service.js';
import { ModePromptBuilder } from './services/mode-prompt-builder.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AiModule],
  controllers: [SimulatorController],
  providers: [
    SimulatorService,
    ChatService,
    ArgumentAnalyzerService,
    InsightsGeneratorService,
    ModePromptBuilder,
  ],
})
export class SimulatorModule {}
```

**Step 3: Commit**

```bash
git add services/ai-service/src/simulator/
git commit -m "feat(ai-service): add chat, analyze, and insights endpoints"
```

---

## Phase 3: Frontend API Client

### Task 11: Update Simulator API Client

**Files:**

- Modify: `frontend/src/lib/simulator-api.ts`

**Step 1: Add new API functions**

```typescript
// Add to existing simulator-api.ts

import type {
  ConversationMode,
  DifficultyLevel,
  CustomPersonaConfig,
  PresetPersona,
  ArgumentAnalysis,
  LearningInsights,
  ConversationMessage,
} from '@/types/simulator';

export interface ChatRequest {
  persona: CustomPersonaConfig;
  mode: ConversationMode;
  difficulty: DifficultyLevel;
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'persona'; content: string }>;
  topicContext?: string;
}

export interface ChatResponse {
  content: string;
  degradedMode?: boolean;
}

export interface AnalyzeRequest {
  userMessage: string;
  conversationContext: Array<{ role: 'user' | 'persona'; content: string }>;
}

export interface InsightsRequest {
  transcript: ConversationMessage[];
  mode: ConversationMode;
  persona: { name: string; position: string; tone: string };
  topicContext?: string;
}

export async function getPresetPersonas(): Promise<{ personas: PresetPersona[] }> {
  const response = await apiClient.get('/ai/simulator/personas');
  return response.data;
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await apiClient.post('/ai/simulator/chat', request);
  return response.data;
}

export async function analyzeArgument(request: AnalyzeRequest): Promise<ArgumentAnalysis> {
  const response = await apiClient.post('/ai/simulator/analyze', request);
  return response.data;
}

export async function generateInsights(request: InsightsRequest): Promise<LearningInsights> {
  const response = await apiClient.post('/ai/simulator/insights', request);
  return response.data;
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/simulator-api.ts
git commit -m "feat(frontend): add chat, analyze, and insights API functions"
```

---

### Task 12: Create Simulator Types

**Files:**

- Create: `frontend/src/types/simulator.ts`

**Step 1: Write the types**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConversationMode = 'socratic' | 'debate' | 'steelman' | 'common_ground';
export type DifficultyLevel = 'novice' | 'intermediate' | 'expert';
export type PersonaTone = 'measured' | 'analytical' | 'passionate' | 'confrontational';
export type SimulationStatus = 'configuring' | 'active' | 'paused' | 'completed';

export interface PresetPersona {
  id: string;
  name: string;
  description: string;
  position: string;
  tone: PersonaTone;
  modeAffinity: ConversationMode;
}

export interface CustomPersonaConfig {
  name: string;
  position: string;
  background: string;
  tone: PersonaTone;
  receptiveness: number;
  argumentation: {
    usesEmotionalAppeals: boolean;
    citesData: boolean;
    asksQuestions: boolean;
  };
  exampleArguments?: string[];
}

export interface Fallacy {
  type: string;
  description: string;
  excerpt: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface ArgumentAnalysis {
  fallacies: Fallacy[];
  unsupportedClaims: string[];
  toneScore: number;
  evidenceScore: number;
  coherenceScore: number;
  suggestions: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'persona';
  content: string;
  timestamp: string;
  analysis?: ArgumentAnalysis;
}

export interface LearningInsights {
  strengths: string[];
  improvements: string[];
  fallaciesCommitted: { type: string; exchange: number; excerpt: string }[];
  recommendedReadings: { title: string; reason: string }[];
  overallAssessment: string;
}

export interface SimulationMetrics {
  totalExchanges: number;
  totalFallacies: number;
  avgToneScore: number;
  avgEvidenceScore: number;
  avgCoherenceScore: number;
}

export interface AIOperation {
  id: string;
  type: 'persona_response' | 'argument_analysis' | 'citation_verify' | 'insights';
  status: 'pending' | 'active' | 'completed' | 'failed';
  label: string;
  startedAt: number;
  estimatedMs?: number;
  error?: string;
}

export interface SimulationState {
  persona: PresetPersona | CustomPersonaConfig | null;
  mode: ConversationMode;
  difficulty: DifficultyLevel;
  maxExchanges: 5 | 10 | 20;
  messages: ConversationMessage[];
  currentExchange: number;
  status: SimulationStatus;
  analysisResults: ArgumentAnalysis[];
  overallMetrics: SimulationMetrics;
  pendingOperations: AIOperation[];
  topicContext?: string;
}
```

**Step 2: Commit**

```bash
git add frontend/src/types/simulator.ts
git commit -m "feat(frontend): add simulator TypeScript types"
```

---

## Phase 4: Frontend Components (Visual Feedback - #788)

### Task 13: Create Chat Message Skeleton

**Files:**

- Create: `frontend/src/components/ui/skeletons/ChatMessageSkeleton.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

interface ChatMessageSkeletonProps {
  isUser?: boolean;
}

export function ChatMessageSkeleton({ isUser = false }: ChatMessageSkeletonProps) {
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      role="status"
      aria-label="Loading message"
    >
      <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Name skeleton */}
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />

          {/* Message bubble skeleton */}
          <div
            className={`rounded-lg p-4 ${
              isUser ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            {/* Typing indicator */}
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ui/skeletons/ChatMessageSkeleton.tsx
git commit -m "feat(frontend): add ChatMessageSkeleton component"
```

---

### Task 14: Create Argument Analysis Skeleton

**Files:**

- Create: `frontend/src/components/ui/skeletons/ArgumentAnalysisSkeleton.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export function ArgumentAnalysisSkeleton() {
  return (
    <div
      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
      role="status"
      aria-label="Analyzing argument"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing your argument...</span>
      </div>

      {/* Progress steps */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Checking logical structure
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Detecting fallacies</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span className="text-sm text-gray-400 dark:text-gray-500">Scoring evidence</span>
        </div>
      </div>

      {/* Shimmer placeholders */}
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ui/skeletons/ArgumentAnalysisSkeleton.tsx
git commit -m "feat(frontend): add ArgumentAnalysisSkeleton component"
```

---

### Task 15: Create Progress Tracker Component

**Files:**

- Create: `frontend/src/components/ui/ProgressTracker.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

interface ProgressTrackerProps {
  steps: Step[];
  className?: string;
}

export function ProgressTracker({ steps, className = '' }: ProgressTrackerProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite">
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2 text-sm">
            {step.status === 'completed' && (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {step.status === 'active' && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {step.status === 'pending' && (
              <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
            {step.status === 'failed' && (
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span
              className={
                step.status === 'completed'
                  ? 'text-gray-600 dark:text-gray-400'
                  : step.status === 'active'
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : step.status === 'failed'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-400 dark:text-gray-500'
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ui/ProgressTracker.tsx
git commit -m "feat(frontend): add ProgressTracker component"
```

---

### Task 16: Create Operation Queue Component

**Files:**

- Create: `frontend/src/components/ui/OperationQueue.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AIOperation } from '@/types/simulator';

interface OperationQueueProps {
  operations: AIOperation[];
  className?: string;
}

function formatEstimatedTime(ms?: number): string {
  if (!ms) return '';
  const seconds = Math.ceil(ms / 1000);
  return `~${seconds}s`;
}

export function OperationQueue({ operations, className = '' }: OperationQueueProps) {
  const activeOps = operations.filter((op) => op.status === 'active' || op.status === 'pending');

  if (activeOps.length === 0) return null;

  return (
    <div
      className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          AI Operations ({activeOps.length} active)
        </span>
      </div>

      <ul className="space-y-1 text-sm text-blue-600 dark:text-blue-400">
        {activeOps.map((op) => (
          <li key={op.id} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {op.status === 'active' ? (
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              ) : (
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              )}
              {op.label}
            </span>
            {op.estimatedMs && (
              <span className="text-xs text-blue-500 dark:text-blue-400">
                {formatEstimatedTime(op.estimatedMs)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Screen reader announcement */}
      <span className="sr-only">
        {activeOps.length} AI operation{activeOps.length !== 1 ? 's' : ''} in progress
      </span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ui/OperationQueue.tsx
git commit -m "feat(frontend): add OperationQueue component for AI status"
```

---

## Phase 5: Frontend Simulator Components

### Task 17: Create Persona Selector Component

**Files:**

- Create: `frontend/src/components/simulator/PersonaSelector.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { PresetPersona, CustomPersonaConfig, PersonaTone } from '@/types/simulator';
import { getPresetPersonas } from '@/lib/simulator-api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface PersonaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (persona: PresetPersona | CustomPersonaConfig) => void;
}

const PERSONA_ICONS: Record<string, string> = {
  skeptic: '🔍',
  advocate: '📢',
  'devils-advocate': '😈',
  mediator: '🤝',
  expert: '🎓',
  idealist: '✨',
};

export function PersonaSelector({ isOpen, onClose, onSelect }: PersonaSelectorProps) {
  const [presets, setPresets] = useState<PresetPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customPersona, setCustomPersona] = useState<CustomPersonaConfig>({
    name: '',
    position: '',
    background: '',
    tone: 'measured',
    receptiveness: 0.5,
    argumentation: {
      usesEmotionalAppeals: false,
      citesData: true,
      asksQuestions: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      getPresetPersonas()
        .then((data) => setPresets(data.personas))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handlePresetSelect = (persona: PresetPersona) => {
    onSelect(persona);
    onClose();
  };

  const handleCustomSubmit = () => {
    if (customPersona.name && customPersona.position) {
      onSelect(customPersona);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Your Debate Partner">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : showCustomForm ? (
        <div className="space-y-4">
          <button
            onClick={() => setShowCustomForm(false)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to presets
          </button>

          <div>
            <label className="block text-sm font-medium mb-1">Persona Name</label>
            <input
              type="text"
              value={customPersona.name}
              onChange={(e) => setCustomPersona({ ...customPersona, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              placeholder="e.g., The Philosopher"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <input
              type="text"
              value={customPersona.position}
              onChange={(e) => setCustomPersona({ ...customPersona, position: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              placeholder="e.g., Believes in empirical evidence above all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Background</label>
            <input
              type="text"
              value={customPersona.background}
              onChange={(e) => setCustomPersona({ ...customPersona, background: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              placeholder="e.g., Academic with expertise in logic"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tone</label>
            <select
              value={customPersona.tone}
              onChange={(e) =>
                setCustomPersona({ ...customPersona, tone: e.target.value as PersonaTone })
              }
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="measured">Measured</option>
              <option value="analytical">Analytical</option>
              <option value="passionate">Passionate</option>
              <option value="confrontational">Confrontational</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Receptiveness: {customPersona.receptiveness.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={customPersona.receptiveness}
              onChange={(e) =>
                setCustomPersona({ ...customPersona, receptiveness: parseFloat(e.target.value) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Closed-minded</span>
              <span>Very open</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Communication Style</label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customPersona.argumentation.usesEmotionalAppeals}
                onChange={(e) =>
                  setCustomPersona({
                    ...customPersona,
                    argumentation: {
                      ...customPersona.argumentation,
                      usesEmotionalAppeals: e.target.checked,
                    },
                  })
                }
              />
              <span className="text-sm">Uses emotional appeals</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customPersona.argumentation.citesData}
                onChange={(e) =>
                  setCustomPersona({
                    ...customPersona,
                    argumentation: { ...customPersona.argumentation, citesData: e.target.checked },
                  })
                }
              />
              <span className="text-sm">Cites data/statistics</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customPersona.argumentation.asksQuestions}
                onChange={(e) =>
                  setCustomPersona({
                    ...customPersona,
                    argumentation: {
                      ...customPersona.argumentation,
                      asksQuestions: e.target.checked,
                    },
                  })
                }
              />
              <span className="text-sm">Asks clarifying questions</span>
            </label>
          </div>

          <Button
            onClick={handleCustomSubmit}
            disabled={!customPersona.name || !customPersona.position}
          >
            Create Persona
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a preset persona or create your own debate partner.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {presets.map((persona) => (
              <button
                key={persona.id}
                onClick={() => handlePresetSelect(persona)}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
              >
                <div className="text-2xl mb-2">{PERSONA_ICONS[persona.id] || '🎭'}</div>
                <div className="font-medium">{persona.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {persona.description}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCustomForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            + Create Custom Persona
          </button>
        </div>
      )}
    </Modal>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/simulator/PersonaSelector.tsx
git commit -m "feat(frontend): add PersonaSelector component"
```

---

### Task 18: Create Conversation Mode Selector

**Files:**

- Create: `frontend/src/components/simulator/ConversationModeSelector.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ConversationMode } from '@/types/simulator';

interface ConversationModeSelectorProps {
  value: ConversationMode;
  onChange: (mode: ConversationMode) => void;
  className?: string;
}

const MODES: Array<{
  id: ConversationMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'socratic',
    label: 'Socratic',
    description: 'AI asks clarifying questions to probe your assumptions',
    icon: '❓',
  },
  {
    id: 'debate',
    label: 'Debate',
    description: 'AI presents counter-arguments and defends opposing position',
    icon: '⚔️',
  },
  {
    id: 'steelman',
    label: 'Steelman',
    description: 'AI presents the strongest version of the opposing view',
    icon: '💪',
  },
  {
    id: 'common_ground',
    label: 'Common Ground',
    description: 'AI seeks areas of agreement and shared values',
    icon: '🤝',
  },
];

export function ConversationModeSelector({
  value,
  onChange,
  className = '',
}: ConversationModeSelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Conversation Mode
      </label>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              value === mode.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{mode.icon}</span>
              <span className="font-medium text-sm">{mode.label}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/simulator/ConversationModeSelector.tsx
git commit -m "feat(frontend): add ConversationModeSelector component"
```

---

### Task 19: Create Argument Feedback Panel

**Files:**

- Create: `frontend/src/components/simulator/ArgumentFeedbackPanel.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ArgumentAnalysis } from '@/types/simulator';
import { ArgumentAnalysisSkeleton } from '@/components/ui/skeletons/ArgumentAnalysisSkeleton';

interface ArgumentFeedbackPanelProps {
  analysis: ArgumentAnalysis | null;
  isLoading: boolean;
  className?: string;
}

function ScoreBar({ label, score, max = 10 }: { label: string; score: number; max?: number }) {
  const percentage = (score / max) * 100;
  const color =
    percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium">
          {score.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function FallacyBadge({ type, severity }: { type: string; severity: string }) {
  const colors = {
    minor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    moderate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    major: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity as keyof typeof colors] || colors.minor}`}
    >
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export function ArgumentFeedbackPanel({
  analysis,
  isLoading,
  className = '',
}: ArgumentFeedbackPanelProps) {
  if (isLoading) {
    return <ArgumentAnalysisSkeleton />;
  }

  if (!analysis) {
    return (
      <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Send a message to see argument analysis
        </p>
      </div>
    );
  }

  return (
    <div
      className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4 ${className}`}
    >
      <h3 className="font-medium text-gray-900 dark:text-gray-100">Argument Analysis</h3>

      {/* Scores */}
      <div className="space-y-3">
        <ScoreBar label="Tone" score={analysis.toneScore} />
        <ScoreBar label="Evidence" score={analysis.evidenceScore} />
        <ScoreBar label="Coherence" score={analysis.coherenceScore} />
      </div>

      {/* Fallacies */}
      {analysis.fallacies.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fallacies Detected
          </h4>
          <div className="space-y-2">
            {analysis.fallacies.map((fallacy, i) => (
              <div key={i} className="text-sm">
                <FallacyBadge type={fallacy.type} severity={fallacy.severity} />
                <p className="mt-1 text-gray-600 dark:text-gray-400">{fallacy.description}</p>
                <p className="mt-1 italic text-gray-500 dark:text-gray-500">
                  &ldquo;{fallacy.excerpt}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unsupported Claims */}
      {analysis.unsupportedClaims.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Unsupported Claims
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {analysis.unsupportedClaims.map((claim, i) => (
              <li key={i}>{claim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggestions</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {analysis.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/simulator/ArgumentFeedbackPanel.tsx
git commit -m "feat(frontend): add ArgumentFeedbackPanel component"
```

---

### Task 20: Create Simulator Chat Interface

**Files:**

- Create: `frontend/src/components/simulator/SimulatorChatInterface.tsx`

**Step 1: Write the component**

```tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect } from 'react';
import type { ConversationMessage, PresetPersona, CustomPersonaConfig } from '@/types/simulator';
import { ChatMessageSkeleton } from '@/components/ui/skeletons/ChatMessageSkeleton';

interface SimulatorChatInterfaceProps {
  messages: ConversationMessage[];
  persona: PresetPersona | CustomPersonaConfig | null;
  isGenerating: boolean;
  onSendMessage: (message: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  disabled?: boolean;
  maxExchanges: number;
  currentExchange: number;
}

function MessageBubble({
  message,
  personaName,
}: {
  message: ConversationMessage;
  personaName: string;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${
            isUser ? 'bg-blue-500' : 'bg-purple-500'
          }`}
        >
          {isUser ? 'You' : personaName.charAt(0)}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {isUser ? 'You' : personaName}
          </span>
          <div
            className={`rounded-lg p-4 ${
              isUser
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-xs text-gray-400 mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SimulatorChatInterface({
  messages,
  persona,
  isGenerating,
  onSendMessage,
  inputValue,
  onInputChange,
  disabled = false,
  maxExchanges,
  currentExchange,
}: SimulatorChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const personaName = persona ? ('name' in persona ? persona.name : 'AI Persona') : 'AI';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled && !isGenerating) {
      onSendMessage(inputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isAtLimit = currentExchange >= maxExchanges;

  return (
    <div className="flex flex-col h-full">
      {/* Exchange counter */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Exchange {currentExchange} of {maxExchanges}
          </span>
          {isAtLimit && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Limit reached</span>
          )}
        </div>
        <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(currentExchange / maxExchanges) * 100}%` }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Start the conversation by sending a message</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} personaName={personaName} />
            ))}
            {isGenerating && <ChatMessageSkeleton />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAtLimit ? 'Exchange limit reached' : 'Type your argument...'}
            disabled={disabled || isGenerating || isAtLimit}
            rows={2}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || disabled || isGenerating || isAtLimit}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/simulator/SimulatorChatInterface.tsx
git commit -m "feat(frontend): add SimulatorChatInterface component"
```

---

## Remaining Tasks

Due to the comprehensive nature of this plan, the remaining tasks follow the same structure:

### Phase 5 (continued):

- **Task 21**: Create Learning Insights Panel
- **Task 22**: Create Transcript Viewer
- **Task 23**: Create Simulation Settings Modal

### Phase 6: Main Page Integration

- **Task 24**: Create useSimulation hook for state management
- **Task 25**: Update DiscussionSimulatorPage with new components
- **Task 26**: Add localStorage persistence for pause/resume

### Phase 7: Testing

- **Task 27**: Write E2E tests for simulation flow
- **Task 28**: Write integration tests for API calls
- **Task 29**: Write component tests for new UI elements

### Phase 8: Polish

- **Task 30**: Add keyboard navigation and focus management
- **Task 31**: Add screen reader announcements
- **Task 32**: Final code review and cleanup

---

## Verification Commands

```bash
# Run all tests
pnpm test

# Run ai-service tests
cd services/ai-service && pnpm test

# Run frontend tests
cd frontend && pnpm test

# Run E2E tests
pnpm test:e2e

# Type check
pnpm typecheck

# Lint
pnpm lint
```
