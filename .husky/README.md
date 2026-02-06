# Git Hooks Configuration

This directory contains pre-commit and pre-push hooks that enforce code quality, security, and project structure standards.

## Hook Overview

### Pre-Commit Hooks

The main pre-commit hook (`pre-commit`) orchestrates all quality checks in two phases:

#### Phase 1: Parallel Security & Quality Checks

These run simultaneously for speed:

- **`pre-commit-secrets-scan`** - Detects sensitive credentials (API keys, tokens, passwords)
  - Uses: `detect-secrets` (requires `pipx install detect-secrets`)
  - Blocks commits containing secrets
  - Maintains `.secrets.baseline` for known patterns

- **`pre-commit-duplication-detection`** - Identifies duplicated code blocks
  - Uses: `jscpd` (npm package)
  - Threshold: 20% (configurable in `.jscpdrc.json`)
  - Suggests refactoring strategies

- **`pre-commit-root-check`** - Enforces clean root directory structure
  - Whitelist-based validation
  - Prevents random files/directories at project root
  - Configuration in this script

- **`pre-commit-dependencies-audit`** - Scans for vulnerable dependencies
  - Uses: `npm audit`
  - Blocks commits with known vulnerabilities
  - Suggests update strategies

- **`eslint`** - Lints staged code files
  - Configuration: `.eslintrc` / ESLint config in project root

#### Phase 2: Sequential Quality Checks

These run one after another:

- **TypeScript Type Checking** - Runs `tsc --noEmit`
  - Prevents type errors from being committed
  - Uses project's `tsconfig.json`

- **`pre-commit-no-console`** - Detects console statements in production code
  - Blocks: `console.log()`, `console.debug()`
  - Allows: `console.error()`, `console.warn()`
  - Allows: All console in test files

- **`pre-commit-forbidden-imports`** - Prevents anti-pattern imports
  - Blocks: Importing test files in production code
  - Blocks: Importing from `__tests__` directory
  - Blocks: Importing test utilities outside of tests

- **Unit Tests** - Runs relevant test suite
  - Targeted: Tests for changed files only (default)
  - Full: All tests (use `FULL_TEST=true git commit`)

- **`lint-staged`** - Formats code and runs final checks
  - Configuration: `package.json` `lint-staged` section
  - Runs: eslint --fix, prettier --write

### Pre-Push Hook

- **`pre-push`** - Prevents direct pushes to main branch
  - Enforces: Feature branches → Pull Requests workflow
  - Bypass: `git push --no-verify` (not recommended)

### Commit Message Hook

- **`commit-msg`** - Enforces Conventional Commits format
  - Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`
  - Format: `type(scope?): subject`
  - Examples:
    - `feat(auth): add JWT token refresh`
    - `fix(api): resolve database timeout`
    - `docs: update README`

## Safe Commit Wrapper

A wrapper script (`bin/git-commit-wrapper`) prevents accidental bypass attempts:

**Features:**

- ✅ Detects and blocks `--no-verify` or `-n` flags
- ✅ Provides clear error messages with guidance
- ✅ Explains why each quality gate is important
- ✅ Guides developers through the proper fix process
- ✅ Perfect for agentic coding sessions to ensure code quality

**Usage:**

```bash
# Use npm script instead of git commit directly
npm run commit -- -m "feat: your message"
# Instead of: git commit -m "feat: your message"
```

**If someone tries to bypass:**

```bash
$ npm run commit -- -n -m "message"
❌ ERROR: Using --no-verify or -n is not permitted in this repository
[Shows detailed guidance on how to properly fix issues]
```

## Installation & Setup

### 1. Install Dependencies

```bash
# Install npm packages (including jscpd)
pnpm install
# or npm install / yarn install
```

### 2. Install System Dependencies

```bash
# Install detect-secrets for secret scanning (optional but recommended)
pip install detect-secrets
# or
pipx install detect-secrets
```

### 3. Initialize Hooks

```bash
# Husky installs git hooks automatically via "prepare" script
pnpm install  # This runs prepare script
# or manually:
npx husky install
```

### 4. Verify Setup

```bash
# Check that .git/hooks are set up
ls -la .git/hooks/

# Manually test any hook:
bash .husky/pre-commit-secrets-scan
bash .husky/pre-commit-no-console
# etc.
```

## Running Validation Manually

Each hook can be run standalone using npm scripts:

```bash
# Run individual validations
npm run validate:secrets
npm run validate:duplication
npm run validate:root-check
npm run validate:console
npm run validate:imports
npm run validate:deps
npm run validate:file-size
```

## Configuration Files

### `.jscpdrc.json` - Duplication Detection

- Threshold: 20% (fails if duplication exceeds this)
- Min Lines: 10 (minimum lines to count as duplication)
- Min Tokens: 15 (minimum tokens to count as duplication)
- Ignores: `node_modules`, `dist`, `coverage`, test files, generated files

### `.secrets.baseline` - Secrets Scanning

- Baseline for `detect-secrets`
- Stores known secrets to avoid false positives
- Update with: `detect-secrets scan --baseline .secrets.baseline --update`

## Common Issues & Solutions

### Issue: "detect-secrets not found"

```bash
# Solution: Install detect-secrets via pipx
pipx install detect-secrets
# Or: python -m pip install detect-secrets
```

### Issue: "jscpd not found"

```bash
# Solution: Already installed as devDependency
pnpm install
# It will be available via npx jscpd
```

### Issue: Hook fails on pre-existing code

**Pre-commit only checks staged files** (not pre-existing code)

- Existing violations in codebase won't block commits
- Only new violations in staged changes will block

### Issue: Attempting to bypass hooks with `--no-verify` or `-n`

**⛔ IMPORTANT: Do NOT use `--no-verify` or `-n` flags. This bypasses critical security and quality checks.**

If you try to use these flags with the safe commit script:

```bash
$ npm run commit -- -n -m "message"
❌ ERROR: Using --no-verify or -n is not permitted in this repository
```

The wrapper script will:

1. **Reject** the bypass attempt
2. **Explain why** hooks are mandatory
3. **Guide you** through the proper fix process

**Why these flags are blocked:**

- They bypass secrets detection (can leak API keys, passwords, tokens)
- They bypass TypeScript checking (can commit broken code)
- They bypass test validation (can introduce regressions)
- They bypass code quality checks (duplication, console.log, etc.)

**If a hook is genuinely broken:**
Contact the team to discuss the issue. Never bypass - always fix the root cause.

### Issue: Secrets false positive

```bash
# Update baseline to ignore known false positives
detect-secrets scan --baseline .secrets.baseline --update
git add .secrets.baseline
git commit -m "chore: update secrets baseline"
```

### Issue: Duplication threshold too strict

```bash
# Edit .jscpdrc.json and increase threshold
# Default is 20, can be increased to 25-30 for larger projects
```

## Safe Commit Workflow

### Using the Safe Commit Script (Recommended)

Instead of using `git commit` directly, use the `npm run commit` script which prevents accidental bypass attempts:

```bash
# Normal commit
npm run commit -- -m "feat(module): implement feature"

# With amend
npm run commit -- -m "fix: resolve issue" --amend

# With all changes
npm run commit -- -m "docs: update README" -a

# For full test suite (before releases)
FULL_TEST=true npm run commit -- -m "release: v1.0.0"
```

**Why use `npm run commit`?**

- Prevents accidental use of `--no-verify` or `-n` flags
- Provides clear guidance if you try to bypass hooks
- Ensures consistent commit behavior across the team
- Great for agentic coding sessions to enforce code quality

### Full Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ... edit files ...

# 3. Stage changes
git add .

# 4. Commit (hooks run automatically)
npm run commit -- -m "feat(module): implement feature"
# Hooks check: secrets, duplication, root structure, deps, types, console, imports, tests, formatting

# 5. Push to remote
git push --set-upstream origin feature/my-feature
# Pre-push prevents pushing to main

# 6. Create Pull Request on GitHub
# Use conventional commit message as PR description
```

## Disabling Hooks (Not Recommended)

To disable Husky temporarily:

```bash
# Disable (prevents git commit from running hooks)
npx husky uninstall

# Re-enable
npx husky install
```

## More Information

- [Husky Documentation](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [detect-secrets GitHub](https://github.com/Yelp/detect-secrets)
- [jscpd GitHub](https://github.com/kucherenko/jscpd)
- [ESLint Configuration](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
