# @unite-discord/shared

Shared utilities, constants, and types for Unite Discord platform.

## Installation

```bash
pnpm install
```

## Development

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Type checking
pnpm typecheck

# Build
pnpm build

# Clean build artifacts
pnpm clean
```

## Testing & Coverage

This package is configured with Vitest and enforces 80% coverage thresholds across:
- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

To generate a coverage report:

```bash
pnpm test --coverage
```

Coverage reports are generated in `./coverage` directory with HTML, JSON, LCOV, and text formats.

## Structure

```
src/
├── index.ts          # Main entry point
├── index.test.ts     # Tests
└── ...other modules
```
