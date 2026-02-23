/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * User Ranking System Types
 *
 * Types for the tiered user ranking system that tracks user engagement,
 * quality of contributions, and assigns global tier levels.
 */

/**
 * User tier levels in the ranking system.
 * Each tier represents a level of reputation and access.
 */
export type TierLevel = 'NEWCOMER' | 'CONTRIBUTOR' | 'TRUSTED' | 'LEADER' | 'EXPERT';

/**
 * Numeric mapping for tier levels (1-5)
 */
export const TIER_LEVEL_NUMBERS: Record<TierLevel, number> = {
  NEWCOMER: 1,
  CONTRIBUTOR: 2,
  TRUSTED: 3,
  LEADER: 4,
  EXPERT: 5,
};

/**
 * Score thresholds for each tier level
 */
export const TIER_THRESHOLDS: Record<TierLevel, { min: number; max: number }> = {
  NEWCOMER: { min: 0.0, max: 0.19 },
  CONTRIBUTOR: { min: 0.2, max: 0.39 },
  TRUSTED: { min: 0.4, max: 0.59 },
  LEADER: { min: 0.6, max: 0.79 },
  EXPERT: { min: 0.8, max: 1.0 },
};

/**
 * User ranking information including composite score and tier details
 */
export interface UserRank {
  /** User ID this ranking belongs to */
  userId: string;

  /** User's display name (may be null if not set) */
  displayName: string | null;

  /** Overall composite score (0.00 - 1.00) */
  compositeScore: number;

  /** Current tier level */
  tierLevel: TierLevel;

  /** Score threshold for next tier (1.0 if already at EXPERT) */
  nextTierThreshold: number;

  /** Progress towards next tier as percentage (0-100) */
  progressToNextTier: number;

  /** Engagement score component (0.00 - 1.00) */
  engagementScore: number;

  /** Quality score component (0.00 - 1.00) */
  qualityScore: number;

  /** Tenure bonus component (0.00 - 0.10) */
  tenureBonus: number;

  /** Array of badge IDs earned by the user */
  badges: string[];

  /** ISO timestamp of last score calculation */
  lastCalculated: string;

  /** ISO timestamp of last user activity (null if never active) */
  lastActivityAt: string | null;
}

/**
 * Tier metadata for display purposes
 */
export interface TierInfo {
  level: TierLevel;
  name: string;
  description: string;
  color: string;
  darkColor: string;
  bgColor: string;
  darkBgColor: string;
  borderColor: string;
  darkBorderColor: string;
}

/**
 * Get tier information for display
 */
/**
 * Domain-specific expertise levels in the ranking system.
 * Represents a user's proficiency within a specific topic/tag domain.
 */
export type ExpertiseLevel = 'NOVICE' | 'FAMILIAR' | 'KNOWLEDGEABLE' | 'EXPERT';

/**
 * Score thresholds for each expertise level
 */
export const EXPERTISE_THRESHOLDS: Record<ExpertiseLevel, { min: number; max: number }> = {
  NOVICE: { min: 0.0, max: 0.24 },
  FAMILIAR: { min: 0.25, max: 0.49 },
  KNOWLEDGEABLE: { min: 0.5, max: 0.74 },
  EXPERT: { min: 0.75, max: 1.0 },
};

/**
 * User's expertise in a specific topic/tag domain
 */
export interface TopicExpertise {
  /** User ID this expertise belongs to */
  userId: string;

  /** Tag/topic ID this expertise is for */
  tagId: string;

  /** Display name of the tag/topic */
  tagName: string;

  /** Expertise score (0.00 - 1.00) */
  expertiseScore: number;

  /** Current expertise level */
  expertiseLevel: ExpertiseLevel;

  /** Number of responses in this domain */
  responseCount: number;

  /** Progress towards next level as percentage (0-100) */
  progressToNextLevel: number;

  /** ISO timestamp of last activity in this domain (null if never active) */
  lastActive: string | null;
}

/**
 * Expertise metadata for display purposes
 */
export interface ExpertiseInfo {
  level: ExpertiseLevel;
  name: string;
  description: string;
  color: string;
  darkColor: string;
  bgColor: string;
  darkBgColor: string;
  borderColor: string;
  darkBorderColor: string;
}

/**
 * Get expertise information for display
 */
export const getExpertiseInfo = (level: ExpertiseLevel): ExpertiseInfo => {
  const expertiseLevels: Record<ExpertiseLevel, ExpertiseInfo> = {
    NOVICE: {
      level: 'NOVICE',
      name: 'Novice',
      description: 'New to this topic',
      color: 'text-gray-700',
      darkColor: 'dark:text-gray-300',
      bgColor: 'bg-gray-100',
      darkBgColor: 'dark:bg-gray-800',
      borderColor: 'border-gray-300',
      darkBorderColor: 'dark:border-gray-600',
    },
    FAMILIAR: {
      level: 'FAMILIAR',
      name: 'Familiar',
      description: 'Gaining familiarity with this topic',
      color: 'text-teal-700',
      darkColor: 'dark:text-teal-400',
      bgColor: 'bg-teal-100',
      darkBgColor: 'dark:bg-teal-900/30',
      borderColor: 'border-teal-300',
      darkBorderColor: 'dark:border-teal-700',
    },
    KNOWLEDGEABLE: {
      level: 'KNOWLEDGEABLE',
      name: 'Knowledgeable',
      description: 'Well-versed in this topic',
      color: 'text-indigo-700',
      darkColor: 'dark:text-indigo-400',
      bgColor: 'bg-indigo-100',
      darkBgColor: 'dark:bg-indigo-900/30',
      borderColor: 'border-indigo-300',
      darkBorderColor: 'dark:border-indigo-700',
    },
    EXPERT: {
      level: 'EXPERT',
      name: 'Expert',
      description: 'Expert in this topic',
      color: 'text-amber-700',
      darkColor: 'dark:text-amber-400',
      bgColor: 'bg-amber-100',
      darkBgColor: 'dark:bg-amber-900/30',
      borderColor: 'border-amber-300',
      darkBorderColor: 'dark:border-amber-700',
    },
  };

  return expertiseLevels[level];
};

/**
 * Types of verifiable credentials for domain expertise.
 * Used to boost a user's expertise score in specific topic domains.
 */
export type CredentialType =
  | 'ACADEMIC_DOCTORATE'
  | 'ACADEMIC_MASTERS'
  | 'ACADEMIC_BACHELORS'
  | 'PROFESSIONAL_LICENSE'
  | 'INDUSTRY_CERTIFICATION'
  | 'PUBLICATION';

/**
 * Display names for credential types
 */
export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  ACADEMIC_DOCTORATE: 'Doctorate (PhD, MD, JD)',
  ACADEMIC_MASTERS: "Master's Degree",
  ACADEMIC_BACHELORS: "Bachelor's Degree",
  PROFESSIONAL_LICENSE: 'Professional License',
  INDUSTRY_CERTIFICATION: 'Industry Certification',
  PUBLICATION: 'Publication',
};

/**
 * Status of a credential verification request
 */
export type CredentialStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

/**
 * Display names for credential statuses
 */
export const CREDENTIAL_STATUS_LABELS: Record<CredentialStatus, string> = {
  PENDING: 'Pending Review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

/**
 * A user's credential for domain expertise verification
 */
export interface Credential {
  /** Unique credential ID */
  id: string;

  /** User ID this credential belongs to */
  userId: string;

  /** Tag/topic ID this credential is for */
  tagId: string;

  /** Display name of the tag/topic */
  tagName: string;

  /** Type of credential */
  type: CredentialType;

  /** Title of the credential (e.g., "PhD in Clinical Psychology") */
  title: string;

  /** Institution that issued the credential */
  institution: string;

  /** URL to uploaded document proof (optional) */
  documentUrl?: string;

  /** URL to external verification (optional) */
  verificationUrl?: string;

  /** Current verification status */
  status: CredentialStatus;

  /** Boost value applied to expertise score when verified */
  boostValue: number;

  /** ISO timestamp when the credential expires (optional, for certifications) */
  expiresAt?: string;

  /** ISO timestamp when the credential was submitted */
  createdAt: string;
}

/**
 * Input data for submitting a new credential
 */
export interface SubmitCredentialInput {
  /** Tag/topic ID this credential is for */
  tagId: string;

  /** Type of credential */
  type: CredentialType;

  /** Title of the credential */
  title: string;

  /** Institution that issued the credential */
  institution: string;

  /** URL to uploaded document proof (optional) */
  documentUrl?: string;

  /** URL to external verification (optional) */
  verificationUrl?: string;

  /** ISO timestamp when the credential expires (optional) */
  expiresAt?: string;
}

/**
 * Tier distribution for analytics
 */
export interface TierDistribution {
  /** Tier level */
  tier: TierLevel;
  /** Number of users in this tier */
  count: number;
  /** Percentage of total users */
  percentage: number;
}

/**
 * Appeals analytics summary
 */
export interface AppealsAnalytics {
  /** Number of pending appeals */
  pending: number;
  /** Number of approved appeals */
  approved: number;
  /** Number of denied appeals */
  denied: number;
  /** Average resolution time in hours */
  avgResolutionHours: number;
}

/**
 * Credential type distribution
 */
export interface CredentialTypeCount {
  /** Credential type */
  type: CredentialType;
  /** Number of credentials of this type */
  count: number;
}

/**
 * Credentials analytics summary
 */
export interface CredentialsAnalytics {
  /** Number of pending credentials */
  pending: number;
  /** Number of verified credentials */
  verified: number;
  /** Number of rejected credentials */
  rejected: number;
  /** Distribution by credential type */
  byType: CredentialTypeCount[];
}

/**
 * System health metrics for ranking
 */
export interface RankingSystemHealth {
  /** ISO timestamp of last ranking recalculation */
  lastRecalculation: string | null;
  /** Average composite score across all users */
  avgCompositeScore: number;
  /** Minimum composite score */
  minScore: number;
  /** Maximum composite score */
  maxScore: number;
  /** Median composite score */
  medianScore: number;
}

/**
 * Complete ranking analytics response
 */
export interface RankingAnalytics {
  /** Distribution of users across tiers */
  tierDistribution: TierDistribution[];
  /** Total number of users in the ranking system */
  totalUsers: number;
  /** Appeals analytics summary */
  appeals: AppealsAnalytics;
  /** Credentials analytics summary */
  credentials: CredentialsAnalytics;
  /** System health metrics */
  systemHealth: RankingSystemHealth;
  /** Top contributors by composite score */
  topContributors: UserRank[];
}

export const getTierInfo = (tier: TierLevel): TierInfo => {
  const tiers: Record<TierLevel, TierInfo> = {
    NEWCOMER: {
      level: 'NEWCOMER',
      name: 'Newcomer',
      description: 'New to the community',
      color: 'text-gray-700',
      darkColor: 'dark:text-gray-300',
      bgColor: 'bg-gray-100',
      darkBgColor: 'dark:bg-gray-800',
      borderColor: 'border-gray-300',
      darkBorderColor: 'dark:border-gray-600',
    },
    CONTRIBUTOR: {
      level: 'CONTRIBUTOR',
      name: 'Contributor',
      description: 'Active community member',
      color: 'text-green-700',
      darkColor: 'dark:text-green-400',
      bgColor: 'bg-green-100',
      darkBgColor: 'dark:bg-green-900/30',
      borderColor: 'border-green-300',
      darkBorderColor: 'dark:border-green-700',
    },
    TRUSTED: {
      level: 'TRUSTED',
      name: 'Trusted',
      description: 'Trusted community member',
      color: 'text-blue-700',
      darkColor: 'dark:text-blue-400',
      bgColor: 'bg-blue-100',
      darkBgColor: 'dark:bg-blue-900/30',
      borderColor: 'border-blue-300',
      darkBorderColor: 'dark:border-blue-700',
    },
    LEADER: {
      level: 'LEADER',
      name: 'Leader',
      description: 'Community leader',
      color: 'text-purple-700',
      darkColor: 'dark:text-purple-400',
      bgColor: 'bg-purple-100',
      darkBgColor: 'dark:bg-purple-900/30',
      borderColor: 'border-purple-300',
      darkBorderColor: 'dark:border-purple-700',
    },
    EXPERT: {
      level: 'EXPERT',
      name: 'Expert',
      description: 'Expert contributor',
      color: 'text-amber-700',
      darkColor: 'dark:text-amber-400',
      bgColor: 'bg-amber-100',
      darkBgColor: 'dark:bg-amber-900/30',
      borderColor: 'border-amber-300',
      darkBorderColor: 'dark:border-amber-700',
    },
  };

  return tiers[tier];
};
