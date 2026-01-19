# uniteDiscord Jenkins CI/CD Configuration

This directory contains a thin Jenkinsfile that delegates to a **separate shared library repository** for all pipeline logic. This architecture decouples CI infrastructure from application code, allowing pipeline changes without being blocked by application-level branch protection.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  uniteDiscord (Application Repo)                                │
│  └── .jenkins/Jenkinsfile  ──────────────────┐                  │
│      (thin loader, ~20 lines)                │                  │
└──────────────────────────────────────────────│──────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  unitediscord-jenkins-lib (Shared Library Repo)                 │
│  └── vars/                                                      │
│      ├── standardPipeline.groovy    (main CI workflow)          │
│      ├── installDependencies.groovy                             │
│      ├── runUnitTests.groovy                                    │
│      ├── buildProject.groovy                                    │
│      ├── pipelineHelpers.groovy     (PM auto-detection)         │
│      └── ...                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Architecture?

| Problem | Solution |
|---------|----------|
| Pipeline changes blocked by app CI failures | Separate repo with lighter protection |
| Chicken-and-egg: can't merge pipeline fixes | Library changes take effect immediately |
| Duplicated pipeline code across projects | Shared library, reusable stages |

## Directory Structure

```
.jenkins/
├── Jenkinsfile              # Thin loader (calls standardPipeline)
├── Jenkinsfile.e2e          # E2E tests pipeline (if needed)
├── jobs/                    # Job configuration documentation
│   └── uniteDiscord-ci.yaml
└── README.md                # This file
```

**Note:** The `vars/` directory has been moved to the separate shared library repository:
https://github.com/steiner385/unitediscord-jenkins-lib

## Usage

The Jenkinsfile is intentionally minimal:

```groovy
@Library('unitediscord-lib@main') _

standardPipeline(
    githubOwner: 'steiner385',
    githubRepo: 'uniteDiscord',
    webhookToken: 'uniteDiscord-ci',
    statusContext: 'Jenkins CI'
)
```

## Jenkins Configuration

### Global Pipeline Library

| Setting | Value |
|---------|-------|
| **Name** | `unitediscord-lib` |
| **Default version** | `main` |
| **Project Repository** | `https://github.com/steiner385/unitediscord-jenkins-lib.git` |
| **Library Path** | `./` |

### Required Credentials

| Credential ID | Type | Description |
|---------------|------|-------------|
| `github-token` | Secret text | GitHub PAT with `repo` scope |
| `github-credentials` | Username/Password | GitHub username and PAT |
| `aws-access-key-id` | Secret text | AWS Access Key ID |
| `aws-secret-access-key` | Secret text | AWS Secret Access Key |

### Webhook Configuration

| Setting | Value |
|---------|-------|
| **URL** | `https://jenkins.kindash.com/generic-webhook-trigger/invoke?token=uniteDiscord-ci` |
| **Content type** | `application/json` |
| **Events** | Push, Pull request |

## Modifying the Pipeline

**To change CI behavior**, modify the shared library repo:
1. Clone: `git clone https://github.com/steiner385/unitediscord-jenkins-lib`
2. Edit files in `vars/`
3. Push changes (no PR required, lighter protection)
4. Changes take effect on next build

**To change project-specific settings**, modify this repo's Jenkinsfile parameters.

## Available Pipeline Options

```groovy
standardPipeline(
    githubOwner: 'steiner385',       // GitHub org/user
    githubRepo: 'uniteDiscord',      // Repository name
    webhookToken: 'uniteDiscord-ci', // Webhook token
    statusContext: 'Jenkins CI',     // GitHub status context
    buildPackages: true,             // Build monorepo packages
    runLint: true,                   // Run linting
    runUnitTests: true,              // Run unit tests
    runBuild: true,                  // Run final build
    timeoutMinutes: 60               // Pipeline timeout
)
```

## Troubleshooting

### Library not found
Ensure Jenkins is configured with the correct shared library pointing to `unitediscord-jenkins-lib.git`.

### GitHub status not updating
Verify the `github-token` credential has `repo` scope.

### Pipeline changes not taking effect
The shared library is cached per build. Push changes to the library repo and trigger a new build.
