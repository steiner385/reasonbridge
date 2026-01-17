# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- Completed issue #43 (T047) - React 18 + Vite frontend initialized
- Completed issue #44 (T048) - TailwindCSS with comprehensive design tokens
- Completed issue #45 (T049) - React Router with route definitions
- Completed issue #46 (T050) - TanStack Query for data fetching
- ~242 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #46 (T050): Set up TanStack Query for data fetching in frontend/src/lib/:
- Installed @tanstack/react-query v5.90.18
- Created queryClient.ts with optimized defaults (5min stale, 10min cache)
- Created QueryProvider.tsx wrapper component
- Integrated QueryProvider into main.tsx app root
- Added useExampleQuery.ts as reference implementation
- All tests passing (typecheck, lint, build: 207KB bundle)

## Next Steps
Run `npm run next-issue` to claim and implement the next highest priority issue.

## Notes
- pnpm is now installed globally and should be used for workspace operations
- The `status: in-progress` label was created for issue tracking
- All PRs are being squash-merged to main
- Local npm registry (Verdaccio) is running at localhost:4873

## Workflow
1. `npm run next-issue` - claims highest priority issue
2. Create feature branch from main
3. Implement, commit, push
4. Create PR via `gh pr create`
5. Merge via `gh pr merge --squash`
6. Pull main, repeat
