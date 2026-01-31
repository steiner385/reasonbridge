# ReasonBridge

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)
![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)

A Discord-related platform using specification-driven development to foster rational discussion and healthy discourse through AI-powered analysis and community feedback mechanisms.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Configuration](#configuration)
- [Testing](#testing)
- [Load Testing](#load-testing)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Tone Analysis** - Analyze and visualize the emotional tone of discussions
- **Common Ground Detection** - Identify areas of agreement between participants
- **Clarity Scoring** - Measure and improve the clarity of arguments
- **Real-time Feedback** - Provide interactive feedback during conversations
- **Moderation Tools** - Review and moderate content with confidence scoring
- **User Trust System** - Track user reputation and verification status
- **Feedback Analytics** - Measure the effectiveness of feedback mechanisms

## Architecture

ReasonBridge uses a microservices architecture with the following key components:

| Service | Description |
|---------|-------------|
| API Gateway | Central routing, authentication, rate limiting, resilience |
| User Service | User management, authentication, profiles |
| Discussion Service | Topics, propositions, responses, threading |
| AI Service | AI-powered analysis (bias detection, common ground) |
| Moderation Service | Content moderation, appeals, reporting |

### Resilience Features

- **Circuit Breakers** - Prevent cascade failures with automatic service isolation
- **Retry with Backoff** - Automatic retry for transient failures with exponential backoff
- **Rate Limiting** - Configurable tiers (100/min default, 10/min strict, 5/min auth)
- **Security Headers** - OWASP-compliant security headers via Helmet

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Prerequisites

- **Node.js 20.x** or higher
- **pnpm** (will be installed by setup script if missing)
- **Git**

## Quick Start

After cloning the repository, run the setup script:

```bash
./scripts/setup.sh
```

This will:

1. Verify Node.js and pnpm are installed
2. Install all dependencies (`pnpm install`)
3. Configure git hooks (husky) for code quality enforcement
4. Build shared packages
5. Generate Prisma client

### Manual Setup

If you prefer to set up manually:

```bash
# Install dependencies (required - also initializes git hooks)
pnpm install

# Build shared packages
pnpm -r --filter="@reason-bridge/*" build

# Generate Prisma client
pnpm --filter="user-service" exec prisma generate
```

## Development

```bash
# Start development servers
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm typecheck
```

## Configuration

### Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration areas:

- **Application** - Node environment, logging level
- **Discord Bot** - Token, client ID, guild ID
- **Database** - PostgreSQL connection details
- **Cache** - Redis connection configuration
- **AWS/LocalStack** - S3, SQS, and other service credentials
- **Authentication** - Cognito user pool configuration
- **API Keys** - Optional OpenAI API for advanced features

See `.env.example` for a complete list of available options.

### Database

The project uses Prisma for database management. Database schema is defined in `packages/db-models/prisma/schema.prisma`.

```bash
# Apply pending migrations
pnpm db:migrate

# Open Prisma Studio (visual DB manager)
pnpm db:studio

# Seed database with sample data
pnpm db:seed
```

## Testing

Run tests using the following commands:

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# Contract tests (API contract validation)
pnpm test:contract

# End-to-end tests (frontend)
pnpm test:e2e

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Testing Infrastructure

The project uses Vitest for unit and integration testing with Prisma mocking to allow tests to run without database dependencies. Each service has its own `vitest.config.ts` file that excludes problematic tests that require database connections until proper mocking is implemented.

Services use a local test setup file (e.g., `src/test-setup.ts`) that creates comprehensive Prisma client mocks, allowing unit tests to run in isolation without external dependencies.

## Load Testing

The project includes k6 load tests for performance validation:

```bash
# Install k6 (https://k6.io/docs/getting-started/installation/)
brew install k6  # macOS

# Run smoke test (5 users)
k6 run load-tests/scenarios/health.js

# Run load test (100 users)
k6 run -e TEST_TYPE=load load-tests/scenarios/topics.js

# Run stress test (500 users)
k6 run -e TEST_TYPE=stress load-tests/scenarios/user-journey.js

# Run soak test (10,000 users)
k6 run load-tests/scenarios/soak-10k.js
```

Available scenarios:
- `health.js` - Health endpoint checks
- `topics.js` - Topics CRUD operations
- `auth.js` - Authentication flows
- `user-journey.js` - Full user journey simulation
- `soak-10k.js` - High concurrency capacity test

See [load-tests/README.md](./load-tests/README.md) for detailed documentation.

## Git Hooks

This project uses [husky](https://typicode.github.io/husky/) for git hooks:

- **pre-commit**: Runs linting, type checking, and security scans
- **pre-push**: Prevents direct pushes to `main` branch
- **commit-msg**: Validates commit message format

> **Important**: Git hooks are configured when you run `pnpm install`. If hooks aren't working, run `pnpm prepare` to reinitialize them.

## API Documentation

API specifications are defined in OpenAPI and GraphQL formats within the specs directory:

- **OpenAPI Specs**: `specs/*/contracts/openapi.yaml`
- **GraphQL Schemas**: `specs/*/contracts/*.graphql`

Each feature specification includes detailed API contracts in the `contracts/` subdirectory.

## Project Structure

```
├── frontend/           # React frontend application
├── services/           # Backend microservices
│   ├── user-service/   # User management and authentication
│   ├── ai-service/     # AI integration (AWS Bedrock)
│   ├── discussion-service/
│   └── moderation-service/
├── packages/           # Shared packages
│   ├── ai-client/      # AI client wrapper
│   └── common/         # Common utilities
├── specs/              # Feature specifications (speckit)
└── .husky/             # Git hooks
```

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Create a feature branch** from `main`

   ```bash
   git checkout -b feat/description-of-feature
   ```

2. **Make your changes** and write tests

   ```bash
   pnpm lint:fix            # Fix linting issues
   pnpm format              # Format code
   pnpm test                # Run tests
   ```

3. **Commit with clear messages**

   ```bash
   git commit -m "feat: description of changes"
   ```

4. **Push and create a Pull Request**

   ```bash
   git push origin feat/description-of-feature
   ```

5. **Ensure tests pass** and request reviews

Direct pushes to `main` are blocked by git hooks. All changes must go through pull requests.

## Additional Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)** - System architecture, microservices, resilience patterns
- **[Developer Guide](./docs/DEVELOPER.md)** - Comprehensive setup and development instructions
- **[Load Testing Guide](./load-tests/README.md)** - Performance testing with k6
- **[Frontend README](./frontend/README.md)** - Frontend-specific setup and development
- **[Feature Specifications](./specs/)** - Detailed feature specifications and design documents

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:

- Open a [GitHub Issue](https://github.com/steiner385/reasonBridge/issues)
- Check existing [discussions](https://github.com/steiner385/reasonBridge/discussions)
- Review project [specifications](./specs/)

# Webhook test
