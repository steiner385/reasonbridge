<!--
================================================================================
SYNC IMPACT REPORT
================================================================================
Version change: 0.0.0 → 1.0.0
Bump rationale: MAJOR - Initial constitution ratification with 4 core principles

Modified principles:
- [PRINCIPLE_1_NAME] → I. Code Quality
- [PRINCIPLE_2_NAME] → II. Testing Standards
- [PRINCIPLE_3_NAME] → III. User Experience Consistency
- [PRINCIPLE_4_NAME] → IV. Performance Requirements
- [PRINCIPLE_5_NAME] → (removed, not needed)

Added sections:
- Quality Gates (was [SECTION_2_NAME])
- Development Workflow (was [SECTION_3_NAME])
- Governance (filled from template)

Removed sections:
- None (template placeholders replaced)

Templates validated:
- ✅ .specify/templates/plan-template.md - Constitution Check section compatible
- ✅ .specify/templates/spec-template.md - Success criteria align with performance principle
- ✅ .specify/templates/tasks-template.md - Test-first workflow aligns with Testing Standards

Follow-up TODOs: None
================================================================================
-->

# uniteDiscord Constitution

## Core Principles

### I. Code Quality

All code MUST adhere to consistent style and maintainability standards:

- **Linting**: All code MUST pass configured linters with zero warnings before merge
- **Type Safety**: TypeScript strict mode MUST be enabled; `any` type is prohibited except
  with documented justification
- **Code Review**: All changes MUST be reviewed by at least one other contributor
- **DRY Principle**: Shared logic MUST be extracted when duplicated more than twice
- **Documentation**: Public APIs MUST have JSDoc/TSDoc comments describing purpose,
  parameters, and return values
- **Error Handling**: All async operations MUST have explicit error handling; silent
  failures are prohibited

### II. Testing Standards

Testing is mandatory and MUST follow test-driven practices:

- **Coverage Threshold**: New features MUST maintain minimum 80% line coverage for
  business logic
- **Test-First**: For bug fixes, a failing test MUST be written before the fix is
  implemented
- **Test Categories**:
  - Unit tests: Required for all pure functions and utility modules
  - Integration tests: Required for Discord API interactions and database operations
  - Contract tests: Required for external API boundaries
- **Test Naming**: Tests MUST follow the pattern: `[unit under test]_[scenario]_[expected result]`
- **Mocking**: External services (Discord API, databases) MUST be mocked in unit tests;
  real services used only in integration tests
- **CI Gate**: All tests MUST pass before merge; flaky tests MUST be fixed or quarantined
  within 48 hours

### III. User Experience Consistency

Discord bot interactions MUST provide a consistent and intuitive experience:

- **Response Time Feedback**: Commands taking >1 second MUST show a loading indicator
  or deferred response
- **Error Messages**: All user-facing errors MUST be actionable, explaining what went
  wrong and how to fix it
- **Command Patterns**: Similar commands MUST use consistent argument patterns and
  response formats
- **Accessibility**: Text content MUST be readable; avoid excessive formatting, emoji
  spam, or walls of text
- **Graceful Degradation**: Partial failures MUST NOT crash the entire command; show
  what succeeded and what failed
- **Confirmation for Destructive Actions**: Operations that delete data or affect
  multiple users MUST require explicit confirmation

### IV. Performance Requirements

The bot MUST meet these performance standards under normal load:

- **Command Response**: Initial response (or deferred acknowledgment) MUST complete
  within 3 seconds of command invocation
- **Memory Usage**: Bot process MUST NOT exceed 512MB RSS under normal operation;
  memory leaks MUST be investigated within 24 hours of detection
- **Startup Time**: Bot MUST be ready to accept commands within 30 seconds of process start
- **Rate Limiting**: All Discord API calls MUST respect rate limits; implement exponential
  backoff for 429 responses
- **Database Queries**: Individual queries MUST complete within 100ms; queries exceeding
  this MUST be optimized or cached
- **Concurrent Users**: Bot MUST handle 100 concurrent command invocations without
  degradation

## Quality Gates

All pull requests MUST pass these gates before merge:

| Gate | Requirement | Enforcement |
|------|-------------|-------------|
| Lint | Zero errors and warnings | CI automated |
| Type Check | Zero TypeScript errors | CI automated |
| Unit Tests | All pass, coverage threshold met | CI automated |
| Integration Tests | All pass | CI automated |
| Code Review | At least 1 approval | GitHub branch protection |
| Performance | No regression beyond 10% | Manual review for significant changes |

## Development Workflow

### Branch Strategy

- `main`: Production-ready code only; protected branch
- `develop`: Integration branch for features
- Feature branches: `[issue-number]-short-description` format

### Commit Standards

- Commits MUST follow Conventional Commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Breaking changes MUST include `BREAKING CHANGE:` in commit body

### Release Process

- Releases follow semantic versioning (MAJOR.MINOR.PATCH)
- CHANGELOG.md MUST be updated with each release
- Tags MUST match version numbers: `v1.2.3`

## Governance

This constitution supersedes all other development practices in this repository:

- **Compliance Verification**: All pull requests MUST demonstrate compliance with
  applicable principles
- **Complexity Justification**: Deviations from these principles MUST be documented
  in the PR description with clear rationale
- **Amendment Process**: Changes to this constitution require:
  1. Written proposal with rationale
  2. Review period of at least 48 hours
  3. Approval from project maintainer(s)
  4. Version increment following semantic versioning
- **Enforcement**: CI pipelines MUST enforce automatable rules; non-automatable rules
  are enforced through code review

**Version**: 1.0.0 | **Ratified**: 2026-01-17 | **Last Amended**: 2026-01-17
