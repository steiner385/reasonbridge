# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#36 (T030-T036) - All core services scaffolded:
  - API Gateway (port 3000)
  - User Service (port 3001)
  - Discussion Service (port 3002)
  - AI Service (port 3002)
  - Moderation Service (port 3003)
  - Recommendation Service (port 3004)
  - Notification Service (port 3005) - with Socket.io
- ~252 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

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
