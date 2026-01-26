# @reason-bridge/test-utils

Test utilities for the reasonBridge monorepo to facilitate unit testing without external dependencies.

## Purpose

This package provides utilities to mock external dependencies (particularly Prisma) to allow unit tests to run without requiring database connections or other external services.

## Approach

Rather than relying on complex module resolution, this package provides a direct function to create mock Prisma clients. The approach embeds the mock setup directly in service test setups to avoid module resolution issues in the monorepo.

## Components

- `createMockPrisma()`: Creates a comprehensive mock of the Prisma client with all necessary model methods
- Global mocks for external dependencies like AWS Bedrock and PDFKit

## Usage

The setup is embedded directly in service-level test setup files (e.g., `src/test-setup.ts` in each service) to avoid module resolution complexities in the monorepo structure.

## Included Mocks

The mock includes all Prisma client methods and model-specific methods for:

- user
- discussionTopic
- response
- responseProposition
- proposition
- alignment
- vote
- moderationAction
- verification
- trustScore
- feedback
- suggestion
- notification

Each model includes standard Prisma methods like findUnique, findMany, create, update, delete, etc.

## Motivation

This approach resolves the "Prisma client module resolution issues" that were preventing unit tests from running in CI environments without database dependencies.
