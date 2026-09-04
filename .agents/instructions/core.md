# reasonBridge agent guidance

## Required context

- Read `README.md` and this file before unfamiliar work. Before implementation,
  review, planning, CI, or architecture changes, use the `project-context` skill to
  read the relevant sections of `.agents/knowledge/legacy-project-context.md`.
- The detailed context preserves the full component patterns, API policies, test
  recipes, CI/branch-protection details, troubleshooting, and Speckit workflow.
- Verify current versions and commands from manifests, source, and workflows when
  historical prose disagrees.

## Product and architecture

- reasonBridge is a rational-discussion platform for structured debate, claim
  validation, bias detection, and common-ground discovery.
- The frontend is React and TypeScript; backend services are NestJS microservices
  routed through the API gateway. Shared contracts and utilities belong in the
  appropriate package under `packages/`.
- Preserve service boundaries and the documented communication model. Search the
  existing code and shared packages before creating helpers, types, schemas, or APIs.
- Follow the detailed patterns for responsive layout, virtual scrolling, WebSockets,
  React Query, URL navigation, cross-panel interactions, structured logging, request
  validation, pagination, and backend error handling when those areas are touched.
- Maintain strict TypeScript, accessible UI behavior, TSDoc/JSDoc conventions, and
  behavior-focused tests.

## Development workflow

- Use pnpm and the checked-in workspace scripts. Common checks include `pnpm lint`,
  `pnpm format:check`, `pnpm typecheck`, `pnpm test:unit`, and `pnpm test:e2e`; inspect
  manifests and CI for the exact command and run the narrowest relevant checks first.
- The Boy Scout rule is part of this repository's policy: fix failures encountered
  during the work and leave the system working end-to-end. If this would materially
  expand scope or risk, surface the evidence and coordinate rather than hiding it.
- Git hooks are mandatory. Never use `--no-verify`, `git commit -n`, or bypass
  pre-push checks; repair the underlying failure.
- Keep the GitHub Actions job names aligned with branch-protection contexts. Read the
  detailed CI section before changing workflows or required checks.
- For Speckit features, preserve the sequence specify → clarify → plan → tasks →
  implement, keep specs focused on user value, and make stories independently testable.
- Long-running command output must be captured with `tee` to a descriptive `/tmp` log.

## Durable learning

- Keep always-on instructions small. Store detailed project facts in maintained docs
  or `.agents/knowledge/`, repeatable procedures in `.agents/skills/`, roles in
  `.agents/roles/`, and enforceable requirements in hooks or tests.
- Use `capture-learning` for confirmed reusable knowledge, not credentials, temporary
  task state, local paths, or speculation.
- Run `python3 .agents/agentctl.py check .` after changing the contract or projections.
