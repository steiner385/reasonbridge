/**
 * User service event definitions
 */

import type { BaseEvent } from './base.js';

/**
 * Event types for user service
 */
export const USER_EVENT_TYPES = {
  VERIFICATION_REQUESTED: 'verification.requested',
  VERIFICATION_COMPLETED: 'verification.completed',
  VERIFICATION_FAILED: 'verification.failed',
  VERIFICATION_EXPIRED: 'verification.expired',
  USER_VERIFIED_HUMAN_STATUS_CHANGED: 'user.verified_human_status_changed',
  BOT_PATTERN_DETECTED: 'bot_pattern.detected',
  USER_FLAGGED_FOR_REVIEW: 'user.flagged_for_review',
} as const;

/**
 * Supported verification types
 */
export type VerificationType = 'email' | 'phone' | 'government_id' | 'video';

/**
 * Verification request outcome
 */
export type VerificationOutcome = 'verified' | 'rejected' | 'expired' | 'pending';

/**
 * Payload for verification.requested event
 * Published when a user initiates a verification request
 */
export interface VerificationRequestedPayload {
  /** The verification request ID */
  verificationId: string;
  /** User requesting verification */
  userId: string;
  /** Type of verification requested */
  verificationType: VerificationType;
  /** When the request was created */
  requestedAt: string;
  /** When the request expires (for time-limited verifications) */
  expiresAt: string;
}

/**
 * Event published when verification is requested
 */
export interface VerificationRequestedEvent
  extends BaseEvent<typeof USER_EVENT_TYPES.VERIFICATION_REQUESTED, VerificationRequestedPayload> {
  type: typeof USER_EVENT_TYPES.VERIFICATION_REQUESTED;
}

/**
 * Payload for verification.completed event
 * Published when a verification request is successfully completed
 */
export interface VerificationCompletedPayload {
  /** The verification request ID */
  verificationId: string;
  /** User who completed verification */
  userId: string;
  /** Type of verification that was completed */
  verificationType: VerificationType;
  /** Provider-specific reference ID (e.g., SMS provider transaction ID) */
  providerReference?: string;
  /** When the verification was completed */
  completedAt: string;
}

/**
 * Event published when verification is completed
 */
export interface VerificationCompletedEvent
  extends BaseEvent<typeof USER_EVENT_TYPES.VERIFICATION_COMPLETED, VerificationCompletedPayload> {
  type: typeof USER_EVENT_TYPES.VERIFICATION_COMPLETED;
}

/**
 * Payload for verification.failed event
 * Published when a verification request is rejected or fails
 */
export interface VerificationFailedPayload {
  /** The verification request ID */
  verificationId: string;
  /** User whose verification failed */
  userId: string;
  /** Type of verification that failed */
  verificationType: VerificationType;
  /** Reason for the failure */
  reason:
    | 'provider_rejected'
    | 'invalid_format'
    | 'expired'
    | 'fraud_detected'
    | 'user_cancelled'
    | 'unknown_error';
  /** Optional error details */
  errorDetails?: string;
  /** When the failure occurred */
  failedAt: string;
}

/**
 * Event published when verification fails
 */
export interface VerificationFailedEvent
  extends BaseEvent<typeof USER_EVENT_TYPES.VERIFICATION_FAILED, VerificationFailedPayload> {
  type: typeof USER_EVENT_TYPES.VERIFICATION_FAILED;
}

/**
 * Payload for verification.expired event
 * Published when a verification request expires without completion
 */
export interface VerificationExpiredPayload {
  /** The verification request ID */
  verificationId: string;
  /** User whose verification expired */
  userId: string;
  /** Type of verification that expired */
  verificationType: VerificationType;
  /** When the expiration was detected */
  expiredAt: string;
}

/**
 * Event published when verification expires
 */
export interface VerificationExpiredEvent
  extends BaseEvent<typeof USER_EVENT_TYPES.VERIFICATION_EXPIRED, VerificationExpiredPayload> {
  type: typeof USER_EVENT_TYPES.VERIFICATION_EXPIRED;
}

/**
 * Payload for user.verified_human_status_changed event
 * Published when a user's verified human status changes
 */
export interface UserVerifiedHumanStatusChangedPayload {
  /** User whose status changed */
  userId: string;
  /** Previous verification level */
  previousVerificationLevel: 'basic' | 'enhanced' | 'verified_human';
  /** New verification level */
  newVerificationLevel: 'basic' | 'enhanced' | 'verified_human';
  /** Reason for the status change */
  reason:
    | 'phone_verification_completed'
    | 'government_id_verification_completed'
    | 'verification_revoked'
    | 'verification_expired'
    | 'fraud_detected';
  /** When the status changed */
  changedAt: string;
}

/**
 * Event published when user's verified human status changes
 */
export interface UserVerifiedHumanStatusChangedEvent
  extends BaseEvent<
    typeof USER_EVENT_TYPES.USER_VERIFIED_HUMAN_STATUS_CHANGED,
    UserVerifiedHumanStatusChangedPayload
  > {
  type: typeof USER_EVENT_TYPES.USER_VERIFIED_HUMAN_STATUS_CHANGED;
}

/**
 * Payload for bot_pattern.detected event
 * Published when suspicious bot-like patterns are detected in a user's behavior
 */
export interface BotPatternDetectedPayload {
  /** User ID exhibiting suspicious patterns */
  userId: string;
  /** Bot detection result */
  riskScore: number; // 0.0 - 1.0
  /** Patterns detected (e.g., 'very_new_account', 'rapid_posting', 'topic_concentration') */
  patterns: string[];
  /** Human-readable reasoning for detection */
  reasoning: string;
  /** Whether the patterns trigger additional verification requirement */
  requiresAdditionalVerification: boolean;
  /** When the detection was made */
  detectedAt: string;
}

/**
 * Event published when bot patterns are detected
 */
export interface BotPatternDetectedEvent
  extends BaseEvent<typeof USER_EVENT_TYPES.BOT_PATTERN_DETECTED, BotPatternDetectedPayload> {
  type: typeof USER_EVENT_TYPES.BOT_PATTERN_DETECTED;
}

/**
 * Payload for user.flagged_for_review event
 * Published when a user is flagged for manual review (e.g., suspicious patterns, verification failure)
 */
export interface UserFlaggedForReviewPayload {
  /** User ID flagged for review */
  userId: string;
  /** Reason for flagging */
  reason:
    | 'bot_pattern_detected'
    | 'coordinated_posting'
    | 'repeated_verification_failures'
    | 'fraud_suspected'
    | 'manual_report';
  /** Risk score or severity (0.0 - 1.0) */
  riskScore: number;
  /** Detailed description for reviewers */
  description: string;
  /** Whether this requires urgent attention */
  urgent: boolean;
  /** Suggested review priority (high/medium/low) */
  priority: 'high' | 'medium' | 'low';
  /** When the flag was created */
  flaggedAt: string;
}

/**
 * Event published when user is flagged for review
 */
export interface UserFlaggedForReviewEvent
  extends BaseEvent<typeof USER_EVENT_TYPES.USER_FLAGGED_FOR_REVIEW, UserFlaggedForReviewPayload> {
  type: typeof USER_EVENT_TYPES.USER_FLAGGED_FOR_REVIEW;
}

/**
 * Union type of all user service events
 */
export type UserEvent =
  | VerificationRequestedEvent
  | VerificationCompletedEvent
  | VerificationFailedEvent
  | VerificationExpiredEvent
  | UserVerifiedHumanStatusChangedEvent
  | BotPatternDetectedEvent
  | UserFlaggedForReviewEvent;
