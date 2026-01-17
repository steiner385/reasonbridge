# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#40 (T042-T044) - Event infrastructure + EventPublisher utility
- ~248 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #40 (T044): Implemented EventPublisher utility in packages/common:
- EventPublisher interface with publish/publishBatch methods
- SnsEventPublisher class for AWS SNS integration
- Support for event metadata enrichment, message attributes, FIFO queues
- Lazy AWS SDK loading for optimal cold start performance
- Available at @unite-discord/common/events

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
