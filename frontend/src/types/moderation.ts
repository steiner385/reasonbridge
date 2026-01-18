/**
 * Moderation-related types and interfaces
 */

/**
 * Content flag request payload
 */
export interface FlagContentRequest {
  /**
   * ID of the content being flagged
   */
  contentId: string;

  /**
   * Type of content being flagged (e.g., 'response', 'comment')
   */
  contentType: 'response' | 'comment' | 'topic' | 'other';

  /**
   * Reason for flagging the content
   */
  reason: string;

  /**
   * Detailed description of the issue
   */
  description: string;

  /**
   * Category of the issue
   */
  category: FlagCategory;

  /**
   * Whether the user wishes to remain anonymous
   */
  isAnonymous?: boolean;

  /**
   * Additional metadata about the flag
   */
  metadata?: Record<string, unknown>;
}

/**
 * Flag response from the API
 */
export interface FlagContentResponse {
  /**
   * Unique flag ID
   */
  flagId: string;

  /**
   * Status of the flag
   */
  status: 'submitted' | 'processing' | 'resolved' | 'dismissed';

  /**
   * When the flag was created
   */
  createdAt: string;

  /**
   * Submission confirmation message
   */
  message: string;
}

/**
 * Categories for content flags
 */
export type FlagCategory =
  | 'inappropriate'
  | 'spam'
  | 'misinformation'
  | 'harassment'
  | 'hate-speech'
  | 'violence'
  | 'copyright'
  | 'privacy'
  | 'other';

/**
 * Flag reason mapping for user-friendly display
 */
export const FLAG_CATEGORIES: Record<FlagCategory, { label: string; description: string }> = {
  inappropriate: {
    label: 'Inappropriate Content',
    description: 'Contains offensive, explicit, or unsuitable material',
  },
  spam: {
    label: 'Spam',
    description: 'Repetitive, commercial, or off-topic content',
  },
  misinformation: {
    label: 'Misinformation',
    description: 'Contains false or misleading information',
  },
  harassment: {
    label: 'Harassment',
    description: 'Targets or harasses individuals or groups',
  },
  'hate-speech': {
    label: 'Hate Speech',
    description: 'Contains hateful, discriminatory, or prejudiced language',
  },
  violence: {
    label: 'Violence',
    description: 'Promotes or glorifies violence',
  },
  copyright: {
    label: 'Copyright Violation',
    description: 'Infringes on intellectual property rights',
  },
  privacy: {
    label: 'Privacy Violation',
    description: 'Shares private information without consent',
  },
  other: {
    label: 'Other',
    description: 'Another reason not listed above',
  },
};

/**
 * Moderation action types
 */
export type ModerationTargetType = 'response' | 'user' | 'topic';
export type ModerationActionType = 'educate' | 'warn' | 'hide' | 'remove' | 'suspend' | 'ban';
export type ModerationSeverity = 'non_punitive' | 'consequential';
export type ModerationActionStatus = 'pending' | 'active' | 'appealed' | 'reversed';
export type AppealStatus = 'pending' | 'under_review' | 'upheld' | 'denied';

/**
 * Moderation Action
 */
export interface ModerationAction {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  actionType: ModerationActionType;
  severity: ModerationSeverity;
  reasoning: string;
  aiRecommended: boolean;
  aiConfidence?: number;
  approvedById?: string;
  approvedAt?: string;
  status: ModerationActionStatus;
  createdAt: string;
  executedAt?: string;
  expiresAt?: string;
}

/**
 * Appeal
 */
export interface Appeal {
  id: string;
  moderationActionId: string;
  appellantId: string;
  reason: string;
  status: AppealStatus;
  reviewerId?: string;
  decisionReasoning?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * Queue Statistics
 */
export interface QueueStats {
  totalPending: number;
  pendingByType: Record<ModerationActionType, number>;
  avgReviewTimeMinutes: number;
  criticalActions: number;
}

/**
 * Moderation Action List Response
 */
export interface ModerationActionListResponse {
  data: ModerationAction[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Appeals List Response
 */
export interface AppealsListResponse {
  data: Appeal[];
  total: number;
  page: number;
  pageSize: number;
}
