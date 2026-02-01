/**
 * Demo Environment ID Constants
 *
 * Deterministic UUIDs for demo environment data.
 * Uses 11111111- prefix to distinguish from:
 * - Test fixtures (00000000- prefix)
 * - Production data (random UUIDs)
 *
 * Format: 11111111-0000-4000-8000-XXXXXXXXXXXX
 */

// =============================================================================
// DEMO USER IDS
// =============================================================================

export const DEMO_USER_IDS = {
  ADMIN_ADAMS: '11111111-0000-4000-8000-000000000001',
  MOD_MARTINEZ: '11111111-0000-4000-8000-000000000002',
  ALICE_ANDERSON: '11111111-0000-4000-8000-000000000003',
  BOB_BUILDER: '11111111-0000-4000-8000-000000000004',
  NEW_USER: '11111111-0000-4000-8000-000000000005',
} as const;

// =============================================================================
// DEMO TOPIC IDS (101-110)
// =============================================================================

export const DEMO_TOPIC_IDS = {
  CONGESTION_PRICING: '11111111-0000-4000-8000-000000000101',
  AI_DISCLOSURE: '11111111-0000-4000-8000-000000000102',
  STANDARDIZED_TESTING: '11111111-0000-4000-8000-000000000103',
  RETURN_TO_OFFICE: '11111111-0000-4000-8000-000000000104',
  PREVENTIVE_CARE: '11111111-0000-4000-8000-000000000105',
  AGE_VERIFICATION: '11111111-0000-4000-8000-000000000106',
  MANDATORY_VOTING: '11111111-0000-4000-8000-000000000107',
  PRODUCT_AI_DISCLOSURE: '11111111-0000-4000-8000-000000000108',
  PLASTIC_BAN: '11111111-0000-4000-8000-000000000109',
  GOF_OVERSIGHT: '11111111-0000-4000-8000-000000000110',
} as const;

// =============================================================================
// DEMO TAG IDS (201-210)
// =============================================================================

export const DEMO_TAG_IDS = {
  ENVIRONMENT: '11111111-0000-4000-8000-000000000201',
  TECHNOLOGY: '11111111-0000-4000-8000-000000000202',
  EDUCATION: '11111111-0000-4000-8000-000000000203',
  ECONOMY: '11111111-0000-4000-8000-000000000204',
  HEALTHCARE: '11111111-0000-4000-8000-000000000205',
  ETHICS: '11111111-0000-4000-8000-000000000206',
  GOVERNMENT: '11111111-0000-4000-8000-000000000207',
  BUSINESS: '11111111-0000-4000-8000-000000000208',
  SCIENCE: '11111111-0000-4000-8000-000000000209',
  SOCIETY: '11111111-0000-4000-8000-000000000210',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a deterministic response ID based on topic and sequence
 * Format: 11111111-0000-4000-8000-0000TTTRRRR
 * TTT = topic number (101-110)
 * RRRR = response sequence (0001-9999)
 */
export function generateResponseId(topicNumber: number, responseSequence: number): string {
  const topicPart = topicNumber.toString().padStart(3, '0');
  const responsePart = responseSequence.toString().padStart(4, '0');
  return `11111111-0000-4000-8000-0000${topicPart}${responsePart}`;
}

/**
 * Generate a deterministic proposition ID
 * Format: 11111111-0000-4000-8000-0001TTTPPPP
 * TTT = topic number (101-110)
 * PPPP = proposition sequence (0001-9999)
 */
export function generatePropositionId(topicNumber: number, propositionSequence: number): string {
  const topicPart = topicNumber.toString().padStart(3, '0');
  const propPart = propositionSequence.toString().padStart(4, '0');
  return `11111111-0000-4000-8000-0001${topicPart}${propPart}`;
}

/**
 * Generate a deterministic AI feedback ID
 * Format: 11111111-0000-4000-8000-0002TTTFFFF
 * TTT = type code (001=bias, 002=clarity, 003=constructive, 004=common, 005=value)
 * FFFF = feedback sequence (0001-9999)
 */
export function generateFeedbackId(typeCode: number, feedbackSequence: number): string {
  const typePart = typeCode.toString().padStart(3, '0');
  const feedbackPart = feedbackSequence.toString().padStart(4, '0');
  return `11111111-0000-4000-8000-0002${typePart}${feedbackPart}`;
}

/**
 * Generate a deterministic common ground analysis ID
 * Format: 11111111-0000-4000-8000-0003TTTAAAA
 * TTT = topic number (101-110)
 * AAAA = analysis sequence (0001-9999)
 */
export function generateCommonGroundId(topicNumber: number, analysisSequence: number): string {
  const topicPart = topicNumber.toString().padStart(3, '0');
  const analysisPart = analysisSequence.toString().padStart(4, '0');
  return `11111111-0000-4000-8000-0003${topicPart}${analysisPart}`;
}

/**
 * Check if a UUID belongs to the demo environment
 */
export function isDemoId(uuid: string): boolean {
  return uuid.startsWith('11111111-');
}

/**
 * Check if an email belongs to a demo user
 */
export function isDemoEmail(email: string): boolean {
  return email.endsWith('@reasonbridge.demo');
}

// Type exports
export type DemoUserId = (typeof DEMO_USER_IDS)[keyof typeof DEMO_USER_IDS];
export type DemoTopicId = (typeof DEMO_TOPIC_IDS)[keyof typeof DEMO_TOPIC_IDS];
export type DemoTagId = (typeof DEMO_TAG_IDS)[keyof typeof DEMO_TAG_IDS];
