# uniteDiscord Jenkins CI/CD Configuration

This directory contains self-contained Jenkins pipeline configuration for uniteDiscord, including all shared library functions. No external dependencies are required.

## Directory Structure

```
.jenkins/
├── Jenkinsfile              # Main CI pipeline
├── Jenkinsfile.e2e          # E2E tests pipeline
├── vars/                    # Shared library functions
│   └── withAwsCredentials.groovy
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
   - **Project Repository**: `https://github.com/steiner385/uniteDiscord.git` (or your enterprise URL)
   - **Credentials**: Select appropriate Git credentials
   - **Library Path**: `.jenkins`

### Step 2: Configure Pipeline Jobs

Create Jenkins Pipeline jobs pointing to the Jenkinsfiles in your repository:

| Job Name | Script Path | Description |
|----------|-------------|-------------|
| uniteDiscord-ci | `.jenkins/Jenkinsfile` | Main CI pipeline |
| uniteDiscord-e2e | `.jenkins/Jenkinsfile.e2e` | E2E tests pipeline |

**IMPORTANT: Branch Configuration**

For the `uniteDiscord-ci` job, configure the Git SCM to build **ALL branches** (`**`) instead of just `*/main`. This ensures:
- Webhook triggers work for feature branches and PRs
- GitHub branch protection can require CI to pass before merging
- Status checks are reported for all commits

See `.jenkins/jobs/uniteDiscord-ci.yaml` for the full job configuration as code.

### Step 3: Configure Required Credentials

The following credentials must be configured in Jenkins:

| Credential ID | Type | Description |
|---------------|------|-------------|
| `github-token` | Secret text | GitHub Personal Access Token with `repo` scope |
| `github-credentials` | Username/Password | GitHub username and PAT |
| `aws-access-key-id` | Secret text | AWS Access Key ID for Bedrock access |
| `aws-secret-access-key` | Secret text | AWS Secret Access Key for Bedrock access |
| `aws-region` | Secret text | AWS Region for Bedrock (default: us-east-1) |

### Step 4: Configure Jenkins Agents

The pipelines expect agents with these labels:

| Label | Purpose | Executors |
|-------|---------|-----------|
| `any` | General-purpose tasks | 2 |
| `e2e` | E2E tests (Playwright) | 1 |

## Shared Library Functions

### AWS Bedrock Integration

The `withAwsCredentials` shared library function provides secure access to AWS Bedrock for AI service tests:

```groovy
stage('E2E Tests with Bedrock') {
    steps {
        script {
            withAwsCredentials {
                // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION are available
                // BEDROCK_ENABLED=true, BEDROCK_DEFAULT_MODEL are set
                sh 'npm run test:e2e'
            }
        }
    }
}

// Verify Bedrock access before running tests
stage('Verify Bedrock') {
    steps {
        script {
            if (withAwsCredentials.verify()) {
                echo 'Bedrock access verified!'
            }
        }
    }
}
```

Environment variables injected:
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (us-east-1)
- `BEDROCK_ENABLED` - Set to 'true'
- `BEDROCK_DEFAULT_MODEL` - Default model ID (Claude 3.5 Haiku)
- `BEDROCK_MODEL_HAIKU` - Claude 3.5 Haiku model ID
- `BEDROCK_MODEL_SONNET` - Claude 3.5 Sonnet model ID
- `BEDROCK_MODEL_OPUS` - Claude Opus 4.5 model ID

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

### AWS Bedrock errors
1. Verify AWS credentials are configured in Jenkins
2. Ensure the IAM user has Bedrock access permissions
3. Check that the AWS region credential (`aws-region`) is set to `us-east-1`

## Usage in Jenkinsfiles

To use the shared library functions in your Jenkinsfiles, add this at the top:

```groovy
@Library('unitediscord-lib@main') _

pipeline {
    agent any
    stages {
        stage('Tests with Bedrock') {
            steps {
                script {
                    withAwsCredentials {
                        sh 'npm run test:unit'
                    }
                }
            }
        }
    }
}
```
