# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

reasonBridge is a **Rational Discussion Platform** built with modern web technologies. The application provides tools for structured debates, claim validation, bias detection, and common ground discovery.

**Stack**: React 18 + TypeScript 5 + Vite (frontend), Node.js 20 LTS (runtime), pnpm (package manager)

**Purpose**: Enable constructive discourse through AI-powered analysis, structured argumentation, and evidence-based discussions.

## Core Principles

### The Boy Scout Rule: Always Leave the Codebase Better

**CRITICAL**: When working on any task, you MUST fix any failures, issues, TODOs, or problems you encounter, **regardless of whether you caused them**.

**Philosophy**:

- If you find a failing test → fix it
- If you encounter a build error → fix it
- If you discover a bug → fix it
- If you see a TODO that's blocking progress → address it
- If E2E tests fail for "unrelated reasons" → those reasons are now related

**This is non-negotiable**. Do not:

- ❌ Say "this is a pre-existing issue"
- ❌ Say "this is unrelated to our changes"
- ❌ Say "this was already broken"
- ❌ Leave problems for later

**Instead**:

- ✅ Fix the problem you found
- ✅ Ensure the system works end-to-end
- ✅ Leave the codebase in a better state than you found it

**Example**: If you're fixing TypeScript errors and discover E2E tests failing due to a missing module export, you fix BOTH the TypeScript errors AND the module export issue. The task isn't complete until the full pipeline passes.

## Architecture

### Frontend Structure

The application uses a component-based architecture with React 18:

```
src/
├── components/          # Reusable React components
│   ├── alignments/      # Moral Foundation Theory alignment displays
│   ├── auth/            # Authentication (Login, Register, PasswordReset)
│   ├── common-ground/   # Common ground detection and visualization
│   ├── feedback/        # AI feedback display and analysis
│   ├── moderation/      # Content moderation and appeals
│   ├── notifications/   # Real-time notification system
│   ├── profile/         # User profile management
│   ├── propositions/    # Argument propositions and structure
│   ├── responses/       # Response threading and management
│   ├── search/          # Search UI and filters
│   ├── topics/          # Discussion topic management
│   ├── ui/              # Base UI primitives (Button, Modal, etc.)
│   ├── users/           # User lists and displays
│   └── verification/    # Phone/email verification flows
├── contexts/            # React Context providers (Auth, Theme, etc.)
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and API client
├── pages/               # Top-level route pages
│   ├── Admin/           # Admin dashboard
│   ├── Appeal/          # Moderation appeals
│   ├── Auth/            # Auth flows
│   ├── Profile/         # User profiles
│   ├── Settings/        # User settings
│   ├── Topics/          # Topic pages
│   └── Verification/    # Verification flows
├── routes/              # React Router configuration
├── test/                # Test utilities and mocks
└── types/               # TypeScript type definitions
```

### Backend Architecture (Microservices)

The backend follows a microservices architecture using NestJS:

```
services/
├── api-gateway/         # Central API gateway, routing, auth middleware
├── user-service/        # User management, authentication, profiles
├── discussion-service/  # Topics, propositions, responses, threading
├── ai-service/          # AI-powered analysis (bias detection, common ground)
├── moderation-service/  # Content moderation, appeals, reporting
├── notification-service/# Real-time notifications, email, push
├── fact-check-service/  # Claim verification, source validation
└── recommendation-service/ # Content recommendations, discovery
```

**Service Communication:**

- Synchronous: HTTP/REST between services via API Gateway
- Asynchronous: Event-driven via Redis pub/sub and AWS SQS/SNS (LocalStack in dev)

**Infrastructure Services:**

- **PostgreSQL 15**: Primary database (Prisma ORM)
- **Redis 7**: Caching, sessions, pub/sub
- **LocalStack**: AWS services emulation (S3, SQS, SNS)

### Shared Packages (Monorepo)

```
packages/
├── common/              # Shared utilities, constants, types
├── db-models/           # Prisma schema and database models
├── event-schemas/       # Event type definitions for service communication
├── ai-client/           # AI provider abstraction (OpenAI, Anthropic)
├── shared/              # Cross-cutting concerns (logging, config)
├── testing-utils/       # Shared test utilities
└── test-utils/          # Additional test helpers
```

**Workspace Configuration:** `pnpm-workspace.yaml`

- `packages/*` - Shared libraries
- `services/*` - Backend microservices
- `frontend` - React frontend
- `e2e` - End-to-end tests

### Technology Decisions

**Frontend Framework**: React 18

- Reason: Mature ecosystem, concurrent rendering, strong TypeScript support
- Hooks-based architecture for state management

**Build Tool**: Vite

- Reason: Fast HMR, ESM-native, excellent dev experience
- Configuration: `vite.config.ts`

**Language**: TypeScript 5.x

- Reason: Type safety, IDE support, refactoring confidence
- Strict mode enabled for maximum safety

**Package Manager**: pnpm 9.x

- Reason: Fast, disk-efficient, workspace support
- Lockfile: `pnpm-lock.yaml` (always use frozen lockfile in CI)

**Styling**: Tailwind CSS 3.x

- Reason: Utility-first, consistent design system, small bundle
- Configuration: `tailwind.config.js`

**Testing**:

- Unit/Integration: Vitest 2.x (fast, ESM-native, Vite integration)
- E2E: Playwright 1.58.x (cross-browser, reliable, great DX)
- Coverage: @vitest/coverage-v8

**Code Quality**:

- ESLint 8.x (Airbnb config + TypeScript rules)
- Prettier 3.x (formatting)
- Husky 9.x (Git hooks)
- lint-staged (staged file linting)

**CI/CD**: Jenkins (multibranch pipeline)

- Comprehensive test stages (lint, unit, integration, contract, E2E)
- Branch protection via required status checks
- Allure reporting for test results

### UI/UX Implementation Patterns

The frontend implements a comprehensive set of UI/UX patterns for consistent, accessible, and performant user experiences.

**Component Architecture:**

```
frontend/src/components/
├── ui/                      # Base UI primitives
│   ├── Button.tsx           # Primary interactive element with variants
│   ├── Input.tsx            # Form inputs with validation display
│   ├── Card.tsx             # Container with elevation variants
│   ├── Modal.tsx            # Dialog overlays with focus trap
│   ├── SearchInput.tsx      # Specialized search with debounce
│   ├── FilterPanel.tsx      # Collapsible filter container
│   ├── TagFilter.tsx        # Multi-select tag filtering
│   ├── LoadingSpinner.tsx   # Loading indicators
│   ├── ProgressBar.tsx      # Progress visualization
│   ├── Toast.tsx            # Notification toasts
│   ├── ErrorState.tsx       # Error display with retry
│   ├── EmptyState.tsx       # Empty state placeholders
│   └── Typography.tsx       # Rich text content wrapper
├── layouts/                 # Layout components
│   ├── Header.tsx           # Persistent top navigation
│   ├── Sidebar.tsx          # Collapsible desktop sidebar
│   ├── MobileDrawer.tsx     # Slide-out mobile menu
│   ├── Navigation.tsx       # Shared nav content
│   ├── AppLayout.tsx        # Main application shell
│   └── MobileActionBar.tsx  # Fixed bottom mobile actions
├── error/                   # Error handling
│   └── ErrorBoundary.tsx    # React error boundary
└── skeletons/               # Loading placeholders
    ├── SkeletonText.tsx     # Text shimmer
    ├── SkeletonCard.tsx     # Card shimmer
    └── TopicCardSkeleton.tsx # Topic-specific skeleton
```

**Key Patterns:**

1. **Dark Mode Support**
   - All components use Tailwind's `dark:` modifier for dark mode variants
   - Theme preference persisted in localStorage via ThemeContext
   - System preference detection with `prefers-color-scheme` media query
   - Preload script in index.html prevents dark mode flash on load
   - 200ms CSS transitions for smooth theme switching

2. **Responsive Design**
   - Mobile-first approach using Tailwind breakpoints (sm:, md:, lg:)
   - Touch-friendly 44px+ minimum tap targets (WCAG 2.1 compliance)
   - Fluid typography using CSS clamp() for smooth text scaling
   - Safe area support for notched devices (env(safe-area-inset-bottom))
   - Collapsible navigation on mobile, persistent on desktop

3. **Loading States**
   - Shimmer animations for skeleton screens (gradient-based)
   - 100ms delay before showing skeletons (prevents flash)
   - LoadingSpinner for indeterminate operations
   - ProgressBar for determinate operations
   - Skeleton variants match actual content shape

4. **Error Handling**
   - ErrorBoundary catches JavaScript errors in component tree
   - Toast notifications for user feedback (success, error, warning, info)
   - ErrorState component for retry-able errors
   - EmptyState component for "no data" scenarios
   - Form validation errors inline with React Hook Form

5. **Form Validation**
   - React Hook Form for performant form state management
   - Zod schemas for type-safe validation
   - Inline error messages below inputs
   - Real-time validation on blur
   - Clear validation state indicators

6. **Accessibility**
   - ARIA attributes on all interactive elements (aria-label, aria-expanded, aria-current)
   - Keyboard navigation support (Tab, Shift+Tab, Enter, Escape, Arrow keys)
   - Focus trap in modals and mobile drawer
   - Body scroll lock when overlays open
   - WCAG AA color contrast ratios (4.5:1 for text)
   - Semantic HTML (nav, main, header, button, etc.)

7. **Search & Filtering**
   - Debounced search input (500ms default delay)
   - Search with clear button and loading state
   - FilterPanel with apply/reset actions
   - TagFilter with multi-select checkboxes
   - Sort options with direction toggle (asc/desc)
   - Active filters display with badges

8. **Onboarding**
   - React Joyride for guided tours
   - Tour progress tracked in localStorage
   - Multiple tour types (home, topics, discussion, profile)
   - data-tour attributes for stable element targeting
   - Skip, reset, and completion tracking

9. **Typography & Readability**
   - Reading width constraints (65ch max for prose)
   - Enhanced line heights (1.7 for paragraphs)
   - Text wrapping: balance for headings, pretty for paragraphs
   - Typography component for rich content
   - Fluid font sizes for responsive text scaling

**Usage Examples:**

```typescript
// Dark mode-aware button
import { Button } from '@/components/ui';
<Button variant="primary" size="md">Save Changes</Button>

// Search with debouncing
import { SearchInput } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';

const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 500);

<SearchInput
  value={query}
  onChange={setQuery}
  placeholder="Search topics..."
  isLoading={isSearching}
/>

// Toast notifications
import { useToast } from '@/contexts/ToastContext';
const toast = useToast();
toast.success('Saved successfully!');
toast.error('Failed to save changes');

// Loading states
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { TopicCardSkeleton } from '@/components/ui/skeletons';

const showSkeleton = useDelayedLoading(isLoading);
{showSkeleton && <TopicCardSkeleton />}
{!showSkeleton && data && <TopicCard topic={data} />}

// Form validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/schemas/auth';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema),
});

<Input
  label="Email"
  {...register('email')}
  error={errors.email?.message}
/>
```

**Performance Considerations:**

- Shimmer animations use CSS transforms (GPU-accelerated)
- Debounced search prevents API spam
- Delayed loading prevents layout shift
- Lazy loading for routes and heavy components
- Bundle size monitoring (<500KB gzipped)

### Development Workflow

1. **Local Development**:

   ```bash
   pnpm install          # Install dependencies
   pnpm dev              # Start dev server (http://localhost:5173)
   pnpm test:unit:watch  # Watch mode for tests
   ```

2. **Code Quality**:

   ```bash
   pnpm lint             # Check linting
   pnpm format:check     # Check formatting
   pnpm typecheck        # TypeScript validation
   pnpm test:unit        # Run unit tests
   pnpm test:e2e         # Run E2E tests
   ```

3. **Pre-commit Hooks**: Automatically run on `git commit`
   - Secrets scanning
   - Code duplication detection
   - Console statement detection
   - Forbidden imports check
   - Linting and formatting (via lint-staged)

## Speckit Workflow

The project uses a structured feature development process through Claude Code slash commands:

### Feature Development Flow

1. `/speckit.specify <description>` - Create feature specification from natural language
2. `/speckit.clarify` - Identify and resolve underspecified areas in the spec
3. `/speckit.plan` - Generate implementation plan with technical design artifacts
4. `/speckit.tasks` - Break plan into actionable, dependency-ordered tasks
5. `/speckit.implement` - Execute tasks from tasks.md
6. `/speckit.taskstoissues` - Convert tasks to GitHub issues

### Supporting Commands

- `/speckit.checklist` - Generate custom checklist for a feature
- `/speckit.analyze` - Cross-artifact consistency check across spec.md, plan.md, tasks.md
- `/speckit.constitution` - Create/update project constitution (core principles)

### Directory Structure

```
specs/[###-feature-name]/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan
├── research.md          # Phase 0 research output
├── data-model.md        # Entity definitions
├── quickstart.md        # Getting started guide
├── contracts/           # API contracts (OpenAPI/GraphQL)
├── tasks.md             # Task breakdown
└── checklists/          # Validation checklists
```

### Key Principles

- **Specs are WHAT, not HOW**: Specifications focus on user needs and business value, avoiding implementation details
- **User stories must be independently testable**: Each story should be a viable MVP slice
- **Maximum 3 [NEEDS CLARIFICATION] markers**: Make informed guesses for everything else
- **Success criteria must be technology-agnostic and measurable**

## Helper Scripts

Located in `.specify/scripts/bash/`:

- `create-new-feature.sh` - Initialize new feature branch and spec directory
- `setup-plan.sh` - Set up planning phase, returns JSON with paths
- `update-agent-context.sh` - Update agent-specific context files
- `check-prerequisites.sh` - Verify required tools are installed

## Git Commit Policy

**IMPORTANT: Pre-commit hooks are mandatory quality gates and MUST NOT be bypassed.**

- **NEVER use `git commit --no-verify` or `git commit -n`** in any agentic coding session or manual commits
- **NEVER use `git push --no-verify`** to bypass pre-push checks
- All commits must pass pre-commit hooks to ensure code quality, security, and test health
- If a pre-commit hook fails:
  1. Read the error message carefully
  2. Fix the issue in your code
  3. Stage the fixed changes
  4. Commit again
- **Alternative for full test runs:** Use `FULL_TEST=true git commit -m "message"` if you need comprehensive testing before release
- **Recommended:** Use `npm run commit` to ensure safe commits (runs git commit with hook verification guaranteed)

Bypassing hooks defeats the purpose of code quality enforcement and can introduce:

- Leaked secrets and credentials
- Code duplication issues
- TypeScript type errors
- Broken tests
- Console debugging statements in production code
- Formatting inconsistencies

## Jenkins CI/CD

**Jenkins Server:** `http://jenkins.reasonBridge.org`
**Credentials:** Stored in `~/.jenkins-cli.yaml`

**Infrastructure:**

- Master + 3 agents running via Docker Compose: `/home/tony/jenkins/docker-compose/`
- Agent allocation: runner-1 and runner-2 (4GB each, general tasks), runner-3 (6GB, E2E dedicated)
- Start/stop: `cd /home/tony/jenkins/docker-compose && docker compose up -d` / `docker compose down`
- Agent secrets configured in Docker Compose `.env`

**Jenkins Shared Library:**

- Repository: `github.com/steiner385/reasonbridge-jenkins-lib`
- Local clone: `/tmp/reasonbridge-jenkins-lib`
- **IMPORTANT:** Push changes directly to `main` branch - no PRs needed
- Jenkins loads the library directly from `main`, so branches/PRs just add unnecessary overhead
- The library contains reusable pipeline steps in `vars/` directory

**Key Job:** `ReasonBridge-ci` - Multibranch pipeline automatically triggered on all branch pushes via GitHub webhook

- Trigger: `githubPush()` in `.jenkins/Jenkinsfile`
- No manual triggering needed - commits trigger builds automatically
- Feature branches only run full CI when a PR exists (otherwise skipped)

**Pipeline Stages:**

1. Initialize - Checkout code
2. Install Dependencies - pnpm install with frozen lockfile
3. Build Packages - Compile shared packages
4. Lint - ESLint and formatting checks
5. Unit Tests - vitest with coverage thresholds
6. Integration Tests - vitest + Docker services (postgres, redis, localstack)
7. Contract Tests - API contract validation
8. E2E Tests - Playwright browser automation (main/develop only)
9. Build - Production artifact generation

**Debugging:**

- Check console output: `echo $UNIT_TEST_EXIT_CODE` for test exit codes
- View build logs: Jenkins UI → ReasonBridge-ci → [branch-name] → Build Console
- Local reproduction: Run stages from `.jenkins/Jenkinsfile` locally (documented in `.github/CI_SETUP.md`)
- Systematic fix plan: See `/home/tony/.claude/plans/snuggly-nibbling-pretzel.md` for ordered debugging approach

## GitHub Branch Protection

**CRITICAL: Branch protection configuration must match actual Jenkins status checks.**

**Required Status Checks for `main` branch (Defense-in-Depth):**

```json
{
  "contexts": [
    "jenkins/lint", // Code quality
    "jenkins/unit-tests", // Unit tests
    "jenkins/integration", // Integration tests
    "jenkins/ci" // Overall pipeline status
  ],
  "strict": true
}
```

**Why this configuration:**

- **Comprehensive validation**: Requires lint, unit tests, integration tests, AND overall pipeline success before merge
- **Full pipeline completion**: jenkins/ci ensures entire pipeline completes successfully (including E2E when applicable)
- **Strict mode**: Ensures PRs are up-to-date with base branch
- **Defense-in-depth**: Multiple layers prevent broken code from merging
- **Prevents premature merges**: PR #709 (2026-01-28) merged at 20:27:43Z while jenkins/ci was pending, later failing at 20:33:31Z

**Status Check Sources:**

- `jenkins/lint` - Posted by `runLintChecks()` helper
- `jenkins/unit-tests` - Posted by `runUnitTests()` helper
- `jenkins/integration` - Posted by `runIntegrationTests()` helper
- `jenkins/ci` - Overall pipeline status (all stages must complete successfully)

**Important Note on jenkins/ci:**

The `jenkins/ci` check represents the overall Jenkins pipeline result and may show UNSTABLE/FAILURE when:

- E2E tests are skipped on feature branches
- Allure/JUnit plugins mark builds as unstable despite passing tests
- Any post-success/failure stage fails

This is a stricter requirement than individual stage checks, ensuring the complete pipeline succeeds before merge.

**Verification:**

```bash
gh api repos/steiner385/reasonbridge/branches/main/protection/required_status_checks --jq '.contexts'
# Expected output: ["jenkins/integration","jenkins/lint","jenkins/unit-tests","jenkins/ci"]
```

**NEVER modify branch protection without:**

1. Verifying the new status check context actually exists in Jenkins builds
2. Ensuring the check posts BEFORE merge (not in post-success/failure blocks)
3. Testing with a dummy PR that auto-merge correctly waits for all checks
4. Documenting the change and reason in this file

**Incident References:**

1. **2026-01-24 - PR #668**: Merged with failing test because protection required only `jenkins/ci` (which posts after merge) but not the individual pre-merge checks (lint, unit-tests, integration). Led to initial defense-in-depth configuration with three required checks.

2. **2026-01-28 - PR #709**: Hotfix PR merged at 20:27:43Z with only three checks (lint, unit-tests, integration) passing. The `jenkins/ci` check was still pending and later failed at 20:33:31Z. This incident revealed that while individual stages passed, the overall pipeline could still fail in later stages. Added `jenkins/ci` as fourth required check to ensure complete pipeline success before merge.

**Configuration Evolution:**

- 2026-01-24: Added jenkins/lint, jenkins/unit-tests, jenkins/integration (removed jenkins/ci)
- 2026-01-28: Re-added jenkins/ci as fourth required check for full pipeline validation

## Playwright E2E Testing

**IMPORTANT: NEVER use `npx playwright test --debug` or `--headed` flags.**

- These flags require interactive input (clicking, keyboard input) which disrupts autonomous workflows
- Debug mode opens a browser GUI that blocks execution until manual interaction
- Always run Playwright in headless mode for CI and agentic sessions

**Correct usage:**

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test frontend/e2e/login-form.spec.ts

# Run with verbose output (safe for automation)
npx playwright test --reporter=list

# Generate HTML report after run
npx playwright show-report
```

**For debugging test failures:**

- Use `console.log()` statements in tests (remove before committing)
- Check Playwright HTML reports: `npx playwright show-report`
- Use `page.screenshot()` to capture state at specific points
- Review trace files if `trace: 'on-first-retry'` is configured

**CI/CD E2E Configuration:**

The Jenkins pipeline uses the official Microsoft Playwright Docker image for E2E tests:

- **Image**: `mcr.microsoft.com/playwright:v1.58.0-noble`
- **Pre-installed**: @playwright/test, Chromium browser binaries (~400MB), system dependencies
- **Benefits**: Eliminates browser downloads, prevents OOM kills (exit code 137), faster startup

**Historical Issues:**

1. **OOM Killer (Exit Code 137)** - Fixed 2026-01-24 15:49 UTC:
   - Main branch builds #48 and #50 failed with exit code 137 (OOM killer)
   - **Root cause**: npm install @playwright/test downloading 400MB browser binaries caused memory spikes
   - **Solution**: Use pre-installed Playwright from official Docker image, only install project dependencies
   - **Result**: Eliminated intermittent E2E failures, reduced memory pressure on Jenkins agents

2. **DNS Resolution (net::ERR_NAME_NOT_RESOLVED)** - Fixed 2026-01-24 16:05 UTC:
   - PR #672 build #1: 14 tests in view-common-ground-summary.spec.ts failed with `net::ERR_NAME_NOT_RESOLVED at http://frontend/topics`
   - **Root cause**: PLAYWRIGHT_BASE_URL environment variable not passed correctly to docker exec process
   - **Solution**: Use `docker exec -e PLAYWRIGHT_BASE_URL=http://frontend:80` instead of export inside bash script
   - **Result**: All 14 tests now resolve correct baseURL for navigation

3. **Port Already Allocated (E2E Start Failure)** - Fixed 2026-01-24 16:27 UTC:
   - PR #672 build #2: Docker Compose failed with `Bind for 0.0.0.0:3004 failed: port is already allocated`
   - **Root cause**: Crashed/killed containers leave processes holding E2E ports; aggressive cleanup only removed containers by name, not port-based processes
   - **Solution**: Enhanced `aggressiveE2ECleanup()` to kill processes on E2E ports (3001-3007, 5000, 9080) using lsof before starting environment
   - **Result**: Port conflicts resolved, environment starts cleanly

4. **Host OOM Killer (Exit Code 137 Despite Low Container Memory)** - Fixed 2026-01-24 19:30 UTC:
   - PR #672 build #4: E2E tests crashed with exit code 137 (OOM) after only 2 tests, despite container showing 486MB/4GB (11.89%) usage
   - **Root cause**: Host system memory pressure causing Linux OOM killer to terminate Docker containers; E2E environment (7 Node.js services + postgres + redis + localstack + nginx + Playwright) consumed ~2.5-3GB unbounded, competing with other Jenkins builds
   - **Solution**: Added explicit memory limits to all docker-compose.e2e.yml services (postgres: 256m, redis: 128m, localstack: 512m, each Node.js service: 256m, nginx: 64m) to prevent bloat and ensure predictable resource usage (~3GB total + 4GB Playwright = 7GB max)
   - **Result**: Services cannot exceed limits, host OOM pressure eliminated, predictable memory footprint

5. **Playwright Version Mismatch (Executable Not Found)** - Fixed 2026-01-28 14:20 UTC:
   - PR #706: All 381 E2E tests failed in 1-2ms each with exit code 1 (not OOM)
   - **Error**: `browserType.launch: Executable doesn't exist at /ms-playwright/chromium_headless_shell-1208/...`
   - **Root cause**: Project's `@playwright/test` was updated to v1.58.0 but Docker image was still v1.57.0; Playwright requires exact version match between npm package and Docker image
   - **Solution**: Updated Docker image from `mcr.microsoft.com/playwright:v1.57.0-noble` to `v1.58.0-noble` in jenkins-lib
   - **Result**: 312 E2E tests pass with normal execution times (200-250ms per test)
   - **Lesson**: When updating `@playwright/test` version, always update the Docker image version in jenkins-lib to match

6. **Recurring OOM from Test Volume and npm Install** - Fixed 2026-01-31 16:45 UTC:
   - PR #730: E2E tests repeatedly failing with exit code 137 (OOM) despite previous fixes
   - **Root causes**:
     - Running 1302 tests (3 browsers × 434 tests) overwhelmed the 2GB Playwright container
     - `npm install allure-playwright` during test startup caused memory spikes
     - Corrupted pnpm symlinks caused install failures requiring retries
   - **Solutions**:
     - Reduced to chromium-only in CI (434 tests vs 1302) via `playwright.config.ts`
     - Skip allure-playwright reporter in CI (conditional reporter config)
     - Increased Playwright container memory from 2GB to 4GB
     - Added pnpm install retry mechanism (3 attempts) with cache clearing
     - Reduced Jenkins agents from 8 to 3 to free memory headroom
   - **Result**: 320 E2E tests pass in 2.7 minutes with no OOM errors
   - **Lesson**: E2E stability requires balancing test coverage with resource constraints; prefer fewer reliable tests over many flaky tests

## Active Technologies

- **TypeScript 5.7.3** - Node.js 20 LTS (backend), React 18 (frontend)
- **PostgreSQL 15** - Primary database with Prisma ORM
- **Redis 7** - Caching, sessions, pub/sub messaging
- **Playwright 1.58.0** - E2E testing (chromium-only in CI)
- **Vitest 2.x** - Unit and integration testing
- **pnpm 9.x** - Package management (workspace monorepo)

## Troubleshooting

### Common Issues

**Issue**: `pnpm install` fails with "lockfile is out of date"
**Solution**: Run `pnpm install --no-frozen-lockfile` locally, commit updated `pnpm-lock.yaml`

**Issue**: TypeScript errors about missing types
**Solution**:

- Check `node_modules/@types` directories exist
- Run `pnpm install` to refresh types
- Restart TypeScript server in IDE

**Issue**: Pre-commit hooks fail
**Solution**:

- **NEVER bypass with `--no-verify`**
- Read the error message carefully
- Fix the reported issue (e.g., remove console.log, fix formatting)
- Stage fixes and commit again
- For full test run: `FULL_TEST=true git commit -m "message"`

**Issue**: Vite dev server won't start
**Solution**:

- Check port 5173 is not already in use: `lsof -i :5173`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Restart with `pnpm dev`

**Issue**: Tests fail with "Cannot find module"
**Solution**:

- Ensure all test files have `.spec.ts` or `.test.ts` extension
- Check import paths use correct relative paths
- Verify `vitest.config.ts` has correct `resolve.alias` settings

**Issue**: E2E tests timeout
**Solution**:

- Ensure headless mode (never use `--debug` or `--headed` in CI)
- Check `playwright.config.ts` timeout settings
- Verify test selectors are stable (use `data-testid` attributes)
- Review Playwright HTML reports: `npx playwright show-report`

**Issue**: E2E tests fail with exit code 137 (OOM)
**Solution**:

- Check Playwright container memory limit (should be 4GB)
- Verify only chromium runs in CI (not all 3 browsers)
- Ensure allure-playwright is skipped in CI (check reporter config)
- Clear pnpm store cache on Jenkins agents: `rm -rf ~/.local/share/pnpm/store`
- If recurring, consider reducing parallel test workers

**Issue**: Jenkins build fails but passes locally
**Solution**:

- Check Jenkins console logs for specific errors
- Verify environment variables are set correctly
- Ensure Docker services (postgres, redis) are running in Jenkins
- Test with frozen lockfile: `pnpm install --frozen-lockfile`

**Issue**: PR cannot merge - status checks pending
**Solution**:

- Wait for all Jenkins pipeline stages to complete
- Required checks: `jenkins/lint`, `jenkins/unit-tests`, `jenkins/integration`
- If checks fail, fix issues and push new commits
- PR must be up-to-date with base branch (strict mode)

### Debugging Workflow

1. **Identify the Error**:
   - Read error message completely
   - Check file and line number
   - Review recent changes

2. **Reproduce Locally**:
   - Pull latest changes
   - Install dependencies
   - Run the failing command locally

3. **Fix and Verify**:
   - Make minimal fix
   - Run tests to verify fix
   - Ensure no regressions

4. **Commit and Push**:
   - Commit with clear message
   - Push to trigger CI
   - Verify CI passes

### Getting Help

- **Jenkins Logs**: Jenkins UI → ReasonBridge-ci → [branch] → Build Console
- **CI Setup Guide**: `.github/CI_SETUP.md`
- **Systematic Debugging Plan**: `/home/tony/.claude/plans/snuggly-nibbling-pretzel.md`
- **Local Reproduction**: Run pipeline stages from `.jenkins/Jenkinsfile` locally

## Recent Changes

- **2026-02-01**: Consolidated pending PRs into staging branch
- **2026-01-31**: Fixed recurring E2E OOM issues - reduced to chromium-only, skip allure in CI, reduced Jenkins agents 8→3
