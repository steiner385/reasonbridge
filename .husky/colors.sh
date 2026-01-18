#!/bin/bash

# ============================================================================
# Pre-Commit Hook Color Utilities
# ============================================================================
# Shared ANSI color definitions and helper functions for consistent output
# across all pre-commit hooks
# ============================================================================

# Color codes
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;36m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[1;37m'
export NC='\033[0m' # No Color

# Additional formatting
export BOLD='\033[1m'
export DIM='\033[2m'
export UNDERLINE='\033[4m'

# ============================================================================
# Helper Functions
# ============================================================================

# Print informational message
info() {
  printf "${BLUE}ℹ  %s${NC}\n" "$1"
}

# Print success message
success() {
  printf "${GREEN}✅ %s${NC}\n" "$1"
}

# Print error message
error() {
  printf "${RED}❌ %s${NC}\n" "$1"
}

# Print warning message
warning() {
  printf "${YELLOW}⚠️  %s${NC}\n" "$1"
}

# Print header section
header() {
  printf "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
  printf "${BOLD}${BLUE}%s${NC}\n" "$1"
  printf "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════${NC}\n\n"
}

# Print section divider
divider() {
  printf "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Print debug message (only if DEBUG=1)
debug() {
  if [ "${DEBUG:-0}" = "1" ]; then
    printf "${DIM}[DEBUG]${NC} %s\n" "$1"
  fi
}

# Print count message
count() {
  printf "${MAGENTA}%s${NC}\n" "$1"
}

# Print step indicator
step() {
  printf "${CYAN}➜${NC} %s\n" "$1"
}

# Export functions for use in child scripts (bash only)
if [ -n "$BASH_VERSION" ]; then
  export -f info success error warning header divider debug count step
fi
