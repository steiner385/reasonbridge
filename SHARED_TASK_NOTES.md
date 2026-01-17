# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- Completed issues #43-#49 (T047-T053) - Frontend setup (React, Tailwind, Router, Query, UI, E2E)
- Completed issue #50 (T054) - CDK project structure for AWS infrastructure
- ~238 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #50 (T054): Create CDK project structure:
- Created infrastructure/cdk/ directory with CDK v2.173.4
- EksStack: VPC + EKS cluster (K8s 1.31) with general + AI node groups
- RdsStack: PostgreSQL 15 with multi-AZ, backups, performance insights
- ElastiCacheStack: Redis 7.1 with replication and encryption
- BedrockStack: IAM permissions for Claude models
- TypeScript build system configured and verified
- Comprehensive README with deployment instructions

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
