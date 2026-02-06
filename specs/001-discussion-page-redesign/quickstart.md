# Quickstart Guide: Discussion Page Redesign

**Feature**: Discussion Page Redesign for Chat-Style UX
**Date**: 2026-02-05
**Purpose**: Get local development environment running for implementing and testing the three-panel discussion interface

---

## Prerequisites

Ensure you have the following installed:

- **Node.js**: 20 LTS (check with `node --version`)
- **pnpm**: 9.x (check with `pnpm --version`)
- **Docker**: For running backend services (optional, but recommended)
- **Git**: For version control

---

## Step 1: Clone and Setup Repository

```bash
# Navigate to project root
cd /path/to/reasonbridge3

# Ensure you're on the feature branch
git checkout 001-discussion-page-redesign

# Install dependencies (frozen lockfile enforced)
pnpm install --frozen-lockfile

# Build shared packages
pnpm build:packages
```

**Expected Output**:
```
✓ Packages built successfully
✓ Dependencies installed (3,245 packages)
```

---

## Step 2: Start Backend Services (Optional)

If you need live backend APIs for development:

```bash
# Start Docker Compose services (postgres, redis, localstack)
cd services
docker compose up -d

# Wait for services to be healthy (check with docker ps)

# Start backend microservices (in separate terminal)
pnpm dev:services
```

**Alternative**: Use existing development/staging backend:
```bash
# Configure .env in frontend/ to point to remote API
echo "VITE_API_BASE_URL=https://dev-api.reasonbridge.com" > frontend/.env.local
```

---

## Step 3: Start Frontend Development Server

```bash
# Navigate to frontend directory
cd frontend

# Start Vite dev server
pnpm dev
```

**Expected Output**:
```
VITE v5.x.x  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.x:5173/

Press h + Enter to show help
```

**Open Browser**: Navigate to `http://localhost:5173/`

---

## Step 4: Navigate to Discussion Page

Once the dev server is running:

1. **Login** (if auth required): Go to `/login` and use test credentials:
   - Username: `testuser`
   - Password: `testpass123`

2. **Go to Topics**: Navigate to `/topics`

3. **Select a Topic**: Click any topic in the list

4. **You should see**: The existing vertical layout (pre-redesign)

**Note**: The three-panel layout will be implemented as part of this feature. For now, you'll see the current single-column design.

---

## Step 5: Run Tests

### Unit Tests

```bash
# Run all unit tests with coverage
pnpm test:unit

# Run unit tests in watch mode (for development)
pnpm test:unit:watch

# Run tests for specific file
pnpm test:unit frontend/src/hooks/usePanelState.test.ts
```

**Expected Output**:
```
✓ src/hooks/usePanelState.test.ts (5 tests) 123ms
✓ src/components/discussion-layout/DiscussionLayout.test.tsx (8 tests) 456ms

Test Files  2 passed (2)
     Tests  13 passed (13)
```

### E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run E2E tests for discussion page
pnpm test:e2e frontend/e2e/discussion-page-redesign.spec.ts

# Run E2E tests in headed mode (see browser)
pnpm test:e2e --headed frontend/e2e/discussion-page-redesign.spec.ts

# Run E2E tests in debug mode (step through)
pnpm test:e2e --debug frontend/e2e/discussion-page-redesign.spec.ts
```

**Expected Output**:
```
Running 12 tests using 1 worker

✓ discussion-page-redesign.spec.ts:10:5 › should display three panels on desktop (2.3s)
✓ discussion-page-redesign.spec.ts:25:5 › should collapse left panel on tablet (1.8s)

12 passed (15.2s)
```

**Important**: NEVER use `--debug` or `--headed` flags in CI/automated workflows (see CLAUDE.md)

---

## Step 6: Component Development Workflow

### Hot Module Replacement (HMR)

Vite provides instant HMR for React components:

1. Edit a component (e.g., `frontend/src/components/discussion-layout/DiscussionLayout.tsx`)
2. Save the file
3. Browser auto-refreshes with changes (preserves React state)

**HMR Tips**:
- Changes to hooks/utilities may require full page refresh (press `r` in terminal)
- Changes to CSS/Tailwind classes are instant
- TypeScript errors shown in browser overlay

### Testing Changes

**Test-First Development** (per constitution):

1. Write failing test for new behavior
   ```typescript
   // usePanelState.test.ts
   it('should persist panel width to sessionStorage', () => {
     const { result } = renderHook(() => usePanelState());
     act(() => result.current.setPanelWidth('left', 400));
     expect(sessionStorage.getItem('discussion-panel-state')).toContain('"leftPanelWidth":400');
   });
   ```

2. Run test in watch mode: `pnpm test:unit:watch`

3. Implement feature until test passes

4. Refactor and verify tests still pass

### Linting and Formatting

```bash
# Check linting (Airbnb + TypeScript rules)
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Check formatting (Prettier)
pnpm format:check

# Auto-format code
pnpm format
```

**Pre-commit Hook**: These checks run automatically on `git commit` (DO NOT bypass with `--no-verify`)

---

## Step 7: Debugging Tools

### React DevTools

Install browser extension:
- Chrome: [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools)
- Firefox: [React DevTools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

**Usage**:
1. Open browser DevTools (F12)
2. Click "Components" tab
3. Inspect component props, state, hooks

### Vite DevTools

Built-in Vite features:

- **Error Overlay**: TypeScript/runtime errors shown directly in browser
- **HMR Status**: Console shows `[vite] hot updated` messages
- **Bundle Analysis**: Run `pnpm build --analyze` to see bundle size breakdown

### Redux DevTools (if using Redux for panel state)

**Note**: This feature uses Context API, not Redux. Skip this section.

---

## Step 8: Working with Mock Data

### Frontend Mocks (MSW)

Mock Service Worker intercepts API requests during development:

```typescript
// frontend/src/test/mocks/handlers.ts
export const handlers = [
  rest.get('/api/topics', (req, res, ctx) => {
    return res(ctx.json({ topics: mockTopics, total: 10 }));
  }),
  rest.get('/api/topics/:id/responses', (req, res, ctx) => {
    return res(ctx.json({ responses: mockResponses, total: 5 }));
  })
];
```

**Enable MSW in Development**:
```typescript
// frontend/src/main.tsx
if (import.meta.env.DEV) {
  const { worker } = await import('./test/mocks/browser');
  await worker.start();
}
```

**Customize Mocks**:
- Edit `frontend/src/test/mocks/data.ts` to add/modify mock topics, responses, etc.
- Restart dev server to load new mocks

### Backend Test Data

If using local backend, seed database with test data:

```bash
cd services/discussion-service
pnpm prisma:seed
```

**Seed Script**: Creates 20 topics, 100 responses, 50 propositions

---

## Step 9: Responsive Testing

### Browser DevTools (Preferred)

1. Open DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select device preset:
   - Desktop: Custom (1920x1080)
   - Tablet: iPad Pro (1024x1366)
   - Mobile: iPhone 14 Pro (393x852)

4. Test panel layout at each breakpoint:
   - Desktop (≥1280px): Three panels visible
   - Tablet (768-1279px): Left panel → hamburger, center + right panels
   - Mobile (<768px): Vertical stack

### Playwright Device Emulation

```typescript
// frontend/e2e/discussion-page-redesign.spec.ts
test('should stack panels vertically on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  await page.goto('/topics');

  // Assert mobile layout
  await expect(page.locator('.discussion-layout')).toHaveCSS('grid-template-columns', '1fr');
});
```

---

## Step 10: Performance Profiling

### React Profiler

```typescript
// Wrap components in Profiler for performance measurement
import { Profiler } from 'react';

<Profiler id="DiscussionLayout" onRender={onRenderCallback}>
  <DiscussionLayout />
</Profiler>

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}
```

### Chrome Performance Tab

1. Open DevTools → Performance tab
2. Click Record (red circle)
3. Interact with discussion page (switch topics, scroll, resize panels)
4. Stop recording
5. Analyze flame chart for slow operations

**Target Metrics** (from spec Success Criteria):
- Panel switch: <100ms
- Scroll frame rate: 60fps
- Initial load: <3 seconds

---

## Common Issues & Solutions

### Issue: `pnpm install` fails with lockfile error

**Solution**:
```bash
# Do NOT use --no-frozen-lockfile in CI/automation
# If local development requires new dependencies, update lockfile:
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update pnpm lockfile"
```

### Issue: Vite dev server won't start (port 5173 in use)

**Solution**:
```bash
# Find process using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>

# Or use a different port
pnpm dev --port 5174
```

### Issue: TypeScript errors about missing types

**Solution**:
```bash
# Ensure all packages are built
pnpm build:packages

# Restart TypeScript server in IDE (VSCode: Ctrl+Shift+P → "Restart TS Server")
```

### Issue: Pre-commit hooks fail

**Solution**:
```bash
# Read the error message carefully
# Fix the reported issue (e.g., linting error, console.log statement)
# Stage the fix
git add <file>

# Re-attempt commit (NEVER use --no-verify)
git commit -m "fix: address pre-commit hook issues"
```

### Issue: E2E tests timeout

**Solution**:
```bash
# Increase timeout in playwright.config.ts
timeout: 60000, // 60 seconds (default: 30s)

# Or for specific test
test('long test', async ({ page }) => {
  test.setTimeout(90000); // 90 seconds
  // ...
});
```

---

## Useful Commands Reference

### Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend dev server (http://localhost:5173) |
| `pnpm build` | Build production frontend bundle |
| `pnpm preview` | Preview production build locally |
| `pnpm dev:services` | Start backend microservices (requires Docker) |

### Testing

| Command | Description |
|---------|-------------|
| `pnpm test:unit` | Run all unit tests with coverage |
| `pnpm test:unit:watch` | Run unit tests in watch mode |
| `pnpm test:e2e` | Run E2E tests (headless) |
| `pnpm test:e2e:headed` | Run E2E tests in browser (visual) |

### Code Quality

| Command | Description |
|---------|-------------|
| `pnpm lint` | Check ESLint errors/warnings |
| `pnpm lint:fix` | Auto-fix ESLint issues |
| `pnpm format` | Auto-format with Prettier |
| `pnpm typecheck` | Run TypeScript compiler check |

### Git

| Command | Description |
|---------|-------------|
| `git status` | Check current branch and changes |
| `git add <file>` | Stage file for commit |
| `git commit -m "message"` | Commit with message (runs pre-commit hooks) |
| `git push origin 001-discussion-page-redesign` | Push to remote feature branch |

---

## Next Steps

After setting up your environment:

1. **Read the Plan**: Review `specs/001-discussion-page-redesign/plan.md` for technical architecture
2. **Review Data Model**: Study `specs/001-discussion-page-redesign/data-model.md` for entities and state
3. **Check Tasks**: Once generated, review `specs/001-discussion-page-redesign/tasks.md` for implementation order
4. **Start Implementing**: Begin with highest-priority tasks (likely panel layout components)

---

## Getting Help

- **Documentation**: See `/docs` directory in project root
- **CI Setup**: See `.github/CI_SETUP.md` for Jenkins pipeline details
- **Architecture Docs**: See `CLAUDE.md` for project overview
- **Constitution**: See `.specify/memory/constitution.md` for coding standards

---

**Quickstart Complete**: You should now have a working development environment ready for implementing the discussion page redesign!
