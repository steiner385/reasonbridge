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

| Setting                                            | Value              |
| -------------------------------------------------- | ------------------ |
| **Name**                                           | `unitediscord-lib` |
| **Default version**                                | `main`             |
| **Load implicitly**                                | ❌ (unchecked)     |
| **Allow default version to be overridden**         | ✅ (checked)       |
| **Include @Library changes in job recent changes** | ✅ (checked)       |

4. Under **Retrieval method**, select **Modern SCM**
5. Select **Git** and configure:
   - **Project Repository**: `https://github.com/steiner385/uniteDiscord.git`
   - **Credentials**: Select appropriate Git credentials
   - **Library Path**: `.jenkins`

### Step 2: Configure Pipeline Jobs

Jobs are configured via JCasC in the core Jenkins configuration. The following jobs are created automatically:

| Job Name                 | Script Path                        | Description                |
| ------------------------ | ---------------------------------- | -------------------------- |
| uniteDiscord-ci          | `.jenkins/Jenkinsfile`             | Main CI pipeline           |
| uniteDiscord-unit        | `.jenkins/Jenkinsfile.unit`        | Unit tests pipeline        |
| uniteDiscord-integration | `.jenkins/Jenkinsfile.integration` | Integration tests pipeline |
| uniteDiscord-e2e         | `.jenkins/Jenkinsfile.e2e`         | E2E tests pipeline         |
| uniteDiscord-nightly     | `.jenkins/Jenkinsfile.nightly`     | Nightly build pipeline     |

### Step 3: Configure Required Credentials

The following credentials must be configured in Jenkins:

| Credential ID        | Type              | Description                                    |
| -------------------- | ----------------- | ---------------------------------------------- |
| `github-token`       | Secret text       | GitHub Personal Access Token with `repo` scope |
| `github-credentials` | Username/Password | GitHub username and PAT                        |

### Step 4: Configure Jenkins Agents

The pipelines expect agents with these labels:

| Label         | Purpose                | Executors |
| ------------- | ---------------------- | --------- |
| `linux`       | General-purpose tasks  | 2         |
| `unit`        | Unit test execution    | 2         |
| `integration` | Integration tests      | 2         |
| `e2e`         | E2E tests (Playwright) | 1         |

## Shared Library Functions

### Pipeline Helpers

- `pipelineHelpers.getProjectName()` - Extract project name from job
- `pipelineHelpers.getWorkspacePath()` - Get persistent workspace path
- `pipelineHelpers.getServicePorts()` - Get list of service ports

### Pipeline Stages

- `pipelineInit()` - Initialize pipeline (checkout, git info, status)
- `installDependencies()` - Smart npm install with caching
- `runUnitTests()` - Execute unit tests with coverage
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
- `analyzeTestFailures()` - Analyze Jest test failures
- `analyzeAllureFailures()` - Analyze Allure test results

## Required Jenkins Plugins

- Pipeline
- Git
- GitHub Integration
- Lockable Resources
- Allure Jenkins Plugin
- HTML Publisher
- Timestamper

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
