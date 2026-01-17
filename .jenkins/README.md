# uniteDiscord Jenkins CI/CD Configuration

This directory contains self-contained Jenkins pipeline configuration for uniteDiscord, including all shared library functions. No external dependencies are required.

## Directory Structure

```
.jenkins/
├── Jenkinsfile              # Main CI pipeline
├── Jenkinsfile.e2e          # E2E tests pipeline
├── Jenkinsfile.unit         # Unit tests pipeline
├── Jenkinsfile.integration  # Integration tests pipeline
├── Jenkinsfile.nightly      # Nightly build pipeline
├── vars/                    # Shared library functions
│   ├── pipelineHelpers.groovy
│   ├── pipelineInit.groovy
│   ├── installDependencies.groovy
│   ├── runUnitTests.groovy
│   ├── runIntegrationTests.groovy
│   ├── runE2ETests.groovy
│   ├── runLintChecks.groovy
│   ├── buildProject.groovy
│   ├── dockerCleanup.groovy
│   ├── playwrightSetup.groovy
│   ├── publishReports.groovy
│   ├── githubStatusReporter.groovy
│   ├── createGitHubIssue.groovy
│   ├── analyzeTestFailures.groovy
│   └── analyzeAllureFailures.groovy
└── README.md                # This file
```

## Setup Instructions

### Step 1: Configure Global Pipeline Library

1. Navigate to **Manage Jenkins** > **System Configuration** > **Global Pipeline Libraries**
2. Click **Add** to create a new library
3. Configure as follows:

| Setting | Value |
|---------|-------|
| **Name** | `unitediscord-lib` |
| **Default version** | `main` |
| **Load implicitly** | ❌ (unchecked) |
| **Allow default version to be overridden** | ✅ (checked) |
| **Include @Library changes in job recent changes** | ✅ (checked) |

4. Under **Retrieval method**, select **Modern SCM**
5. Select **Git** and configure:
   - **Project Repository**: `https://github.com/steiner385/uniteDiscord.git`
   - **Credentials**: Select appropriate Git credentials
   - **Library Path**: `.jenkins`

### Step 2: Configure Pipeline Jobs

Create Jenkins Pipeline jobs pointing to the Jenkinsfiles in your repository:

| Job Name | Script Path | Description |
|----------|-------------|-------------|
| uniteDiscord-ci | `.jenkins/Jenkinsfile` | Main CI pipeline |
| uniteDiscord-unit | `.jenkins/Jenkinsfile.unit` | Unit tests pipeline |
| uniteDiscord-integration | `.jenkins/Jenkinsfile.integration` | Integration tests pipeline |
| uniteDiscord-e2e | `.jenkins/Jenkinsfile.e2e` | E2E tests pipeline |
| uniteDiscord-nightly | `.jenkins/Jenkinsfile.nightly` | Nightly build pipeline |

### Step 3: Configure Required Credentials

The following credentials must be configured in Jenkins:

| Credential ID | Type | Description |
|---------------|------|-------------|
| `github-token` | Secret text | GitHub Personal Access Token with `repo` scope |
| `github-credentials` | Username/Password | GitHub username and PAT |

### Step 4: Configure Jenkins Agents

The pipelines expect agents with these labels:

| Label | Purpose | Executors |
|-------|---------|-----------|
| `linux` | General-purpose tasks | 2 |
| `unit` | Unit test execution | 2 |
| `integration` | Integration tests | 2 |
| `e2e` | E2E tests (Playwright) | 1 |

### Step 5: Optional - Lockable Resources

For resource contention prevention, configure these lockable resources:

| Resource Name | Description |
|---------------|-------------|
| `test-infrastructure` | Shared by Integration and E2E tests |
| `deploy-staging` | Staging deployment lock |
| `deploy-production` | Production deployment lock |

## Shared Library Functions

### Pipeline Helpers
- `pipelineHelpers.getProjectName()` - Extract project name from job
- `pipelineHelpers.getWorkspacePath()` - Get persistent workspace path
- `pipelineHelpers.getServicePorts()` - Get list of service ports

### Pipeline Stages
- `pipelineInit()` - Initialize pipeline (checkout, git info, status)
- `installDependencies()` - Smart npm install with caching
- `runUnitTests()` - Execute unit tests with coverage (Vitest)
- `runIntegrationTests()` - Execute integration tests
- `runE2ETests()` - Execute E2E tests with Playwright
- `runLintChecks()` - Run linting and type checks
- `buildProject()` - Build project and archive artifacts

### Utilities
- `dockerCleanup()` - Clean Docker containers and ports
- `playwrightSetup()` - Install Playwright browsers
- `publishReports()` - Publish test reports (JUnit, Allure, Playwright)
- `githubStatusReporter()` - Report build status to GitHub
- `createGitHubIssue()` - Create GitHub issues for failures
- `analyzeTestFailures()` - Analyze Vitest test failures
- `analyzeAllureFailures()` - Analyze Allure test results

## Testing Framework

uniteDiscord uses **Vitest** for unit testing (configured in `vitest.config.ts`):

- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e` (Playwright)
- Contract tests: `npm run test:contract`

Coverage thresholds: 80% (lines, functions, branches, statements)

## Automatic GitHub Issue Creation

Pipelines automatically create GitHub issues when tests fail, ensuring failures are tracked and not forgotten.

### How It Works

1. **Test Results Analysis**: After tests run, failures are parsed from Vitest JSON output
2. **Error Grouping**: Failures are grouped by error signature (same error = one issue)
3. **Deduplication**: Checks for existing open issues to prevent duplicates
4. **Issue Creation**: Creates detailed issues with build context, stack traces, and reproduction steps
5. **Comment Updates**: Adds comments to existing issues for recurring failures

### Requirements

- **GitHub Token**: Must have `github-token` credential configured with `repo` scope
- **Test Results**: Tests must generate JSON output (`test-results.json`)
- **Repository Variables**: Set `GITHUB_OWNER` and `GITHUB_REPO` environment variables

## Required Jenkins Plugins

- Pipeline
- Git
- GitHub Integration
- Lockable Resources
- Allure Jenkins Plugin
- HTML Publisher
- Timestamper

## Troubleshooting

### Library not found
Ensure the library is configured in Global Pipeline Libraries with:
- Name: `unitediscord-lib`
- Library Path: `.jenkins`

### Agent labels not found
Create agents with the required labels or modify the Jenkinsfiles to use available labels.

### GitHub status not updating
Verify the `github-token` credential is configured and has `repo` scope.

## Usage in Jenkinsfiles

To use the shared library functions in your Jenkinsfiles, add this at the top:

```groovy
@Library('unitediscord-lib@main') _

pipeline {
    agent any
    stages {
        stage('Init') {
            steps {
                script {
                    pipelineInit()
                }
            }
        }
        stage('Install') {
            steps {
                script {
                    installDependencies()
                }
            }
        }
        // ... other stages
    }
}
```
