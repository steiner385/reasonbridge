/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DTO for moderating (hiding/removing) a response
 */
export class ModerateResponseDto {
  /**
   * The action to perform: 'hide' or 'remove'
   * - 'hide': Content is hidden from public view but not deleted
   * - 'remove': Content is deleted entirely
   */
  action!: 'hide' | 'remove';

  /**
   * Reason for the moderation action
   * Required for audit trail and user notification
   */
  reason!: string;

  /**
   * Optional additional context for moderators
   * Can include specific policy violations or internal notes
   */
  moderatorNotes?: string;
}

/**
 * DTO for response to a moderation action
 */
export class ModerationActionResponseDto {
  /**
   * The ID of the response that was moderated
   */
  responseId!: string;

  /**
   * The action that was performed
   */
  action!: 'hide' | 'remove';

  /**
   * The timestamp when the action was performed
   */
  actionTimestamp!: Date;

  /**
   * The user ID of the moderator who performed the action
   */
  moderatorId!: string;

  /**
   * The reason for the moderation action
   */
  reason!: string;

  /**
   * The new status of the response
   */
  newStatus!: 'hidden' | 'removed';

  /**
   * Whether the author can appeal this decision
   */
  appealable!: boolean;
}
