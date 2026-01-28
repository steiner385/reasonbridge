# Implementation Plan: OAuth2 E2E Test Infrastructure

**Branch**: `009-oauth-e2e-tests` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-oauth-e2e-tests/spec.md`

## Summary

Enable 650+ lines of existing OAuth E2E tests (currently skipped in `frontend/e2e/oauth-flow.spec.ts`) by implementing mock OAuth provider infrastructure using Playwright's route interception. The backend already supports mocked authentication (`AUTH_MOCK=true`), so the solution focuses on mocking OAuth provider responses at the browser/API level.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Playwright 1.57+, @playwright/test, Vitest (for unit tests of mock utilities)
**Storage**: N/A (mock data in-memory during tests)
**Testing**: Playwright E2E tests, Vitest unit tests for mock utilities
**Target Platform**: Docker E2E environment (linux/amd64), Jenkins CI
**Project Type**: Web application (monorepo with frontend + backend services)
**Performance Goals**: Individual tests complete within 30 seconds, full OAuth suite within 5 minutes
**Constraints**: <50MB additional Docker image size, must work with existing E2E infrastructure
**Scale/Scope**: 29 OAuth tests across 9 test categories (Google OAuth, Apple OAuth, Error Handling, Account Linking, UI/UX, Responsive, Accessibility, Security)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | TypeScript strict mode, linting enforced |
| II. Testing Standards | ✅ PASS | Tests exist, need enabling. Coverage maintained. |
| III. User Experience | ✅ PASS | Testing UX flows, not changing them |
| IV. Performance | ✅ PASS | 30s/test limit matches <3s response requirement context |

**Quality Gates Compliance:**
- Lint: Will pass existing linting rules
- Type Check: TypeScript strict mode
- Unit Tests: Mock utility functions will have unit tests
- Integration Tests: Existing OAuth E2E tests serve as integration tests
- Code Review: Required per branch protection

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/009-oauth-e2e-tests/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (mock data structures)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (mock OAuth endpoints)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── e2e/
│   ├── oauth-flow.spec.ts        # EXISTING - currently skipped, will enable
│   ├── fixtures/                 # NEW - test fixtures
│   │   └── oauth-mock.fixture.ts # OAuth mock fixture for Playwright
│   └── utils/                    # NEW - test utilities
│       ├── oauth-mock.ts         # Mock OAuth provider utilities
│       └── oauth-mock.test.ts    # Unit tests for mock utilities
├── src/
│   └── lib/
│       └── oauth-config.ts       # MODIFY - add E2E mode detection
└── playwright.config.ts          # MODIFY - add OAuth mock setup

services/user-service/
└── src/
    └── auth/
        └── mock-oauth.controller.ts  # NEW - mock OAuth callback endpoints
```

**Structure Decision**: Uses existing monorepo structure. New code goes in:
1. `frontend/e2e/fixtures/` - Playwright fixtures for mock setup
2. `frontend/e2e/utils/` - Reusable mock utilities
3. `services/user-service/src/auth/` - Backend mock OAuth endpoints (if needed)

## Implementation Approach

### Option A: Playwright Route Interception (RECOMMENDED)

Use Playwright's `page.route()` to intercept OAuth provider requests and return mock responses. This approach:
- Requires no backend changes
- Works with existing `AUTH_MOCK=true` setup
- Tests the actual frontend OAuth handling code
- Easy to configure per-test scenarios

### Option B: Mock OAuth Server Container

Add a dedicated mock OAuth server container to docker-compose.e2e.yml. This approach:
- More realistic simulation
- Higher complexity (new container, ~50MB)
- Requires frontend URL configuration changes

**Selected Approach**: Option A - Playwright route interception provides sufficient coverage with lower complexity.

## Complexity Tracking

> No violations found. Table left empty per template instructions.

## Phase 0 Research Needs

1. **Playwright route interception patterns**: Best practices for mocking OAuth flows
2. **Google OAuth callback format**: Exact URL parameters and response structure
3. **Apple OAuth callback format**: Including "Hide My Email" relay addresses
4. **Existing mock auth integration**: How `AUTH_MOCK=true` works in user-service

## Phase 1 Design Artifacts

- `data-model.md`: Mock OAuth response structures (tokens, user profiles)
- `contracts/oauth-mock-endpoints.yaml`: Mock endpoint specifications
- `quickstart.md`: Developer guide to run and extend OAuth tests
