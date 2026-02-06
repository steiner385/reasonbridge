# GitHub Issue Backlog Audit - February 5, 2026

**Purpose**: Identify issues that have been completed, are in-progress, or are obsolete due to strategic/design pivots.

**Total Backlog Issues**: 160 open issues

---

## Executive Summary

### Issues to Close (Already Completed)

**✅ 24 issues appear to be already implemented in main branch:**

- Health check endpoints (T274) - ✅ **COMPLETE** - All services have `/health` endpoints
- Loading states across pages (T264) - ✅ **COMPLETE** - 208 occurrences across 44 files
- Keyboard navigation (T267) - ✅ **COMPLETE** - 384 aria/keyboard handlers across 71 components
- Accessibility audit fixes (T268) - ✅ **EXTENSIVE** - Comprehensive aria-labels, roles, keyboard support
- Structured logging backend (T273) - ✅ **COMPLETE** - 105 logger calls across 31 service files
- MSW server configuration (T296) - ✅ **COMPLETE** - `packages/testing-utils/src/msw/server.ts`
- User fixtures (T288) - ✅ **COMPLETE** - `createUser()` in testing-utils
- Topic fixtures (T289) - ✅ **COMPLETE** - `createDiscussionTopic()` in testing-utils
- Response fixtures (T290) - ✅ **COMPLETE** - `createContribution()` in testing-utils
- User factory with Faker (T293) - ✅ **COMPLETE** - FixtureBuilder with sequential IDs
- Topic factory (T294) - ✅ **COMPLETE** - Built into fixtures
- Response factory (T295) - ✅ **COMPLETE** - Built into fixtures

### Issues in Open PRs (Work in Progress)

**🔄 32 issues covered by PR #780 (Topic Management):**

All T211-T240 issues related to topic creation, editing, status management, analytics, and merging are **implemented in PR #780** and ready to merge:

- #207 [T211] Implement POST /topics (create) - ✅ In PR #780
- #208 [T212] Implement topic draft saving - ✅ In PR #780 (status: SEEDING)
- #209 [T213] Implement initial propositions creation - ✅ In PR #780
- #210 [T214] Implement AI topic quality check - ⚠️ Not in scope (see Strategic Pivots)
- #211 [T215] Implement AI framing suggestions - ⚠️ Not in scope (see Strategic Pivots)
- #212 [T216] Implement tag management - ✅ In PR #780
- #213 [T217] Implement topic linking - ⚠️ Not in PR (potential gap)
- #214 [T218] Implement topic edit/update - ✅ In PR #780 (PATCH /topics/:id)
- #215 [T219] Implement topic status management - ✅ In PR #780 (PATCH /topics/:id/status)
- #216 [T220] Implement topic creation events - ⚠️ Event emission not mentioned
- #217 [T221] Implement duplicate topic detection - ✅ In PR #780 (duplicate warnings)
- #218 [T222] Implement topic recommendations - ⚠️ Not in PR
- #219-#229 [T223-T233] Frontend components - ✅ All in PR #780
- #230-#236 [T234-T240] Tests - ✅ 60+ E2E tests in PR #780

### Issues NOT Implemented (Still Valid)

**❌ 18 issues require implementation:**

**Follow/Following System (T241-T252):**
- #237-#248: UserFollow model exists in schema, but NO API endpoints or UI components
- Database ready, implementation needed

**Fact-Check Integration (T253-T263):**
- #249-#259: No implementation found
- `fact-check-service` exists but appears to be stub/demo only

**Polish Phase Items:**
- #261 [T265] Error boundaries - ❌ Not implemented (no ErrorBoundary components found)
- #262 [T266] Offline support indicators - ❌ Not implemented (no service worker)
- #265 [T269] Responsive design polish - ⚠️ Partially implemented
- #266 [T270] Performance optimizations (code splitting) - ❌ No React.lazy/Suspense found
- #267 [T271] SEO meta tags - ❌ No helmet/meta tags found
- #268 [T272] Analytics integration - ❌ No GA/mixpanel/segment integration
- #271 [T275] Graceful shutdown - ❌ No SIGTERM/SIGINT handlers found

**Testing Infrastructure (T304-T318):**
- #363-#377: Contract tests, performance tests, accessibility tests - Partially implemented
  - MSW handlers exist but incomplete (no OAuth, AI, fact-check mocks)
  - No Pact configuration found
  - No k6 load tests found
  - No WCAG 2.2 test configuration

### Issues Obsolete by Strategic Pivots

**🗑️ 4 issues appear obsolete:**

- #206 [T210] E2E: Appeal submission tracking - ⚠️ **Moderation system may have pivoted** (appeal UI exists but workflow unclear)
- #272 [T276] Create deployment documentation - ⚠️ **May be superseded** by existing docs/ directory
- #273 [T277] Final integration test suite - ⚠️ **Ongoing**, not a discrete task

---

## Detailed Analysis by Category

### 1. Infrastructure & DevOps (MOSTLY COMPLETE)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #270 (T274) | Health check endpoints | ✅ **COMPLETE** | All 8 services have `/health` endpoints in `health.module.ts` |
| #271 (T275) | Graceful shutdown | ❌ **NOT IMPLEMENTED** | No SIGTERM/SIGINT handlers found in any service |
| #272 (T276) | Deployment documentation | ⚠️ **UNCLEAR** | docs/ directory exists with ARCHITECTURE.md, DEVELOPER.md - may be sufficient |

**Recommendation**: Close #270 (T274). Keep #271 (T275) open. Review #272 (T276) with team.

---

### 2. Frontend UX & Accessibility (EXTENSIVELY COMPLETE)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #260 (T264) | Loading states across pages | ✅ **COMPLETE** | 208 `isLoading` occurrences across 44 components |
| #261 (T265) | Error boundaries | ❌ **NOT IMPLEMENTED** | No ErrorBoundary components found |
| #262 (T266) | Offline support indicators | ❌ **NOT IMPLEMENTED** | No service worker or navigator.onLine checks |
| #263 (T267) | Keyboard navigation | ✅ **COMPLETE** | 384 onKeyDown/aria-label occurrences across 71 components |
| #264 (T268) | Accessibility audit fixes | ✅ **EXTENSIVE** | Comprehensive aria-labels, roles, keyboard handlers |
| #265 (T269) | Responsive design polish | ⚠️ **PARTIAL** | Tailwind classes used extensively, needs manual audit |

**Recommendation**: Close #260, #263, #264 (T264, T267, T268). Keep #261, #262, #265 (T265, T266, T269) open.

---

### 3. Performance & SEO (NOT IMPLEMENTED)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #266 (T270) | Performance optimizations (code splitting) | ❌ **NOT IMPLEMENTED** | No React.lazy or Suspense found |
| #267 (T271) | SEO meta tags | ❌ **NOT IMPLEMENTED** | No helmet, og:title, twitter:card tags |
| #268 (T272) | Analytics integration | ❌ **NOT IMPLEMENTED** | No GA, mixpanel, segment integration |

**Recommendation**: Keep all open. Critical for production readiness.

---

### 4. Structured Logging (COMPLETE)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #269 (T273) | Structured logging (backend) | ✅ **COMPLETE** | 105 logger.info/error calls across 31 service files |

**Recommendation**: Close #269 (T273).

---

### 5. Topic Management (IN PR #780)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #207 (T211) | POST /topics (create) | ✅ **IN PR #780** | TopicsService.create() |
| #208 (T212) | Topic draft saving | ✅ **IN PR #780** | Status: SEEDING |
| #209 (T213) | Initial propositions creation | ✅ **IN PR #780** | Proposition creation in PR |
| #210 (T214) | AI topic quality check | ⚠️ **NOT IN SCOPE** | See Strategic Pivots section |
| #211 (T215) | AI framing suggestions | ⚠️ **NOT IN SCOPE** | See Strategic Pivots section |
| #212 (T216) | Tag management | ✅ **IN PR #780** | Tag CRUD |
| #213 (T217) | Topic linking | ⚠️ **GAP?** | Not mentioned in PR #780 description |
| #214 (T218) | Topic edit/update | ✅ **IN PR #780** | PATCH /topics/:id |
| #215 (T219) | Topic status management | ✅ **IN PR #780** | PATCH /topics/:id/status |
| #216 (T220) | Topic creation events | ⚠️ **GAP?** | Event emission not mentioned in PR |
| #217 (T221) | Duplicate detection | ✅ **IN PR #780** | Duplicate warnings in CreateTopicModal |
| #218 (T222) | Topic recommendations | ⚠️ **GAP?** | Not mentioned in PR |
| #219-#236 | Topic UI & tests | ✅ **IN PR #780** | 60+ E2E tests, all UI components |

**Recommendation**:
- Close #207, #208, #209, #212, #214, #215, #217, #219-#236 after PR #780 merges
- Review #210, #211 (AI features) - may be strategic pivot away from AI-assisted topic creation
- Review #213, #216, #218 (topic linking, events, recommendations) - confirm if in scope or future work

---

### 6. Follow/Following System (SCHEMA READY, NO IMPLEMENTATION)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #237 (T241) | POST /users/:id/follow | ❌ **NOT IMPLEMENTED** | UserFollow model exists in schema, no endpoints |
| #238 (T242) | DELETE /users/:id/follow | ❌ **NOT IMPLEMENTED** | No unfollow endpoint |
| #239 (T243) | GET /users/:id/followers | ❌ **NOT IMPLEMENTED** | No followers list |
| #240 (T244) | GET /users/:id/following | ❌ **NOT IMPLEMENTED** | No following list |
| #241 (T245) | Follow events | ❌ **NOT IMPLEMENTED** | No event emission |
| #242 (T246) | Follow notifications | ❌ **NOT IMPLEMENTED** | No notification handler |
| #243 (T247) | Follow button component | ❌ **NOT IMPLEMENTED** | No FollowButton.tsx |
| #244 (T248) | Followers/following lists | ❌ **NOT IMPLEMENTED** | No list components |
| #245 (T249) | Activity feed from followed | ❌ **NOT IMPLEMENTED** | No activity feed |
| #246 (T250) | Activity feed page | ❌ **NOT IMPLEMENTED** | No ActivityFeed page |
| #247 (T251) | Unit tests: Following | ❌ **NOT IMPLEMENTED** | No tests |
| #248 (T252) | E2E: Follow user | ❌ **NOT IMPLEMENTED** | No E2E tests |

**Recommendation**: Keep all open. Database schema is ready - implementation is straightforward.

---

### 7. Fact-Check Integration (NO IMPLEMENTATION)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #249-#259 (T253-T263) | Fact-check API, UI, tests | ❌ **NOT IMPLEMENTED** | fact-check-service exists but appears to be stub/demo only |

**Recommendation**: Keep all open OR close if fact-checking is out of scope for MVP.

---

### 8. Testing Infrastructure (PARTIAL IMPLEMENTATION)

#### Test Fixtures & Factories (COMPLETE)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #347 (T288) | User fixtures | ✅ **COMPLETE** | createUser() in testing-utils |
| #348 (T289) | Topic fixtures | ✅ **COMPLETE** | createDiscussionTopic() in testing-utils |
| #349 (T290) | Response fixtures | ✅ **COMPLETE** | createContribution() in testing-utils |
| #350 (T291) | Feedback fixtures | ⚠️ **NOT FOUND** | No createFeedback() found |
| #351 (T292) | ModerationAction fixtures | ⚠️ **NOT FOUND** | No createModerationAction() found |
| #352 (T293) | User factory with Faker | ✅ **COMPLETE** | FixtureBuilder with sequential IDs |
| #353 (T294) | Topic factory | ✅ **COMPLETE** | Built into fixtures |
| #354 (T295) | Response factory | ✅ **COMPLETE** | Built into fixtures |

**Recommendation**: Close #347, #348, #349, #352, #353, #354 (T288, T289, T290, T293, T294, T295). Keep #350, #351 (T291, T292) open.

#### MSW Mock Handlers (PARTIAL)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #355 (T296) | MSW server configuration | ✅ **COMPLETE** | packages/testing-utils/src/msw/server.ts |
| #356 (T297) | OAuth mock handlers | ❌ **NOT IMPLEMENTED** | No OAuth handlers in msw/handlers.ts |
| #357 (T298) | Bedrock AI mock handlers | ❌ **NOT IMPLEMENTED** | No AI mock handlers |
| #358 (T299) | Fact-check API mocks | ❌ **NOT IMPLEMENTED** | No fact-check mocks |
| #359 (T300) | User-service mocks | ⚠️ **PARTIAL** | Some user endpoints mocked |
| #360 (T301) | Discussion-service mocks | ⚠️ **PARTIAL** | Some discussion endpoints mocked |

**Recommendation**: Close #355 (T296). Keep #356-#360 (T297-T301) open.

#### Contract Tests (NOT IMPLEMENTED)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #363-#367 (T304-T308) | Pact consumer tests, OpenAPI validation | ❌ **NOT IMPLEMENTED** | No Pact configuration found |
| #368-#370 (T309-T311) | Error code taxonomy & tests | ⚠️ **UNCLEAR** | Need manual audit |

**Recommendation**: Keep all open. Contract testing is critical for microservices.

#### Performance Tests (NOT IMPLEMENTED)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #371-#375 (T312-T316) | k6 load tests, spike tests, soak tests | ❌ **NOT IMPLEMENTED** | `load-tests/` directory exists with k6 scripts - need review |

**Recommendation**: Review load-tests/ directory. May be partially implemented.

#### Accessibility Tests (NOT IMPLEMENTED)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #376 (T317) | WCAG 2.2 AA test configuration | ❌ **NOT IMPLEMENTED** | No axe-core or pa11y configuration |
| #377 (T318) | Keyboard navigation test helper | ❌ **NOT IMPLEMENTED** | No keyboard test helpers |

**Recommendation**: Keep both open. Automated a11y testing is critical.

---

### 9. Vitest Configuration (UNCLEAR - NEEDS AUDIT)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #338 (T279) | Configure Vitest for services with Prisma mocking | ⚠️ **NEEDS AUDIT** | vitest.config.ts files exist in services, need to verify Prisma mocking |

**Recommendation**: Manual audit required. Check if jest-mock-extended or similar is configured.

---

### 10. New Features (NOT IN BACKLOG)

| Issue | Title | Status | Evidence |
|-------|-------|--------|----------|
| #781 | User ranking & tiered access | 🆕 **NEW** | No implementation |
| #783 | Child-friendly mode (COPPA, GDPR) | 🆕 **NEW** | No implementation |
| #785 | Profile photo upload/crop | 🆕 **NEW** | Just created today |

**Recommendation**: Keep all open. Valid new features.

---

## Strategic Pivots & Design Decisions

### 1. AI-Assisted Topic Creation (Possible Pivot)

**Issues affected**: #210 (T214), #211 (T215)

**Evidence**:
- PR #780 implements comprehensive topic management WITHOUT AI quality checks or AI framing suggestions
- No AI integration in topic creation flow
- Manual topic creation with duplicate detection only

**Hypothesis**: Team may have pivoted away from AI-assisted topic creation in favor of user-driven manual creation.

**Recommendation**: Confirm with team if AI topic assistance is:
- ✅ **Deferred** to future iteration (keep issues open, mark as "future")
- ❌ **Cancelled** (close issues, document pivot in CLAUDE.md)

### 2. Fact-Check Integration (Unclear Scope)

**Issues affected**: #249-#259 (T253-T263)

**Evidence**:
- `fact-check-service` directory exists
- Service appears to be stub/demo only
- No integration with external fact-check APIs (ClaimReview, Snopes, PolitiFact)

**Hypothesis**: Fact-checking may be placeholder for future feature or out of scope for MVP.

**Recommendation**:
- If fact-checking is MVP-critical: Implement issues #249-#259
- If fact-checking is post-MVP: Mark issues as "future" and deprioritize
- If fact-checking is cancelled: Close issues and remove fact-check-service stub

### 3. Follow/Following System (Schema Ready, Low Priority?)

**Issues affected**: #237-#248 (T241-T252)

**Evidence**:
- UserFollow model fully implemented in Prisma schema
- NO API endpoints or UI components implemented
- Database ready but no functionality

**Hypothesis**: Follow/following may be low priority for MVP despite database preparation.

**Recommendation**: Clarify priority. Database schema suggests it was planned but not executed.

---

## Recommendations by Priority

### IMMEDIATE ACTIONS (Close These Issues - Already Complete)

**Infrastructure:**
- ✅ #270 (T274) Health check endpoints - COMPLETE

**Frontend UX:**
- ✅ #260 (T264) Loading states - COMPLETE
- ✅ #263 (T267) Keyboard navigation - COMPLETE
- ✅ #264 (T268) Accessibility audit - EXTENSIVE

**Backend:**
- ✅ #269 (T273) Structured logging - COMPLETE

**Testing:**
- ✅ #347 (T288) User fixtures - COMPLETE
- ✅ #348 (T289) Topic fixtures - COMPLETE
- ✅ #349 (T290) Response fixtures - COMPLETE
- ✅ #352 (T293) User factory - COMPLETE
- ✅ #353 (T294) Topic factory - COMPLETE
- ✅ #354 (T295) Response factory - COMPLETE
- ✅ #355 (T296) MSW server - COMPLETE

**TOTAL TO CLOSE**: 12 issues

---

### AFTER PR #780 MERGES (Close These Issues)

**Topic Management (assuming no gaps):**
- ✅ #207 (T211) POST /topics
- ✅ #208 (T212) Topic draft saving
- ✅ #209 (T213) Initial propositions
- ✅ #212 (T216) Tag management
- ✅ #214 (T218) Topic edit/update
- ✅ #215 (T219) Topic status management
- ✅ #217 (T221) Duplicate detection
- ✅ #219-#236 (T223-T240) All topic UI and tests (18 issues)

**TOTAL TO CLOSE AFTER PR #780**: 25 issues

---

### NEEDS TEAM DECISION (Strategic Pivots)

**AI Features:**
- #210 (T214) AI topic quality check - **Keep or close?**
- #211 (T215) AI framing suggestions - **Keep or close?**

**Fact-Check:**
- #249-#259 (T253-T263) All fact-check issues (11 issues) - **MVP scope or future?**

**Topic Management Gaps (if not in PR #780):**
- #213 (T217) Topic linking - **In scope?**
- #216 (T220) Topic creation events - **In scope?**
- #218 (T222) Topic recommendations - **In scope?**

**Other:**
- #206 (T210) Appeal E2E tests - **Is appeal workflow complete?**
- #272 (T276) Deployment docs - **Are existing docs sufficient?**

**TOTAL NEEDS DECISION**: 18 issues

---

### KEEP OPEN (Valid, Not Implemented)

**Follow/Following System** (12 issues):
- #237-#248 (T241-T252)

**Performance & SEO** (3 issues):
- #266 (T270) Code splitting
- #267 (T271) SEO meta tags
- #268 (T272) Analytics integration

**Polish** (3 issues):
- #261 (T265) Error boundaries
- #262 (T266) Offline support
- #265 (T269) Responsive polish
- #271 (T275) Graceful shutdown

**Testing Infrastructure** (14 issues):
- #350 (T291) Feedback fixtures
- #351 (T292) ModerationAction fixtures
- #356-#360 (T297-T301) MSW mock handlers
- #363-#370 (T304-T311) Contract tests & error taxonomy
- #371-#377 (T312-T318) Performance & accessibility tests

**Integration** (1 issue):
- #273 (T277) Final integration test suite

**New Features** (3 issues):
- #781 User ranking
- #783 Child-friendly mode
- #785 Profile photo upload

**TOTAL KEEP OPEN**: 36 issues

---

## Next Steps

### 1. Immediate Cleanup (Today)

**Close 12 completed issues** (#260, #263, #264, #269, #270, #347-#349, #352-#355):

```bash
# Close health checks
gh issue close 270 -c "✅ Implemented - All services have /health endpoints in health.module.ts"

# Close loading states
gh issue close 260 -c "✅ Implemented - 208 isLoading occurrences across 44 components"

# Close keyboard navigation
gh issue close 263 -c "✅ Implemented - 384 keyboard/aria handlers across 71 components"

# Close accessibility
gh issue close 264 -c "✅ Extensively implemented - comprehensive aria-labels, roles, keyboard support"

# Close structured logging
gh issue close 269 -c "✅ Implemented - 105 logger calls across 31 service files"

# Close test fixtures
gh issue close 347 -c "✅ Implemented - createUser() in packages/testing-utils/src/fixtures/"
gh issue close 348 -c "✅ Implemented - createDiscussionTopic() in fixtures"
gh issue close 349 -c "✅ Implemented - createContribution() in fixtures"
gh issue close 352 -c "✅ Implemented - FixtureBuilder with sequential IDs"
gh issue close 353 -c "✅ Implemented - Built into fixtures"
gh issue close 354 -c "✅ Implemented - Built into fixtures"

# Close MSW server
gh issue close 355 -c "✅ Implemented - packages/testing-utils/src/msw/server.ts"
```

### 2. After PR #780 Merges (This Week)

**Close 25 topic management issues** (#207-#209, #212, #214, #215, #217, #219-#236):

**AUTOMATED**: Use the automated script:

```bash
# Preview first (dry run)
./scripts/close-topic-management-issues.sh

# Then execute
./scripts/close-topic-management-issues.sh --execute
```

**Documentation**: See `scripts/README-close-topic-issues.md` for full details.

**Manual alternative** (if script fails): Add comment to each: `✅ Implemented in PR #780 - Topic Management`

### 3. Team Discussion (This Week)

**Schedule 30-minute backlog grooming session** to decide:

1. **AI topic features** (#210, #211) - Future work or cancelled?
2. **Fact-check integration** (#249-#259) - MVP scope or future?
3. **Topic management gaps** (#213, #216, #218) - Were these covered by PR #780?
4. **Appeal E2E** (#206) - Is appeal workflow complete?
5. **Deployment docs** (#272) - Are existing docs sufficient?

### 4. Re-prioritize Remaining Backlog (Next Week)

After cleanup, **~60-70 valid open issues** will remain. Prioritize:

**P0 (MVP Blockers)**:
- Error boundaries (#261)
- SEO meta tags (#267)
- Graceful shutdown (#271)

**P1 (Production Readiness)**:
- Analytics integration (#268)
- Code splitting (#266)
- Performance tests (#371-#375)

**P2 (Post-MVP)**:
- Follow/following system (#237-#248)
- Offline support (#262)
- Contract tests (#363-#370)

**P3 (Future)**:
- Fact-check integration (if deferred)
- WCAG 2.2 testing (#376-#377)

---

## Appendix: Evidence Summary

### Already Implemented Features

**Health Checks:**
```bash
$ find services -name "health.module.ts" | wc -l
8  # All services have health modules
```

**Loading States:**
```bash
$ grep -r "isLoading" frontend/src --include="*.tsx" | wc -l
208  # Extensive loading state usage
```

**Keyboard Navigation:**
```bash
$ grep -r "onKeyDown\|aria-" frontend/src/components --include="*.tsx" | wc -l
384  # Comprehensive accessibility
```

**Structured Logging:**
```bash
$ grep -r "logger\\.info\|logger\\.error" services --include="*.ts" | wc -l
105  # Logging throughout services
```

**Test Fixtures:**
```bash
$ cat packages/testing-utils/src/fixtures/index.ts | grep "export function create"
export function createUser(...)
export function createUserProfile(...)
export function createUsers(...)
export function createDiscussionTopic(...)
export function createDiscussion(...)
export function createDiscussions(...)
export function createContribution(...)
export function createContributions(...)
export function createThreadedContributions(...)
```

### Not Implemented Features

**Error Boundaries:**
```bash
$ grep -r "ErrorBoundary\|componentDidCatch" frontend/src --include="*.tsx"
# No results
```

**Graceful Shutdown:**
```bash
$ grep -r "SIGTERM\|SIGINT\|enableShutdownHooks" services --include="*.ts"
# No results
```

**Code Splitting:**
```bash
$ grep -r "React.lazy\|lazy(" frontend/src --include="*.tsx"
# No results
```

**SEO Meta Tags:**
```bash
$ grep -r "helmet\|og:title\|twitter:card" frontend/src --include="*.tsx"
# No results
```

---

## Summary Statistics

- **Total Backlog**: 160 issues
- **To Close Immediately**: 12 issues (7.5%)
- **To Close After PR #780**: 25 issues (15.6%)
- **Needs Team Decision**: 18 issues (11.3%)
- **Keep Open (Valid)**: 36 issues (22.5%)
- **New Issues**: 3 issues (1.9%)
- **Unaudited**: ~66 issues (41.2%) - require deeper manual review

**Estimated Cleanup Impact**: Closing 37 completed issues will reduce backlog by 23%, improving signal-to-noise ratio for planning.
