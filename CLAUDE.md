# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a new Discord-related project using a specification-driven development workflow called "speckit". The project is in early stages with no source code yet - only the speckit tooling is set up.

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

**Jenkins Server:** `http://jenkins.uniteDiscord.org`
**Credentials:** Stored in `~/.jenkins-cli.yaml`

**Infrastructure:**

- Master + 8 agents running via Docker Compose: `/home/tony/jenkins/docker-compose/`
- Start/stop: `cd /home/tony/jenkins/docker-compose && docker compose up -d` / `docker compose down`
- Agent secrets configured in Docker Compose `.env`

**Jenkins Shared Library:**

- Repository: `github.com/steiner385/unitediscord-jenkins-lib`
- Local clone: `/tmp/unitediscord-jenkins-lib`
- **IMPORTANT:** Push changes directly to `main` branch - no PRs needed
- Jenkins loads the library directly from `main`, so branches/PRs just add unnecessary overhead
- The library contains reusable pipeline steps in `vars/` directory

**Key Job:** `uniteDiscord-multibranch` - Multibranch pipeline automatically triggered on all branch pushes via GitHub webhook

- Trigger: `githubPush()` in `.jenkins/Jenkinsfile`
- No manual triggering needed - commits trigger builds automatically
- **NOTE:** Job name is `uniteDiscord-multibranch`, NOT `unitediscord-ci`

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
- View build logs: Jenkins UI → uniteDiscord-multibranch → [branch-name] → Build Console
- Local reproduction: Run stages from `.jenkins/Jenkinsfile` locally (documented in `.github/CI_SETUP.md`)
- Systematic fix plan: See `/home/tony/.claude/plans/snuggly-nibbling-pretzel.md` for ordered debugging approach

## GitHub Branch Protection

**CRITICAL: Branch protection configuration must match actual Jenkins status checks.**

**Required Status Checks for `main` branch (Defense-in-Depth):**
```json
{
  "contexts": [
    "continuous-integration/jenkins/pr-merge",  // Automatic (Jenkins plugin)
    "jenkins/lint",                             // Code quality
    "jenkins/unit-tests",                       // Unit tests
    "jenkins/integration"                       // Integration tests
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
gh api repos/steiner385/uniteDiscord/branches/main/protection/required_status_checks --jq '.contexts'
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

## Active Technologies

- TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend) (001-rational-discussion-platform)

## Recent Changes

- 001-rational-discussion-platform: Added TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend)
