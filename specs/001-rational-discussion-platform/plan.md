# Implementation Plan: uniteDiscord - Rational Discussion Platform

**Branch**: `001-rational-discussion-platform` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-rational-discussion-platform/spec.md`

## Summary

Build a web-based platform for rational discussion across diverse perspectives, featuring AI-powered communication guidance, proposition-based discussion organization, common ground analysis, and anti-bot measures. The platform uses psychological frameworks (Kahneman, Haidt, Fogg, Gross, Mayer) to facilitate productive discourse.

**Technical Approach**: Microservices architecture on AWS EKS with TypeScript backend services, React frontend, PostgreSQL (RDS) for persistence, and Amazon Bedrock for AI capabilities.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend)
**Primary Dependencies**:
- Backend: NestJS (microservices framework), Prisma ORM, Bull (job queues), Socket.io (real-time)
- Frontend: React 18, TanStack Query, Zustand, Tailwind CSS
- Infrastructure: AWS CDK, Helm charts for K8s

**Storage**:
- PostgreSQL 15 (AWS RDS) - primary relational data
- Redis (ElastiCache) - caching, session storage, rate limiting
- S3 - static assets, user uploads

**Testing**:
- Jest (unit/integration)
- Playwright (E2E)
- Pact (contract testing between microservices)
- k6 (load testing)

**Target Platform**:
- Development: Local workstation, local Jenkins, Docker Compose
- Production: AWS EKS (Kubernetes), multi-AZ deployment

**Project Type**: Web application (microservices backend + SPA frontend)

**Performance Goals**:
- API p95 latency: <200ms for reads, <500ms for writes
- Real-time AI feedback: <500ms (local models)
- Complex AI analysis: <5s (Bedrock)
- 10,000 concurrent users (SC-014)

**Constraints**:
- Database queries <100ms (Constitution IV)
- Initial response within 3 seconds (Constitution IV)
- 80% test coverage for business logic (Constitution II)

**Scale/Scope**:
- 10,000 concurrent users
- ~44 functional requirements
- 9 core entities
- 8+ microservices

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality

| Requirement | Plan Compliance |
|-------------|-----------------|
| Linting with zero warnings | ✅ ESLint + Prettier configured in all services |
| TypeScript strict mode, no `any` | ✅ `strict: true` in all tsconfig.json |
| Code review required | ✅ GitHub branch protection on `main` and `develop` |
| DRY - extract shared logic | ✅ Shared packages: `@unite/common`, `@unite/ai-client`, `@unite/db-models` |
| Public API documentation | ✅ OpenAPI specs auto-generated, TSDoc for internal APIs |
| Explicit error handling | ✅ NestJS exception filters, Result pattern for service methods |

### II. Testing Standards

| Requirement | Plan Compliance |
|-------------|-----------------|
| 80% coverage for business logic | ✅ Jest coverage thresholds in CI |
| Test-first for bug fixes | ✅ PR template includes test requirement |
| Unit tests for pure functions | ✅ All services have `/tests/unit/` |
| Integration tests for DB/API | ✅ Testcontainers for DB, Pact for service contracts |
| Contract tests for external APIs | ✅ Pact provider/consumer tests |
| Test naming convention | ✅ `[unit]_[scenario]_[expected]` enforced by lint rule |
| CI gate - all tests pass | ✅ Jenkins pipeline blocks on test failure |

### III. User Experience Consistency

| Requirement | Plan Compliance |
|-------------|-----------------|
| Loading indicator >1s | ✅ Frontend skeleton loaders, optimistic updates |
| Actionable error messages | ✅ Error codes map to user-friendly messages |
| Consistent patterns | ✅ Design system with component library |
| Accessibility | ✅ WCAG 2.1 AA target, axe-core in E2E tests |
| Graceful degradation | ✅ Circuit breakers, fallback UI states |
| Confirmation for destructive actions | ✅ Modal confirmations for delete/remove actions |

### IV. Performance Requirements

| Requirement | Plan Compliance |
|-------------|-----------------|
| Response within 3 seconds | ✅ SLA monitoring, async processing for heavy ops |
| Memory <512MB per process | ✅ Container resource limits, memory profiling |
| Startup <30 seconds | ✅ Lazy loading, health check timeouts |
| Rate limiting with backoff | ✅ Redis-based rate limiter, exponential backoff |
| DB queries <100ms | ✅ Query analysis, Prisma query logging, indexes |
| 100 concurrent users per service | ✅ HPA scaling, load testing in CI |

**Constitution Check Status**: ✅ PASS - All requirements addressed in plan

## Project Structure

### Documentation (this feature)

```text
specs/001-rational-discussion-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Microservices Backend
services/
├── api-gateway/              # Kong/custom gateway, auth, rate limiting
│   ├── src/
│   └── tests/
├── user-service/             # Account, auth, verification, trust scores
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   └── events/
│   └── tests/
├── discussion-service/       # Topics, propositions, responses, alignments
│   ├── src/
│   └── tests/
├── ai-service/               # Bedrock integration, feedback, analysis
│   ├── src/
│   │   ├── analyzers/        # Bias, fallacy, tone detection
│   │   ├── synthesizers/     # Common ground, moral foundations
│   │   └── clients/          # Bedrock, fact-check APIs
│   └── tests/
├── moderation-service/       # Flags, actions, appeals, human queue
│   ├── src/
│   └── tests/
├── recommendation-service/   # Topic discovery, follow suggestions
│   ├── src/
│   └── tests/
├── notification-service/     # Real-time updates, email
│   ├── src/
│   └── tests/
└── fact-check-service/       # External fact-check API integration
    ├── src/
    └── tests/

# Shared Packages
packages/
├── common/                   # Shared types, utilities, constants
├── db-models/               # Prisma schema, migrations
├── ai-client/               # Bedrock client wrapper
├── event-schemas/           # Event contracts for async messaging
└── testing-utils/           # Shared test helpers

# Frontend
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Design system primitives
│   │   ├── discussion/      # Topic, proposition, response components
│   │   ├── analysis/        # Common ground, consensus meters
│   │   └── moderation/      # Feedback, flags, appeals
│   ├── pages/
│   │   ├── home/
│   │   ├── topic/
│   │   ├── profile/
│   │   └── onboarding/
│   ├── services/            # API clients
│   ├── stores/              # Zustand state
│   └── hooks/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/

# Infrastructure
infrastructure/
├── cdk/                     # AWS CDK stacks
│   ├── lib/
│   │   ├── eks-stack.ts
│   │   ├── rds-stack.ts
│   │   ├── elasticache-stack.ts
│   │   └── bedrock-stack.ts
│   └── bin/
├── helm/                    # Kubernetes Helm charts
│   ├── unite-services/
│   └── unite-frontend/
├── docker/                  # Dockerfiles for each service
└── jenkins/                 # Pipeline definitions
    ├── Jenkinsfile
    └── jobs/

# Local Development
docker-compose.yml           # Local dev environment
docker-compose.test.yml      # Test environment
Makefile                     # Common commands
```

**Structure Decision**: Microservices architecture chosen to support:
1. Independent scaling of AI-heavy services
2. Team parallelization across services
3. Isolation of third-party dependencies (Bedrock, fact-check APIs)
4. Kubernetes-native deployment on EKS

## Complexity Tracking

| Decision | Justification | Simpler Alternative Rejected Because |
|----------|---------------|--------------------------------------|
| 8 microservices instead of monolith | AI services have different scaling needs (CPU-bound), discussion service is I/O-bound; independent deployability required for CI/CD | Monolith would couple AI processing with user-facing latency SLAs |
| Separate fact-check service | External API rate limits and latency isolation; can cache independently | Embedding in AI service would complicate caching and rate limit handling |
| Event-driven architecture | Common ground analysis is async (5s budget); moderation queue requires decoupling | Synchronous calls would block user actions on AI processing |

## Microservice Boundaries

| Service | Responsibilities | Key Entities |
|---------|------------------|--------------|
| **api-gateway** | Authentication, rate limiting, request routing, API composition | Session tokens |
| **user-service** | Registration, OAuth, verification, trust scores, following | User, VerificationRecord |
| **discussion-service** | Topics, propositions, responses, alignments, tags, links | Topic, Proposition, Response, Tag, TopicLink |
| **ai-service** | Real-time feedback, bias detection, common ground synthesis | Feedback, CommonGroundAnalysis |
| **moderation-service** | Flags, human review queue, actions, appeals | ModerationAction, Appeal |
| **recommendation-service** | Topic discovery, follow suggestions, perspective diversity | UserAffinity, RecommendationLog |
| **notification-service** | WebSocket connections, push notifications, email | NotificationPreference |
| **fact-check-service** | External API integration, caching, credibility scoring | FactCheckResult, SourceCredibility |

## Event-Driven Communication

| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| `response.created` | discussion-service | ai-service (analysis), notification-service |
| `response.analyzed` | ai-service | discussion-service (update feedback) |
| `topic.participant.joined` | discussion-service | recommendation-service (diversity check) |
| `moderation.action.requested` | ai-service | moderation-service (queue) |
| `user.trust.updated` | moderation-service | user-service (score update) |
| `common-ground.generated` | ai-service | discussion-service, notification-service |
