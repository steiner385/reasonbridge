# CI/CD Setup Guide

This project uses a hybrid CI/CD approach with **Jenkins** as the primary CI server and **GitHub Actions** for quick PR validation and status monitoring.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Repo    │────▶│  GitHub Actions │────▶│    Jenkins      │
│  (Push/PR)      │     │  (Quick checks) │     │  (Full CI)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                       │                       │
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                        Status Updates
```

## GitHub Actions Workflows

### 1. `ci.yml` - Main CI Workflow
- **Trigger**: Push to `main`, PRs to `main`/`develop`
- **Purpose**: Full build and test pipeline in GitHub Actions
- **Jobs**:
  - Install dependencies
  - Build shared packages
  - Run linting
  - Run type checking
  - Execute all tests

### 2. `pr-checks.yml` - PR Validation
- **Trigger**: PRs to `main`/`develop`
- **Purpose**: Quick PR validation before Jenkins builds
- **Jobs**:
  - Lint check
  - Format check
  - PR size analysis (adds labels: `size/S`, `size/M`, `size/L`, `size/XL`)
  - Security scan (dependency audit, secrets detection)

### 3. `jenkins-trigger.yml` - Jenkins Integration
- **Trigger**: Push to `main`/`develop`, PRs
- **Purpose**: Trigger Jenkins builds via API
- **Requirements**: See [Jenkins Configuration](#jenkins-configuration)

### 4. `jenkins-status.yml` - Status Sync
- **Trigger**: `repository_dispatch` from Jenkins
- **Purpose**: Update GitHub commit status from Jenkins build results

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

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub PAT for API calls |
| `GITHUB_REPO` | Repository in format `owner/repo` |

### Webhook Setup
1. In GitHub repository settings, add webhook:
   - **URL**: `https://your-jenkins.com/github-webhook/`
   - **Content type**: `application/json`
   - **Events**: Push, Pull Request

## GitHub Secrets Configuration

Add these secrets to your GitHub repository:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `JENKINS_URL` | Jenkins server URL | `jenkins-trigger.yml` |
| `JENKINS_USER` | Jenkins username | `jenkins-trigger.yml` |
| `JENKINS_TOKEN` | Jenkins API token | `jenkins-trigger.yml` |
| `CODECOV_TOKEN` | Codecov upload token | `ci.yml` (optional) |

### Setting up Secrets
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret with its value

## Build Pipeline Stages

### Jenkins Pipeline (`Jenkinsfile`)

```
Setup → Build Dependencies → Lint & Type Check → Unit Tests → Integration Tests → Contract Tests → E2E Tests → Build
```

| Stage | Description |
|-------|-------------|
| **Setup** | Install pnpm and dependencies |
| **Build Dependencies** | Build shared packages, generate Prisma client |
| **Lint & Type Check** | Run ESLint and TypeScript checks (parallel) |
| **Unit Tests** | Run vitest unit tests with coverage |
| **Integration Tests** | Run integration tests with Docker services |
| **Contract Tests** | Run API contract tests |
| **E2E Tests** | Run Playwright E2E tests (main/develop only) |
| **Build** | Build production artifacts |

## Status Checks

PRs require these status checks to pass:

1. **Jenkins CI** - Full CI pipeline
2. **Quick Validation** - Lint and format checks
3. **Security Scan** - Dependency audit

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
3. Verify `@unite-discord/*` packages are built

## Local Development

Run the same checks locally before pushing:

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm -r --filter="@unite-discord/*" build

# Generate Prisma client
pnpm --filter="@unite-discord/db-models" exec prisma generate

# Run all checks
pnpm lint
pnpm typecheck
pnpm test
```
