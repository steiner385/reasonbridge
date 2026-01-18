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
