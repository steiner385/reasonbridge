# Shared Task Notes

## Current Status
- All lint checks are now passing (0 errors, 0 warnings)
- ~169 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-18)
**Lint fixes (2026-01-18):**
- Fixed all ESLint errors and warnings across the codebase
- Removed unused variables and imports
- Fixed React Hook dependency issues
- Configured ESLint to properly handle vitest config files

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
