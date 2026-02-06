# Backlog Cleanup Quick Start Guide

**Date**: 2026-02-05
**Status**: Phase 1 complete (12 issues closed)
**Remaining**: 148 open issues

---

## Progress Tracker

| Phase | Status | Issues | Description |
|-------|--------|--------|-------------|
| **Phase 1** | ✅ **COMPLETE** | 12 closed | Infrastructure, testing, accessibility |
| **Phase 2** | ⏳ **WAITING** | 25 pending | After PR #780 merges |
| **Phase 3** | 📋 **PLANNING** | ~18 decision | Team grooming session needed |
| **Phase 4** | 📋 **BACKLOG** | ~36 valid | Re-prioritize for MVP/post-MVP |

**Net reduction**: 37 issues (23%) when Phase 1 & 2 complete
**Final backlog**: ~123 valid issues

---

## Phase 1: ✅ COMPLETE (12 Issues Closed)

**Completed**: 2026-02-05

### Closed Issues

✅ #260 - [T264] Loading states across all pages
✅ #263 - [T267] Keyboard navigation
✅ #264 - [T268] Accessibility audit fixes
✅ #269 - [T273] Structured logging (backend)
✅ #270 - [T274] Health check endpoints
✅ #347 - [T288] User fixtures
✅ #348 - [T289] Topic fixtures
✅ #349 - [T290] Response fixtures
✅ #352 - [T293] User factory with Faker
✅ #353 - [T294] Topic factory
✅ #354 - [T295] Response factory
✅ #355 - [T296] MSW server configuration

### Verification

```bash
# Check closed issues
for i in 260 263 264 269 270 347 348 349 352 353 354 355; do
  gh issue view $i --repo steiner385/reasonbridge --json state --jq ".state"
done
# Should all show: CLOSED
```

---

## Phase 2: ⏳ WAITING FOR PR #780 (25 Issues)

**Action Required**: Wait for PR #780 to merge, then run automated script

### Prerequisites

1. ✅ Automated script created: `scripts/close-topic-management-issues.sh`
2. ✅ Documentation: `scripts/README-close-topic-issues.md`
3. ⏳ **Waiting**: PR #780 must merge to main

### Quick Start (After PR Merge)

```bash
# Step 1: Check PR status
gh pr view 780 --repo steiner385/reasonbridge

# Step 2: Verify PR is merged (State: MERGED)

# Step 3: Dry run (preview only)
./scripts/close-topic-management-issues.sh

# Step 4: Review output, then execute
./scripts/close-topic-management-issues.sh --execute

# Step 5: Verify
gh issue list --repo steiner385/reasonbridge --state closed --limit 30
```

### Issues to Close

**25 issues total**: #207, #208, #209, #212, #214, #215, #217, #219-#236

**Categories**:
- Backend APIs (8 issues)
- Frontend components (11 issues)
- Testing (6 issues)

**Estimated time**: 5 minutes (automated)

---

## Phase 3: 📋 TEAM DECISION NEEDED (18 Issues)

**Action Required**: Schedule 30-minute backlog grooming session

### Decision Points

#### 1. AI Topic Features (2 issues)

- #210 [T214] AI topic quality check
- #211 [T215] AI framing suggestions

**Context**: PR #780 implements topics WITHOUT AI assistance

**Question**: Keep open for future iteration OR close as strategic pivot?

**Recommendation**: Mark as "future" and deprioritize for MVP

---

#### 2. Fact-Check Integration (11 issues)

- #249-#259 [T253-T263] All fact-check features

**Context**: `fact-check-service` exists but appears to be stub/demo only

**Question**: MVP scope OR post-MVP feature?

**Recommendation**:
- If MVP-critical: Implement immediately
- If post-MVP: Mark as "future" and close

---

#### 3. Topic Management Gaps (3 issues)

- #213 [T217] Topic linking
- #216 [T220] Topic creation events
- #218 [T222] Topic recommendations

**Context**: Not mentioned in PR #780 description

**Question**: Were these implemented in PR #780?

**Action**: Review PR #780 code to verify, then:
- If implemented: Close with PR reference
- If not implemented: Keep open and prioritize

---

#### 4. Other Decisions (2 issues)

- #206 [T210] Appeal E2E tests - Is appeal workflow complete?
- #272 [T276] Deployment docs - Are existing docs sufficient?

---

### Meeting Agenda Template

```markdown
## Backlog Grooming - Strategic Decisions

**Date**: [Schedule for this week]
**Duration**: 30 minutes
**Attendees**: Engineering team

### Agenda

1. **AI Topic Features** (#210, #211)
   - Decision: Future work or cancelled?
   - If future: Apply "future" label and deprioritize

2. **Fact-Check Integration** (#249-#259)
   - Decision: MVP scope or post-MVP?
   - If post-MVP: Close or mark "future"

3. **Topic Management Gaps** (#213, #216, #218)
   - Code review: Are these in PR #780?
   - If yes: Close
   - If no: Prioritize or defer

4. **Quick Decisions** (#206, #272)
   - Appeal tests: Complete or in progress?
   - Deployment docs: Sufficient or need more?

### Outcome

- [ ] All 18 issues have clear disposition
- [ ] "Future" label applied where appropriate
- [ ] Close issues that are no longer relevant
```

---

## Phase 4: 📋 RE-PRIORITIZE BACKLOG (36+ Issues)

**After Phase 1-3 complete, ~123 valid issues remain**

### Priority Framework

#### P0 - MVP Blockers (Must-Have Before Launch)

**Frontend:**
- #261 [T265] Error boundaries
- #267 [T271] SEO meta tags

**Backend:**
- #271 [T275] Graceful shutdown

**Estimated effort**: 2-3 days

---

#### P1 - Production Readiness (Week 1 Post-MVP)

**Analytics & Performance:**
- #268 [T272] Analytics integration (GA/Mixpanel)
- #266 [T270] Code splitting (React.lazy)

**Testing:**
- #371-#375 [T312-T316] Performance tests (k6)

**Estimated effort**: 1 week

---

#### P2 - Post-MVP Enhancements (Month 1)

**Follow/Following System** (12 issues):
- #237-#248 [T241-T252] Complete social features
- Database schema ready, just needs endpoints + UI

**Polish:**
- #262 [T266] Offline support
- #265 [T269] Responsive design polish

**Estimated effort**: 2 weeks

---

#### P3 - Future Features (Backlog)

**Testing Infrastructure** (14 issues):
- #350-#351 [T291-T292] Remaining fixtures
- #356-#360 [T297-T301] MSW mock handlers
- #363-#370 [T304-T311] Contract tests
- #376-#377 [T317-T318] Accessibility tests

**Optional Features:**
- #781 User ranking system
- #783 Child-friendly mode
- #785 Profile photo upload

**Estimated effort**: 1-2 months (can be done incrementally)

---

## Current Backlog Statistics

### Before Cleanup
- **Total**: 160 open issues
- **Status**: Cluttered with completed work

### After Phase 1 (Current)
- **Total**: 148 open issues
- **Closed**: 12 issues (7.5%)

### After Phase 2 (When PR #780 Merges)
- **Total**: 123 open issues
- **Closed**: 37 issues (23%)

### After Phase 3 (After Team Decisions)
- **Total**: ~105-115 open issues (depends on decisions)
- **Closed**: ~45-55 issues (28-34%)

### Final Prioritized Backlog
- **P0 (MVP)**: 3 issues
- **P1 (Week 1)**: 5 issues
- **P2 (Month 1)**: 14 issues
- **P3 (Future)**: 80+ issues

---

## Commands Reference

### Check Backlog Size

```bash
# Open issues
gh issue list --repo steiner385/reasonbridge --state open | wc -l

# Closed issues (recent)
gh issue list --repo steiner385/reasonbridge --state closed --limit 50

# Issues by label
gh issue list --repo steiner385/reasonbridge --label "priority:high"
```

### Phase 2 Automation

```bash
# Dry run
./scripts/close-topic-management-issues.sh

# Execute
./scripts/close-topic-management-issues.sh --execute
```

### Verify Specific Issues

```bash
# Check if issue is closed
gh issue view 260 --repo steiner385/reasonbridge --json state

# View issue with comments
gh issue view 260 --repo steiner385/reasonbridge --comments
```

---

## Related Documentation

- **Full Audit**: `docs/BACKLOG_AUDIT_2026-02-05.md` (comprehensive analysis)
- **Script Docs**: `scripts/README-close-topic-issues.md` (automation guide)
- **PR #780**: https://github.com/steiner385/reasonbridge/pull/780

---

## Next Actions

### Immediate (Today)
- ✅ Phase 1 complete (12 issues closed)
- ✅ Automation script created
- ✅ Documentation written

### This Week
- [ ] Wait for PR #780 to merge
- [ ] Run automated script (Phase 2)
- [ ] Schedule team grooming session (Phase 3)

### Next Week
- [ ] Execute team decisions from grooming
- [ ] Re-prioritize remaining backlog (Phase 4)
- [ ] Start work on P0 issues

---

## Success Metrics

**Goal**: Clean, actionable backlog with clear priorities

✅ **Achieved**:
- 12 completed issues removed
- Automated script for 25 more
- Clear process for remaining decisions

🎯 **Target** (after all phases):
- Backlog reduced by 28-34%
- All issues have priority labels
- P0 issues clearly identified
- Team aligned on strategic direction

---

## Contact

Questions about backlog cleanup:
- Review audit: `docs/BACKLOG_AUDIT_2026-02-05.md`
- Run script: `./scripts/close-topic-management-issues.sh`
- GitHub: https://github.com/steiner385/reasonbridge
