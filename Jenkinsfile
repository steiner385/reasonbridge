#!/usr/bin/env groovy
/**
 * uniteDiscord Multi-Branch Pipeline
 *
 * Main CI/CD pipeline for the uniteDiscord application.
 * Implemented using the unitediscord-jenkins-lib shared library.
 *
 * Pipeline Stages:
 * 1. Initialize - Setup, checkout, GitHub status reporting
 * 2. Install Dependencies - pnpm install with frozen lockfile
 * 3. Build Packages - Build shared packages, generate Prisma client
 * 4. Lint - ESLint and code quality checks
 * 5. Unit Tests - Run 1632 unit tests (backend + frontend)
 * 6. Integration Tests - Run 105 integration tests (optional, resource-locked)
 * 7. Contract Tests - API contract validation tests
 * 8. Build - Production build and artifact generation
 *
 * For updates and customization, see:
 * https://github.com/steiner385/unitediscord-jenkins-lib
 */

@Library('unitediscord-lib@main') _

pipeline {
    agent any

    environment {
        GITHUB_OWNER = 'steiner385'
        GITHUB_REPO = 'uniteDiscord'
        CI = 'true'
        NODE_ENV = 'test'
        NODE_OPTIONS = '--max-old-space-size=4096'
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
    }

    stages {
        stage('Initialize') {
            steps {
                script {
                    def buildType = env.CHANGE_ID ? "PR #${env.CHANGE_ID}" : "Branch: ${env.BRANCH_NAME}"
                    echo "=== Multi-Branch Build ==="
                    echo "Build type: ${buildType}"
                    if (env.CHANGE_ID) {
                        echo "PR Title: ${env.CHANGE_TITLE ?: 'N/A'}"
                        echo "PR Author: ${env.CHANGE_AUTHOR ?: 'N/A'}"
                        echo "Target Branch: ${env.CHANGE_TARGET ?: 'N/A'}"
                    }
                    echo "=========================="

                    githubStatusReporter(
                        status: 'pending',
                        context: 'jenkins/ci',
                        description: "Build started for ${buildType}"
                    )
                }

                checkout scm

                sh '''
                    rm -rf frontend/frontend || true
                    rm -rf coverage || true
                    find . -path "*/coverage/*" -name "*.xml" -delete 2>/dev/null || true
                '''

                script {
                    env.GIT_COMMIT_SHORT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    echo "Building commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    rm -rf node_modules
                    rm -f .npmrc
                    npx --yes pnpm@latest install --frozen-lockfile
                '''
            }
        }

        stage('Build Packages') {
            steps {
                sh '''
                    npx pnpm --filter "./packages/*" -r run build
                    echo "=== Verifying workspace package links ==="
                    ls -la node_modules/@unite-discord/ || echo "WARNING: @unite-discord packages not linked"
                    ls -la node_modules/@prisma/client/ || echo "WARNING: @prisma/client not found"
                    ls -la node_modules/.pnpm/ | head -20 || echo "WARNING: .pnpm store missing"
                '''
            }
        }

        stage('Lint') {
            steps {
                sh 'npx pnpm run lint'
            }
        }

        stage('Unit Tests') {
            steps {
                withAwsCredentials {
                    sh 'npx pnpm run test:unit'
                }
            }
        }

        stage('Integration Tests') {
            when {
                expression {
                    return env.BRANCH_NAME == 'main' ||
                           env.BRANCH_NAME == 'develop' ||
                           env.BRANCH_NAME =~ /^continuous-claude\// ||
                           env.CHANGE_ID != null
                }
            }
            steps {
                script {
                    try {
                        runIntegrationTests(
                            testCommand: 'npx vitest run --config vitest.integration.config.ts',
                            skipLock: false,
                            statusContext: 'jenkins/integration',
                            composeFile: 'docker-compose.test.yml'
                        )
                    } catch (Exception e) {
                        echo "⚠️  Integration tests failed"
                        echo "Error: ${e.message}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Contract Tests') {
            steps {
                sh 'npx pnpm run test:contract'
            }
        }

        stage('Build') {
            steps {
                sh 'npx pnpm run build'
            }
        }
    }

    post {
        always {
            junit testResults: 'coverage/**/*.xml', allowEmptyResults: true, skipPublishingChecks: true

            script {
                def allureDirs = ['allure-results', 'frontend/allure-results', 'backend/allure-results']
                def existingDirs = allureDirs.findAll { fileExists(it) }
                if (existingDirs) {
                    allure([
                        includeProperties: false,
                        jdk: '',
                        results: existingDirs.collect { [path: it] }
                    ])
                }
            }
        }
        success {
            script {
                def buildType = env.CHANGE_ID ? "PR #${env.CHANGE_ID}" : env.BRANCH_NAME
                githubStatusReporter(
                    status: 'success',
                    context: 'jenkins/ci',
                    description: "Build succeeded for ${buildType}"
                )
            }
        }
        failure {
            script {
                def buildType = env.CHANGE_ID ? "PR #${env.CHANGE_ID}" : env.BRANCH_NAME
                githubStatusReporter(
                    status: 'failure',
                    context: 'jenkins/ci',
                    description: "Build failed for ${buildType}"
                )
            }
        }
        cleanup {
            cleanWs()
        }
    }
}
