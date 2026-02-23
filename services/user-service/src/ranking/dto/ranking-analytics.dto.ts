/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { TierLevel, CredentialType } from '@prisma/client';

/**
 * TierDistributionDto - Count and percentage of users per tier
 */
export class TierDistributionDto {
  /** The tier level */
  tier: TierLevel;

  /** Number of users in this tier */
  count: number;

  /** Percentage of total users in this tier (0-100) */
  percentage: number;

  constructor(data: { tier: TierLevel; count: number; percentage: number }) {
    this.tier = data.tier;
    this.count = data.count;
    this.percentage = data.percentage;
  }
}

/**
 * AppealsAnalyticsDto - Statistics about tier appeals
 */
export class AppealsAnalyticsDto {
  /** Number of pending appeals */
  pending: number;

  /** Number of approved appeals */
  approved: number;

  /** Number of denied appeals */
  denied: number;

  /** Average resolution time in hours (null if no resolved appeals) */
  avgResolutionHours: number | null;

  constructor(data: {
    pending: number;
    approved: number;
    denied: number;
    avgResolutionHours: number | null;
  }) {
    this.pending = data.pending;
    this.approved = data.approved;
    this.denied = data.denied;
    this.avgResolutionHours = data.avgResolutionHours;
  }
}

/**
 * CredentialTypeCountDto - Count of credentials by type
 */
export class CredentialTypeCountDto {
  /** The credential type */
  type: CredentialType;

  /** Number of credentials of this type */
  count: number;

  constructor(data: { type: CredentialType; count: number }) {
    this.type = data.type;
    this.count = data.count;
  }
}

/**
 * CredentialsAnalyticsDto - Statistics about domain credentials
 */
export class CredentialsAnalyticsDto {
  /** Number of pending credentials */
  pending: number;

  /** Number of verified credentials */
  verified: number;

  /** Number of rejected credentials */
  rejected: number;

  /** Breakdown by credential type */
  byType: CredentialTypeCountDto[];

  constructor(data: {
    pending: number;
    verified: number;
    rejected: number;
    byType: CredentialTypeCountDto[];
  }) {
    this.pending = data.pending;
    this.verified = data.verified;
    this.rejected = data.rejected;
    this.byType = data.byType;
  }
}

/**
 * SystemHealthDto - Overall ranking system health metrics
 */
export class SystemHealthDto {
  /** ISO timestamp of last ranking recalculation (null if never) */
  lastRecalculation: string | null;

  /** Average composite score across all users */
  avgCompositeScore: number;

  /** Minimum composite score */
  minScore: number;

  /** Maximum composite score */
  maxScore: number;

  /** Median composite score */
  medianScore: number;

  constructor(data: {
    lastRecalculation: string | null;
    avgCompositeScore: number;
    minScore: number;
    maxScore: number;
    medianScore: number;
  }) {
    this.lastRecalculation = data.lastRecalculation;
    this.avgCompositeScore = data.avgCompositeScore;
    this.minScore = data.minScore;
    this.maxScore = data.maxScore;
    this.medianScore = data.medianScore;
  }
}

/**
 * RankingAnalyticsDto - Aggregated analytics for admin dashboard
 *
 * Provides a comprehensive overview of the ranking system including:
 * - Tier distribution across all users
 * - Appeals statistics and resolution times
 * - Credential verification status
 * - System health metrics
 * - Top contributors list
 */
export class RankingAnalyticsDto {
  /** Distribution of users across tiers */
  tierDistribution: TierDistributionDto[];

  /** Total number of users with rankings */
  totalUsers: number;

  /** Appeals statistics */
  appeals: AppealsAnalyticsDto;

  /** Credentials statistics */
  credentials: CredentialsAnalyticsDto;

  /** System health metrics */
  systemHealth: SystemHealthDto;

  /** Top 10 contributors by composite score */
  topContributors: Array<{
    userId: string;
    displayName: string | null;
    compositeScore: number;
    tierLevel: TierLevel;
  }>;

  constructor(data: {
    tierDistribution: TierDistributionDto[];
    totalUsers: number;
    appeals: AppealsAnalyticsDto;
    credentials: CredentialsAnalyticsDto;
    systemHealth: SystemHealthDto;
    topContributors: Array<{
      userId: string;
      displayName: string | null;
      compositeScore: number;
      tierLevel: TierLevel;
    }>;
  }) {
    this.tierDistribution = data.tierDistribution;
    this.totalUsers = data.totalUsers;
    this.appeals = data.appeals;
    this.credentials = data.credentials;
    this.systemHealth = data.systemHealth;
    this.topContributors = data.topContributors;
  }
}
