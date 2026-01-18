# Shared Task Notes

## Current Status

- All lint checks, formatting checks, and TypeScript type checks passing
- ~169 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-17)

**Lint Check Fixes:**

- Fixed all ESLint errors (10 errors resolved)
- Fixed unused variables in test files
- Fixed unused imports in feedback components
- Fixed React Hook dependency warnings
- Added ESLint override for vitest config files to suppress import/no-unresolved errors
- Fixed TypeScript errors in topic-link suggester tests (added optional chaining for array access)
- Ran Prettier to format all files
- All checks passing: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`

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
