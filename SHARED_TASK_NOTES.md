# Shared Task Notes

## Current Status
- Completed issue #119 (T123) - E2E: Apply suggestion flow
- ~166 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-18)
**Issue #119 (T123) - E2E: Apply suggestion flow:**
- Created comprehensive E2E test suite for applying AI suggestions
- Added 17 E2E tests in `frontend/e2e/apply-suggestion-flow.spec.ts`
- Tests cover:
  - Tag suggestions: requesting, applying, and dismissing
  - Topic link suggestions with 5 relationship types (supports, contradicts, extends, questions, relates_to)
  - Applying single and multiple suggestions
  - Error handling for failed applications
  - State management for applied/dismissed suggestions
  - Confidence scores, reasoning, and metadata validation
- API mocking for isolated testing (no live backend required)
- Merged via PR #478

## Notes
- pnpm is now installed globally and should be used for workspace operations
- The `status: in-progress` label was created for issue tracking
- All PRs are being squash-merged to main

## Workflow
1. `npm run next-issue` - claims highest priority issue
2. Create feature branch from main
3. Implement, commit, push
4. Create PR via `gh pr create`
5. Merge via `gh pr merge --squash`
6. Pull main, repeat
