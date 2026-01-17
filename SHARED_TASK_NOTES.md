# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- Completed issue #43 (T047) - React 18 + Vite frontend initialized
- ~245 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #43 (T047): Initialized React 18 app with Vite in frontend/:
- React 18.3.1 + TypeScript 5.7.3 + Vite 6.0.7
- ESLint configured with React-specific rules
- Development scripts: dev, build, preview, typecheck, lint
- Dev server on port 3000 with HMR
- Ready for TanStack Query, Zustand, Tailwind CSS, and design system components

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
