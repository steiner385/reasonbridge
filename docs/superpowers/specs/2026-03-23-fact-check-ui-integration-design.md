# Fact-Check UI Integration Design

**Date:** 2026-03-23
**Status:** Approved
**Scope:** Full P1 Story - "See Related Context for checkable claims"

## Overview

Integrate the existing fact-check infrastructure into the ResponseCard UI, enabling users to manually trigger fact-checking and see related context for claims in discussion responses.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Claim highlighting | Inline dotted underline | Discoverable without being intrusive; hover shows context badge |
| Button placement | Action bar | Groups with other response interactions (vote, reply) |
| Results display | Expandable panel below response | Reuses existing FactCheckResultDisplay component |
| Trigger behavior | Manual only | Predictable, cost-effective for v1 |
| State management | Context provider | Enables caching, cleaner component props, future extensibility |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DiscussionPage                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FactCheckProvider                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  state: Map<responseId, FactCheckState>         │  │  │
│  │  │  checkClaims(responseId, content)               │  │  │
│  │  │  getResults(responseId)                         │  │  │
│  │  │  getStatus(responseId)                          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                         │                              │  │
│  │         ┌───────────────┴───────────────┐              │  │
│  │         ▼                               ▼              │  │
│  │  ┌─────────────┐                 ┌─────────────┐       │  │
│  │  │ResponseCard │                 │ResponseCard │       │  │
│  │  │  useFactCheck(id)             │  useFactCheck(id)   │  │
│  │  └─────────────┘                 └─────────────┘       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- `FactCheckProvider` wraps the discussion page, holds state for all responses
- `useFactCheck(responseId)` hook provides access to state + actions
- State cached per-response: results persist during session
- Components remain presentational - logic lives in context

## Components

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/contexts/FactCheckContext.tsx` | Provider + `useFactCheck` hook |
| `frontend/src/components/fact-check/ClaimHighlighter.tsx` | Renders dotted underlines on claims |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/src/components/responses/ResponseCard.tsx` | Add FactCheckButton to action bar, ClaimHighlighter around content, FactCheckResultDisplay below |
| `frontend/src/pages/Topics/DiscussionPage.tsx` | Wrap with FactCheckProvider |
| `services/api-gateway/src/proxy/` | Add FactCheckProxyController |
| `services/api-gateway/src/proxy/proxy.module.ts` | Register new controller |
| `services/api-gateway/src/proxy/proxy.service.ts` | Add FACT_CHECK_SERVICE config |

### Component Hierarchy in ResponseCard

```tsx
<ResponseCard>
  <ResponseHeader />
  <ClaimHighlighter
    content={response.content}
    claims={results?.claims}
  />
  <ResponseActionBar>
    <VoteButtons />
    <ReplyButton />
    <FactCheckButton
      status={status}
      onCheck={() => checkClaims(response.id, response.content)}
    />
    <MoreActions />
  </ResponseActionBar>
  {status === 'success' && (
    <FactCheckResultDisplay results={results} />
  )}
</ResponseCard>
```

## Context API

### State Structure

```typescript
interface FactCheckState {
  status: 'idle' | 'loading' | 'success' | 'error' | 'no-results';
  results: FactCheckResult[] | null;
  error: string | null;
  checkedAt: number | null;
}

interface FactCheckContextValue {
  getState(responseId: string): FactCheckState;
  checkClaims(responseId: string, content: string): Promise<void>;
  clearResults(responseId: string): void;
  getHighlightedClaims(responseId: string): ClaimWithOffset[] | null;
}
```

### Hook API

```typescript
function useFactCheck(responseId: string) {
  const ctx = useContext(FactCheckContext);

  return {
    status: ctx.getState(responseId).status,
    results: ctx.getState(responseId).results,
    error: ctx.getState(responseId).error,
    claims: ctx.getHighlightedClaims(responseId),
    checkClaims: (content: string) => ctx.checkClaims(responseId, content),
    clear: () => ctx.clearResults(responseId),
  };
}
```

## ClaimHighlighter Component

### Props

```typescript
interface ClaimHighlighterProps {
  content: string;
  claims: ClaimWithOffset[] | null;
  onClaimClick?: (claim: ClaimWithOffset) => void;
}

interface ClaimWithOffset {
  text: string;
  startOffset: number;
  endOffset: number;
  hasContext: boolean;
}
```

### Rendering Logic

1. If `claims` is null/empty, render content as-is
2. Sort claims by `startOffset`
3. Split content into segments: `[text, claim, text, claim, text]`
4. Render claims with styling:

```tsx
<span
  className="border-b-2 border-dotted border-blue-500 cursor-pointer
             hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
  title="Related Context available"
>
  {claimText}
</span>
```

### Edge Cases

- Overlapping claims → merge into single highlight
- Claims at start/end of content → no extra whitespace
- HTML entities → preserve correctly
- Dark mode → appropriate hover color

## API Gateway Routing

### New Controller

`services/api-gateway/src/proxy/fact-check-proxy.controller.ts`

```typescript
@Controller('fact-check')
export class FactCheckProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('check')
  @UseGuards(AuthGuard)
  async checkClaims(@Req() req, @Res() res) {
    return this.proxyService.forward(req, res, 'FACT_CHECK_SERVICE');
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getResult(@Req() req, @Res() res) {
    return this.proxyService.forward(req, res, 'FACT_CHECK_SERVICE');
  }
}
```

### ProxyService Config

```typescript
this.factCheckService = {
  url: getServiceUrl('FACT_CHECK_SERVICE', 'http://localhost:3005'),
  timeout: 10000,
  retryAttempts: 2,
};
```

### Routes

| Method | Path | Backend |
|--------|------|---------|
| POST | `/api/fact-check/check` | `fact-check-service:3005/fact-check/check` |
| GET | `/api/fact-check/:id` | `fact-check-service:3005/fact-check/:id` |

## Error Handling

### Error States

| Error | User Sees | Recovery |
|-------|-----------|----------|
| Network failure | Toast: "Couldn't check claims. Try again." | Button shows "Retry" |
| 429 Rate limited | Toast: "Too many requests. Wait a moment." | Auto-retry after delay |
| 500 Server error | Toast: "Something went wrong." | Button shows "Retry" |
| No claims found | Badge: "No checkable claims" | Informational |
| No context found | Badge: "No context found" | Informational |

### Timeout Handling

- Frontend timeout: 15 seconds
- Show "Taking longer than expected..." after 8 seconds
- User can cancel and retry

### Toast Integration

- Uses existing `useToast()` hook
- Errors shown as `toast.error(message)`
- No success toast (results panel is sufficient)

## Testing

### Unit Tests (New)

| File | Coverage |
|------|----------|
| `FactCheckContext.test.tsx` | Provider state management, hook API, caching |
| `ClaimHighlighter.test.tsx` | Text splitting, highlight rendering, edge cases |

### Unit Tests (Update)

| File | Coverage |
|------|----------|
| `ResponseCard.test.tsx` | FactCheckButton in action bar, results panel on success |

### E2E Tests (Re-enable)

`frontend/e2e/fact-check-flow.spec.ts` - currently skipped:

| Test | Validates |
|------|-----------|
| Display fact-check button | Button visible in action bar |
| Loading state | Spinner during request |
| Display results | Panel expands with sources |
| Claim highlighting | Dotted underlines on claims |
| Conflict warning | Amber indicator for disagreement |
| Keyboard navigation | Tab/Enter accessibility |

### Integration Test

- API Gateway → fact-check-service routing
- Add to existing integration test suite

### Test Data

- Seeded topic `CONGESTION_PRICING` with fact-checkable claims
- Mock Google Fact Check API in E2E

## Dependencies

### Existing (reuse as-is)

- `frontend/src/components/fact-check/FactCheckButton.tsx`
- `frontend/src/components/fact-check/FactCheckBadge.tsx`
- `frontend/src/components/fact-check/FactCheckResultDisplay.tsx`
- `frontend/src/services/factCheckService.ts`
- `frontend/src/types/factCheck.ts`
- `services/fact-check-service/` (complete backend)

### Infrastructure

- Redis (caching) - already running
- Google Fact Check API - already configured in backend

## Out of Scope

- P2: Real-time claim feedback while composing
- P3-P5: Advanced features (history, batch checking)
- Auto-detection of claims (future enhancement)
- Claim highlighting click-to-scroll (future enhancement)

## Success Criteria

1. User can click "Find Context" button on any response
2. Loading state shows during API call
3. Claims in response text show dotted underlines after results return
4. Expandable panel displays sources with credibility scores
5. Conflicting sources show amber warning indicator
6. E2E tests pass (fact-check-flow.spec.ts)
7. Feature works in dark mode
8. Keyboard accessible (Tab to button, Enter to activate)
