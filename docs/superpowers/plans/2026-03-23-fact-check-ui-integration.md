# Fact-Check UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate fact-check components into ResponseCard with context-based state management and inline claim highlighting.

**Architecture:** FactCheckProvider context wraps DiscussionPage, providing state + actions via useFactCheck hook. ResponseCard consumes the hook to render FactCheckButton in action bar, ClaimHighlighter around content, and FactCheckResultDisplay below.

**Tech Stack:** React 18, TypeScript 5, NestJS (API Gateway), Tailwind CSS, Vitest, Playwright

---

## File Structure

### New Files

| File | Responsibility |
|------|----------------|
| `frontend/src/contexts/FactCheckContext.tsx` | Context provider + useFactCheck hook |
| `frontend/src/contexts/__tests__/FactCheckContext.test.tsx` | Unit tests for context |
| `frontend/src/components/fact-check/ClaimHighlighter.tsx` | Renders dotted underlines on claims |
| `frontend/src/components/fact-check/__tests__/ClaimHighlighter.test.tsx` | Unit tests for highlighter |
| `services/api-gateway/src/proxy/fact-check-proxy.controller.ts` | Routes /fact-check/* to backend |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/src/components/responses/ResponseCard.tsx` | Add fact-check integration |
| `frontend/src/pages/Topics/DiscussionPage.tsx` | Wrap with FactCheckProvider |
| `services/api-gateway/src/proxy/proxy.module.ts` | Register FactCheckProxyController |
| `services/api-gateway/src/proxy/proxy.service.ts` | Add factCheckService config |
| `frontend/e2e/fact-check-flow.spec.ts` | Re-enable skipped tests |

---

## Task 1: FactCheckContext Provider

**Files:**
- Create: `frontend/src/contexts/FactCheckContext.tsx`
- Create: `frontend/src/contexts/__tests__/FactCheckContext.test.tsx`

### Step 1.1: Write failing test for context existence

- [ ] **Create test file with initial test**

```typescript
// frontend/src/contexts/__tests__/FactCheckContext.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { FactCheckProvider, useFactCheck } from '../FactCheckContext';

describe('FactCheckContext', () => {
  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useFactCheck('test-id'));
    }).toThrow('useFactCheck must be used within a FactCheckProvider');
  });
});
```

- [ ] **Run test to verify it fails**

Run: `cd frontend && pnpm vitest run src/contexts/__tests__/FactCheckContext.test.tsx`
Expected: FAIL - module not found

### Step 1.2: Create minimal context structure

- [ ] **Create context file with basic structure**

```typescript
// frontend/src/contexts/FactCheckContext.tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import type { FactCheckResult, FactCheckStatus, Claim } from '../types/factCheck';
import { factCheckService } from '../services/factCheckService';

interface FactCheckState {
  status: FactCheckStatus;
  results: FactCheckResult[] | null;
  error: string | null;
  checkedAt: number | null;
}

interface FactCheckContextValue {
  getState: (responseId: string) => FactCheckState;
  checkClaims: (responseId: string, content: string) => Promise<void>;
  clearResults: (responseId: string) => void;
  getHighlightedClaims: (responseId: string) => Claim[] | null;
}

const defaultState: FactCheckState = {
  status: 'idle',
  results: null,
  error: null,
  checkedAt: null,
};

const FactCheckContext = createContext<FactCheckContextValue | null>(null);

export function FactCheckProvider({ children }: { children: React.ReactNode }) {
  const [stateMap, setStateMap] = useState<Map<string, FactCheckState>>(new Map());

  const getState = useCallback(
    (responseId: string): FactCheckState => {
      return stateMap.get(responseId) || defaultState;
    },
    [stateMap]
  );

  const updateState = useCallback((responseId: string, updates: Partial<FactCheckState>) => {
    setStateMap((prev) => {
      const newMap = new Map(prev);
      const current = prev.get(responseId) || defaultState;
      newMap.set(responseId, { ...current, ...updates });
      return newMap;
    });
  }, []);

  const checkClaims = useCallback(
    async (responseId: string, content: string) => {
      updateState(responseId, { status: 'loading', error: null });

      try {
        const claims = factCheckService.extractClaims(content);

        if (claims.length === 0) {
          updateState(responseId, {
            status: 'no-results',
            results: [],
            checkedAt: Date.now(),
          });
          return;
        }

        const response = await factCheckService.checkClaims(responseId, claims);

        updateState(responseId, {
          status: response.results.length > 0 ? 'success' : 'no-results',
          results: response.results,
          checkedAt: Date.now(),
        });
      } catch (err) {
        updateState(responseId, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to check claims',
        });
      }
    },
    [updateState]
  );

  const clearResults = useCallback(
    (responseId: string) => {
      setStateMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(responseId);
        return newMap;
      });
    },
    []
  );

  const getHighlightedClaims = useCallback(
    (responseId: string): Claim[] | null => {
      const state = stateMap.get(responseId);
      if (!state?.results || state.results.length === 0) return null;

      return state.results
        .filter((r) => r.claimStartOffset !== undefined && r.claimEndOffset !== undefined)
        .map((r) => ({
          text: r.claimText,
          startOffset: r.claimStartOffset!,
          endOffset: r.claimEndOffset!,
        }));
    },
    [stateMap]
  );

  const value = useMemo(
    () => ({ getState, checkClaims, clearResults, getHighlightedClaims }),
    [getState, checkClaims, clearResults, getHighlightedClaims]
  );

  return <FactCheckContext.Provider value={value}>{children}</FactCheckContext.Provider>;
}

export function useFactCheck(responseId: string) {
  const context = useContext(FactCheckContext);
  if (!context) {
    throw new Error('useFactCheck must be used within a FactCheckProvider');
  }

  const state = context.getState(responseId);
  const claims = context.getHighlightedClaims(responseId);

  return {
    status: state.status,
    results: state.results,
    error: state.error,
    claims,
    checkClaims: (content: string) => context.checkClaims(responseId, content),
    clear: () => context.clearResults(responseId),
  };
}
```

- [ ] **Run test to verify it passes**

Run: `cd frontend && pnpm vitest run src/contexts/__tests__/FactCheckContext.test.tsx`
Expected: PASS

### Step 1.3: Add test for hook returning correct state

- [ ] **Add test for initial state**

```typescript
// Add to FactCheckContext.test.tsx
it('should return idle state for unknown responseId', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FactCheckProvider>{children}</FactCheckProvider>
  );

  const { result } = renderHook(() => useFactCheck('unknown-id'), { wrapper });

  expect(result.current.status).toBe('idle');
  expect(result.current.results).toBeNull();
  expect(result.current.error).toBeNull();
  expect(result.current.claims).toBeNull();
});
```

- [ ] **Run test to verify it passes**

Run: `cd frontend && pnpm vitest run src/contexts/__tests__/FactCheckContext.test.tsx`
Expected: PASS

### Step 1.4: Add test for checkClaims flow

- [ ] **Add test for loading and success states**

```typescript
// Add to FactCheckContext.test.tsx
import { vi, beforeEach, afterEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { factCheckService } from '../../services/factCheckService';

vi.mock('../../services/factCheckService', () => ({
  factCheckService: {
    extractClaims: vi.fn(),
    checkClaims: vi.fn(),
  },
}));

describe('checkClaims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update status through loading to success', async () => {
    const mockClaims = [{ text: 'Test claim', startOffset: 0, endOffset: 10 }];
    const mockResults = [{
      id: '1',
      claimText: 'Test claim',
      claimStartOffset: 0,
      claimEndOffset: 10,
      displayedAs: 'Related Context',
      sources: [{ provider: 'Test', url: 'https://test.com', title: 'Test', credibilityScore: 0.8, retrievedAt: new Date().toISOString() }],
      hasConflictingSources: false,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }];

    vi.mocked(factCheckService.extractClaims).mockReturnValue(mockClaims);
    vi.mocked(factCheckService.checkClaims).mockResolvedValue({
      results: mockResults,
      processingTimeMs: 100,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FactCheckProvider>{children}</FactCheckProvider>
    );

    const { result } = renderHook(() => useFactCheck('test-response'), { wrapper });

    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.checkClaims('Some content with claims.');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.claims).toHaveLength(1);
  });
});
```

- [ ] **Run test to verify it passes**

Run: `cd frontend && pnpm vitest run src/contexts/__tests__/FactCheckContext.test.tsx`
Expected: PASS

### Step 1.5: Commit Task 1

- [ ] **Commit the context implementation**

```bash
git add frontend/src/contexts/FactCheckContext.tsx frontend/src/contexts/__tests__/FactCheckContext.test.tsx
git commit -m "feat(fact-check): add FactCheckContext provider and useFactCheck hook

- Context manages per-response fact-check state
- Hook provides status, results, claims, and actions
- Includes unit tests for state management

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: ClaimHighlighter Component

**Files:**
- Create: `frontend/src/components/fact-check/ClaimHighlighter.tsx`
- Create: `frontend/src/components/fact-check/__tests__/ClaimHighlighter.test.tsx`

### Step 2.1: Write failing test for ClaimHighlighter

- [ ] **Create test file**

```typescript
// frontend/src/components/fact-check/__tests__/ClaimHighlighter.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClaimHighlighter from '../ClaimHighlighter';

describe('ClaimHighlighter', () => {
  it('should render content without highlights when claims is null', () => {
    render(<ClaimHighlighter content="Some plain text content." claims={null} />);

    expect(screen.getByText('Some plain text content.')).toBeInTheDocument();
  });
});
```

- [ ] **Run test to verify it fails**

Run: `cd frontend && pnpm vitest run src/components/fact-check/__tests__/ClaimHighlighter.test.tsx`
Expected: FAIL - module not found

### Step 2.2: Create minimal ClaimHighlighter

- [ ] **Create component file**

```typescript
// frontend/src/components/fact-check/ClaimHighlighter.tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import type { Claim } from '../../types/factCheck';

export interface ClaimHighlighterProps {
  /** Response content to render */
  content: string;
  /** Claims to highlight (null = no highlights) */
  claims: Claim[] | null;
  /** Callback when a claim is clicked */
  onClaimClick?: (claim: Claim) => void;
}

/**
 * Renders response content with highlighted claims
 *
 * Claims are shown with dotted underlines to indicate
 * related context is available. Hover shows tooltip.
 */
const ClaimHighlighter: React.FC<ClaimHighlighterProps> = ({
  content,
  claims,
  onClaimClick,
}) => {
  const segments = useMemo(() => {
    if (!claims || claims.length === 0) {
      return [{ type: 'text' as const, content }];
    }

    // Sort claims by start offset
    const sortedClaims = [...claims].sort((a, b) => a.startOffset - b.startOffset);

    // Merge overlapping claims
    const mergedClaims: Claim[] = [];
    for (const claim of sortedClaims) {
      const last = mergedClaims[mergedClaims.length - 1];
      if (last && claim.startOffset <= last.endOffset) {
        // Overlapping - extend the previous claim
        last.endOffset = Math.max(last.endOffset, claim.endOffset);
        last.text = content.substring(last.startOffset, last.endOffset);
      } else {
        mergedClaims.push({ ...claim });
      }
    }

    // Build segments
    const result: Array<{ type: 'text' | 'claim'; content: string; claim?: Claim }> = [];
    let lastEnd = 0;

    for (const claim of mergedClaims) {
      // Text before this claim
      if (claim.startOffset > lastEnd) {
        result.push({
          type: 'text',
          content: content.substring(lastEnd, claim.startOffset),
        });
      }

      // The claim itself
      result.push({
        type: 'claim',
        content: content.substring(claim.startOffset, claim.endOffset),
        claim,
      });

      lastEnd = claim.endOffset;
    }

    // Text after last claim
    if (lastEnd < content.length) {
      result.push({
        type: 'text',
        content: content.substring(lastEnd),
      });
    }

    return result;
  }, [content, claims]);

  return (
    <span data-testid="claim-highlighter">
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        }

        return (
          <span
            key={index}
            className="border-b-2 border-dotted border-blue-500 cursor-pointer
                       hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Related Context available"
            onClick={() => segment.claim && onClaimClick?.(segment.claim)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                segment.claim && onClaimClick?.(segment.claim);
              }
            }}
            data-testid="highlighted-claim"
          >
            {segment.content}
          </span>
        );
      })}
    </span>
  );
};

export default ClaimHighlighter;
```

- [ ] **Run test to verify it passes**

Run: `cd frontend && pnpm vitest run src/components/fact-check/__tests__/ClaimHighlighter.test.tsx`
Expected: PASS

### Step 2.3: Add test for highlighting claims

- [ ] **Add test for claim highlighting**

```typescript
// Add to ClaimHighlighter.test.tsx
it('should highlight claims with dotted underline', () => {
  const claims = [
    { text: 'factual claim', startOffset: 5, endOffset: 18 },
  ];

  render(<ClaimHighlighter content="Some factual claim here." claims={claims} />);

  const highlightedClaim = screen.getByTestId('highlighted-claim');
  expect(highlightedClaim).toHaveTextContent('factual claim');
  expect(highlightedClaim).toHaveClass('border-dotted', 'border-blue-500');
});

it('should merge overlapping claims', () => {
  const claims = [
    { text: 'overlapping', startOffset: 0, endOffset: 11 },
    { text: 'claims', startOffset: 8, endOffset: 17 },
  ];

  render(<ClaimHighlighter content="overlapping claims text" claims={claims} />);

  const highlighted = screen.getAllByTestId('highlighted-claim');
  // Should merge into single highlight
  expect(highlighted).toHaveLength(1);
  expect(highlighted[0]).toHaveTextContent('overlapping claim');
});
```

- [ ] **Run tests to verify they pass**

Run: `cd frontend && pnpm vitest run src/components/fact-check/__tests__/ClaimHighlighter.test.tsx`
Expected: PASS

### Step 2.4: Add index export

- [ ] **Update fact-check index to export ClaimHighlighter**

```typescript
// frontend/src/components/fact-check/index.ts
// Add this line:
export { default as ClaimHighlighter } from './ClaimHighlighter';
```

- [ ] **Run all fact-check component tests**

Run: `cd frontend && pnpm vitest run src/components/fact-check/`
Expected: PASS

### Step 2.5: Commit Task 2

- [ ] **Commit the ClaimHighlighter**

```bash
git add frontend/src/components/fact-check/ClaimHighlighter.tsx frontend/src/components/fact-check/__tests__/ClaimHighlighter.test.tsx frontend/src/components/fact-check/index.ts
git commit -m "feat(fact-check): add ClaimHighlighter component

- Renders dotted underlines on claims with related context
- Merges overlapping claims into single highlight
- Keyboard accessible (Enter/Space to click)
- Dark mode support

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: API Gateway Routing

**Files:**
- Create: `services/api-gateway/src/proxy/fact-check-proxy.controller.ts`
- Modify: `services/api-gateway/src/proxy/proxy.module.ts`
- Modify: `services/api-gateway/src/proxy/proxy.service.ts`

### Step 3.1: Add factCheckService config to ProxyService

- [ ] **Add service config to proxy.service.ts**

In `services/api-gateway/src/proxy/proxy.service.ts`, add after line 71 (after notificationService declaration):

```typescript
private readonly factCheckService: ServiceConfig;
```

In the constructor, add after line 135 (after notificationService initialization):

```typescript
this.factCheckService = {
  url: getConfig<string>('FACT_CHECK_SERVICE_URL', getServiceUrl('FACT_CHECK_SERVICE')),
  // Fact-checking can be slow due to external API calls
  timeout: getConfig<number>('FACT_CHECK_SERVICE_TIMEOUT', 15000),
  retryAttempts: getConfig<number>('FACT_CHECK_SERVICE_RETRY_ATTEMPTS', 2),
};
```

Add after line 163 (after proxyToNotificationService method):

```typescript
async proxyToFactCheckService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
  return this.proxyWithResilience<T>('fact-check-service', this.factCheckService, request);
}
```

- [ ] **Verify TypeScript compiles**

Run: `cd services/api-gateway && pnpm tsc --noEmit`
Expected: No errors

### Step 3.2: Create FactCheckProxyController

- [ ] **Create controller file**

```typescript
// services/api-gateway/src/proxy/fact-check-proxy.controller.ts
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, All, Req, Res, Headers, Inject } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProxyService } from './proxy.service.js';

/**
 * Fact-Check Service Proxy Controller
 * Proxies all /fact-check/* requests to the fact-check service
 */
@Controller('fact-check')
export class FactCheckProxyController {
  constructor(@Inject(ProxyService) private readonly proxyService: ProxyService) {}

  /**
   * Proxy all fact-check service requests
   * Handles: POST /fact-check/check, GET /fact-check/:id
   */
  @All('*')
  async proxyToFactCheck(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Headers('authorization') authHeader?: string,
  ) {
    // Extract path after /fact-check
    const path = req.url.replace(/^\/fact-check/, '') || '/';
    const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    const response = await this.proxyService.proxyToFactCheckService({
      method,
      path,
      body: req.body,
      query: req.query as Record<string, string>,
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    res.status(response.status).send(response.data);
  }
}
```

- [ ] **Verify TypeScript compiles**

Run: `cd services/api-gateway && pnpm tsc --noEmit`
Expected: No errors

### Step 3.3: Register controller in ProxyModule

- [ ] **Update proxy.module.ts**

Add import at top (after line 23):

```typescript
import { FactCheckProxyController } from './fact-check-proxy.controller.js';
```

Add to controllers array (after line 48):

```typescript
FactCheckProxyController,
```

- [ ] **Verify build**

Run: `cd services/api-gateway && pnpm build`
Expected: Build successful

### Step 3.4: Commit Task 3

- [ ] **Commit API Gateway changes**

```bash
git add services/api-gateway/src/proxy/fact-check-proxy.controller.ts services/api-gateway/src/proxy/proxy.module.ts services/api-gateway/src/proxy/proxy.service.ts
git commit -m "feat(api-gateway): add fact-check service routing

- Add FactCheckProxyController for /fact-check/* routes
- Configure 15s timeout for external API calls
- Register in ProxyModule

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: ResponseCard Integration

**Files:**
- Modify: `frontend/src/components/responses/ResponseCard.tsx`
- Modify: `frontend/src/pages/Topics/DiscussionPage.tsx`

### Step 4.1: Check DiscussionPage structure

- [ ] **Read DiscussionPage to understand where to add provider**

Run: `head -100 frontend/src/pages/Topics/DiscussionPage.tsx`

Note: Wrap the main content with FactCheckProvider.

### Step 4.2: Add FactCheckProvider to DiscussionPage

- [ ] **Import and wrap with provider**

Add import:
```typescript
import { FactCheckProvider } from '../../contexts/FactCheckContext';
```

Wrap the main return with `<FactCheckProvider>...</FactCheckProvider>`.

- [ ] **Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: No errors

### Step 4.3: Add fact-check integration to ResponseCard

- [ ] **Update ResponseCard imports**

Add at top of ResponseCard.tsx:

```typescript
import { useFactCheck } from '../../contexts/FactCheckContext';
import FactCheckButton from '../fact-check/FactCheckButton';
import FactCheckResultDisplay from '../fact-check/FactCheckResultDisplay';
import ClaimHighlighter from '../fact-check/ClaimHighlighter';
import { useToast } from '../../contexts/ToastContext';
```

- [ ] **Add hook and state to component**

Inside the component function, add:

```typescript
const toast = useToast();

// Fact-check integration - only when inside FactCheckProvider
let factCheckState: ReturnType<typeof useFactCheck> | null = null;
try {
  factCheckState = useFactCheck(response.id);
} catch {
  // Not inside FactCheckProvider - fact-check disabled
}

const handleFactCheckError = useCallback(() => {
  if (factCheckState?.error) {
    toast.error(factCheckState.error);
  }
}, [factCheckState?.error, toast]);

useEffect(() => {
  handleFactCheckError();
}, [handleFactCheckError]);
```

- [ ] **Replace MarkdownRenderer with ClaimHighlighter when results exist**

Replace the `<MarkdownRenderer content={displayContent} className="prose-sm" />` with:

```typescript
{factCheckState?.claims ? (
  <ClaimHighlighter
    content={displayContent}
    claims={factCheckState.claims}
  />
) : (
  <MarkdownRenderer content={displayContent} className="prose-sm" />
)}
```

- [ ] **Add FactCheckButton to actions area**

After the CardBody, before the existing CardFooter sections, add:

```typescript
{/* Fact-check action bar */}
{factCheckState && (
  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
    <FactCheckButton
      responseId={response.id}
      content={response.content}
      compact
      onResults={(results) => {
        // Results are handled by context, but we can show toast
        if (results.length > 0) {
          const hasConflicts = results.some(r => r.hasConflictingSources);
          if (hasConflicts) {
            toast.warning('Some sources have conflicting information');
          }
        }
      }}
      onStatusChange={(status) => {
        if (status === 'no-results') {
          toast.info('No related context found for this response');
        }
      }}
    />
    {factCheckState.status === 'success' && factCheckState.results && (
      <span className="text-xs text-gray-500">
        {factCheckState.results.length} claim{factCheckState.results.length !== 1 ? 's' : ''} checked
      </span>
    )}
  </div>
)}

{/* Fact-check results */}
{factCheckState?.status === 'success' && factCheckState.results && factCheckState.results.length > 0 && (
  <div className="px-4 pb-4">
    <FactCheckResultDisplay
      results={factCheckState.results}
      compact
    />
  </div>
)}
```

- [ ] **Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: No errors

### Step 4.4: Run existing ResponseCard tests

- [ ] **Verify existing tests still pass**

Run: `cd frontend && pnpm vitest run src/components/responses/__tests__/ResponseCard.test.tsx`
Expected: PASS (or skip if no tests exist)

### Step 4.5: Commit Task 4

- [ ] **Commit ResponseCard integration**

```bash
git add frontend/src/components/responses/ResponseCard.tsx frontend/src/pages/Topics/DiscussionPage.tsx
git commit -m "feat(fact-check): integrate into ResponseCard

- Add FactCheckProvider to DiscussionPage
- Add Find Context button to response action bar
- Show ClaimHighlighter with dotted underlines when results exist
- Display expandable results panel below response
- Toast notifications for errors and conflicts

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Enable E2E Tests

**Files:**
- Modify: `frontend/e2e/fact-check-flow.spec.ts`

### Step 5.1: Remove skip from test suite

- [ ] **Update test file to remove skip**

Change `test.describe.skip('Fact-Check Feature'` to `test.describe('Fact-Check Feature'`.

Update the skip reason comment to note the feature is now integrated.

- [ ] **Run E2E tests locally**

Run: `cd frontend && pnpm playwright test e2e/fact-check-flow.spec.ts --headed`
Expected: Tests should run (may need seeded data adjustments)

### Step 5.2: Fix any failing tests

- [ ] **Adjust selectors if needed**

Update any selectors that don't match the actual implementation.

### Step 5.3: Commit Task 5

- [ ] **Commit E2E test enablement**

```bash
git add frontend/e2e/fact-check-flow.spec.ts
git commit -m "test(e2e): enable fact-check flow tests

- Remove skip from fact-check test suite
- Feature is now integrated into ResponseCard

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Final Verification

### Step 6.1: Run all unit tests

- [ ] **Run frontend unit tests**

Run: `cd frontend && pnpm test:unit`
Expected: All tests pass

### Step 6.2: Run TypeScript check

- [ ] **Run type check across frontend**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: No errors

### Step 6.3: Run lint

- [ ] **Run linter**

Run: `cd frontend && pnpm lint`
Expected: No errors

### Step 6.4: Build check

- [ ] **Verify production build**

Run: `cd frontend && pnpm build`
Expected: Build successful

### Step 6.5: Final commit with all changes verified

- [ ] **Create final verification commit if any fixes were needed**

```bash
git status
# If any uncommitted changes:
git add -A
git commit -m "fix: address review feedback from fact-check integration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | FactCheckContext | 2 | 0 |
| 2 | ClaimHighlighter | 2 | 1 |
| 3 | API Gateway | 1 | 2 |
| 4 | ResponseCard Integration | 0 | 2 |
| 5 | E2E Tests | 0 | 1 |
| 6 | Verification | 0 | 0 |

**Total: 5 new files, 6 modified files, ~6 commits**
