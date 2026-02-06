# Contributing to ReasonBridge

Thank you for your interest in contributing to ReasonBridge! We welcome contributions from the community and are committed to making this project a welcoming and inclusive environment for all.

## License Agreement

By contributing to ReasonBridge, you agree that your contributions will be licensed under the Apache License 2.0.

You certify that:

1. The contribution is your original work, or you have the right to submit it under the Apache 2.0 license
2. You grant the ReasonBridge project a perpetual, worldwide, non-exclusive, royalty-free patent license under the Apache 2.0 terms
3. You understand that your contributions are public and may be redistributed

This certification is based on the [Developer Certificate of Origin 1.1](https://developercertificate.org/).

## Patent Grant

Under Apache 2.0, you grant a patent license for any patents you own that are necessarily infringed by your contribution. This protects the project and its users from patent litigation.

## How to Contribute

### 1. Fork and Clone the Repository

```bash
git clone https://github.com/steiner385/reasonbridge.git
cd reasonbridge
```

### 2. Set Up Your Development Environment

Follow the setup instructions in the [README.md](README.md):

```bash
./scripts/setup.sh
```

### 3. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Use conventional commit prefixes:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes
- `chore/` - Maintenance tasks

### 4. Make Your Changes

- Write clear, concise code following the project's coding standards
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass locally

### 5. Code Quality Checks

Before committing, run:

```bash
pnpm lint:fix              # Fix linting issues
pnpm format                # Format code with Prettier
pnpm typecheck             # Check TypeScript types
pnpm test                  # Run all tests
```

### 6. Commit Your Changes

Use clear, descriptive commit messages following [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add user authentication feature"
git commit -m "fix: resolve issue with topic sorting"
git commit -m "docs: update API documentation"
```

All commits must pass pre-commit hooks:

- Code linting
- Type checking
- Security scans (secret detection, code duplication)

**Important**: Never bypass pre-commit hooks with `--no-verify`. If a hook fails, fix the issue and commit again.

### 7. Push and Create a Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a pull request on GitHub with:

- A clear title describing the change
- A detailed description of what the PR does
- References to related issues (e.g., "Fixes #123")
- Screenshots or videos for UI changes

### 8. Code Review Process

- All PRs require at least one approval
- Address review feedback promptly
- Keep your PR up to date with the main branch
- CI/CD checks must pass (lint, unit tests, integration tests)

## Development Guidelines

### Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Write self-documenting code with clear variable names
- Add comments only where the logic isn't self-evident

### Testing

- Write unit tests for new functions and components
- Add integration tests for API endpoints
- Update E2E tests for user-facing changes
- Maintain or improve code coverage

### Documentation

- Update README.md for new features
- Add JSDoc comments for public APIs
- Update CLAUDE.md for architecture changes
- Create or update specifications in `specs/` for major features

### Security

- Never commit secrets or credentials
- Use environment variables for configuration
- Follow OWASP security best practices
- Report security vulnerabilities privately (see SECURITY.md)

## Speckit Workflow (for major features)

For significant new features, use the Speckit workflow:

1. Create a specification: `/speckit.specify <description>`
2. Clarify requirements: `/speckit.clarify`
3. Plan implementation: `/speckit.plan`
4. Break down into tasks: `/speckit.tasks`
5. Implement: `/speckit.implement`

See [CLAUDE.md](CLAUDE.md#speckit-workflow) for details.

## Getting Help

- **Questions?** Open a [Discussion](https://github.com/steiner385/reasonbridge/discussions)
- **Bug reports:** Open an [Issue](https://github.com/steiner385/reasonbridge/issues)
- **Feature requests:** Open an [Issue](https://github.com/steiner385/reasonbridge/issues) with the "enhancement" label

## Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## Recognition

All contributors are recognized in our project documentation. Significant contributions may be highlighted in release notes.

Thank you for contributing to ReasonBridge!
