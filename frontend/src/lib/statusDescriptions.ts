/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Human-readable descriptions for various status types used across the application.
 * These descriptions are used in tooltips to help users understand what each status means.
 */

/**
 * Topic status descriptions
 */
export const TOPIC_STATUS_DESCRIPTIONS: Record<string, string> = {
  SEEDING: 'This topic is being prepared and not yet open for discussion',
  ACTIVE: 'This topic is open for discussion',
  ARCHIVED: 'This topic is closed but all content is preserved',
  LOCKED: 'This topic is locked by moderators',
};

/**
 * Response status descriptions
 */
export const RESPONSE_STATUS_DESCRIPTIONS: Record<string, string> = {
  VISIBLE: 'This response is visible to all users',
  HIDDEN: 'This response has been hidden from public view by moderators',
  REMOVED: 'This response has been removed for policy violations',
  PENDING_REVIEW: 'This response is awaiting moderator review before becoming visible',
};

/**
 * Moderation action status descriptions
 */
export const MODERATION_STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: 'This moderation action is awaiting review',
  active: 'This moderation action is currently in effect',
  appealed: 'The user has appealed this moderation action',
  reversed: 'This moderation action was reversed on appeal',
};

/**
 * User tier descriptions with criteria
 */
export const TIER_DESCRIPTIONS: Record<string, string> = {
  NEWCOMER: 'New to the platform. Participate in discussions to advance!',
  CONTRIBUTOR: 'Regular contributor with helpful responses and participation.',
  TRUSTED: 'Trusted member with consistent high-quality contributions.',
  LEADER: 'Community leader who helps guide productive discussions.',
  EXPERT: 'Expert with demonstrated expertise and outstanding contributions.',
};

/**
 * Trust score level descriptions
 */
export const TRUST_LEVEL_DESCRIPTIONS: Record<string, string> = {
  very_high: 'Exceptional trustworthiness based on consistent positive contributions',
  high: 'Strong track record of reliable and constructive participation',
  medium: 'Building a reputation through ongoing contributions',
  low: 'Trust is being established through continued engagement',
  very_low: 'New or limited participation history',
};

/**
 * Trust score dimension descriptions
 */
export const TRUST_DIMENSION_DESCRIPTIONS = {
  ability:
    'Measures your expertise and accuracy in discussions. Based on factual accuracy, source quality, and argument structure.',
  benevolence:
    'Measures how helpful and constructive you are to others. Based on positive interactions and collaborative behavior.',
  integrity:
    'Measures your consistency and honesty in discussions. Based on good-faith engagement and following community guidelines.',
  overall:
    'Your overall trust score is the average of your Ability, Benevolence, and Integrity ratings.',
};

/**
 * Verification level descriptions
 */
export const VERIFICATION_LEVEL_DESCRIPTIONS: Record<string, string> = {
  BASIC: 'Email verified. Basic account access.',
  ENHANCED: 'Additional verification completed for expanded access.',
  VERIFIED_HUMAN: 'Fully verified human identity with complete platform access.',
};

/**
 * Get a human-readable description for a topic status
 */
export function getTopicStatusDescription(status: string): string {
  return TOPIC_STATUS_DESCRIPTIONS[status] || `Status: ${status}`;
}

/**
 * Get a human-readable description for a response status
 */
export function getResponseStatusDescription(status: string): string {
  return RESPONSE_STATUS_DESCRIPTIONS[status] || `Status: ${status}`;
}

/**
 * Get a human-readable description for a moderation status
 */
export function getModerationStatusDescription(status: string): string {
  return MODERATION_STATUS_DESCRIPTIONS[status] || `Status: ${status}`;
}

/**
 * Get a human-readable description for a user tier
 */
export function getTierDescription(tier: string): string {
  return TIER_DESCRIPTIONS[tier] || `Tier: ${tier}`;
}

/**
 * Get a human-readable description for a trust level
 */
export function getTrustLevelDescription(level: string): string {
  return TRUST_LEVEL_DESCRIPTIONS[level] || `Trust Level: ${level}`;
}
