# Shared Task Notes

## Current Status
- Completed issue #118 (T122) - E2E: Request and view feedback flow
- ~167 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-18)
**Issue #118 (T122) - E2E: Request and view feedback flow:**
- Created comprehensive E2E test suite for feedback request/view flow
- Added 14 E2E tests in `frontend/e2e/request-and-view-feedback.spec.ts`
- Tests cover:
  - Requesting feedback via API with mocked endpoints
  - Viewing feedback with proper type-based styling
  - Displaying confidence scores and metadata
  - Dismissing feedback items
  - Error handling and edge cases
  - Multiple feedback types (FALLACY, UNSOURCED, AFFIRMATION, etc.)
- API mocking for isolated testing (no live backend required)
- Merged via PR #477

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
