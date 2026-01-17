# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- ~246 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #42 (T046): Implemented dead-letter queue handler in packages/common:
- DeadLetterQueueHandler class for processing failed messages from DLQ
- DlqMonitor class for monitoring queue depth and alerting
- Support for requeuing messages to source queue after fixes
- Support for permanently deleting poison messages
- Detailed failure metadata tracking and statistics
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
