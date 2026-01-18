# Shared Task Notes

## Current Status
- Completed issue #116 (T120) - Unit tests: Suggestions generation
- ~169 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Latest Completed (2026-01-18)
**Issue #116 (T120) - Unit tests: Suggestions generation:**
- Added comprehensive unit tests for suggestions generation system
- Created 3 test files with 48 total tests covering:
  - SuggestionsService orchestration (6 tests)
  - TagSuggester: category detection, keyword extraction, confidence scoring (22 tests)
  - TopicLinkSuggester: relationship detection, keyword matching (20 tests)
- Updated jest.config.js to enable global injection
- Added jest types to tsconfig.json for TypeScript support
- All 78 tests passing (30 existing + 48 new)
- Merged via PR #475

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
