# CI/CD Setup Guide

This project uses **Jenkins** as the primary CI server, triggered directly via **GitHub webhooks**. Builds run for all branches on every push or merge.

## Architecture Overview

```
┌─────────────────┐                    ┌─────────────────┐
│  GitHub Repo    │───── Webhook ─────▶│    Jenkins      │
│  (Push/Merge)   │                    │  (Full CI)      │
│                 │◀── Status Update ──│                 │
└─────────────────┘                    └─────────────────┘
```

## Trigger Configuration

### GitHub Webhook → Jenkins

- **Events**: Push, Pull Request
- **Branches**:
  - **Main branch**: All pushes trigger a build
  - **Pull requests**: All PR updates trigger a build
  - **Feature branches**: Builds are skipped (no CI triggered)
- **Endpoint**: `https://your-jenkins.com/github-webhook/`

The Jenkinsfile includes conditional logic to only run CI for main branch and pull requests, skipping feature branch builds.

## GitHub Actions Workflows (Optional)

### `jenkins-status.yml` - Status Sync

- **Trigger**: `repository_dispatch` from Jenkins
- **Purpose**: Update GitHub commit status from Jenkins build results
- **Note**: This is optional - Jenkins can update status directly via GitHub API

## Jenkins Configuration

### Required Jenkins Plugins

- GitHub Plugin
- GitHub Branch Source Plugin
- Pipeline: GitHub Groovy Libraries

### Jenkins Credentials

Create the following credentials in Jenkins:

1. **`github-token`** (Secret text)
   - GitHub Personal Access Token with `repo` scope
   - Used for updating commit status

### Environment Variables

Configure these in Jenkins or as credentials:

| Variable       | Description                       |
| -------------- | --------------------------------- |
| `GITHUB_TOKEN` | GitHub PAT for API calls          |
| `GITHUB_REPO`  | Repository in format `owner/repo` |

### Webhook Setup

1. In GitHub repository settings, add webhook:
   - **URL**: `https://your-jenkins.com/github-webhook/`
   - **Content type**: `application/json`
   - **Events**: Push, Pull Request

## GitHub Secrets Configuration (Optional)

These secrets are only needed if using GitHub Actions for status reporting:

| Secret          | Description          | Required For                  |
| --------------- | -------------------- | ----------------------------- |
| `CODECOV_TOKEN` | Codecov upload token | Coverage reporting (optional) |

**Note**: Jenkins triggers via webhook - no GitHub secrets required for build triggering.

## Build Pipeline Stages

### Jenkins Pipeline (`Jenkinsfile`)

```
Setup → Build Dependencies → Lint & Type Check → Unit Tests → Integration Tests → Contract Tests → E2E Tests → Build
```

| Stage                  | Description                                   |
| ---------------------- | --------------------------------------------- |
| **Setup**              | Install pnpm and dependencies                 |
| **Build Dependencies** | Build shared packages, generate Prisma client |
| **Lint & Type Check**  | Run ESLint and TypeScript checks (parallel)   |
| **Unit Tests**         | Run vitest unit tests with coverage           |
| **Integration Tests**  | Run integration tests with Docker services    |
| **Contract Tests**     | Run API contract tests                        |
| **E2E Tests**          | Run Playwright E2E tests (main/develop only)  |
| **Build**              | Build production artifacts                    |

## Status Checks

PRs require this status check to pass:

1. **Jenkins CI** - Full CI pipeline (includes linting, type checking, all tests, build)

## Troubleshooting

### Jenkins build not triggering

1. Check GitHub webhook delivery in repository settings
2. Verify Jenkins URL is accessible from GitHub
3. Check Jenkins credentials are valid

### GitHub status not updating

1. Verify `github-token` credential in Jenkins
2. Check Jenkins console log for API errors
3. Ensure GitHub token has `repo` scope

### Build dependencies failing

1. Ensure shared packages build before tests
2. Check Prisma client is generated
3. Verify `@reason-bridge/*` packages are built

## Local Development

Run the same checks locally before pushing:

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm -r --filter="@reason-bridge/*" build

# Generate Prisma client
pnpm --filter="@reason-bridge/db-models" exec prisma generate

# Run all checks
pnpm lint
pnpm typecheck
pnpm test
```
