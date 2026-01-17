# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#41 (T042-T045) - Complete event infrastructure (pub/sub)
- ~247 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #41 (T045): Implemented EventSubscriber base class in packages/common:
- EventSubscriber abstract base class with handler registration (on/off)
- SqsEventSubscriber class for AWS SQS polling
- Support for long polling, concurrent processing, graceful shutdown
- Automatic message acknowledgement with error handling and retry logic
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
