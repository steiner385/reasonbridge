# Shared Task Notes

## Current Status
- Completed issues #1-#4 (T001-T004) - Setup phase monorepo configuration
- ~269 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Next Steps
Run `npm run next-issue` to claim and implement the next highest priority issue.

The next issues to tackle are likely:
- T005: TypeScript base config (tsconfig.base.json)
- T006: Docker Compose setup
- Other setup/foundational infrastructure tasks

## Notes
- pnpm is not installed in the CI environment; pnpm-specific features in .npmrc cause npm warnings but don't block work
- The `status: in-progress` label was created during this iteration for issue tracking
- All PRs are being squash-merged to main

## Workflow
1. `npm run next-issue` - claims highest priority issue
2. Create feature branch from main
3. Implement, commit, push
4. Create PR via `gh pr create`
5. Merge via `gh pr merge --squash`
6. Pull main, repeat
