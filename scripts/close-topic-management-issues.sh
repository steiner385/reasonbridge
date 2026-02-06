#!/bin/bash
# Copyright 2025 Tony Stein
# SPDX-License-Identifier: Apache-2.0

set -e

# ==============================================================================
# Script: Close Topic Management Issues After PR #780 Merges
# ==============================================================================
# Purpose: Automatically close 25 GitHub issues that were implemented in PR #780
# Usage:
#   ./scripts/close-topic-management-issues.sh          # Dry run (preview only)
#   ./scripts/close-topic-management-issues.sh --execute # Actually close issues
# ==============================================================================

REPO="steiner385/reasonbridge"
PR_NUMBER=780
DRY_RUN=true

# Parse command line arguments
if [[ "$1" == "--execute" ]]; then
  DRY_RUN=false
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Verify Prerequisites
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Topic Management Issues Closure Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo -e "${RED}❌ Error: GitHub CLI (gh) is not installed${NC}"
  echo "Install: https://cli.github.com/"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo -e "${RED}❌ Error: Not authenticated with GitHub CLI${NC}"
  echo "Run: gh auth login"
  exit 1
fi

echo -e "${GREEN}✓${NC} Prerequisites verified"
echo ""

# ==============================================================================
# Check if PR #780 is Merged
# ==============================================================================

echo -e "${BLUE}Checking PR #780 status...${NC}"
PR_STATE=$(gh pr view $PR_NUMBER --repo $REPO --json state --jq '.state')
PR_MERGED_AT=$(gh pr view $PR_NUMBER --repo $REPO --json mergedAt --jq '.mergedAt')
PR_TITLE=$(gh pr view $PR_NUMBER --repo $REPO --json title --jq '.title')

echo "PR #$PR_NUMBER: $PR_TITLE"
echo "State: $PR_STATE"
echo "Merged at: ${PR_MERGED_AT:-Not merged}"
echo ""

if [[ "$PR_STATE" != "MERGED" ]] && [[ "$PR_MERGED_AT" == "null" || -z "$PR_MERGED_AT" ]]; then
  echo -e "${RED}❌ Error: PR #$PR_NUMBER is not yet merged${NC}"
  echo ""
  echo "Current status: $PR_STATE"
  echo ""
  echo "Please wait for PR #780 to be merged before running this script."
  echo "Check status: gh pr view $PR_NUMBER --repo $REPO"
  exit 1
fi

echo -e "${GREEN}✓${NC} PR #$PR_NUMBER is merged"
echo ""

# ==============================================================================
# Define Issues to Close
# ==============================================================================

# Array of issue numbers with descriptions
declare -A ISSUES
ISSUES[207]="[T211] Implement POST /topics (create)"
ISSUES[208]="[T212] Implement topic draft saving"
ISSUES[209]="[T213] Implement initial propositions creation"
ISSUES[212]="[T216] Implement tag management"
ISSUES[214]="[T218] Implement topic edit/update"
ISSUES[215]="[T219] Implement topic status management"
ISSUES[217]="[T221] Implement duplicate topic detection"
ISSUES[219]="[T223] Create topic creation wizard"
ISSUES[220]="[T224] Create topic title input with validation"
ISSUES[221]="[T225] Create topic description editor"
ISSUES[222]="[T226] Create proposition input section"
ISSUES[223]="[T227] Create AI feedback integration in wizard"
ISSUES[224]="[T228] Create framing suggestions display"
ISSUES[225]="[T229] Create tag selector component"
ISSUES[226]="[T230] Create related topics linker"
ISSUES[227]="[T231] Create draft auto-save functionality"
ISSUES[228]="[T232] Create topic preview component"
ISSUES[229]="[T233] Create duplicate topic warning"
ISSUES[230]="[T234] Unit tests: Topic creation"
ISSUES[231]="[T235] Unit tests: AI quality check"
ISSUES[232]="[T236] Unit tests: Duplicate detection"
ISSUES[233]="[T237] Integration test: Topic creation flow"
ISSUES[234]="[T238] E2E: Create topic wizard flow"
ISSUES[235]="[T239] E2E: AI framing suggestions"
ISSUES[236]="[T240] E2E: Draft saving and recovery"

# Standard comment template
COMMENT_TEMPLATE="✅ **IMPLEMENTED** in PR #$PR_NUMBER (Topic Management)

**PR Title**: $PR_TITLE

**Implementation**: Complete topic management system with 48 tasks across:
- Backend: 8 REST endpoints (GET/POST/PATCH topics)
- Services: CRUD, search, edit history, analytics, merge capabilities
- Frontend: Create/edit modals, filters, status management, analytics dashboard
- Testing: 60+ E2E tests covering all workflows

**Key Features**:
- Topic lifecycle: SEEDING → ACTIVE → ARCHIVED/LOCKED
- Redis caching with 5min TTL
- Full-text search with trigram similarity
- Edit history with audit trail
- Transaction-safe merges with rollback
- Permission-based authorization

See PR #$PR_NUMBER for complete implementation details.

**Closed by**: Backlog audit 2026-02-05 (automated closure script)"

# ==============================================================================
# Dry Run or Execute
# ==============================================================================

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  DRY RUN MODE (Preview Only)${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "The following ${#ISSUES[@]} issues would be closed:"
  echo ""

  for issue_num in $(echo "${!ISSUES[@]}" | tr ' ' '\n' | sort -n); do
    issue_title="${ISSUES[$issue_num]}"
    echo -e "  ${GREEN}✓${NC} #$issue_num - $issue_title"
  done

  echo ""
  echo -e "${YELLOW}No issues were actually closed (dry run mode)${NC}"
  echo ""
  echo "To execute the closures, run:"
  echo -e "${BLUE}  $0 --execute${NC}"
  echo ""
  exit 0
fi

# ==============================================================================
# Execute Issue Closures
# ==============================================================================

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  EXECUTING ISSUE CLOSURES${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Closing ${#ISSUES[@]} issues..."
echo ""

CLOSED_COUNT=0
FAILED_COUNT=0
FAILED_ISSUES=()

for issue_num in $(echo "${!ISSUES[@]}" | tr ' ' '\n' | sort -n); do
  issue_title="${ISSUES[$issue_num]}"

  echo -ne "Closing #$issue_num - $issue_title... "

  # Check if issue is already closed
  issue_state=$(gh issue view $issue_num --repo $REPO --json state --jq '.state' 2>/dev/null || echo "NOT_FOUND")

  if [[ "$issue_state" == "CLOSED" ]]; then
    echo -e "${YELLOW}ALREADY CLOSED${NC}"
    ((CLOSED_COUNT++))
    continue
  fi

  if [[ "$issue_state" == "NOT_FOUND" ]]; then
    echo -e "${RED}NOT FOUND${NC}"
    ((FAILED_COUNT++))
    FAILED_ISSUES+=($issue_num)
    continue
  fi

  # Close the issue
  if gh issue close $issue_num --repo $REPO --comment "$COMMENT_TEMPLATE" 2>/dev/null; then
    echo -e "${GREEN}✓ CLOSED${NC}"
    ((CLOSED_COUNT++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED_COUNT++))
    FAILED_ISSUES+=($issue_num)
  fi

  # Rate limiting: sleep briefly between API calls
  sleep 0.5
done

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total issues: ${#ISSUES[@]}"
echo -e "${GREEN}Successfully closed: $CLOSED_COUNT${NC}"

if [[ $FAILED_COUNT -gt 0 ]]; then
  echo -e "${RED}Failed: $FAILED_COUNT${NC}"
  echo ""
  echo "Failed issues:"
  for failed_issue in "${FAILED_ISSUES[@]}"; do
    echo "  - #$failed_issue"
  done
  echo ""
  echo "Please manually review and close failed issues."
fi

echo ""
echo -e "${GREEN}✓ Script completed${NC}"
echo ""

# ==============================================================================
# Verification Command
# ==============================================================================

echo "To verify closures, run:"
echo -e "${BLUE}  gh issue list --repo $REPO --state closed --limit 30${NC}"
echo ""

exit 0
