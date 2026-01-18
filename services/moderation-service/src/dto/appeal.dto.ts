/**
 * Appeal DTOs
 * Data Transfer Objects for appeal requests and responses
 */

import type { ModerationActionResponse } from './moderation-action.dto.js';

/**
 * Request to create an appeal against a moderation action
 */
export interface CreateAppealRequest {
  reason: string;
}

/**
 * Request to review and decide on an appeal
 */
export interface ReviewAppealRequest {
  decision: 'upheld' | 'denied';
  reasoning: string;
}

/**
 * Reviewer information
 */
export interface ReviewerInfo {
  id: string;
  displayName?: string;
}

/**
 * Response containing appeal details
 * Tracks the status of an appeal, reviewer decision, and reasoning
 */
export interface AppealResponse {
  id: string;
  moderationActionId: string;
  appellantId: string;
  reason: string;
  status: string;
  reviewerId: string | null;
  decisionReasoning: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * Pending appeal response with associated moderation action
 * Used when retrieving appeals that need review
 */
export interface PendingAppealResponse extends AppealResponse {
  moderationAction?: ModerationActionResponse | undefined;
}

/**
 * Paginated response for listing appeals
 */
export interface ListAppealResponse {
  appeals: PendingAppealResponse[];
  nextCursor: string | null;
  totalCount: number;
}
