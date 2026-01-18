# Jenkins Trigger Workflow Test

This file is used to test that the Jenkins trigger workflow is enabled and working.

When this branch is pushed, it should:
1. Trigger "Trigger Jenkins CI" GitHub Actions workflow
2. That workflow should fetch the Jenkins CSRF crumb
3. Trigger the unitediscord-ci Jenkins job
4. Report status back to GitHub

Test Date: 2026-01-18
