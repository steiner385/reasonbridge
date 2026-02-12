/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vitest setup file for db-models package
 *
 * Ensures the Prisma client is generated before tests run.
 * This is necessary because the tests import @prisma/client directly.
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export default async function setup() {
  // Check if the GENERATED Prisma client exists (not just the @prisma/client package)
  // The generated client lives in .prisma/client which is created by `prisma generate`
  const generatedClientDir = join(__dirname, '../../node_modules/.prisma/client');

  if (!existsSync(generatedClientDir)) {
    // Generate Prisma client if not found
    try {
      execFileSync('npx', ['prisma', 'generate'], {
        cwd: __dirname,
        stdio: 'inherit',
      });
    } catch {
      // Continue anyway - the test import will fail with a clearer error
    }
  }
}
