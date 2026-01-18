# Shared Task Notes

## Current Status

- All lint, format, and type checks passing on main
- Ready for next issue
- ~161 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-18)

**Lint/Format Fixes:**
- Fixed Prettier formatting issues across 4 files
- All lint checks, format checks, and type checks now pass
- PR #493 merged (3 files from T127), additional fix pushed directly to main

## Notes

- pnpm is now installed globally and should be used for workspace operations
- The `status: in-progress` label was created for issue tracking
- All PRs are being squash-merged to main
- Jest is now set up for both ai-service and discussion-service

## Workflow

1. `npm run next-issue` - claims highest priority issue
2. Create feature branch from main
3. Implement, commit, push
4. Create PR via `gh pr create`
5. Merge via `gh pr merge --squash`
6. Pull main, repeat
