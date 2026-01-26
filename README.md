# ReasonBridge

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)
![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)

A Discord-related platform using specification-driven development to foster rational discussion and healthy discourse through AI-powered analysis and community feedback mechanisms.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Configuration](#configuration)
- [Testing](#testing)
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

- **[Frontend README](./frontend/README.md)** - Frontend-specific setup and development
- **[Architecture Documentation](./specs/001-rational-discussion-platform/)** - Detailed architecture and design specifications

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:

- Open a [GitHub Issue](https://github.com/steiner385/reasonBridge/issues)
- Check existing [discussions](https://github.com/steiner385/reasonBridge/discussions)
- Review project [specifications](./specs/)

# Webhook test
