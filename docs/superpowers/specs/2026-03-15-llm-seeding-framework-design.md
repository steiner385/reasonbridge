# LLM-Powered Seeding Framework Enhancement

**Date**: 2026-03-15
**Status**: Draft
**Author**: Claude Code

## Summary

Enhance the demo data seeding framework to scale from 12 to ~75 topics with LLM-generated, topic-specific content for all discussion elements. Uses a generate-once, cache-forever strategy to minimize API costs while maintaining content quality and uniqueness.

## Goals

1. **Scale topics**: Expand from 12 to ~75 diverse discussion topics across 9 categories
2. **Quality content**: Generate realistic, topic-specific responses, propositions, and common ground
3. **Feature completeness**: Add bridging suggestions to seeded data (currently not seeded)
4. **Eliminate duplicates**: Prevent duplicate responses within discussions
5. **Efficient seeding**: Cache generated content to avoid repeated LLM calls

## Non-Goals

- Real-time content generation during user interaction
- Replacing the AI service's live analysis capabilities
- Generating user accounts (keep existing 5 demo personas)
- Multi-language support

## Architecture

### Directory Structure

```
packages/db-models/prisma/seed/
├── generators/
│   ├── llm-client.ts              # Bedrock/Claude API wrapper
│   ├── topic-generator.ts         # Generate topic titles/descriptions
│   ├── response-generator.ts      # Generate realistic responses
│   ├── proposition-generator.ts   # Generate key propositions
│   ├── common-ground-generator.ts # Enhanced with LLM
│   ├── bridging-generator.ts      # NEW: Generate bridging suggestions
│   ├── engagement-generator.ts    # Generate votes, read states
│   └── orchestrator.ts            # Coordinates generation workflow
├── cache/
│   ├── .gitkeep
│   ├── generated-topics.json      # Cached topic data
│   ├── generated-responses.json   # Cached response data
│   ├── generated-propositions.json
│   ├── generated-common-ground.json
│   ├── generated-bridging.json
│   └── generation-metadata.json   # When generated, model version, etc.
├── demo-fixtures.ts               # Updated orchestrator
├── demo-ids.ts                    # Existing ID generation
├── demo-personas.ts               # Existing 5 users (unchanged)
├── demo-tags.ts                   # Existing 10 tags (unchanged)
└── ... (existing hand-crafted files remain as fallback)
```

### Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     seedDemo() called                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Cache exists?         │
                  └───────────────────────┘
                     │              │
                    Yes            No
                     │              │
                     ▼              ▼
          ┌──────────────┐  ┌──────────────────────┐
          │ Load cache   │  │ Generate via LLM     │
          └──────────────┘  └──────────────────────┘
                     │              │
                     │              ▼
                     │     ┌──────────────────────┐
                     │     │ Save to cache files  │
                     │     └──────────────────────┘
                     │              │
                     └──────┬───────┘
                            ▼
                  ┌───────────────────────┐
                  │ Seed database         │
                  │ (upsert operations)   │
                  └───────────────────────┘
```

## Topic Generation

### Categories and Distribution

| Category | Count | Description |
|----------|-------|-------------|
| Climate & Environment | 10 | Climate policy, sustainability, conservation |
| Technology & Privacy | 10 | AI, data privacy, digital rights |
| Education & Youth | 8 | School policy, curriculum, youth development |
| Work & Economy | 10 | Labor, workplace, economic policy |
| Healthcare & Policy | 8 | Health insurance, medical ethics, public health |
| Ethics & Society | 10 | Social norms, justice, cultural issues |
| Government & Civic | 8 | Voting, governance, civic engagement |
| Science & Research | 6 | Research ethics, scientific policy |
| Business & Innovation | 5 | Corporate policy, innovation, entrepreneurship |
| **Total** | **75** | 12 existing + 63 new |

### Topic Schema

```typescript
interface GeneratedTopic {
  id: string;                    // Deterministic UUID (11111111-0000-4000-8000-...)
  title: string;                 // "Should X?" format (max 100 chars)
  description: string;           // 2-3 sentences of context (150-300 chars)
  slug: string;                  // URL-friendly version of title
  creatorId: string;             // Random from 5 demo users
  category: string;              // From categories above
  status: TopicStatus;           // ACTIVE (85%), SEEDING (10%), ARCHIVED (5%)
  tags: string[];                // 2-3 relevant tag IDs
  crossCuttingThemes: string[];  // Related concepts
  expectedEngagement: 'low' | 'medium' | 'high' | 'very_high';
}
```

### Topic Generation Prompt

```
Generate {count} discussion topics for the category "{category}".

Requirements:
- Format as clear yes/no questions ("Should X?", "Is Y necessary?")
- Topics should be contemporary and debatable
- Avoid highly partisan or inflammatory framing
- Include mix of local and national scope
- Each topic needs: title, description (2-3 sentences), 2-3 relevant themes

Output as JSON array matching the schema above.
```

## Response Generation

### Response Distribution Per Topic

- **5-8 responses** per topic
- **Threading structure**:
  - 2-3 root-level responses (different viewpoints)
  - 2-3 direct replies
  - 1-2 nested replies (max 3 levels)

### Viewpoint Balance

- 30% `support`
- 30% `oppose`
- 40% `nuanced`

### Response Schema

```typescript
interface GeneratedResponse {
  id: string;                    // Deterministic UUID
  topicId: string;
  authorId: string;              // Random from 5 demo users
  parentId: string | null;
  content: string;               // 50-200 words
  viewpoint: 'support' | 'oppose' | 'nuanced';
  citedSources: CitedSource[];   // 0-2 sources (optional)
}

interface CitedSource {
  url: string;                   // Fabricated but realistic
  title: string;
  author?: string;
}
```

### Response Generation Prompt

```
Generate a realistic discussion thread for this topic:
Title: "{title}"
Description: "{description}"

Generate 6 responses with this structure:
- 3 root responses with different viewpoints (support, oppose, nuanced)
- 2-3 replies to those responses
- 1 nested reply

Each response should:
- Be 50-200 words
- Use conversational tone appropriate for online discussion
- Reference real-world examples when relevant
- Vary writing style per author (Alice: analytical, Bob: pragmatic, etc.)
- Include occasional cited sources (fabricated but realistic URLs)

Author personas:
- Alice Anderson: Analytical, data-driven, progressive leaning
- Bob Builder: Pragmatic, solution-oriented, moderate
- Admin Adams: Balanced moderator perspective
- Mod Martinez: Community-focused, empathetic
- New User: Curious, asks clarifying questions

Output as JSON array with threading (parentId references).
```

## Proposition Generation

### Propositions Per Topic

- **3-5 propositions** extracted from responses
- Mix of sources:
  - 60% `AI_IDENTIFIED` (extracted from discussion)
  - 40% `USER_CREATED` (explicit claims made by users)

### Proposition Schema

```typescript
interface GeneratedProposition {
  id: string;
  topicId: string;
  statement: string;             // Clear claim (max 150 chars)
  source: 'AI_IDENTIFIED' | 'USER_CREATED';
  supportCount: number;          // Based on response viewpoints
  opposeCount: number;
  nuancedCount: number;
  consensusScore: number;        // 0.0-1.0 based on distribution
  status: 'ACTIVE';
}
```

### Generation Strategy

1. Analyze generated responses for the topic
2. Extract 3-5 key claims/propositions
3. Calculate support/oppose/nuanced counts based on response viewpoints
4. Compute consensus score: `(max(support, oppose) + nuanced*0.5) / total`

## Common Ground Generation

### Common Ground Per Topic

- **1-2 analyses** per topic with ≥3 responses
- Derived from actual response content (not generic templates)

### Common Ground Schema

```typescript
interface GeneratedCommonGround {
  id: string;
  topicId: string;
  version: number;
  agreementZones: AgreementZone[];      // 1-3 areas of agreement
  misunderstandings: Misunderstanding[]; // 0-2 points of confusion
  genuineDisagreements: GenuineDisagreement[]; // 1-2 fundamental differences
  overallConsensusScore: number;
  participantCountAtGeneration: number;
  responseCountAtGeneration: number;
  modelVersion: string;
}
```

### Generation Prompt

```
Analyze this discussion and generate a common ground analysis:

Topic: "{title}"
Responses: {responses as JSON}

Identify:
1. Agreement zones: Where do most participants agree? (1-3 areas)
2. Misunderstandings: What points of confusion exist? (0-2 items)
3. Genuine disagreements: What are the fundamental value differences? (1-2 items)

For each agreement zone, cite specific evidence from responses.
For disagreements, identify the underlying values in tension.

Output as JSON matching the CommonGround schema.
```

## Bridging Suggestions (NEW)

### Bridging Suggestions Per Topic

- **2-3 suggestions** per topic with common ground analysis
- Derived from propositions and identified disagreements

### Bridging Schema

```typescript
interface GeneratedBridgingSuggestion {
  id: string;
  topicId: string;
  commonGroundAnalysisId: string;
  suggestionText: string;            // Action-oriented suggestion
  targetAudience: 'support' | 'oppose' | 'both';
  relatedPropositionIds: string[];
  potentialCommonGround: string;     // What agreement this could unlock
  confidenceScore: number;           // 0.5-0.95
  suggestionType: 'reframe' | 'question' | 'shared_value' | 'compromise';
}
```

### Generation Prompt

```
Given the common ground analysis for this discussion:

Topic: "{title}"
Propositions: {propositions as JSON}
Common Ground Analysis: {analysis as JSON}

Generate 2-3 bridging suggestions that could help participants find more common ground.

Each suggestion should:
- Target a specific audience (supporters, opponents, or both)
- Reference specific propositions
- Identify potential common ground that could be unlocked
- Be actionable (a question to consider, a reframe, or shared value to explore)

Types of suggestions:
- reframe: Alternative way to view the issue
- question: Question that could shift perspectives
- shared_value: Underlying value both sides share
- compromise: Potential middle ground position

Output as JSON array matching the BridgingSuggestion schema.
```

## Duplicate Prevention

### Strategies

1. **Deterministic IDs**: Use `generateResponseId(topicNumber, sequence)` format
   - Format: `11111111-0000-4000-8000-000TTTRRRRRR`
   - TTT = topic number, RRRRRR = sequence
   - Prevents database duplicates via upsert

2. **Content uniqueness in prompts**: Include instruction:
   ```
   IMPORTANT: Each response must be unique. Do not repeat content, arguments,
   or examples used in other responses. Each user has a distinct voice and perspective.
   ```

3. **Post-generation validation**:
   ```typescript
   function validateUniqueness(responses: GeneratedResponse[]): boolean {
     const contentHashes = responses.map(r => hashContent(r.content));
     const uniqueHashes = new Set(contentHashes);
     return uniqueHashes.size === contentHashes.length;
   }
   ```

4. **Database upsert**: All seed operations use `prisma.X.upsert()` with unique constraints

## Cache Management

### Cache Files

| File | Description | Regeneration Trigger |
|------|-------------|---------------------|
| `generated-topics.json` | 75 topics | Manual or schema change |
| `generated-responses.json` | ~450 responses | When topics change |
| `generated-propositions.json` | ~300 propositions | When responses change |
| `generated-common-ground.json` | ~75 analyses | When propositions change |
| `generated-bridging.json` | ~200 suggestions | When common ground changes |
| `generation-metadata.json` | Timestamps, versions | Updated on each generation |

### Metadata Schema

```typescript
interface GenerationMetadata {
  generatedAt: string;           // ISO timestamp
  modelVersion: string;          // e.g., "claude-3-5-sonnet-20241022"
  topicCount: number;
  responseCount: number;
  propositionCount: number;
  commonGroundCount: number;
  bridgingCount: number;
  generationDurationMs: number;
  cacheVersion: number;          // Increment to force regeneration
}
```

### Regeneration Commands

```bash
# Force full regeneration
pnpm seed:generate --force

# Regenerate specific entity type
pnpm seed:generate --only=topics
pnpm seed:generate --only=responses

# Validate cache integrity
pnpm seed:validate
```

## LLM Client Configuration

### Provider

Use AWS Bedrock with Claude 3.5 Sonnet for cost-effective generation:

```typescript
// generators/llm-client.ts
import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime';

interface LLMClientConfig {
  modelId: string;              // "anthropic.claude-3-5-sonnet-20241022-v2:0"
  maxTokens: number;            // 4096 for responses, 8192 for full topic
  temperature: number;          // 0.7 for variety, 0.3 for consistency
  topP: number;                 // 0.95
  retryAttempts: number;        // 3
  rateLimitDelayMs: number;     // 500ms between calls
}
```

### Error Handling

- Retry failed generations up to 3 times with exponential backoff
- Fall back to existing hand-crafted content if generation fails
- Log generation failures for review

## Testing Strategy

### Unit Tests

- Test ID generation uniqueness across all topics
- Test cache loading/saving
- Test response threading validation
- Test viewpoint distribution

### Integration Tests

- Test full generation pipeline (mocked LLM)
- Test database seeding with generated data
- Test cache invalidation

### Manual Validation

- Review sample of generated content for quality
- Verify no duplicates across topics
- Check threading relationships are valid

## Migration Plan

### Phase 1: Infrastructure

1. Create generator files with interfaces
2. Set up cache directory structure
3. Implement LLM client with Bedrock integration

### Phase 2: Topic Generation

1. Implement topic generator
2. Generate 63 new topics (keeping 12 existing)
3. Validate topic quality and uniqueness

### Phase 3: Response & Proposition Generation

1. Implement response generator with threading
2. Implement proposition extractor
3. Generate content for all 75 topics

### Phase 4: Common Ground & Bridging

1. Enhance common-ground-generator with LLM
2. Implement new bridging-generator
3. Generate analyses for all topics

### Phase 5: Integration & Testing

1. Update demo-fixtures.ts to use generators
2. Add regeneration CLI commands
3. Run full E2E test suite
4. Document regeneration process

## Rollback Strategy

If LLM generation produces unacceptable quality:

1. Existing hand-crafted files remain intact as fallback
2. Set `USE_GENERATED_CONTENT=false` environment variable
3. Seeding falls back to existing 12 topics with hand-crafted content
4. Review and fix generation prompts
5. Clear cache and regenerate

## Success Criteria

1. **Topic count**: ≥70 topics seeded successfully
2. **Content quality**: No generic/template content visible in UI
3. **No duplicates**: Zero duplicate responses within any discussion
4. **Feature coverage**: All topics have propositions, common ground, and bridging
5. **Seed time**: Full seed completes in <30 seconds (using cache)
6. **E2E tests**: All existing tests pass with new seed data

## Appendix: Existing Files to Preserve

The following hand-crafted files will be preserved and used as fallback:

- `demo-personas.ts` - 5 demo users (unchanged)
- `demo-tags.ts` - 10 tags (unchanged)
- `demo-topics.ts` - 12 original topics (kept alongside new)
- `demo-responses.ts` - 52 original responses (kept alongside new)
- `demo-propositions.ts` - 33 original propositions (kept alongside new)
- `demo-common-ground.ts` - 21 original analyses (kept alongside new)
- `demo-alignments.ts` - 77 alignments (regenerated based on new propositions)
- `demo-ai-feedback.ts` - AI feedback (regenerated based on new responses)
