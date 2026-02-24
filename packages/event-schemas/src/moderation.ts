/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Moderation service event definitions
 */

import type { BaseEvent } from './base.js';

/**
 * Event types for moderation service
 */
export const MODERATION_EVENT_TYPES = {
  ACTION_REQUESTED: 'moderation.action.requested',
  USER_TRUST_UPDATED: 'user.trust.updated',
} as const;

/**
 * Target type for moderation actions
 */
export type ModerationTargetType = 'response' | 'user' | 'topic';

/**
 * Type of moderation action
 */
export type ModerationActionType = 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban';

/**
 * Severity of moderation action
 */
export type ModerationSeverity = 'non_punitive' | 'consequential';

/**
 * Payload for moderation.action.requested event
 * Published when AI recommends a moderation action
 */
export interface ModerationActionRequestedPayload {
  /** Type of target being moderated */
  targetType: ModerationTargetType;
  /** ID of the target entity */
  targetId: string;
  /** Recommended action type */
  actionType: ModerationActionType;
  /** Severity of the action */
  severity: ModerationSeverity;
  /** AI's reasoning for the recommendation */
  reasoning: string;
  /** AI's confidence in the recommendation (0.00-1.00) */
  aiConfidence: number;
  /** Context about the violation */
  violationContext?: {
    /** Specific content that triggered the recommendation */
    flaggedContent?: string;
    /** Rule or guideline violated */
    violatedGuideline?: string;
    /** Prior warnings or actions on this target */
    priorActions?: number;
  };
  /** When the action was requested */
  requestedAt: string;
}

/**
 * Event published when AI requests a moderation action
 */
export interface ModerationActionRequestedEvent extends BaseEvent<
  typeof MODERATION_EVENT_TYPES.ACTION_REQUESTED,
  ModerationActionRequestedPayload
> {
  type: typeof MODERATION_EVENT_TYPES.ACTION_REQUESTED;
}

/**
 * Mayer ABI trust score components
 */
export interface TrustScores {
  /** Ability - quality of contributions */
  ability: number;
  /** Benevolence - helpfulness to others */
  benevolence: number;
  /** Integrity - consistency and honesty */
  integrity: number;
}

/**
 * Payload for user.trust.updated event
 * Published when a user's trust scores are updated
 */
export interface UserTrustUpdatedPayload {
  /** User whose trust was updated */
  userId: string;
  /** Previous trust scores */
  previousScores: TrustScores;
  /** New trust scores */
  newScores: TrustScores;
  /** Reason for the update */
  reason:
    | 'moderation_action'
    | 'positive_contribution'
    | 'appeal_upheld'
    | 'periodic_recalculation';
  /** ID of the related moderation action (if applicable) */
  moderationActionId?: string;
  /** When the update occurred */
  updatedAt: string;
}

/**
 * Event published when user trust scores are updated
 */
export interface UserTrustUpdatedEvent extends BaseEvent<
  typeof MODERATION_EVENT_TYPES.USER_TRUST_UPDATED,
  UserTrustUpdatedPayload
> {
  type: typeof MODERATION_EVENT_TYPES.USER_TRUST_UPDATED;
}

/**
 * Reason for safety report (from panic button)
 */
export type SafetyReportReason =
  | 'UNCOMFORTABLE'
  | 'SCARY_CONTENT'
  | 'STRANGER_CONTACT'
  | 'PERSONAL_QUESTIONS'
  | 'OTHER';

/**
 * Priority level for safety reports
 */
export type SafetyReportPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

/**
 * Payload for safety.report.created event
 * Published when a child submits a safety report via panic button
 */
export interface SafetyReportCreatedPayload {
  /** Unique report ID */
  reportId: string;
  /** ID of the user who submitted the report */
  reporterId: string;
  /** Reason for the safety report */
  reason: SafetyReportReason;
  /** Priority assigned to the report */
  priority: SafetyReportPriority;
  /** Additional context from the reporter (optional) */
  additionalInfo?: string;
  /** Context - page URL where report was submitted */
  contextUrl?: string;
  /** Context - topic ID if applicable */
  contextTopicId?: string;
  /** Context - response ID if applicable */
  contextResponseId?: string;
  /** When the report was created */
  createdAt: string;
}

/**
 * Event published when a safety report is created
 */
export interface SafetyReportCreatedEvent extends BaseEvent<
  'safety.report.created',
  SafetyReportCreatedPayload
> {
  type: 'safety.report.created';
}

/**
 * Event types for moderation service - extended with safety reports
 */
export const MODERATION_EVENT_TYPES_EXTENDED = {
  ...MODERATION_EVENT_TYPES,
  SAFETY_REPORT_CREATED: 'safety.report.created',
} as const;

/**
 * Union type of all moderation service events
 */
export type ModerationEvent =
  | ModerationActionRequestedEvent
  | UserTrustUpdatedEvent
  | SafetyReportCreatedEvent;
