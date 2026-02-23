/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { TierAppealType, TierAppealStatus, TierLevel, ExpertiseLevel } from '@prisma/client';

/**
 * Human-readable names for tier levels
 */
const TIER_LEVEL_NAMES: Record<TierLevel, string> = {
  NEWCOMER: 'Newcomer',
  CONTRIBUTOR: 'Contributor',
  TRUSTED: 'Trusted',
  LEADER: 'Leader',
  EXPERT: 'Expert',
};

/**
 * Human-readable names for expertise levels
 */
const EXPERTISE_LEVEL_NAMES: Record<ExpertiseLevel, string> = {
  NOVICE: 'Novice',
  FAMILIAR: 'Familiar',
  KNOWLEDGEABLE: 'Knowledgeable',
  EXPERT: 'Expert',
};

/**
 * AppealDto - Data transfer object for tier appeal information
 *
 * Contains the appeal details, status, and resolution information
 * for a user's tier or domain expertise appeal.
 */
export class AppealDto {
  /** The unique identifier of the appeal */
  id: string;

  /** The unique identifier of the user who submitted the appeal */
  userId: string;

  /** Display name of the user who submitted the appeal */
  userName: string;

  /** Type of appeal (GLOBAL_TIER or DOMAIN_EXPERTISE) */
  appealType: TierAppealType;

  /** The category/tag ID for domain expertise appeals (null for global tier) */
  categoryId?: string;

  /** Name of the category for domain expertise appeals */
  categoryName?: string;

  /** The tier or expertise level being requested (0-4 for tiers, 0-3 for expertise) */
  requestedLevel: number;

  /** Human-readable name of the requested level */
  requestedLevelName: string;

  /** The user's justification for the appeal */
  reason: string;

  /** Current status of the appeal */
  status: TierAppealStatus;

  /** ID of the admin who reviewed the appeal (if reviewed) */
  reviewedBy?: string;

  /** Display name of the reviewer */
  reviewerName?: string;

  /** Notes from the admin review (if reviewed) */
  reviewNotes?: string;

  /** Timestamp when the appeal was submitted */
  createdAt: Date;

  /** Timestamp when the appeal was resolved (if resolved) */
  resolvedAt?: Date;

  constructor(data: {
    id: string;
    userId: string;
    userName: string;
    appealType: TierAppealType;
    categoryId?: string;
    categoryName?: string;
    requestedLevel: number;
    requestedLevelName: string;
    reason: string;
    status: TierAppealStatus;
    reviewedBy?: string;
    reviewerName?: string;
    reviewNotes?: string;
    createdAt: Date;
    resolvedAt?: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.userName = data.userName;
    this.appealType = data.appealType;
    if (data.categoryId) this.categoryId = data.categoryId;
    if (data.categoryName) this.categoryName = data.categoryName;
    this.requestedLevel = data.requestedLevel;
    this.requestedLevelName = data.requestedLevelName;
    this.reason = data.reason;
    this.status = data.status;
    if (data.reviewedBy) this.reviewedBy = data.reviewedBy;
    if (data.reviewerName) this.reviewerName = data.reviewerName;
    if (data.reviewNotes) this.reviewNotes = data.reviewNotes;
    this.createdAt = data.createdAt;
    if (data.resolvedAt) this.resolvedAt = data.resolvedAt;
  }

  /**
   * Check if the appeal is pending review
   */
  isPending(): boolean {
    return this.status === TierAppealStatus.PENDING;
  }

  /**
   * Check if the appeal has been approved
   */
  isApproved(): boolean {
    return this.status === TierAppealStatus.APPROVED;
  }

  /**
   * Check if the appeal has been denied
   */
  isDenied(): boolean {
    return this.status === TierAppealStatus.DENIED;
  }

  /**
   * Get a human-readable status description
   */
  getStatusDisplayName(): string {
    const displayNames: Record<TierAppealStatus, string> = {
      [TierAppealStatus.PENDING]: 'Pending Review',
      [TierAppealStatus.APPROVED]: 'Approved',
      [TierAppealStatus.DENIED]: 'Denied',
    };
    return displayNames[this.status];
  }

  /**
   * Get the human-readable name for a tier level index
   */
  static getTierLevelName(level: number): string {
    const tierLevels = Object.keys(TIER_LEVEL_NAMES) as TierLevel[];
    const tierLevel = tierLevels[level];
    if (level >= 0 && level < tierLevels.length && tierLevel !== undefined) {
      return TIER_LEVEL_NAMES[tierLevel];
    }
    return 'Unknown';
  }

  /**
   * Get the human-readable name for an expertise level index
   */
  static getExpertiseLevelName(level: number): string {
    const expertiseLevels = Object.keys(EXPERTISE_LEVEL_NAMES) as ExpertiseLevel[];
    const expertiseLevel = expertiseLevels[level];
    if (level >= 0 && level < expertiseLevels.length && expertiseLevel !== undefined) {
      return EXPERTISE_LEVEL_NAMES[expertiseLevel];
    }
    return 'Unknown';
  }
}

/**
 * SubmitAppealDto - Data transfer object for submitting a new appeal
 *
 * Contains the required and optional fields for creating a tier appeal.
 */
export class SubmitAppealDto {
  /** Type of appeal (GLOBAL_TIER or DOMAIN_EXPERTISE) */
  appealType: TierAppealType;

  /** The category/tag ID for domain expertise appeals (required for DOMAIN_EXPERTISE) */
  categoryId?: string;

  /** The tier or expertise level being requested */
  requestedLevel: number;

  /** The user's justification for the appeal */
  reason: string;

  constructor(data: {
    appealType: TierAppealType;
    categoryId?: string;
    requestedLevel: number;
    reason: string;
  }) {
    this.appealType = data.appealType;
    if (data.categoryId) this.categoryId = data.categoryId;
    this.requestedLevel = data.requestedLevel;
    this.reason = data.reason;
  }
}

/**
 * AppealEligibilityDto - Data transfer object for appeal eligibility check
 */
export class AppealEligibilityDto {
  /** Whether the user can submit an appeal */
  canSubmit: boolean;

  /** If ineligible, the reason why */
  reason?: string;

  /** If ineligible due to cooldown, when the user can submit again */
  nextEligibleDate?: Date;

  constructor(data: { canSubmit: boolean; reason?: string; nextEligibleDate?: Date }) {
    this.canSubmit = data.canSubmit;
    if (data.reason) this.reason = data.reason;
    if (data.nextEligibleDate) this.nextEligibleDate = data.nextEligibleDate;
  }
}
