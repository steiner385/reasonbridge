/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Credentials - Single Source of Truth
 *
 * These credentials are used by:
 * - Frontend login modal (quick login buttons)
 * - Database seed scripts (dev/demo environment setup)
 * - E2E tests (authentication fixtures)
 *
 * When adding or modifying demo accounts:
 * 1. Update this file
 * 2. Re-run the seed script: pnpm --filter @reason-bridge/db-models db:seed
 * 3. Frontend will automatically use updated credentials
 */

export interface DemoCredential {
  /** Display name for the user */
  name: string;
  /** Email address (used for login) */
  email: string;
  /** Password (plaintext - will be hashed during seeding) */
  password: string;
  /** Role description shown in UI */
  role: 'Admin' | 'Moderator' | 'Power User' | 'Regular User' | 'New User' | 'Unverified User';
  /** Whether email is verified (defaults to true) */
  emailVerified?: boolean;
}

/**
 * Demo user accounts available in development and demo environments.
 *
 * Each account represents a different user persona for testing
 * various permission levels and user journeys.
 */
export const DEMO_CREDENTIALS: readonly DemoCredential[] = [
  {
    name: 'Admin Adams',
    email: 'demo-admin@reasonbridge.demo',
    password: 'DemoAdmin2026!',
    role: 'Admin',
  },
  {
    name: 'Mod Martinez',
    email: 'demo-mod@reasonbridge.demo',
    password: 'DemoMod2026!',
    role: 'Moderator',
  },
  {
    name: 'Alice Anderson',
    email: 'demo-alice@reasonbridge.demo',
    password: 'DemoAlice2026!',
    role: 'Power User',
  },
  {
    name: 'Bob Builder',
    email: 'demo-bob@reasonbridge.demo',
    password: 'DemoBob2026!',
    role: 'Regular User',
  },
  {
    name: 'New User',
    email: 'demo-new@reasonbridge.demo',
    password: 'DemoNew2026!',
    role: 'New User',
  },
  {
    name: 'Unverified Uma',
    email: 'demo-unverified@reasonbridge.demo',
    password: 'DemoUnverified2026!',
    role: 'Unverified User',
    emailVerified: false,
  },
] as const;

/**
 * Get a demo credential by role
 */
export function getDemoCredentialByRole(role: DemoCredential['role']): DemoCredential | undefined {
  return DEMO_CREDENTIALS.find((cred) => cred.role === role);
}

/**
 * Get a demo credential by email
 */
export function getDemoCredentialByEmail(email: string): DemoCredential | undefined {
  return DEMO_CREDENTIALS.find((cred) => cred.email === email);
}
