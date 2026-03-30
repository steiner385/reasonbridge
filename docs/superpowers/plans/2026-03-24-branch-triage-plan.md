# Branch Triage Plan

**Date:** 2026-03-24
**Total Branches:** 23 unmerged branches
**Goal:** Complete, merge, or delete all stale branches

---

## Summary

| Category                        | Count | Action                      |
| ------------------------------- | ----- | --------------------------- |
| Open issues (keep/complete)     | 3     | Review and complete         |
| Closed issues (verify & delete) | 7     | Verify in main, then delete |
| No issue (review needed)        | 13    | Analyze and decide          |

---

## Category 1: Branches with OPEN Issues (3)

These branches are for active work. Review if they should be completed or if the approach has changed.

| Branch                                    | Issue | Commits | Action                                          |
| ----------------------------------------- | ----- | ------- | ----------------------------------------------- |
| `chore/e2e-discussion-page-2panel-1081`   | #1081 | 1       | **Review** - E2E tests for 2-panel architecture |
| `fix/profile-trust-indicators-1082`       | #1082 | 1       | **Review** - Profile trust indicator tests      |
| `fix/e2e-guest-readonly-reliability-1087` | #1087 | 1       | **Review** - Guest read-only mode reliability   |

**Recommended approach:**

1. Check if the branch approach is still valid
2. If yes: rebase on main, complete work, create PR
3. If no: close issue with explanation, delete branch

---

## Category 2: Branches with CLOSED Issues (7)

These issues are closed but branches remain. Need to verify if work was merged via different means.

| Branch                               | Issue | Commits | Last Activity |
| ------------------------------------ | ----- | ------- | ------------- |
| `feat/1034-share-button`             | #1034 | 3       | 2026-03-19    |
| `feat/1042-link-previews`            | #1042 | 1       | 2026-03-20    |
| `feat/1043-swipe-gestures`           | #1043 | 1       | 2026-03-20    |
| `feat/1049-visual-regression-tests`  | #1049 | 1       | 2026-03-20    |
| `feat/1051-sms-push-notifications`   | #1051 | 1       | 2026-03-20    |
| `feat/1053-user-avatars`             | #1053 | 25      | 2026-03-21    |
| `feat/1073-login-modal-enhancements` | #1073 | 1       | 2026-03-21    |

**Recommended approach:**

1. Check how issue was closed (merged PR vs manual close)
2. Verify functionality exists in main
3. If redundant: delete branch
4. If not merged but issue closed prematurely: reopen issue or create PR

**High priority review:** `feat/1053-user-avatars` has 25 commits - significant work that may not be in main.

---

## Category 3: Branches without Issues (13)

These need individual analysis to determine if work is valuable or obsolete.

### Likely Safe to Delete (small fixes that may be in main)

| Branch                                      | Commits | Description               |
| ------------------------------------------- | ------- | ------------------------- |
| `docs/preview-feedback-mock-only-pattern`   | 1       | Documentation only        |
| `fix/drop-orphaned-response-search-trigger` | 1       | DB fix - check if applied |
| `fix/duplicate-topic-links-route`           | 1       | Route fix                 |
| `fix/login-page-duplicate-text`             | 1       | UI text fix               |
| `fix/merge-topics-tests-use-seeded-data`    | 1       | Test improvement          |
| `fix/remove-placeholder-e2e-tests`          | 1       | Test cleanup              |
| `fix/see-how-it-works-button`               | 1       | UI fix                    |
| `fix/add-seeded-moderated-responses`        | 1       | Test data                 |

### Need Deeper Review (larger changes)

| Branch                            | Commits | Description                 |
| --------------------------------- | ------- | --------------------------- |
| `feat/forgot-password`            | 15      | Full feature implementation |
| `fix/browse-topics-e2e-tests`     | 7       | Multiple test fixes         |
| `feat/error-state-retry-buttons`  | 1       | Error handling feature      |
| `fix/contract-test-flakiness`     | 2       | Test reliability            |
| `fix/jenkinsfile-load-shared-lib` | 2       | CI/CD fix                   |

**High priority review:** `feat/forgot-password` has 15 commits - likely a complete feature.

---

## Execution Plan

### Phase 1: Quick Wins - Verify & Delete (Est. 30 min)

1. **Closed issue branches** - For each:

   ```bash
   # Check if functionality exists in main
   # If yes, delete branch
   gh api repos/steiner385/reasonbridge/git/refs/heads/<branch> -X DELETE
   ```

2. **Small fix branches without issues** - For each:
   - Check if fix is in main
   - If yes, delete

### Phase 2: Review Large Branches (Est. 1 hour)

1. **feat/1053-user-avatars (25 commits)**
   - Check if avatar support exists in main
   - If not: create PR or reopen issue

2. **feat/forgot-password (15 commits)**
   - Check if forgot password feature exists
   - If not: create issue and PR

3. **fix/browse-topics-e2e-tests (7 commits)**
   - Review test changes
   - Determine if still relevant

### Phase 3: Complete Open Issue Branches (Est. 2 hours)

1. Review each open issue (#1081, #1082, #1087)
2. Decide: complete the branch work OR close issue with explanation
3. Create PRs for valid work

---

## Verification Checklist

For each branch before deletion:

- [ ] Confirmed issue is closed (if applicable)
- [ ] Verified functionality exists in main
- [ ] No unique commits that should be preserved
- [ ] No open PRs referencing this branch

---

## Expected Outcome

| Metric            | Before | After                     |
| ----------------- | ------ | ------------------------- |
| Unmerged branches | 23     | ~5 (open issue work only) |
| Stale branches    | 20     | 0                         |
| Technical debt    | High   | Low                       |
