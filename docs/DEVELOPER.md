# Developer Guide

This guide provides comprehensive instructions for setting up, developing, and contributing to the ReasonBridge platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x LTS | Runtime environment |
| pnpm | 9.x | Package manager |
| Docker | Latest | Development services |
| Git | Latest | Version control |

### Optional Software

| Software | Version | Purpose |
|----------|---------|---------|
| k6 | Latest | Load testing |
| PostgreSQL Client | 15.x | Database CLI access |
| Redis CLI | Latest | Cache inspection |

### Installation

**Node.js (via nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**pnpm:**
```bash
npm install -g pnpm
```

**Docker:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo usermod -aG docker $USER

# macOS
brew install --cask docker
```

## Quick Start

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/steiner385/reasonbridge.git
cd reasonbridge

# Install dependencies (also sets up git hooks)
pnpm install
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, LocalStack
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings (editor of choice)
nano .env
```

**Minimum Required Variables:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reasonbridge?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-development-secret-key"
NODE_ENV="development"
```

### 4. Initialize Database

```bash
# Generate Prisma client
pnpm --filter=@reason-bridge/db-models exec prisma generate

# Run migrations
pnpm --filter=@reason-bridge/db-models exec prisma migrate dev

# (Optional) Seed with sample data
pnpm --filter=user-service exec prisma db seed
```

### 5. Build Shared Packages

```bash
# Build all shared packages
pnpm -r --filter="@reason-bridge/*" build
```

### 6. Start Development Servers

```bash
# Start all services in development mode
pnpm dev

# Or start specific services
pnpm --filter=api-gateway dev
pnpm --filter=user-service dev
pnpm --filter=frontend dev
```

### 7. Verify Setup

- **Frontend:** http://localhost:5173
- **API Gateway:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/health

## Project Structure

```
reasonbridge/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── contexts/         # React Context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and API client
│   │   ├── pages/            # Route-level pages
│   │   └── types/            # TypeScript definitions
│   ├── e2e/                  # Playwright E2E tests
│   └── public/               # Static assets
│
├── services/                 # Backend microservices
│   ├── api-gateway/          # Central API gateway
│   │   ├── src/
│   │   │   ├── config/       # Security & app configuration
│   │   │   ├── middleware/   # Express middleware
│   │   │   ├── proxy/        # Service proxy logic
│   │   │   ├── resilience/   # Circuit breakers, retry
│   │   │   └── metrics/      # Observability
│   │   └── package.json
│   ├── user-service/         # User management
│   ├── discussion-service/   # Topics and responses
│   ├── ai-service/           # AI analysis
│   └── ...                   # Other microservices
│
├── packages/                 # Shared packages
│   ├── common/               # Utilities and types
│   ├── db-models/            # Prisma schema
│   ├── event-schemas/        # Event definitions
│   └── ai-client/            # AI provider wrapper
│
├── load-tests/               # k6 load tests
│   ├── scenarios/            # Test scenarios
│   └── lib/                  # Shared utilities
│
├── docs/                     # Documentation
├── specs/                    # Feature specifications
└── .husky/                   # Git hooks
```

## Development Workflow

### Creating a Feature Branch

```bash
# Always branch from main
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

### Branch Naming Convention

| Prefix | Use Case |
|--------|----------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code refactoring |
| `docs/` | Documentation updates |
| `test/` | Test additions/updates |
| `chore/` | Maintenance tasks |

### Making Changes

1. **Write code** following existing patterns
2. **Add tests** for new functionality
3. **Run local checks** before committing:

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Unit tests
pnpm test:unit

# Format code
pnpm format
```

### Committing Changes

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat(user-service): add password reset functionality"

# Bug fix
git commit -m "fix(api-gateway): handle timeout errors in circuit breaker"

# Refactor
git commit -m "refactor(frontend): simplify auth context logic"
```

**Pre-commit hooks will run automatically:**
- Secrets scanning
- Code duplication detection
- Console statement check
- ESLint
- Unit tests
- Formatting

### Creating a Pull Request

```bash
# Push branch
git push -u origin feat/your-feature-name

# Create PR via GitHub CLI
gh pr create --title "feat: your feature description" --body "..."
```

**PR Requirements:**
- Passes all CI checks (lint, unit, integration)
- Has descriptive title and body
- Links related issues
- Gets at least one approval

## Testing

### Test Types

| Type | Command | Location |
|------|---------|----------|
| Unit | `pnpm test:unit` | `**/__tests__/*.spec.ts` |
| Integration | `pnpm test:integration` | `**/__tests__/*.integration.ts` |
| Contract | `pnpm test:contract` | `**/contract/*.spec.ts` |
| E2E | `pnpm test:e2e` | `frontend/e2e/*.spec.ts` |

### Running Tests

```bash
# All tests
pnpm test

# Watch mode (development)
pnpm test:unit:watch

# Specific service
pnpm --filter=user-service test

# With coverage
pnpm test:coverage
```

### Writing Tests

**Unit Test Example:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { UserService } from '../user.service';

describe('UserService', () => {
  it('should create a user', async () => {
    const mockPrisma = {
      user: { create: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }) }
    };

    const service = new UserService(mockPrisma);
    const result = await service.create({ email: 'test@example.com' });

    expect(result.id).toBe('1');
  });
});
```

### Load Testing

```bash
# Install k6 (if not installed)
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu

# Run smoke test
k6 run load-tests/scenarios/health.js

# Run load test
k6 run -e TEST_TYPE=load load-tests/scenarios/topics.js
```

## Code Quality

### ESLint Configuration

The project uses ESLint with Airbnb TypeScript rules. Configuration is in `.eslintrc.js`.

```bash
# Check linting
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Prettier Configuration

Code formatting is handled by Prettier. Configuration is in `.prettierrc`.

```bash
# Check formatting
pnpm format:check

# Apply formatting
pnpm format
```

### TypeScript

Strict TypeScript is enabled. Type check with:

```bash
pnpm typecheck
```

### Git Hooks

Pre-commit hooks enforce code quality:

1. **Secrets Scan** - Detects leaked credentials
2. **Duplication Detection** - Prevents copy-paste code
3. **Console Check** - Blocks console.log (except allowed files)
4. **Forbidden Imports** - Prevents unsafe imports
5. **Unit Tests** - Runs core service tests
6. **Lint-staged** - Formats staged files

## Debugging

### VS Code Launch Configurations

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API Gateway",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/services/api-gateway/src/main.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Debugging Tests

```bash
# Debug in VS Code
pnpm --filter=api-gateway test -- --inspect-brk

# Debug specific test
pnpm --filter=api-gateway test -- --grep "circuit breaker" --inspect-brk
```

### Viewing Logs

```bash
# Service logs (if using docker-compose)
docker-compose logs -f api-gateway

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

### Database Inspection

```bash
# Open Prisma Studio (visual database browser)
pnpm --filter=@reason-bridge/db-models exec prisma studio

# PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d reasonbridge
```

### Redis Inspection

```bash
# Redis CLI
docker-compose exec redis redis-cli

# Common commands
KEYS *
GET session:user123
TTL rate-limit:192.168.1.1
```

## Troubleshooting

### Common Issues

**Issue:** `pnpm install` fails with lockfile error
```bash
# Solution: Refresh lockfile
pnpm install --no-frozen-lockfile
```

**Issue:** TypeScript errors about missing types
```bash
# Solution: Rebuild packages
pnpm -r build
```

**Issue:** Database connection refused
```bash
# Solution: Ensure Docker is running
docker-compose up -d postgres
docker-compose logs postgres
```

**Issue:** Port already in use
```bash
# Solution: Find and kill process
lsof -i :3000
kill -9 <PID>
```

**Issue:** Pre-commit hooks fail
```bash
# Never bypass with --no-verify!
# Fix the reported issue, stage changes, and commit again

# For test failures
pnpm test:unit

# For lint issues
pnpm lint:fix
```

**Issue:** E2E tests timeout
```bash
# Solution: Increase timeout in playwright.config.ts
# Or check if services are running
curl http://localhost:3000/health
```

### Getting Help

1. Check existing [GitHub Issues](https://github.com/steiner385/reasonbridge/issues)
2. Review [Architecture Documentation](./ARCHITECTURE.md)
3. Ask in project discussions
4. Check Jenkins build logs for CI failures

### Useful Commands Reference

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Start development
pnpm dev

# Run tests
pnpm test

# Check types
pnpm typecheck

# Lint and format
pnpm lint:fix && pnpm format

# Database migrations
pnpm --filter=@reason-bridge/db-models exec prisma migrate dev

# Generate Prisma client
pnpm --filter=@reason-bridge/db-models exec prisma generate
```
