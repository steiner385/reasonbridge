#!/bin/bash
# Script to create GitHub issues from tasks.md
# Repository: steiner385/uniteDiscord

REPO="steiner385/uniteDiscord"

create_issue() {
    local id="$1"
    local title="$2"
    local phase="$3"
    local labels="$4"
    local filepath="$5"
    local parallel="$6"
    local story="$7"
    local deps="$8"

    local body="**Phase**: $phase
**Task ID**: $id"

    if [ -n "$story" ]; then
        body="$body
**User Story**: $story"
    fi

    if [ "$parallel" = "yes" ]; then
        body="$body
**Parallel**: Yes - can run simultaneously with other [P] tasks"
    else
        body="$body
**Parallel**: No - sequential execution required"
    fi

    body="$body

## Description
$title

## File Path
\`$filepath\`

## Acceptance Criteria
- [ ] Implementation complete
- [ ] Tests pass (if applicable)
- [ ] Code reviewed

## Dependencies
$deps"

    echo "Creating issue: [$id] $title"
    gh issue create --repo "$REPO" --title "[$id] $title" --body "$body" --label "$labels" 2>/dev/null || echo "  Failed: $id"
    sleep 0.5  # Rate limiting
}

# Phase 1: Setup (T001-T014)
echo "=== Phase 1: Setup ==="
create_issue "T001" "Create monorepo structure with pnpm workspaces" "Setup" "setup" "pnpm-workspace.yaml" "no" "" "None"
create_issue "T002" "Initialize root package.json with TypeScript 5.x" "Setup" "setup" "package.json" "no" "" "T001"
create_issue "T003" "Configure ESLint with Airbnb config" "Setup" "setup,parallel" ".eslintrc.js" "yes" "" "T002"
create_issue "T004" "Configure Prettier" "Setup" "setup,parallel" ".prettierrc" "yes" "" "T002"
create_issue "T005" "Configure TypeScript base config with strict: true" "Setup" "setup,parallel" "tsconfig.base.json" "yes" "" "T002"
create_issue "T006" "Create docker-compose.yml with postgres, redis, localstack" "Setup" "setup,infrastructure" "docker-compose.yml" "no" "" "T001"
create_issue "T007" "Create docker-compose.test.yml for isolated test environment" "Setup" "setup,infrastructure" "docker-compose.test.yml" "no" "" "T006"
create_issue "T008" "Create Makefile with setup, dev, test, lint, build targets" "Setup" "setup" "Makefile" "no" "" "T006"
create_issue "T009" "Create .env.example with environment variables" "Setup" "setup" ".env.example" "no" "" "T001"
create_issue "T010" "Create packages/common/ with shared types and utilities" "Setup" "setup,parallel" "packages/common/" "yes" "" "T002"
create_issue "T011" "Create packages/event-schemas/ with event type definitions" "Setup" "setup,parallel" "packages/event-schemas/" "yes" "" "T002"
create_issue "T012" "Create packages/testing-utils/ with shared test helpers" "Setup" "setup,parallel" "packages/testing-utils/" "yes" "" "T002"
create_issue "T013" "Create packages/db-models/ with Prisma schema initialization" "Setup" "setup" "packages/db-models/" "no" "" "T002"
create_issue "T014" "Create packages/ai-client/ with Bedrock client wrapper stub" "Setup" "setup,parallel" "packages/ai-client/" "yes" "" "T002"

echo "Phase 1 complete!"
