# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- Completed issues #43-#49 (T047-T053) - Frontend setup (React, Tailwind, Router, Query, UI, E2E)
- Completed issues #50-#51 (T054-T055) - CDK infrastructure with Aurora Serverless v2
- ~237 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #51 (T055): Migrate RDS stack to Aurora Serverless v2:
- Replaced DatabaseInstance with DatabaseCluster (Aurora PostgreSQL 15.5)
- Writer instance: auto-scales 0.5-16 ACUs
- Reader instance: auto-scales 0.5-16 ACUs
- Multi-AZ with automatic failover
- Cost-effective pay-per-use pricing
- Maintained encryption, backups, performance insights
- Updated README with Aurora Serverless v2 details

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
