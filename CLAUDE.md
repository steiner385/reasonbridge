# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a new Discord-related project using a specification-driven development workflow called "speckit". The project is in early stages with no source code yet - only the speckit tooling is set up.

## Speckit Workflow

The project uses a structured feature development process through Claude Code slash commands:

### Feature Development Flow

1. `/speckit.specify <description>` - Create feature specification from natural language
2. `/speckit.clarify` - Identify and resolve underspecified areas in the spec
3. `/speckit.plan` - Generate implementation plan with technical design artifacts
4. `/speckit.tasks` - Break plan into actionable, dependency-ordered tasks
5. `/speckit.implement` - Execute tasks from tasks.md
6. `/speckit.taskstoissues` - Convert tasks to GitHub issues

### Supporting Commands

- `/speckit.checklist` - Generate custom checklist for a feature
- `/speckit.analyze` - Cross-artifact consistency check across spec.md, plan.md, tasks.md
- `/speckit.constitution` - Create/update project constitution (core principles)

### Directory Structure

```
specs/[###-feature-name]/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan
├── research.md          # Phase 0 research output
├── data-model.md        # Entity definitions
├── quickstart.md        # Getting started guide
├── contracts/           # API contracts (OpenAPI/GraphQL)
├── tasks.md             # Task breakdown
└── checklists/          # Validation checklists
```

### Key Principles

- **Specs are WHAT, not HOW**: Specifications focus on user needs and business value, avoiding implementation details
- **User stories must be independently testable**: Each story should be a viable MVP slice
- **Maximum 3 [NEEDS CLARIFICATION] markers**: Make informed guesses for everything else
- **Success criteria must be technology-agnostic and measurable**

## Helper Scripts

Located in `.specify/scripts/bash/`:

- `create-new-feature.sh` - Initialize new feature branch and spec directory
- `setup-plan.sh` - Set up planning phase, returns JSON with paths
- `update-agent-context.sh` - Update agent-specific context files
- `check-prerequisites.sh` - Verify required tools are installed

## Active Technologies

- TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend) (001-rational-discussion-platform)

## Recent Changes

- 001-rational-discussion-platform: Added TypeScript 5.x (Node.js 20 LTS for backend, React 18 for frontend)
