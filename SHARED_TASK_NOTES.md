# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#39 (T042-T043) - SNS/SQS event infrastructure in LocalStack
- ~249 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #39 (T043): Created comprehensive SNS topic infrastructure for pub/sub architecture:
- 9 event topics organized by domain (discussion, moderation, AI analysis, notifications, system)
- Topics auto-initialized via docker-compose LocalStack mount
- Subscriptions managed by application services at startup (LocalStack 3 CE limitation workaround)
- Comprehensive documentation with TypeScript implementation examples

Issue #38 (T042): Created comprehensive SQS queue infrastructure:
- 7 primary event processing queues + 3 utility queues
- Each queue has dedicated DLQ with retry policies

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
