# Implementation Plan: reasonBridge - Rational Discussion Platform

**Branch**: `001-rational-discussion-platform` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-rational-discussion-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a web-based public discussion platform called "reasonBridge" that facilitates rational discourse across diverse perspectives. The platform features proposition-based discussion organization, AI-assisted communication feedback (bias detection, fact-checking prompts), common ground analysis using Moral Foundations Theory, anti-bot measures with trust scoring (Mayer's ABI Model), and graduated moderation with human-in-the-loop for consequential actions.

**Technical Approach**: Hybrid AI architecture with lightweight local models for real-time feedback (<500ms) and cloud LLMs for complex synthesis (<5s). React 18 frontend with Node.js 20 LTS backend, PostgreSQL for persistence, and structured event logging with correlation IDs for comprehensive testing and observability.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend)
**Primary Dependencies**:
- Backend: Express.js/Fastify, Prisma ORM, OpenTelemetry, Zod validation
- Frontend: React 18, TanStack Query, Zustand, Tailwind CSS
- AI: OpenAI API (cloud LLM), TensorFlow.js/ONNX (local inference)
- Testing: Vitest, Playwright, Supertest, MSW (Mock Service Worker)

**Storage**: PostgreSQL 15+ with full-text search, Redis for caching/sessions
**Testing**:
- Unit: Vitest with 80% coverage threshold
- Integration: Supertest for API, Prisma with test database
- E2E: Playwright with accessibility assertions
- Contract: OpenAPI schema validation, Pact for consumer-driven contracts

**Target Platform**: Web (Linux server deployment, modern browsers)
**Project Type**: Web application (monorepo with frontend + backend + shared packages)
**Performance Goals**:
- API: 200ms p95 response time (NFR-004)
- AI feedback: 500ms for real-time analysis (NFR-005)
- Concurrent users: 10,000 without degradation (SC-014)

**Constraints**:
- 99.9% availability (NFR-010)
- WCAG 2.2 AA accessibility (NFR-007)
- Graceful degradation for external dependencies (NFR-011)

**Scale/Scope**: 10,000 concurrent users, ~50 screens/views

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality ✅
- **Linting**: ESLint configured with TypeScript strict rules; CI enforces zero warnings
- **Type Safety**: TypeScript strict mode enabled; `any` prohibited with eslint rule
- **Code Review**: GitHub branch protection requires 1+ approval
- **DRY Principle**: Shared logic in `packages/shared/` for cross-project use
- **Documentation**: TSDoc required for all public APIs via eslint-plugin-jsdoc
- **Error Handling**: Async error boundaries required; structured error codes (NFR-014)

### II. Testing Standards ✅ (TDD Focus)
- **Coverage Threshold**: 80% line coverage enforced via Vitest coverage reports
- **Test-First**: All bug fixes require failing test before implementation
- **Test Categories**:
  - Unit tests: Vitest for all pure functions, services, utilities
  - Integration tests: Supertest + Prisma test database for API endpoints
  - E2E tests: Playwright for critical user journeys
  - Contract tests: OpenAPI validation + Pact for AI service boundaries
- **Test Naming**: `describe('ComponentName')` + `it('should [expected behavior] when [condition]')`
- **Mocking**: MSW for external APIs; Prisma mocks for unit tests
- **CI Gate**: All tests must pass; flaky test quarantine process defined

### III. User Experience Consistency ✅
- **Response Time Feedback**: Loading indicators for operations >1s (React Suspense)
- **Error Messages**: Structured error codes with actionable user-facing messages (NFR-015)
- **Command Patterns**: Consistent API response format via shared schemas
- **Accessibility**: WCAG 2.2 AA compliance with Playwright axe-core assertions
- **Graceful Degradation**: Circuit breakers for external services (NFR-011)
- **Confirmation for Destructive Actions**: Modal confirmations for delete/moderation actions

### IV. Performance Requirements ✅
- **API Response**: 200ms p95 target (NFR-004); CI performance regression tests
- **Memory Usage**: Monitored via OpenTelemetry metrics
- **Rate Limiting**: Token bucket implementation with exponential backoff
- **Database Queries**: Query performance assertions in integration tests (<100ms)
- **Concurrent Users**: Load testing in CI for 10,000 concurrent user simulation

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── shared/                    # Shared types, utilities, validation schemas
│   ├── src/
│   │   ├── types/            # Domain types (User, Discussion, Proposition, etc.)
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── errors/           # Error code taxonomy (AUTH_001, VALIDATION_002, etc.)
│   │   └── utils/            # Shared utilities
│   └── tests/
│       └── unit/

├── ai-models/                 # Local AI inference models
│   ├── src/
│   │   ├── bias-detection/   # System 1/System 2 pattern detection
│   │   ├── tone-analysis/    # Inflammatory language detection
│   │   ├── fallacy-detection/# Logical fallacy identification
│   │   └── claim-extraction/ # Factual claim identification
│   └── tests/
│       ├── unit/
│       └── contract/         # AI model output contracts

services/
├── api/                       # Core backend API service
│   ├── src/
│   │   ├── routes/           # Express/Fastify route handlers
│   │   ├── middleware/       # Auth, rate limiting, error handling
│   │   ├── services/         # Business logic services
│   │   ├── repositories/     # Data access layer (Prisma)
│   │   ├── events/           # Structured event logging
│   │   └── jobs/             # Background job processing
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tests/
│       ├── unit/             # Service/utility unit tests
│       ├── integration/      # API endpoint tests with test DB
│       └── contract/         # OpenAPI schema validation

├── ai-service/                # AI synthesis service (cloud LLM integration)
│   ├── src/
│   │   ├── common-ground/    # Common ground analysis
│   │   ├── moral-foundations/# Moral foundation mapping
│   │   ├── fact-check/       # Fact-check API integration
│   │   └── translation/      # Argument translation across viewpoints
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── contract/         # LLM response contracts

frontend/
├── src/
│   ├── components/
│   │   ├── ui/               # Design system components
│   │   ├── discussion/       # Discussion-specific components
│   │   ├── feedback/         # AI feedback display components
│   │   └── moderation/       # Moderation UI components
│   ├── pages/                # Route-based page components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API client services
│   ├── stores/               # Zustand state stores
│   └── utils/
└── tests/
    ├── unit/                 # Component unit tests
    ├── integration/          # Hook/store integration tests
    └── e2e/                  # Playwright E2E tests

infrastructure/
├── docker/                    # Docker configurations
├── k8s/                       # Kubernetes manifests (if applicable)
└── terraform/                 # Infrastructure as code

e2e/                           # Cross-service E2E tests
├── tests/
│   ├── user-journeys/        # Critical user path tests
│   ├── accessibility/        # WCAG 2.2 AA compliance tests
│   └── performance/          # Load and performance tests
└── fixtures/                  # Test data fixtures
```

**Structure Decision**: Web application monorepo with pnpm workspaces. Separates concerns into:
- `packages/` for shared code and local AI models
- `services/` for backend microservices (API + AI service)
- `frontend/` for React web application
- `e2e/` for cross-cutting end-to-end tests

Each package/service has co-located tests following the unit/integration/contract/e2e pattern aligned with constitution testing standards.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Separate ai-service | AI synthesis tasks (common ground, moral foundations) require different scaling/cost profile | Embedding in main API would couple AI costs to API scaling |
| Local AI models package | Real-time feedback requires <500ms latency | Cloud-only would exceed latency requirements for composition-time feedback |

## Testing Strategy (TDD Implementation)

### Test Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← Playwright (critical paths only)
                    │   (~10% tests)  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │    Integration Tests        │  ← Supertest, Prisma test DB
              │      (~30% tests)           │
              └──────────────┬──────────────┘
                             │
    ┌────────────────────────┴────────────────────────┐
    │              Unit Tests (~60% tests)            │  ← Vitest, MSW
    │  Pure functions, services, components, hooks    │
    └─────────────────────────────────────────────────┘
```

### Test Categories by User Story

| User Story | Unit Tests | Integration Tests | E2E Tests |
|------------|-----------|-------------------|-----------|
| US-1: Join Discussion | Auth service, Discussion service | POST /discussions/:id/join, GET /discussions | Full signup → join → post flow |
| US-2: Communication Feedback | Bias detector, Tone analyzer, Fallacy detector | POST /responses (with feedback) | Compose → receive feedback → revise |
| US-3: Common Ground Analysis | Analysis algorithms | GET /discussions/:id/analysis | View analysis, real-time updates |
| US-4: Human Authenticity | Trust calculator, Rate limiter | POST /auth/verify, Bot detection | Verification flow, trust display |
| US-5: Moderation | Moderation service, Escalation detector | Moderation endpoints | Moderator workflow |
| US-6: Topic Creation | Topic service, Diversity calculator | POST /topics | Full topic creation flow |

### Contract Testing Strategy

| Boundary | Contract Type | Tool |
|----------|---------------|------|
| Frontend ↔ API | OpenAPI 3.1 | openapi-typescript, Supertest |
| API ↔ AI Service | AsyncAPI + JSON Schema | Pact |
| AI Service ↔ OpenAI | Response schema validation | Zod + snapshot tests |
| API ↔ Fact-Check APIs | Response schema validation | MSW + contract fixtures |

### Performance Test Requirements

| Metric | Target | Test Approach |
|--------|--------|---------------|
| API p95 latency | <200ms | k6 load tests in CI |
| AI feedback latency | <500ms | Benchmark tests with timeout assertions |
| Concurrent users | 10,000 | k6 soak test (staging environment) |
| Database query time | <100ms | Integration test assertions |

### Accessibility Testing

- **Automated**: Playwright with @axe-core/playwright for WCAG 2.2 AA
- **Manual Checklist**: Keyboard navigation, screen reader compatibility
- **CI Integration**: Accessibility violations fail the build

### Test Data Management

- **Fixtures**: JSON fixtures for deterministic test data
- **Factories**: Factory functions for dynamic test data generation
- **Database Seeding**: Prisma seed scripts for development and test environments
- **AI Mocking**: MSW handlers for consistent AI response simulation
