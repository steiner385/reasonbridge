# Shared Task Notes

## Current Status
- Completed issue #114 (T118) - Implement feedback sensitivity levels
- ~171 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-18)
**Issue #114 (T118) - Implement feedback sensitivity levels:**
- Added FeedbackSensitivity enum to backend (services/ai-service/src/feedback/dto/request-feedback.dto.ts:6-10)
- Added optional sensitivity parameter to RequestFeedbackDto (services/ai-service/src/feedback/dto/request-feedback.dto.ts:36-38)
- Implemented sensitivity filtering logic in FeedbackService (services/ai-service/src/feedback/feedback.service.ts:35-38)
- Added getConfidenceThreshold helper (services/ai-service/src/feedback/feedback.service.ts:124-135)
- Thresholds: LOW (0.5), MEDIUM (0.7), HIGH (0.85)
- Merged via PR #473

## Notes
- pnpm is now installed globally and should be used for workspace operations
- The `status: in-progress` label was created for issue tracking
- All PRs are being squash-merged to main

## Workflow
1. `npm run next-issue` - claims highest priority issue
2. Create feature branch from main
3. Implement, commit, push
4. Create PR via `gh pr create`
5. Merge via `gh pr merge --squash`
6. Pull main, repeat
