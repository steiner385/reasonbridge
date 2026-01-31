# Tasks: Phase 13 - Polish & Cross-Cutting Concerns

**Input**: GitHub Issues #419-431 (Polish phase tasks)
**Prerequisites**: All core user stories complete, main branch stable

**Organization**: Tasks grouped by category for systematic completion. Each issue becomes a branch, implements the fix, and merges back to main.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (independent of other tasks)
- Include exact file paths in descriptions
- Each task corresponds to a GitHub issue

## Path Conventions

- **Frontend**: `frontend/src/`
- **Services**: `services/[service-name]/src/`
- **Packages**: `packages/[package-name]/src/`
- **E2E Tests**: `frontend/e2e/`
- **Documentation**: Root level `.md` files and `docs/`

---

## Category 1: Observability & Monitoring

**Purpose**: Enable comprehensive system monitoring and debugging

### T361: Distributed Tracing with X-Ray (#421)

- [ ] T001 [P] Install AWS X-Ray SDK in services/api-gateway/package.json
- [ ] T002 [P] Install AWS X-Ray SDK in services/user-service/package.json
- [ ] T003 [P] Install AWS X-Ray SDK in services/discussion-service/package.json
- [ ] T004 [P] Install AWS X-Ray SDK in services/ai-service/package.json
- [ ] T005 [P] Install AWS X-Ray SDK in services/moderation-service/package.json
- [ ] T006 [P] Install AWS X-Ray SDK in services/notification-service/package.json
- [ ] T007 Create X-Ray configuration module in packages/shared/src/tracing/xray.ts
- [ ] T008 Add X-Ray middleware to services/api-gateway/src/main.ts
- [ ] T009 Propagate trace headers across service calls in packages/shared/src/http/client.ts
- [ ] T010 Add segment annotations for key operations in each service
- [ ] T011 Document X-Ray setup in CLAUDE.md observability section

### T362: Request Correlation IDs (#422)

- [ ] T012 Create correlation ID middleware in services/api-gateway/src/middleware/correlation.ts
- [ ] T013 Add correlation ID to request context in services/api-gateway/src/context/request-context.ts
- [ ] T014 Propagate correlation ID in HTTP client in packages/shared/src/http/client.ts
- [ ] T015 Include correlation ID in all service logs using packages/shared/src/logging/logger.ts
- [ ] T016 Add correlation ID to error responses in services/api-gateway/src/filters/error.filter.ts
- [ ] T017 Add correlation ID header to API responses (X-Correlation-ID)

### T360: Prometheus Metrics (#420)

- [ ] T018 [P] Add @willsoto/nestjs-prometheus to services/api-gateway/package.json
- [ ] T019 [P] Add @willsoto/nestjs-prometheus to services/user-service/package.json
- [ ] T020 [P] Add @willsoto/nestjs-prometheus to services/discussion-service/package.json
- [ ] T021 [P] Add @willsoto/nestjs-prometheus to services/ai-service/package.json
- [ ] T022 Create metrics module in packages/shared/src/metrics/prometheus.ts
- [ ] T023 Add /metrics endpoint to each service
- [ ] T024 Add custom metrics: request_duration_seconds, active_connections, cache_hits
- [ ] T025 Document metrics endpoints in CLAUDE.md

---

## Category 2: Performance Optimization

**Purpose**: Ensure system handles production load efficiently

### T363: Database Query Optimization (#423)

- [ ] T026 [P] Run EXPLAIN ANALYZE on discussion-service queries, document in docs/performance/queries.md
- [ ] T027 [P] Run EXPLAIN ANALYZE on user-service queries, document findings
- [ ] T028 [P] Run EXPLAIN ANALYZE on moderation-service queries, document findings
- [ ] T029 Add missing indexes to packages/db-models/prisma/schema.prisma
- [ ] T030 Create composite indexes for frequently joined tables
- [ ] T031 Add query performance logging in packages/shared/src/database/query-logger.ts
- [ ] T032 Verify index usage with EXPLAIN after optimization

### T364: Redis Caching Layer (#424)

- [ ] T033 Identify high-traffic endpoints (topics list, user profiles, discussions)
- [ ] T034 Create caching service in packages/shared/src/cache/redis-cache.service.ts
- [ ] T035 Add cache decorator in packages/shared/src/cache/cacheable.decorator.ts
- [ ] T036 [P] Implement caching for GET /topics in services/discussion-service/src/topics/topics.controller.ts
- [ ] T037 [P] Implement caching for GET /users/:id in services/user-service/src/users/users.controller.ts
- [ ] T038 [P] Implement caching for GET /discussions/:id in services/discussion-service/src/discussions/discussions.controller.ts
- [ ] T039 Add cache invalidation on mutations
- [ ] T040 Add cache hit/miss metrics to Prometheus

### T369: Load Testing with k6 (#429)

- [ ] T041 Install k6 and create test directory at k6/
- [ ] T042 Create k6 script for topics endpoint in k6/topics-load.js
- [ ] T043 Create k6 script for user authentication in k6/auth-load.js
- [ ] T044 Create k6 script for discussion participation in k6/discussions-load.js
- [ ] T045 Create k6 soak test configuration for 10,000 concurrent users in k6/soak-test.js
- [ ] T046 Run load tests and document results in docs/performance/load-test-results.md
- [ ] T047 Identify and fix bottlenecks found during load testing
- [ ] T048 Verify SC-014 (10k concurrent users) success criteria

---

## Category 3: Reliability & Resilience

**Purpose**: Ensure system handles failures gracefully

### T365: AI Service Graceful Degradation (#425)

- [ ] T049 Create fallback service in services/ai-service/src/fallback/fallback.service.ts
- [ ] T050 Implement circuit breaker pattern in packages/shared/src/resilience/circuit-breaker.ts
- [ ] T051 Add AI service health check endpoint in services/ai-service/src/health/health.controller.ts
- [ ] T052 Create cached/static responses for AI unavailable scenarios
- [ ] T053 Add fallback for bias detection in services/ai-service/src/bias/bias.service.ts
- [ ] T054 Add fallback for common ground in services/ai-service/src/common-ground/common-ground.service.ts
- [ ] T055 Log all fallback activations with correlation IDs
- [ ] T056 Add degraded mode indicator to API responses

---

## Category 4: Frontend Polish

**Purpose**: Improve user experience with loading states

### T366: Skeleton Loaders (#426)

- [ ] T057 [P] Create SkeletonLoader base component in frontend/src/components/ui/SkeletonLoader.tsx
- [ ] T058 [P] Create TopicCardSkeleton in frontend/src/components/topics/TopicCardSkeleton.tsx
- [ ] T059 [P] Create UserProfileSkeleton in frontend/src/components/profile/UserProfileSkeleton.tsx
- [ ] T060 [P] Create DiscussionSkeleton in frontend/src/components/discussions/DiscussionSkeleton.tsx
- [ ] T061 [P] Create ResponseThreadSkeleton in frontend/src/components/responses/ResponseThreadSkeleton.tsx
- [ ] T062 Implement skeleton in TopicsPage in frontend/src/pages/Topics/TopicsPage.tsx
- [ ] T063 Implement skeleton in ProfilePage in frontend/src/pages/Profile/ProfilePage.tsx
- [ ] T064 Implement skeleton in DiscussionPage (if exists)
- [ ] T065 Add Storybook stories for skeleton components

### T367: Accessibility Audit (#427) - PARTIALLY COMPLETE

> PR #729 fixed WCAG violations found in E2E tests. Additional audit may be needed.

- [x] T066 Fix select-name violation in TopicFilterUI.tsx (PR #729)
- [x] T067 Fix color-contrast violation in HomePage.tsx (PR #729)
- [ ] T068 Run axe-core audit on all pages programmatically
- [ ] T069 Test with screen reader (VoiceOver/NVDA)
- [ ] T070 Verify keyboard navigation on all interactive elements
- [ ] T071 Check focus indicators meet WCAG 2.2 AA
- [ ] T072 Document any intentional accessibility exceptions in docs/accessibility.md

---

## Category 5: Security

**Purpose**: Ensure system is secure against common vulnerabilities

### T368: OWASP Top 10 Audit (#428)

- [ ] T073 Audit for A01:2021 - Broken Access Control
- [ ] T074 Audit for A02:2021 - Cryptographic Failures
- [ ] T075 Audit for A03:2021 - Injection (SQL, NoSQL, Command)
- [ ] T076 Audit for A04:2021 - Insecure Design
- [ ] T077 Audit for A05:2021 - Security Misconfiguration
- [ ] T078 Audit for A06:2021 - Vulnerable Components (npm audit)
- [ ] T079 Audit for A07:2021 - Auth Failures
- [ ] T080 Audit for A08:2021 - Data Integrity Failures
- [ ] T081 Audit for A09:2021 - Security Logging Failures
- [ ] T082 Audit for A10:2021 - SSRF
- [ ] T083 Fix all identified vulnerabilities
- [ ] T084 Document security controls in docs/security.md

---

## Category 6: Documentation

**Purpose**: Ensure documentation is accurate and helpful

### T359: OpenAPI Spec Generation (#419)

- [ ] T085 [P] Add @nestjs/swagger to services/api-gateway/package.json
- [ ] T086 [P] Add @nestjs/swagger to services/user-service/package.json
- [ ] T087 [P] Add @nestjs/swagger to services/discussion-service/package.json
- [ ] T088 Configure Swagger module in each service's app.module.ts
- [ ] T089 Add API decorators to all controllers
- [ ] T090 Generate combined OpenAPI spec at /api-docs
- [ ] T091 Export OpenAPI JSON/YAML to docs/api/

### T370: Quickstart Validation (#430)

- [ ] T092 Follow quickstart.md from scratch in clean environment
- [ ] T093 Verify all pnpm commands work correctly
- [ ] T094 Verify Docker Compose setup works
- [ ] T095 Verify database migrations run successfully
- [ ] T096 Verify all services start correctly
- [ ] T097 Fix any outdated instructions found
- [ ] T098 Add troubleshooting section for common issues

### T371: CLAUDE.md Architecture Update (#431)

- [ ] T099 Document final microservices architecture
- [ ] T100 Update technology decisions section
- [ ] T101 Add observability section (X-Ray, Prometheus, logging)
- [ ] T102 Add performance section (caching, optimization)
- [ ] T103 Add security section (auth, OWASP compliance)
- [ ] T104 Add troubleshooting tips for common issues
- [ ] T105 Verify all file paths are accurate

---

## Dependencies & Execution Order

### Category Dependencies

1. **Observability (T001-T025)**: Can start immediately, foundation for other work
2. **Performance (T026-T048)**: Benefits from observability being in place
3. **Reliability (T049-T056)**: Benefits from observability and metrics
4. **Frontend (T057-T072)**: Independent, can run in parallel
5. **Security (T073-T084)**: Should run after core changes complete
6. **Documentation (T085-T105)**: Should run last to capture final state

### Recommended Execution Order

**Wave 1 (Parallel):**
- T362: Request Correlation IDs (foundational for all logging)
- T366: Skeleton Loaders (frontend, independent)
- T359: OpenAPI Spec Generation (documentation, independent)

**Wave 2 (After Wave 1):**
- T361: Distributed Tracing (uses correlation IDs)
- T360: Prometheus Metrics (observability)
- T363: Database Query Optimization

**Wave 3 (After Wave 2):**
- T364: Redis Caching Layer (uses metrics for monitoring)
- T365: AI Service Graceful Degradation
- T367: Accessibility Audit completion

**Wave 4 (After Wave 3):**
- T369: Load Testing (needs caching and optimizations in place)
- T368: OWASP Security Audit

**Wave 5 (Final):**
- T370: Quickstart Validation
- T371: CLAUDE.md Update (captures all changes)

---

## Issue-to-Branch Mapping

| Issue | Branch Name | Tasks |
|-------|-------------|-------|
| #419 | issue-419-openapi-spec | T085-T091 |
| #420 | issue-420-prometheus-metrics | T018-T025 |
| #421 | issue-421-xray-tracing | T001-T011 |
| #422 | issue-422-correlation-ids | T012-T017 |
| #423 | issue-423-query-optimization | T026-T032 |
| #424 | issue-424-redis-caching | T033-T040 |
| #425 | issue-425-ai-graceful-degradation | T049-T056 |
| #426 | issue-426-skeleton-loaders | T057-T065 |
| #427 | issue-427-accessibility-audit | T066-T072 |
| #428 | issue-428-owasp-audit | T073-T084 |
| #429 | issue-429-load-testing | T041-T048 |
| #430 | issue-430-quickstart-validation | T092-T098 |
| #431 | issue-431-claude-md-update | T099-T105 |

---

## Workflow Per Issue

```bash
# 1. Create branch from main
git checkout main && git pull origin main
git checkout -b issue-XXX-description

# 2. Implement tasks for the issue

# 3. Commit and push
git add . && git commit -m "feat/fix: Description (closes #XXX)"
git push -u origin issue-XXX-description

# 4. Create PR and merge after CI passes
gh pr create --title "Description (closes #XXX)" --body "..."

# 5. After merge, pull main and continue to next issue
git checkout main && git pull origin main
```

---

## Summary

- **Total Tasks**: 105
- **Issues Covered**: 13 (#419-#431)
- **Parallel Opportunities**: 40+ tasks marked [P]
- **Estimated Waves**: 5 execution waves

**MVP Scope**: Wave 1 + Wave 2 (Observability + Performance basics)
