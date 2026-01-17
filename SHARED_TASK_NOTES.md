# Shared Task Notes

## Current Status
- Completed issues #1-#14 (T001-T014) - Setup phase monorepo + ai-client package
- Completed issues #30-#37 (T030-T037) - All core services scaffolded
- Completed issues #38-#42 (T042-T046) - Complete event infrastructure (pub/sub + DLQ)
- Completed issues #43-#49 (T047-T053) - Frontend setup (React, Tailwind, Router, Query, UI, E2E)
- Completed issues #50-#53 (T054-T057) - Complete CDK infrastructure with tests
- Completed issue #64 (T068) - Avatar upload with S3
- Completed issue #65 (T069) - GET /topics endpoint with filtering
- Completed issue #66 (T070) - GET /topics/:id detail endpoint
- Completed issue #67 (T071) - Topic search endpoint
- Completed issue #68 (T072) - Topic list page with filtering and pagination
- Completed issue #69 (T073) - Reusable TopicCard component
- Completed issue #70 (T074) - Topic detail page
- Completed issue #71 (T075) - Search bar component
- Completed issue #72 (T076) - Topic filtering UI component
- ~226 open issues remaining (mostly L1-L3 foundation tasks, user stories US1-US6, polish phase)

## Recent Completions
Issue #72 (T076): Implement topic filtering UI:
- Created reusable TopicFilterUI component in frontend/src/components/topics/
- Extracted filtering logic from TopicsPage into composable component
- Status filtering (All, Seeding, Active, Archived) with visual indicators
- Sort options (Newest First, Most Participants, Most Responses)
- Tag filtering with search input, Apply/Clear buttons, Enter key support
- Active filter badges display showing currently applied filters
- Props-based control (filters, onFiltersChange) for full flexibility
- Follows existing component patterns (Button, Input, Card)
- TypeScript type safety, responsive layout, keyboard accessible

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
