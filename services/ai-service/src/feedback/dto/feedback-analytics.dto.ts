/**
 * DTO for feedback effectiveness analytics response
 * Provides insights into how users interact with feedback
 */
export class FeedbackAnalyticsDto {
  /**
   * Total number of feedback items analyzed
   */
  totalFeedback!: number;

  /**
   * Number of feedback items acknowledged by users
   */
  acknowledgedCount!: number;

  /**
   * Percentage of feedback acknowledged (0-100)
   */
  acknowledgmentRate!: number;

  /**
   * Number of feedback items that led to user revisions
   */
  revisionCount!: number;

  /**
   * Percentage of feedback that led to revisions (0-100)
   */
  revisionRate!: number;

  /**
   * Number of feedback items dismissed by users
   */
  dismissedCount!: number;

  /**
   * Percentage of feedback dismissed (0-100)
   */
  dismissalRate!: number;

  /**
   * Distribution of helpful ratings
   */
  helpfulRatings!: {
    HELPFUL: number;
    NOT_HELPFUL: number;
  };

  /**
   * Average helpful rating score (0-1, where 1=HELPFUL, 0=NOT_HELPFUL)
   */
  averageHelpfulScore!: number;

  /**
   * Breakdown by feedback type
   */
  byType!: {
    type: string;
    count: number;
    acknowledgedCount: number;
    revisionCount: number;
    dismissedCount: number;
    averageConfidence: number;
  }[];

  /**
   * Most common dismissal reasons
   */
  topDismissalReasons!: {
    reason: string;
    count: number;
  }[];

  /**
   * Time range for the analytics
   */
  dateRange!: {
    start: Date;
    end: Date;
  };
}

/**
 * Query parameters for analytics requests
 */
export class FeedbackAnalyticsQueryDto {
  /**
   * Start date for analytics (ISO 8601)
   * Optional - defaults to 30 days ago
   */
  startDate?: string;

  /**
   * End date for analytics (ISO 8601)
   * Optional - defaults to now
   */
  endDate?: string;

  /**
   * Filter by feedback type
   * Optional
   */
  feedbackType?: string;

  /**
   * Filter by response ID
   * Optional
   */
  responseId?: string;
}
