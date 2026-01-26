# Implementation Plan: User Onboarding

**Branch**: `003-user-onboarding` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-user-onboarding/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a value-first user onboarding experience that demonstrates platform capabilities before requiring signup, supports multiple authentication methods (email/password, Google OAuth, Apple OAuth), verifies email addresses, guides users through topic interest selection, provides minimal orientation, and enables first discussion participation within 10 minutes.

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js 20.x (backend), React 18.3.1 (frontend)
**Primary Dependencies**:
- Backend: NestJS 10.3, Fastify, AWS Cognito (authentication), Prisma (ORM), PostgreSQL
- Frontend: React 18.3, Vite 6.0, React Router, TanStack Query
**Storage**: PostgreSQL (user accounts, onboarding progress, topic interests), AWS S3 (demo content)
**Testing**: Vitest 2.1 (unit/integration), Playwright (E2E), contract tests via OpenAPI validation
**Target Platform**: Web browsers (desktop + mobile responsive), Linux servers (backend services)
**Project Type**: Web application (separate frontend and backend services)
**Performance Goals**:
- Landing page load <1.5s
- Demo interactions <200ms response
- Account creation flow <2min total time
- Verification email delivery <60s
**Constraints**:
- WCAG 2.2 AA accessibility compliance
- <5min total onboarding time from landing to first post
- Must work on mobile without degradation
- Progressive enhancement (core content viewable without JS)
**Scale/Scope**:
- Expected: 1000+ new signups per day at maturity
- Onboarding conversion target: 40% of demo viewers
- Email verification: 70% within 24 hours
- First post: 50% within 7 days

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| **Code Quality** | ✅ PASS | TypeScript strict mode enabled, ESLint configured, all code will be reviewed |
| **Testing Standards** | ✅ PASS | Unit tests for authentication logic, integration tests for Cognito/OAuth flows, E2E tests for signup journey, contract tests for API endpoints |
| **UX Consistency** | ✅ PASS | Consistent error messaging, loading states for async operations, accessibility compliance planned |
| **Performance Requirements** | ✅ PASS | Targets aligned: <3s command response, <1.5s landing page load, <100ms DB queries, rate limiting implemented |

**Pre-Phase 0 Assessment**: All gates PASS. No violations requiring justification.

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
# Backend Services
services/user-service/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts        # Signup, login, verification endpoints
│   │   ├── auth.service.ts           # Business logic for authentication
│   │   ├── cognito.service.ts        # AWS Cognito integration
│   │   ├── oauth.service.ts          # Google/Apple OAuth flows
│   │   └── verification.service.ts   # Email verification token management
│   ├── onboarding/
│   │   ├── onboarding.controller.ts  # Onboarding progress tracking endpoints
│   │   ├── onboarding.service.ts     # Onboarding state management
│   │   └── topic-selection.service.ts # Topic interest selection logic
│   └── demo/
│       ├── demo.controller.ts         # Demo content endpoints
│       └── demo.service.ts            # Demo discussion retrieval
└── tests/
    ├── unit/
    │   ├── auth.service.spec.ts
    │   ├── oauth.service.spec.ts
    │   └── onboarding.service.spec.ts
    ├── integration/
    │   ├── cognito-integration.spec.ts
    │   └── oauth-integration.spec.ts
    └── contract/
        └── auth-api.contract.spec.ts

# Frontend Application
frontend/
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx           # Value-first demo page
│   │   ├── SignupPage.tsx            # Account creation
│   │   ├── EmailVerificationPage.tsx # Email confirmation flow
│   │   ├── TopicSelectionPage.tsx    # Interest selection
│   │   └── OrientationPage.tsx       # Brief onboarding tutorial
│   ├── components/
│   │   ├── auth/
│   │   │   ├── EmailSignupForm.tsx
│   │   │   ├── OAuthButtons.tsx      # Google/Apple sign-in
│   │   │   └── VerificationBanner.tsx
│   │   ├── demo/
│   │   │   ├── DemoDiscussionView.tsx
│   │   │   ├── DemoMetrics.tsx       # Social proof stats
│   │   │   └── InteractiveDemo.tsx
│   │   └── onboarding/
│   │       ├── TopicCard.tsx
│   │       ├── OrientationOverlay.tsx
│   │       └── ProgressIndicator.tsx
│   └── services/
│       ├── authService.ts            # API calls for auth
│       └── onboardingService.ts      # API calls for onboarding
└── tests/
    ├── unit/
    │   └── components/
    └── e2e/
        ├── signup-flow.spec.ts
        ├── oauth-flow.spec.ts
        └── onboarding-journey.spec.ts

# Shared Database Models
packages/db-models/
└── prisma/
    ├── schema.prisma                 # User, VerificationToken, OnboardingProgress entities
    └── migrations/

# Shared Packages
packages/common/
└── src/
    └── validation/
        ├── password-validator.ts     # Password strength rules
        └── email-validator.ts        # Email format validation
```

**Structure Decision**: Web application architecture with separate frontend/backend. User service handles all authentication/onboarding logic. Frontend provides responsive UI for the complete onboarding journey. Shared db-models package contains Prisma schema for user entities.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations - section not applicable._

---

## Phase 0: Research (Complete)

All technical decisions documented in [research.md](./research.md).

**Key Decisions**:
- AWS Cognito for authentication (email/password + OAuth)
- Google and Apple OAuth providers
- Email verification via Cognito built-in flows
- Demo content from curated real discussions
- Database-backed onboarding progress
- Progressive enhancement for landing page
- Non-modal 3-step orientation

---

## Phase 1: Design & Contracts (Complete)

### Data Model

Complete entity definitions in [data-model.md](./data-model.md).

**Core Entities**:
- User (auth, email verification status)
- VerificationToken (24-hour expiry, 6-digit codes)
- OnboardingProgress (state tracking across 4 steps)
- TopicInterest (2-3 selections per user)
- Topic (activity levels for informed selection)
- VisitorSession (pre-auth demo tracking)

### API Contracts

Full OpenAPI 3.0 specification in [contracts/openapi.yaml](./contracts/openapi.yaml).

**Endpoint Summary**:
- Authentication: signup, verify-email, resend, login
- OAuth: initiate (Google/Apple), callback
- Demo: GET /demo/discussions
- Topics: browse, select
- Onboarding: progress tracking, milestone marking

### Quickstart Guide

Developer setup guide in [quickstart.md](./quickstart.md).

**Covers**:
- AWS Cognito setup
- OAuth provider configuration
- Local development environment
- Testing flows end-to-end
- Troubleshooting common issues

---

## Post-Phase 1 Constitution Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| **Code Quality** | ✅ PASS | TypeScript strict mode in design, comprehensive types defined |
| **Testing Standards** | ✅ PASS | Test categories identified: unit (auth logic), integration (Cognito/OAuth), E2E (signup journey), contract (API validation) |
| **UX Consistency** | ✅ PASS | Consistent error responses defined in OpenAPI, loading states specified, accessibility requirements documented |
| **Performance Requirements** | ✅ PASS | Targets met: <3s API responses, <1.5s landing page, <60s email delivery, DB queries optimized with indexes |

**Post-Design Assessment**: All gates remain PASS. No new violations introduced.

---

## Next Steps

This plan is now complete. Proceed to task breakdown:

```bash
/speckit.tasks
```

This will generate `tasks.md` with the detailed implementation checklist based on this plan.

---

## Artifacts Summary

| File | Purpose | Status |
|------|---------|--------|
| spec.md | Feature requirements | ✅ Complete |
| plan.md | This file - implementation plan | ✅ Complete |
| research.md | Technical decisions & rationale | ✅ Complete |
| data-model.md | Entity definitions, Prisma schema | ✅ Complete |
| contracts/openapi.yaml | API specification | ✅ Complete |
| quickstart.md | Developer setup guide | ✅ Complete |
| tasks.md | Task breakdown (next phase) | ⏳ Pending |

**Branch**: 003-user-onboarding
**Ready for**: Task generation (`/speckit.tasks`)
