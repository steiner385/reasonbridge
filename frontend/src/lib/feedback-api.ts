/**
 * Feedback API Client
 *
 * API methods for real-time preview feedback during content composition.
 * Uses the centralized apiClient for authentication and error handling.
 */

import { apiClient } from './api';

/**
 * Sensitivity levels for feedback filtering
 */
export type FeedbackSensitivity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Request payload for preview feedback
 */
export interface PreviewFeedbackRequest {
  /** Draft content to analyze (min 20 chars) */
  content: string;
  /** Optional discussion context for caching */
  discussionId?: string;
  /** Optional topic context for caching */
  topicId?: string;
  /** Sensitivity level for feedback filtering */
  sensitivity?: FeedbackSensitivity;
}

/**
 * Individual feedback item from analysis
 */
export interface PreviewFeedbackItem {
  /** Type of feedback (FALLACY, INFLAMMATORY, UNSOURCED, BIAS, AFFIRMATION) */
  type: string;
  /** Specific subtype (e.g., "strawman", "ad_hominem") */
  subtype?: string;
  /** Actionable suggestion for the user */
  suggestionText: string;
  /** Explanation of why this was flagged */
  reasoning: string;
  /** Confidence score (0.00-1.00) */
  confidenceScore: number;
  /** Educational resources for learning more */
  educationalResources?: {
    links?: Array<{ title: string; url: string }>;
  };
  /** Whether this item meets the sensitivity threshold */
  shouldDisplay: boolean;
}

/**
 * Response from preview feedback API
 */
export interface PreviewFeedbackResponse {
  /** All feedback items that meet sensitivity threshold */
  feedback: PreviewFeedbackItem[];
  /** Highest priority feedback item (if any issues) */
  primary?: PreviewFeedbackItem;
  /** True if no critical issues detected */
  readyToPost: boolean;
  /** User-friendly summary message */
  summary: string;
  /** Time taken for analysis in milliseconds */
  analysisTimeMs: number;
}

/**
 * AI Service base URL - goes through API gateway like all other endpoints
 */
const AI_SERVICE_URL = import.meta.env['VITE_AI_SERVICE_URL'] || '/api/ai';

/**
 * Request preview feedback for draft content
 *
 * This endpoint provides real-time AI-generated feedback as users compose
 * responses. It helps users refine their content before posting.
 *
 * @param request - The preview feedback request
 * @returns Preview feedback with all detected items
 * @throws ApiError on authentication (401), validation (400), or rate limit (429) errors
 *
 * @example
 * ```typescript
 * const response = await previewFeedback({
 *   content: 'I think your argument is completely wrong...',
 *   sensitivity: 'MEDIUM',
 * });
 *
 * if (!response.readyToPost) {
 *   // Display the summary: "Consider revising before posting..."
 *   displayMessage(response.summary);
 *   response.feedback.forEach(item => {
 *     // Display each feedback item
 *     displayFeedback(`${item.type}: ${item.suggestionText}`);
 *   });
 * }
 * ```
 */
export async function previewFeedback(
  request: PreviewFeedbackRequest,
): Promise<PreviewFeedbackResponse> {
  // Use AI service endpoint for feedback
  const baseUrl = AI_SERVICE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/feedback/preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiClient.getAuthToken() || ''}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Handle rate limiting with retry info
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw new Error(`Feedback paused. Try again in ${retrySeconds} seconds.`);
    }

    throw new Error(
      response.status === 401
        ? 'Authentication required'
        : response.status === 400
          ? errorData.message || 'Content must be at least 20 characters'
          : `Request failed: ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Minimum content length required for preview feedback
 */
export const MIN_CONTENT_LENGTH = 20;
