# E2E Test Failures Investigation Plan

## Problem Statement

Main branch build #526 has 124 E2E test failures after recent dependency updates:

- `deps: bump lucide-react from 0.577.0 to 1.7.0` (#1202) - **MAJOR VERSION BUMP**
- `deps: bump the minor-and-patch group with 22 updates` (#1200)

### Primary Failure Pattern

The "Start Discussion" button is not found on `/topics/:topicId/discussions` route:

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('button', { name: /start discussion/i })
Expected: visible
Error: element(s) not found
```

### Affected Test Files (118 tests)

- `discussion-creation.spec.ts` - 13 failures (all tests depend on Start Discussion button)
- `discussion-page-redesign.spec.ts` - 12 failures
- `edit-topic.spec.ts` - 6 failures
- `fact-check-flow.spec.ts` - 9 failures
- `accessibility-dark-mode.spec.ts` - 4 failures
- `accessibility.spec.ts` - 1 failure
- Various other tests cascading from route/rendering issues

## Investigation Steps

### Phase 1: Verify Route Rendering Locally

**Goal**: Confirm whether the issue is environmental (CI) or a code regression

1. **Manual verification**

   ```bash
   cd /mnt/ssk-ssd/tony/GitHub/reasonbridge
   pnpm dev  # Start frontend dev server
   ```

   - Navigate to `http://localhost:5173/topics/11111111-0000-4000-8000-000000000101/discussions`
   - Check if "Start Discussion" button renders
   - Check browser console for errors

2. **Run affected E2E test locally**
   ```bash
   cd frontend
   npx playwright test e2e/discussion-creation.spec.ts --headed
   ```

### Phase 2: Bisect the Dependency Changes

**Goal**: Identify which dependency update caused the regression

1. **Test with lucide-react rollback**

   ```bash
   # Create test branch
   git checkout -b test/lucide-rollback

   # Rollback lucide-react to previous version
   cd frontend
   pnpm add lucide-react@0.577.0

   # Run E2E tests
   npx playwright test e2e/discussion-creation.spec.ts
   ```

2. **If lucide-react is the culprit**:
   - Check lucide-react v1.x changelog for breaking changes
   - Search for removed/renamed icons used in the app
   - Update imports if icon names changed

3. **If lucide-react is NOT the culprit**:
   - Check the 22 minor/patch updates in #1200
   - Focus on React-related packages (react-router-dom, @tanstack/react-query, etc.)

### Phase 3: Check for Icon/Component Changes

**Goal**: Identify if any UI components stopped rendering

1. **Check Button component for icon usage**

   ```bash
   grep -r "lucide-react" frontend/src/components/ui/Button.tsx
   grep -r "lucide-react" frontend/src/pages/Discussions/
   ```

2. **Check if lazy loading is failing**
   - `DiscussionListPage` is wrapped in `<LazyRoute>`
   - Suspense boundary might be catching errors silently

3. **Add error boundary debugging**
   - Temporarily add error logging to `LazyRoute` component
   - Check if component is throwing during render

### Phase 4: Check API/Backend Connectivity

**Goal**: Rule out backend issues affecting page rendering

1. **Verify seeded topic exists**

   ```sql
   SELECT id, title, status FROM discussion_topics
   WHERE id = '11111111-0000-4000-8000-000000000101';
   ```

2. **Check API response**

   ```bash
   curl http://localhost:3001/api/discussions?topicId=11111111-0000-4000-8000-000000000101
   ```

3. **Check for conditional rendering**
   - Does the button only show for authenticated users?
   - Does it require specific topic states?

## Resolution Strategies

### If lucide-react v1.x is the cause:

**Option A: Pin to v0.x (quick fix)**

```bash
pnpm add lucide-react@0.577.0 --save-exact
```

**Option B: Update icon imports (proper fix)**

- Identify changed icon names in v1.x
- Update all imports to new names
- Example: `import { SomeIcon } from 'lucide-react'` may need renaming

### If route/lazy loading is the cause:

- Check React Router v7 compatibility (if upgraded)
- Verify Suspense fallback is not blocking indefinitely
- Add error boundary with fallback UI

### If API connectivity is the cause:

- Check E2E environment Docker compose
- Verify db-seed ran successfully
- Check discussion-service health in CI

## Verification

After fix, run full E2E suite:

```bash
cd frontend
npx playwright test --reporter=list
```

Expected: All 124 previously failing tests should pass.

## Files to Investigate

1. `frontend/src/pages/Discussions/DiscussionListPage.tsx` - Button component
2. `frontend/src/routes/index.tsx` - Route definition
3. `frontend/src/components/ui/Button.tsx` - Base button component
4. `frontend/package.json` - Dependency versions
5. `docker-compose.e2e.yml` - E2E environment configuration

## Timeline Estimate

- Phase 1: 15 minutes (manual verification)
- Phase 2: 30 minutes (dependency bisection)
- Phase 3: 20 minutes (component analysis)
- Phase 4: 15 minutes (backend checks)
- Resolution: 30-60 minutes depending on root cause
