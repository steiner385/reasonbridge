/**
 * Workspace configuration for contract tests.
 *
 * This file is needed because the default vitest.workspace.ts uses per-service
 * configs that don't include pact tests. Contract tests need to discover tests
 * across all services using a single config with cross-workspace patterns.
 */
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace(['vitest.contract.config.ts']);
