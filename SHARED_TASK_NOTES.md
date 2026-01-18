# Shared Task Notes

## Current Status
- Completed issue #109 (T113) - Create fallacy warnings component
- ~175 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-18)
**Issue #109 (T113) - Create fallacy warnings component:**
- Created FallacyWarnings component in frontend/src/components/feedback/FallacyWarnings.tsx
- Displays AI-detected logical fallacies with educational feedback in "curious peer" voice
- Supports 10 common fallacy types (ad hominem, straw man, false dichotomy, etc.)
- Severity-based styling: high (red), medium (amber), low (yellow) based on confidence score
- Expandable details with fallacy definitions and AI reasoning
- Educational resources integration
- Compact badge mode and full card mode
- Configurable minimum confidence threshold (default 0.8)
- Full accessibility with ARIA labels and keyboard navigation
- Added FallacySubtype, FallacySeverity types and FallacyWarningsProps interface
- Playwright test structure in frontend/tests/fallacy-warnings.spec.ts
- Merged via PR #469

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
