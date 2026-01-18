pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        PNPM_HOME = "${WORKSPACE}/.pnpm-store"
        PATH = "${PNPM_HOME}:${env.PATH}"
        GITHUB_REPO = 'steiner385/uniteDiscord'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Notify Start') {
            steps {
                script {
                    // Set GitHub commit status to pending
                    if (env.CHANGE_ID) {
                        // This is a PR build
                        githubNotify context: 'Jenkins CI',
                                     status: 'PENDING',
                                     description: 'Build started...',
                                     credentialsId: 'github-token'
                    }
                }
            }
        }

        stage('Setup') {
            steps {
                sh '''
                    # Install pnpm if not available
                    npm install -g pnpm@8

                    # Install dependencies
                    pnpm install --frozen-lockfile
                '''
            }
        }

        stage('Build Dependencies') {
            steps {
                sh '''
                    # Build shared packages (required before tests can import them)
                    pnpm -r --filter="@unite-discord/*" build

                    # Generate Prisma client (required for database-dependent tests)
                    pnpm --filter="@unite-discord/db-models" exec prisma generate
                '''
            }
        }

        stage('Security & Quality Gates') {
            parallel {
                stage('Secrets Scan') {
                    steps {
                        sh 'bash .husky/pre-commit-secrets-scan'
                    }
                }
                stage('Console Check') {
                    steps {
                        sh 'bash .husky/pre-commit-no-console'
                    }
                }
                stage('Forbidden Imports') {
                    steps {
                        sh 'bash .husky/pre-commit-forbidden-imports'
                    }
                }
                stage('File Size Check') {
                    steps {
                        sh 'bash .husky/pre-commit-file-size'
                    }
                }
            }
        }

        stage('Lint & Type Check') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'pnpm lint'
                    }
                }
                stage('Type Check') {
                    steps {
                        sh 'pnpm type-check'
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'pnpm test:unit --coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'coverage/junit.xml'
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Unit Test Coverage'
                    ])
                }
            }
        }

        stage('Integration Tests') {
            steps {
                sh '''
                    # Start test infrastructure
                    docker-compose -f docker-compose.test.yml up -d

                    # Wait for services to be ready
                    sleep 10

                    # Run integration tests
                    pnpm test:integration
                '''
            }
            post {
                always {
                    sh 'docker-compose -f docker-compose.test.yml down -v || true'
                }
            }
        }

        stage('Contract Tests') {
            steps {
                sh 'pnpm test:contract'
            }
        }

        stage('E2E Tests') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    changeRequest target: 'main'
                }
            }
            steps {
                sh '''
                    # Install Playwright browsers
                    pnpm --filter frontend playwright install --with-deps

                    # Start the full stack
                    docker-compose up -d

                    # Wait for services
                    sleep 15

                    # Run E2E tests
                    pnpm test:e2e
                '''
            }
            post {
                always {
                    sh 'docker-compose down -v || true'
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'frontend/playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright E2E Report'
                    ])
                }
            }
        }

        stage('Build') {
            steps {
                sh 'pnpm build'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            script {
                echo 'All tests passed successfully'
                // Update GitHub status on success
                if (env.CHANGE_ID) {
                    githubNotify context: 'Jenkins CI',
                                 status: 'SUCCESS',
                                 description: 'All checks passed',
                                 credentialsId: 'github-token'
                }
                // Trigger GitHub Actions workflow to update status
                sh '''
                    if [ -n "${GITHUB_TOKEN}" ]; then
                        curl -X POST \
                            -H "Accept: application/vnd.github+json" \
                            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
                            "https://api.github.com/repos/${GITHUB_REPO}/dispatches" \
                            -d '{
                                "event_type": "jenkins-build-result",
                                "client_payload": {
                                    "sha": "'${GIT_COMMIT}'",
                                    "result": "SUCCESS",
                                    "build_url": "'${BUILD_URL}'",
                                    "build_number": "'${BUILD_NUMBER}'",
                                    "pr_number": "'${CHANGE_ID}'"
                                }
                            }' || echo "Failed to dispatch GitHub event"
                    fi
                '''
            }
        }
        failure {
            script {
                echo 'Pipeline failed - check test reports for details'
                // Update GitHub status on failure
                if (env.CHANGE_ID) {
                    githubNotify context: 'Jenkins CI',
                                 status: 'FAILURE',
                                 description: 'Build failed - check logs',
                                 credentialsId: 'github-token'
                }
                // Trigger GitHub Actions workflow to update status
                sh '''
                    if [ -n "${GITHUB_TOKEN}" ]; then
                        curl -X POST \
                            -H "Accept: application/vnd.github+json" \
                            -H "Authorization: Bearer ${GITHUB_TOKEN}" \
                            "https://api.github.com/repos/${GITHUB_REPO}/dispatches" \
                            -d '{
                                "event_type": "jenkins-build-result",
                                "client_payload": {
                                    "sha": "'${GIT_COMMIT}'",
                                    "result": "FAILURE",
                                    "build_url": "'${BUILD_URL}'",
                                    "build_number": "'${BUILD_NUMBER}'",
                                    "pr_number": "'${CHANGE_ID}'"
                                }
                            }' || echo "Failed to dispatch GitHub event"
                    fi
                '''
            }
        }
        unstable {
            script {
                echo 'Pipeline unstable - some tests may have failed'
                if (env.CHANGE_ID) {
                    githubNotify context: 'Jenkins CI',
                                 status: 'FAILURE',
                                 description: 'Build unstable - check logs',
                                 credentialsId: 'github-token'
                }
            }
        }
    }
}
