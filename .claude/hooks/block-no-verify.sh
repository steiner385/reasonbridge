#!/bin/bash
# ============================================================================
# PreToolUse Hook: Block --no-verify and -n flags on git commit
# ============================================================================
# This hook prevents Claude Code from bypassing pre-commit hooks by detecting
# and blocking git commit commands that use --no-verify or -n flags.
#
# Installation: This hook is configured in .claude/settings.json
# ============================================================================

# Read the tool input from stdin (JSON format)
INPUT=$(cat)

# Extract the command from the JSON input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# If no command, allow (not a Bash tool call)
if [ -z "$COMMAND" ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Check if this is a git commit command with --no-verify or -n flag
if echo "$COMMAND" | grep -qE 'git\s+commit.*--no-verify|git\s+commit.*\s-n(\s|$)'; then
  # Block the command with an informative message
  cat << 'EOF'
{
  "decision": "block",
  "reason": "Using --no-verify or -n flag is not permitted in this repository.\n\nPre-commit hooks are MANDATORY quality gates that ensure:\n  - No secrets are committed\n  - No code duplication issues\n  - TypeScript types are valid\n  - Tests pass for changed code\n\nPlease fix any issues reported by pre-commit hooks instead of bypassing them."
}
EOF
  exit 0
fi

# Allow all other commands
echo '{"decision": "allow"}'
exit 0
