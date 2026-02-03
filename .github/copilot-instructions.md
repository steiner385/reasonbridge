# GitHub Copilot Instructions for reasonBridge

This file provides instructions for GitHub Copilot when working with the reasonBridge codebase.

## Project Overview

reasonBridge is a **Rational Discussion Platform** built with modern web technologies for structured debates, claim validation, bias detection, and common ground discovery.

**Stack**: React 18 + TypeScript 5 + Vite (frontend), Node.js 20 LTS (runtime), pnpm 9.x (package manager)

## Technology Stack

- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS 3
- **Backend**: NestJS microservices, Node.js 20 LTS
- **Database**: PostgreSQL 15 with Prisma ORM
- **Testing**: Vitest 2.x (unit/integration), Playwright 1.58.0 (E2E)
- **Package Manager**: pnpm 9.x (workspace monorepo)
- **CI/CD**: Jenkins (multibranch pipeline)

## Repository Structure

This is a pnpm workspace monorepo:

```
packages/           # Shared libraries
  ├── common/       # Shared utilities, constants, types
  ├── db-models/    # Prisma schema and database models
  ├── event-schemas/ # Event type definitions
  └── ai-client/    # AI provider abstraction

services/           # Backend microservices (NestJS)
  ├── api-gateway/
  ├── user-service/
  ├── discussion-service/
  ├── ai-service/
  └── moderation-service/

frontend/           # React frontend application
  ├── src/
  │   ├── components/  # React components
  │   ├── hooks/       # Custom hooks
  │   ├── pages/       # Route pages
  │   └── types/       # TypeScript types
  └── e2e/            # Playwright E2E tests
```

## Essential Commands

### Development

```bash
pnpm install              # Install dependencies (ALWAYS use frozen lockfile in CI)
pnpm dev                  # Start all development servers
pnpm build                # Build all packages and services
```

### Code Quality

```bash
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix ESLint issues
pnpm format:check         # Check Prettier formatting
pnpm format               # Format code with Prettier
pnpm typecheck            # TypeScript type checking
```

### Testing

```bash
pnpm test:unit            # Run unit tests
pnpm test:unit:watch      # Watch mode for unit tests
pnpm test:integration     # Run integration tests
pnpm test:e2e             # Run E2E tests (Playwright)
pnpm test:contract        # Run contract tests
```

### Database

```bash
pnpm db:migrate           # Run Prisma migrations
pnpm db:studio            # Open Prisma Studio
pnpm db:seed              # Seed database
```

## Coding Standards

### TypeScript

- **Strict mode enabled** - All TypeScript strict checks are enforced
- **Never use `any`** - Always provide proper types
- **Prefer `const`** over `let` where possible
- **Use type inference** - Let TypeScript infer types when obvious
- **Export types and interfaces** - Make types reusable across modules

### React

- **Use functional components** - No class components
- **Hooks-based architecture** - Use React hooks for state and effects
- **Component organization**:
  - One component per file
  - Co-locate tests with components (`.spec.tsx`)
  - Use `data-testid` attributes for E2E selectors

### Styling

- **Tailwind CSS** - Use utility-first classes
- **No inline styles** - Use Tailwind classes instead
- **Consistent design system** - Follow existing patterns

### File Naming

- React components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Types: `PascalCase.ts` or co-located with implementation
- Tests: `*.spec.ts` or `*.test.ts`

## Git Workflow

### Pre-commit Hooks (MANDATORY)

**NEVER bypass pre-commit hooks with `--no-verify` or `-n`**

The following checks run automatically on every commit:

- Secrets scanning (prevents credential leaks)
- Code duplication detection
- Console statement detection (no `console.log` in production)
- Forbidden imports check
- Dependencies audit
- File size check
- Linting and formatting (via lint-staged)

If a pre-commit hook fails:

1. Read the error message carefully
2. Fix the issue in your code
3. Stage the fixed changes
4. Commit again

**Use `npm run commit` for safe commits with all checks.**

### Commit Messages

- Use conventional commits format
- Be descriptive and specific
- Reference issue numbers when applicable

## Testing Guidelines

### Unit Tests (Vitest)

- Test files: `*.spec.ts` or `*.test.ts`
- Co-locate tests with source code
- Mock external dependencies
- Aim for high coverage on business logic

### E2E Tests (Playwright)

- Location: `frontend/e2e/`
- **NEVER use `--debug` or `--headed` flags** (breaks CI/automation)
- Always run in headless mode
- Use `data-testid` attributes for selectors
- Keep tests isolated and independent

### Integration Tests

- Test service interactions
- Use Docker services (postgres, redis, localstack)
- Run with `pnpm test:integration`

## CI/CD Pipeline (Jenkins)

The Jenkins pipeline runs these stages on every push:

1. **Initialize** - Checkout code
2. **Install Dependencies** - `pnpm install --frozen-lockfile`
3. **Build Packages** - Compile shared packages
4. **Lint** - ESLint and formatting checks
5. **Unit Tests** - Vitest with coverage thresholds
6. **Integration Tests** - Vitest + Docker services
7. **Contract Tests** - API contract validation
8. **E2E Tests** - Playwright (main/develop only)
9. **Build** - Production artifact generation

**Required status checks for `main` branch**:

- `jenkins/lint`
- `jenkins/unit-tests`
- `jenkins/integration`
- `jenkins/ci` (overall pipeline status)

## Forbidden Practices

### Never Do

- ❌ Bypass pre-commit hooks (`git commit --no-verify`)
- ❌ Use `any` type in TypeScript
- ❌ Commit secrets or credentials
- ❌ Use `console.log` in production code (remove before committing)
- ❌ Modify files under `.github/agents/` (agent-specific instructions)
- ❌ Use `git reset` or `git rebase` (force push not available)
- ❌ Install packages without checking for vulnerabilities
- ❌ Run Playwright with `--debug` or `--headed` in CI/automation
- ❌ Use `npm` or `yarn` (always use `pnpm`)
- ❌ Commit `node_modules`, build artifacts, or temporary files

### Always Do

- ✅ Run tests before committing
- ✅ Use frozen lockfile in CI (`--frozen-lockfile`)
- ✅ Follow existing code patterns and conventions
- ✅ Update tests when changing functionality
- ✅ Use TypeScript strict mode
- ✅ Write descriptive commit messages
- ✅ Check CI status before merging PRs
- ✅ Use `pnpm` for all package operations

## Architecture Principles

### The Boy Scout Rule

**Always leave the codebase better than you found it.**

When working on any task:

- Fix failing tests you encounter
- Fix build errors you discover
- Address blocking TODOs
- Improve code quality incrementally

Do NOT say "this is pre-existing" or "unrelated to my changes" - fix problems as you find them.

### Microservices Communication

- **Synchronous**: HTTP/REST between services via API Gateway
- **Asynchronous**: Event-driven via Redis pub/sub and AWS SQS/SNS

### Service Boundaries

Each service has clear responsibilities:

- **API Gateway**: Routing, auth middleware, rate limiting
- **User Service**: User management, authentication, profiles
- **Discussion Service**: Topics, propositions, responses, threading
- **AI Service**: AI-powered analysis (bias detection, common ground)
- **Moderation Service**: Content moderation, appeals, reporting

## Package Management

### pnpm Workspaces

- Use workspace protocol for internal dependencies: `workspace:*`
- Run commands in specific packages: `pnpm --filter <package-name> <command>`
- Run commands in all packages: `pnpm -r <command>`

### Installing Dependencies

```bash
pnpm add <package>                    # Add to root
pnpm add <package> --filter <pkg>     # Add to specific package
pnpm add -D <package>                 # Add as dev dependency
```

## Debugging Common Issues

### Issue: `pnpm install` fails with lockfile errors

**Solution**: Never use `--no-frozen-lockfile` in CI. Locally, run `pnpm install` and commit the updated lockfile.

### Issue: TypeScript errors about missing types

**Solution**: Check `node_modules/@types` exist, run `pnpm install`, restart TypeScript server.

### Issue: Pre-commit hooks fail

**Solution**: Fix the reported issue, stage changes, commit again. Do NOT bypass.

### Issue: E2E tests timeout or fail

**Solution**: Ensure headless mode, check selectors are stable, review Playwright HTML reports.

### Issue: Jenkins build fails but passes locally

**Solution**: Check Jenkins console logs, verify environment variables, ensure Docker services are running.

## Environment Variables

Required environment variables are documented in:

- `.env.example` (root)
- Service-specific `.env.example` files

**Never commit `.env` files or secrets.**

## Documentation

Key documentation files:

- `README.md` - Project overview and quick start
- `CLAUDE.md` - Instructions for Claude Code
- `.github/CI_SETUP.md` - CI/CD setup guide
- `.github/INTEGRATION_TESTS.md` - Integration testing guide
- `.github/SECURITY.md` - Security policies
- `docs/ARCHITECTURE.md` - Detailed architecture documentation

## Getting Help

- Review existing patterns in the codebase
- Check documentation in `docs/` directory
- Review test files for usage examples
- Consult the README.md for setup instructions

## Summary

When contributing to reasonBridge:

1. Use pnpm for all package operations
2. Follow TypeScript strict mode conventions
3. Write tests for new functionality
4. Run linters and tests before committing
5. Never bypass pre-commit hooks
6. Keep the codebase clean and maintainable
7. Follow the Boy Scout Rule - leave it better than you found it

<!-- Updated: 2026-02-01 -->
