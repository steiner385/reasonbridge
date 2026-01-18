/**
 * ModerationAction DTOs
 * Data Transfer Objects for moderation action requests and responses
 */

/**
 * Request to create a new moderation action
 */
export interface CreateActionRequest {
  targetType: 'response' | 'user' | 'topic';
  targetId: string;
  actionType: 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban';
  reasoning: string;
}

/**
 * Request to approve a pending moderation action
 */
export interface ApproveActionRequest {
  modifiedReasoning?: string;
}

/**
 * Request to reject a pending moderation action
 */
export interface RejectActionRequest {
  reason: string;
}

/**
 * Response containing details about a moderator who approved an action
 */
export interface ModeratorInfo {
  id: string;
  displayName: string;
}

/**
 * Response containing moderation action details
 * Includes metadata about the action, its approval, and execution status
 */
export interface ModerationActionResponse {
  id: string;
  targetType: string;
  targetId: string;
  actionType: string;
  severity: string;
  reasoning: string;
  aiRecommended: boolean;
  aiConfidence: number | null;
  approvedBy: ModeratorInfo | null;
  approvedAt: string | null;
  status: string;
  createdAt: string;
  executedAt: string | null;
}

/**
 * Detailed moderation action response with related context
 * Extends ModerationActionResponse with additional information like appeals and related actions
 */
export interface ModerationActionDetailResponse extends ModerationActionResponse {
  targetContent?: Record<string, unknown>;
  appeal?: Record<string, unknown> | null;
  relatedActions?: ModerationActionResponse[];
}

/**
 * Paginated response for listing moderation actions
 */
export interface ListActionsResponse {
  actions: ModerationActionResponse[];
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Cooling-off intervention prompt request
 * Non-punitive intervention to encourage reflection before responding
 */
export interface CoolingOffPromptRequest {
  userIds: string[];
  topicId: string;
  prompt: string;
}

/**
 * Cooling-off intervention prompt response
 */
export interface CoolingOffPromptResponse {
  sent: number;
}
