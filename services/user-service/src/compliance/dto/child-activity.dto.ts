/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Summary of a child's activity on the platform
 * Used for the parental dashboard
 */
export interface ChildActivitySummaryDto {
  /**
   * Child's display name (shown to parent)
   */
  childDisplayName: string;

  /**
   * When the child's account was created
   */
  accountCreatedAt: string;

  /**
   * Current consent status
   */
  consentStatus: 'VERIFIED' | 'PENDING' | 'WITHDRAWN';

  /**
   * When consent was verified (if applicable)
   */
  consentVerifiedAt?: string;

  /**
   * Last activity timestamp (if available)
   */
  lastActivityAt?: string;

  /**
   * Summary of child's platform activity
   */
  activitySummary: {
    /**
     * Number of topics the child has participated in
     */
    topicsParticipated: number;

    /**
     * Number of responses the child has posted
     */
    responsesPosted: number;
  };
}

/**
 * Response for consent withdrawal
 */
export interface WithdrawConsentResponseDto {
  success: boolean;
  message: string;
}
