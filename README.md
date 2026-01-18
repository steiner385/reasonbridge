# UniteDiscord

A Discord-related platform using specification-driven development.

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
pnpm -r --filter="@unite-discord/*" build

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

## Git Hooks

This project uses [husky](https://typicode.github.io/husky/) for git hooks:

- **pre-commit**: Runs linting, type checking, and security scans
- **pre-push**: Prevents direct pushes to `main` branch
- **commit-msg**: Validates commit message format

> **Important**: Git hooks are configured when you run `pnpm install`. If hooks aren't working, run `pnpm prepare` to reinitialize them.

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

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

Direct pushes to `main` are blocked by git hooks. All changes must go through pull requests.
