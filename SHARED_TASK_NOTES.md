# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issue #38 (T042) - SQS queue definitions in LocalStack
- ~250 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completion
Issue #38 (T042): Created comprehensive SQS queue infrastructure for event-driven architecture:
- 7 primary event processing queues (response-analysis, discussion-events, moderation, notification, user-trust, recommendation, common-ground)
- 3 utility queues (email, audit-log, global-dlq)
- Each primary queue has dedicated DLQ with appropriate retry policies
- Auto-initialized via docker-compose LocalStack mount
- Comprehensive README with usage examples

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
