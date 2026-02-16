# MCP Configuration Guide

This guide explains how to configure and use Model Context Protocol (MCP) servers with GitHub Copilot in the reasonBridge project.

## What is MCP?

The Model Context Protocol (MCP) is an open standard that connects GitHub Copilot to external tools and data sources. It enables Copilot to access project-specific context, automate workflows, and interact with external services like GitHub Issues, Jenkins, and more.

## Configuration File

The MCP configuration is stored in `.github/copilot-mcp.json` and is automatically loaded by GitHub Copilot when you work on this repository.

## Configured MCP Servers

### 1. Jenkins Server (`jenkins`)

**Purpose**: Provides access to Jenkins CI/CD pipeline information, build status, and job management.

**Configuration**:

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-jenkins"],
  "env": {
    "JENKINS_URL": "https://jenkins.kindash.com",
    "JENKINS_USERNAME": "${JENKINS_USER}",
    "JENKINS_PASSWORD": "${JENKINS_PASSWORD}"
  }
}
```

**Required Environment Variables**:

- `JENKINS_USER`: Your Jenkins username
- `JENKINS_PASSWORD`: Your Jenkins API token or password

**Usage**: Ask Copilot about Jenkins builds, pipeline status, or CI/CD workflows.

### 2. GitHub Issue Priority Server (`github-issue-priority`)

**Purpose**: Enables AI-assisted GitHub issue prioritization and workflow management.

**Configuration**:

```json
{
  "command": "npx",
  "args": ["-y", "mcp-git-issue-priority"]
}
```

**Authentication**: Uses GitHub CLI authentication (automatic) or `GITHUB_TOKEN` environment variable.

**Available Tools**:

1. **`create_issue`**: Create new GitHub issues with priority and type labels
2. **`select_next_issue`**: Select the highest-priority issue using deterministic scoring
3. **`list_backlog`**: List open issues in priority order
4. **`advance_workflow`**: Move issues through development phases
5. **`get_workflow_status`**: Check current workflow status
6. **`release_lock`**: Release lock on completed/abandoned issues
7. **`force_claim`**: Force claim a locked issue (with confirmation)
8. **`sync_backlog_labels`**: Detect and fix missing priority/type/status labels
9. **`get_pr_status`**: Check PR CI status and merge state
10. **`bulk_update_issues`**: Update multiple issues at once
11. **`implement_batch`**: Start batch implementation of N issues
12. **`batch_continue`**: Continue batch implementation workflow
13. **`get_workflow_analytics`**: Get workflow analytics and cycle time metrics

**Features**:

- **Priority Scoring**: P0-P3 priorities with age-based boosting
- **Concurrency-Safe**: File-based locking prevents conflicts
- **Guided Workflow**: 8-phase workflow (selection → research → branch → implementation → testing → commit → pr → review)
- **Dependency Detection**: Automatically deprioritizes blocked issues
- **Audit Logging**: JSON Lines logging with 30-day retention

**Usage Examples**:

```
# Ask Copilot to:
"List the top 5 priority issues in the backlog"
"Select the next issue to work on"
"Create a new P1 bug issue for authentication failure"
"Show workflow status for all locked issues"
"Sync labels for issues missing priority tags"
"Get workflow analytics for the last 30 days"
```

## Authentication Setup

### GitHub CLI (Recommended)

The `mcp-git-issue-priority` server automatically uses GitHub CLI authentication if available:

```bash
# One-time setup
gh auth login
```

This is the recommended approach - no manual token management required.

### Personal Access Token (Alternative)

If you prefer to use a personal access token instead of GitHub CLI:

1. Create a token at https://github.com/settings/tokens
2. Grant `repo` scope permissions
3. Set the environment variable:
   ```bash
   export GITHUB_TOKEN="ghp_your_personal_access_token"
   ```

### Jenkins Authentication

For the Jenkins MCP server, set these environment variables:

```bash
export JENKINS_USER="your-jenkins-username"
export JENKINS_PASSWORD="your-jenkins-api-token"
```

To create a Jenkins API token:

1. Log into Jenkins
2. Go to Your Name → Configure
3. Scroll to API Token section
4. Click "Add new Token"
5. Copy the generated token

## Verifying MCP Configuration

### In GitHub Copilot

1. Open a chat with GitHub Copilot
2. Type `/mcp` to see available MCP servers
3. Both `jenkins` and `github-issue-priority` should be listed
4. Try a command like "list backlog issues" to test functionality

### JSON Validation

You can validate the configuration file syntax:

```bash
cat .github/copilot-mcp.json | jq .
```

If the command succeeds without errors, the JSON is valid.

## Priority Scoring Algorithm

The `github-issue-priority` server uses a deterministic formula to score issues:

```
score = (basePoints + ageBonus) * blockingMultiplier * blockedPenalty
```

- **Base Points**: P0=1000, P1=100, P2=10, P3=1
- **Age Bonus**: +1 point per day since creation (max 365)
- **Blocking Multiplier**: 1.5x for issues with "blocking" label
- **Blocked Penalty**: 0.1x for issues blocked by open parent issues
- **Tiebreaker**: Earlier creation date wins (FIFO)

## Workflow Phases

When working with issues through the MCP server, follow this 8-phase workflow:

1. **selection**: Issue selected and locked
2. **research**: Understanding the problem
3. **branch**: Feature branch created
4. **implementation**: Code changes in progress
5. **testing**: Running tests and validation
6. **commit**: Changes committed
7. **pr**: Pull request created
8. **review**: Awaiting review/merge

## Data Storage

The `github-issue-priority` server stores data locally in `~/.mcp-git-issue-priority/`:

```
~/.mcp-git-issue-priority/
├── locks/          # Active lock files (.lockdata)
├── workflow/       # Workflow state files (.json)
└── logs/           # Audit logs (JSON Lines format)
```

## Troubleshooting

### MCP Server Not Available

**Problem**: GitHub Copilot doesn't show the MCP servers

**Solutions**:

1. Verify `.github/copilot-mcp.json` exists in the repository root
2. Check JSON syntax is valid: `cat .github/copilot-mcp.json | jq .`
3. Restart your IDE or GitHub Copilot
4. Ensure you have internet access for `npx` to download packages

### Authentication Errors

**Problem**: "GitHub authentication required" error

**Solutions**:

1. Run `gh auth login` to authenticate with GitHub CLI
2. Or set `GITHUB_TOKEN` environment variable
3. Verify token has `repo` scope permissions

**Problem**: "Jenkins authentication failed" error

**Solutions**:

1. Verify `JENKINS_USER` and `JENKINS_PASSWORD` are set
2. Test credentials by logging into Jenkins UI
3. Create a new API token if needed

### Command Not Found

**Problem**: `npx: command not found` or package errors

**Solutions**:

1. Ensure Node.js 20+ is installed: `node --version`
2. Ensure npm is available: `npm --version`
3. Clear npm cache: `npm cache clean --force`
4. Try installing globally: `npm install -g mcp-git-issue-priority`

## References

- **MCP Specification**: https://modelcontextprotocol.io/
- **GitHub MCP Documentation**: https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-with-extensions/mcp
- **mcp-git-issue-priority Repository**: https://github.com/steiner385/mcp-git-issue-priority
- **Jenkins MCP Server**: https://www.npmjs.com/package/@modelcontextprotocol/server-jenkins

## Contributing

To add new MCP servers or modify the configuration:

1. Update `.github/copilot-mcp.json` with the new server
2. Document the server in this guide
3. Test the configuration: `cat .github/copilot-mcp.json | jq .`
4. Commit changes and create a PR

## Support

For issues or questions:

- File an issue at https://github.com/steiner385/reasonbridge/issues
- Check the MCP server repository for specific tool issues
- Review GitHub Copilot documentation for general MCP questions

---

_Last updated: 2026-02-16_
