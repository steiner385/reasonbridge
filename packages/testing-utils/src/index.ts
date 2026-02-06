/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @reason-bridge/testing-utils
 *
 * Shared test helpers, mocks, and fixtures for the reasonBridge platform.
 *
 * @example Basic usage
 * ```typescript
 * import { createMockFn } from '@reason-bridge/testing-utils';
 * ```
 *
 * @example MSW setup (import separately)
 * ```typescript
 * import { server, addHandlers } from '@reason-bridge/testing-utils/msw';
 * ```
 *
 * @example Shared test setup (use in vitest.config.ts)
 * ```typescript
 * // vitest.config.ts
 * setupFiles: ['@reason-bridge/testing-utils/setup']
 * ```
 */

export * from './mocks/index.js';
export * from './fixtures/index.js';
export * from './assertions/index.js';
export * from './db-cleanup.js';

// Re-export commonly used MSW types for convenience
export type { RequestHandler } from 'msw';
