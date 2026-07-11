/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Accessibility (WCAG 2.2 AA) test configuration.
 *
 * The a11y regression suite lives in tests/e2e/accessibility, outside the main
 * config's testDir ('./e2e'), so it needs its own config to run. CI runs it as
 * a non-blocking step after the main E2E suite (parity with the advisory
 * jenkins/accessibility status from the old pipeline).
 *
 * Usage: npx playwright test --config playwright.a11y.config.ts
 */
export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e/accessibility',
});
