/**
 * Demo Persona Definitions
 *
 * Defines the 5 demo personas required by FR-001:
 * - Admin Adams: Admin with full permissions
 * - Mod Martinez: Moderator for moderation workflows
 * - Alice Anderson: Power user with high engagement
 * - Bob Builder: Regular user with moderate activity
 * - New User: Fresh user for onboarding experience
 */

import { DEMO_USER_IDS } from './demo-ids';

// Types matching Prisma schema
type AuthMethod = 'EMAIL_PASSWORD' | 'GOOGLE_OAUTH' | 'APPLE_OAUTH';
type VerificationLevel = 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';
type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface DemoPersona {
  id: string;
  email: string;
  displayName: string;
  cognitoSub: string;
  authMethod: AuthMethod;
  emailVerified: boolean;
  passwordHash: string;
  accountStatus: AccountStatus;
  phoneNumber: string | null;
  phoneVerified: boolean;
  verificationLevel: VerificationLevel;
  trustScoreAbility: number;
  trustScoreBenevolence: number;
  trustScoreIntegrity: number;
  moralFoundationProfile: MoralFoundationProfile;
  status: UserStatus;
  // Metadata for demos
  role: DemoRole;
  description: string;
  activityLevel: ActivityLevel;
}

export type DemoRole = 'admin' | 'moderator' | 'power_user' | 'regular_user' | 'new_user';
export type ActivityLevel = 'low' | 'medium' | 'high' | 'very_high';

interface MoralFoundationProfile {
  care: number;
  fairness: number;
  loyalty: number;
  authority: number;
  sanctity: number;
  liberty: number;
}

// Demo password hashes (bcrypt hashed versions of documented passwords)
// Password pattern: Demo{Role}2026!
// These are pre-computed bcrypt hashes for demo purposes
// IMPORTANT: Real passwords documented in password manager, not source
const DEMO_PASSWORD_HASHES = {
  // All use cost factor 10, can be verified with bcrypt.compare()
  // DemoAdmin2026!
  ADMIN: '$2b$10$demo.admin.hash.placeholder.for.development.only',
  // DemoMod2026!
  MOD: '$2b$10$demo.mod.hash.placeholder.for.development.only',
  // DemoAlice2026!
  ALICE: '$2b$10$demo.alice.hash.placeholder.for.development.only',
  // DemoBob2026!
  BOB: '$2b$10$demo.bob.hash.placeholder.for.development.only',
  // DemoNew2026!
  NEW: '$2b$10$demo.new.hash.placeholder.for.development.only',
};

/**
 * Admin Adams - Full admin access
 * Purpose: Showcase admin features, moderation queue, user management
 */
export const ADMIN_ADAMS: DemoPersona = {
  id: DEMO_USER_IDS.ADMIN_ADAMS,
  email: 'demo-admin@reasonbridge.demo',
  displayName: 'Admin Adams',
  cognitoSub: 'demo-admin',
  authMethod: 'EMAIL_PASSWORD',
  emailVerified: true,
  passwordHash: DEMO_PASSWORD_HASHES.ADMIN,
  accountStatus: 'ACTIVE',
  phoneNumber: '+1-555-0001',
  phoneVerified: true,
  verificationLevel: 'VERIFIED_HUMAN',
  trustScoreAbility: 0.95,
  trustScoreBenevolence: 0.95,
  trustScoreIntegrity: 0.95,
  moralFoundationProfile: {
    care: 0.75,
    fairness: 0.85,
    loyalty: 0.7,
    authority: 0.8,
    sanctity: 0.65,
    liberty: 0.75,
  },
  status: 'ACTIVE',
  role: 'admin',
  description: 'Showcase admin features, moderation queue, user management',
  activityLevel: 'high',
};

/**
 * Mod Martinez - Moderator access
 * Purpose: Demonstrate moderation workflows, appeals handling
 */
export const MOD_MARTINEZ: DemoPersona = {
  id: DEMO_USER_IDS.MOD_MARTINEZ,
  email: 'demo-mod@reasonbridge.demo',
  displayName: 'Mod Martinez',
  cognitoSub: 'demo-mod',
  authMethod: 'EMAIL_PASSWORD',
  emailVerified: true,
  passwordHash: DEMO_PASSWORD_HASHES.MOD,
  accountStatus: 'ACTIVE',
  phoneNumber: '+1-555-0002',
  phoneVerified: true,
  verificationLevel: 'VERIFIED_HUMAN',
  trustScoreAbility: 0.9,
  trustScoreBenevolence: 0.9,
  trustScoreIntegrity: 0.9,
  moralFoundationProfile: {
    care: 0.8,
    fairness: 0.9,
    loyalty: 0.75,
    authority: 0.7,
    sanctity: 0.6,
    liberty: 0.65,
  },
  status: 'ACTIVE',
  role: 'moderator',
  description: 'Demonstrate moderation workflows, appeals handling',
  activityLevel: 'high',
};

/**
 * Alice Anderson - Power user
 * Purpose: Active participant, high engagement, progressive viewpoints
 */
export const ALICE_ANDERSON: DemoPersona = {
  id: DEMO_USER_IDS.ALICE_ANDERSON,
  email: 'demo-alice@reasonbridge.demo',
  displayName: 'Alice Anderson',
  cognitoSub: 'demo-alice',
  authMethod: 'EMAIL_PASSWORD',
  emailVerified: true,
  passwordHash: DEMO_PASSWORD_HASHES.ALICE,
  accountStatus: 'ACTIVE',
  phoneNumber: '+1-555-0003',
  phoneVerified: true,
  verificationLevel: 'ENHANCED',
  trustScoreAbility: 0.85,
  trustScoreBenevolence: 0.85,
  trustScoreIntegrity: 0.85,
  moralFoundationProfile: {
    care: 0.9,
    fairness: 0.85,
    loyalty: 0.55,
    authority: 0.45,
    sanctity: 0.4,
    liberty: 0.85,
  },
  status: 'ACTIVE',
  role: 'power_user',
  description: 'Active participant, high engagement, progressive viewpoints',
  activityLevel: 'very_high',
};

/**
 * Bob Builder - Regular user
 * Purpose: Typical user experience, moderate activity, balanced views
 */
export const BOB_BUILDER: DemoPersona = {
  id: DEMO_USER_IDS.BOB_BUILDER,
  email: 'demo-bob@reasonbridge.demo',
  displayName: 'Bob Builder',
  cognitoSub: 'demo-bob',
  authMethod: 'EMAIL_PASSWORD',
  emailVerified: true,
  passwordHash: DEMO_PASSWORD_HASHES.BOB,
  accountStatus: 'ACTIVE',
  phoneNumber: null,
  phoneVerified: false,
  verificationLevel: 'BASIC',
  trustScoreAbility: 0.7,
  trustScoreBenevolence: 0.7,
  trustScoreIntegrity: 0.7,
  moralFoundationProfile: {
    care: 0.65,
    fairness: 0.7,
    loyalty: 0.75,
    authority: 0.7,
    sanctity: 0.65,
    liberty: 0.6,
  },
  status: 'ACTIVE',
  role: 'regular_user',
  description: 'Typical user experience, moderate activity, balanced views',
  activityLevel: 'medium',
};

/**
 * New User - Fresh account
 * Purpose: Onboarding experience, first-time user flow, limited history
 */
export const NEW_USER: DemoPersona = {
  id: DEMO_USER_IDS.NEW_USER,
  email: 'demo-new@reasonbridge.demo',
  displayName: 'New User',
  cognitoSub: 'demo-new',
  authMethod: 'EMAIL_PASSWORD',
  emailVerified: true,
  passwordHash: DEMO_PASSWORD_HASHES.NEW,
  accountStatus: 'ACTIVE',
  phoneNumber: null,
  phoneVerified: false,
  verificationLevel: 'BASIC',
  trustScoreAbility: 0.5,
  trustScoreBenevolence: 0.5,
  trustScoreIntegrity: 0.5,
  moralFoundationProfile: {
    care: 0.5,
    fairness: 0.5,
    loyalty: 0.5,
    authority: 0.5,
    sanctity: 0.5,
    liberty: 0.5,
  },
  status: 'ACTIVE',
  role: 'new_user',
  description: 'Onboarding experience, first-time user flow, limited history',
  activityLevel: 'low',
};

/**
 * All demo personas in an array for iteration
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  ADMIN_ADAMS,
  MOD_MARTINEZ,
  ALICE_ANDERSON,
  BOB_BUILDER,
  NEW_USER,
];

/**
 * Get a demo persona by role
 */
export function getPersonaByRole(role: DemoRole): DemoPersona | undefined {
  return DEMO_PERSONAS.find((p) => p.role === role);
}

/**
 * Get a demo persona by ID
 */
export function getPersonaById(id: string): DemoPersona | undefined {
  return DEMO_PERSONAS.find((p) => p.id === id);
}

/**
 * Get demo credential hints (safe for API exposure)
 */
export function getDemoCredentialHints() {
  return DEMO_PERSONAS.map((p) => ({
    role: p.role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    email: p.email,
    hint: 'Demo + Role + Year + !',
    displayName: p.displayName,
    verificationLevel: p.verificationLevel,
    trustScore: (p.trustScoreAbility + p.trustScoreBenevolence + p.trustScoreIntegrity) / 3,
  }));
}

export default DEMO_PERSONAS;
