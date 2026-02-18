# AI/LLM Testing Infrastructure Design

**Date:** 2026-02-18
**Issues:** #409, #410, #411, #412, #413
**Phase:** Phase 12 - AI Model Testing

## Overview

Implement comprehensive testing infrastructure for AI/LLM integrations in the ai-service, covering mock fixtures, prompt snapshot tests, schema validation, and resilience testing.

## File Structure

```
services/ai-service/
├── tests/
│   ├── fixtures/
│   │   └── bedrock-responses/
│   │       ├── common-ground/
│   │       │   ├── cluster-texts-success.json
│   │       │   ├── cluster-texts-empty.json
│   │       │   └── identify-values-success.json
│   │       ├── moral-foundations/
│   │       │   ├── analyze-values-success.json
│   │       │   ├── analyze-values-mixed.json
│   │       │   └── analyze-values-no-match.json
│   │       ├── errors/
│   │       │   ├── timeout.json
│   │       │   ├── rate-limit.json
│   │       │   ├── auth-failure.json
│   │       │   └── malformed-response.json
│   │       └── index.ts
│   ├── snapshots/
│   │   ├── common-ground.snap.ts
│   │   └── moral-foundations.snap.ts
│   ├── contract/
│   │   └── bedrock-schema.spec.ts
│   └── integration/
│       └── bedrock-resilience.spec.ts
```

## Component Designs

### 1. Bedrock Mock Fixtures (#409)

Static JSON files representing Bedrock API responses for deterministic testing.

**Fixture Schema:**
```json
{
  "description": "Human-readable description of this fixture",
  "request": {
    "systemPrompt": "The system prompt sent to Bedrock",
    "messages": [
      { "role": "user", "content": "User message content" }
    ]
  },
  "response": {
    "content": "The response content from Bedrock",
    "stopReason": "end_turn"
  },
  "metadata": {
    "latencyMs": 450,
    "tokensUsed": 156
  }
}
```

**Fixture Categories:**
- `common-ground/` - Clustering and value identification responses
- `moral-foundations/` - Moral foundation analysis responses
- `errors/` - Error scenarios (timeout, rate limit, auth failure, malformed)

**Loader Utility:** TypeScript module that loads and exports all fixtures with proper typing.

### 2. Prompt Snapshot Tests (#410, #411)

Vitest snapshot tests that capture exact prompts sent to Bedrock, detecting unintended changes.

**Approach:**
- Extract prompt-building logic into static/testable methods
- Use `expect(prompt).toMatchSnapshot()` for prompt verification
- Snapshots stored in `__snapshots__/` (Vitest default)
- Update with `pnpm test -u` when prompts intentionally change

**Coverage:**
- `common-ground.snap.ts`: clusterTexts prompt, identifyValues prompt, generateClarification prompt
- `moral-foundations.snap.ts`: moral foundation mapping prompts, value extraction prompts

### 3. Schema Validation (#412)

Zod schemas validating Bedrock response structures.

**Schemas:**
```typescript
ClusterResponseSchema = z.array(z.object({
  theme: z.string(),
  members: z.array(z.number()),
}));

ValuesResponseSchema = z.array(z.string());

ModerationResponseSchema = z.union([
  z.literal('SAFE'),
  z.string().startsWith('FLAGGED:'),
]);
```

**Test Cases:**
- Valid response structures for each operation
- Edge cases: empty arrays, single items, max items
- Malformed JSON handling
- Partial/incomplete responses

### 4. Resilience Tests (#413)

Integration tests for timeout, retry, and graceful degradation.

**Scenarios:**
| Scenario | Expected Behavior |
|----------|-------------------|
| Timeout after `timeoutMs` | Throws `TIMEOUT_ERROR`, falls back to pattern-based |
| Rate limit (transient) | Retries up to max attempts |
| Auth error (permanent) | Fails immediately, no retry |
| AI not configured | Returns stub response with `analyzed: false` |
| Malformed response | Logs error, returns safe fallback |

**Test Structure:**
- Use `MockScenarios` from `@reason-bridge/ai-client`
- Verify retry count with `vi.fn()` call tracking
- Spy on logger to verify error logging
- Assert fallback behavior produces valid (if degraded) results

## Dependencies

- **Existing:** Vitest, Zod, MockAIClient, MockScenarios
- **New:** None required

## Test Commands

```bash
# Run all ai-service tests
pnpm --filter @reason-bridge/ai-service test

# Update snapshots after intentional prompt changes
pnpm --filter @reason-bridge/ai-service test -u

# Run only contract tests
pnpm --filter @reason-bridge/ai-service test tests/contract

# Run only resilience tests
pnpm --filter @reason-bridge/ai-service test tests/integration
```

## Success Criteria

1. All 5 issues closed with passing tests
2. Mock fixtures cover success, empty, and error cases
3. Snapshot tests detect prompt changes in CI
4. Schema validation catches malformed responses
5. Resilience tests verify timeout/retry/fallback behavior
6. No changes to existing test patterns or conventions
