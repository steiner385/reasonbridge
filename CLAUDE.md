# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

reasonBridge is a **Rational Discussion Platform** built with modern web technologies. The application provides tools for structured debates, claim validation, bias detection, and common ground discovery.

**Stack**: React 18 + TypeScript 5 + Vite (frontend), Node.js 20 LTS (runtime), pnpm (package manager)

**Purpose**: Enable constructive discourse through AI-powered analysis, structured argumentation, and evidence-based discussions.

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
- E2E: Playwright 1.40+ (cross-browser, reliable, great DX)
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

- Master + 8 agents running via Docker Compose: `/home/tony/jenkins/docker-compose/`
- Start/stop: `cd /home/tony/jenkins/docker-compose && docker compose up -d` / `docker compose down`
- Agent secrets configured in Docker Compose `.env`

**Jenkins Shared Library:**

- Repository: `github.com/steiner385/reasonbridge-jenkins-lib`
- Local clone: `/tmp/reasonbridge-jenkins-lib`
- **IMPORTANT:** Push changes directly to `main` branch - no PRs needed
- Jenkins loads the library directly from `main`, so branches/PRs just add unnecessary overhead
- The library contains reusable pipeline steps in `vars/` directory

**Key Job:** `reasonBridge-multibranch` - Multibranch pipeline automatically triggered on all branch pushes via GitHub webhook

- Trigger: `githubPush()` in `.jenkins/Jenkinsfile`
- No manual triggering needed - commits trigger builds automatically
- **NOTE:** Job name is `reasonBridge-multibranch`, NOT `reasonbridge-ci`

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
- View build logs: Jenkins UI → reasonBridge-multibranch → [branch-name] → Build Console
- Local reproduction: Run stages from `.jenkins/Jenkinsfile` locally (documented in `.github/CI_SETUP.md`)
- Systematic fix plan: See `/home/tony/.claude/plans/snuggly-nibbling-pretzel.md` for ordered debugging approach

## GitHub Branch Protection

**CRITICAL: Branch protection configuration must match actual Jenkins status checks.**

**Required Status Checks for `main` branch (Defense-in-Depth):**

```json
{
  "contexts": [
    "continuous-integration/jenkins/pr-merge", // Automatic (Jenkins plugin)
    "jenkins/lint", // Code quality
    "jenkins/unit-tests", // Unit tests
    "jenkins/integration" // Integration tests
  ],
  "strict": true
}
```

**Why this configuration:**

- **Comprehensive validation**: Requires lint, unit tests, AND integration tests before merge
- **Pre-merge checks**: All required checks post BEFORE merge (not after like `jenkins/ci`)
- **Strict mode**: Ensures PRs are up-to-date with base branch
- **Defense-in-depth**: Multiple layers prevent broken code from merging

**Status Check Sources:**

- `continuous-integration/jenkins/pr-merge` - Automatic from Jenkins GitHub Branch Source plugin
- `jenkins/lint` - Posted by `runLintChecks()` helper
- `jenkins/unit-tests` - Posted by `runUnitTests()` helper
- `jenkins/integration` - Posted by `runIntegrationTests()` helper

**Verification:**

```bash
gh api repos/steiner385/reasonBridge/branches/main/protection/required_status_checks --jq '.contexts'
```

**NEVER modify branch protection without:**

1. Verifying the new status check context actually exists in Jenkins builds
2. Ensuring the check posts BEFORE merge (not in post-success/failure blocks)
3. Testing with a dummy PR that auto-merge correctly waits for all checks
4. Documenting the change and reason in this file

**Incident Reference:** 2026-01-24 - PR #668 merged with failing test because protection required `jenkins/ci` (posts after merge) but not the actual pre-merge checks. Comprehensive protection now prevents this. See `/tmp/branch-protection-final-config.md` for full details.

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

- **Image**: `mcr.microsoft.com/playwright:v1.57.0-noble`
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

## Active Technologies

- TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend) (001-rational-discussion-platform)

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

**Issue**: Jenkins build fails but passes locally
**Solution**:

- Check Jenkins console logs for specific errors
- Verify environment variables are set correctly
- Ensure Docker services (postgres, redis) are running in Jenkins
- Test with frozen lockfile: `pnpm install --frozen-lockfile`

**Issue**: PR cannot merge - status checks pending
**Solution**:

- Wait for all Jenkins pipeline stages to complete
- Required checks: `jenkins/lint`, `jenkins/unit-tests`, `jenkins/integration`, `continuous-integration/jenkins/pr-merge`
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

- **Jenkins Logs**: Jenkins UI → reasonBridge-multibranch → [branch] → Build Console
- **CI Setup Guide**: `.github/CI_SETUP.md`
- **Systematic Debugging Plan**: `/home/tony/.claude/plans/snuggly-nibbling-pretzel.md`
- **Local Reproduction**: Run pipeline stages from `.jenkins/Jenkinsfile` locally

## Recent Changes

- 001-rational-discussion-platform: Added TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend)
- 2026-01-24: Updated CLAUDE.md with implemented architecture (issue #431)
