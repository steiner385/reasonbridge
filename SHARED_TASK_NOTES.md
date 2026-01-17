# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- Completed issues #43-#49 (T047-T053) - Frontend setup (React, Tailwind, Router, Query, UI, E2E)
- Completed issues #50-#53 (T054-T057) - Complete CDK infrastructure with tests (Aurora + Redis + EKS)
- ~235 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #53 (T057): Add comprehensive tests for EKS cluster stack:
- EKS stack was already implemented, added missing test coverage
- Created 11 comprehensive test cases covering cluster, VPC, and node groups
- Tests verify Kubernetes 1.31, VPC with 3 AZs, general and AI node groups
- All 20 CDK tests now passing (ElastiCache + EKS)

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
