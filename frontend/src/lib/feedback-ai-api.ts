/**
 * AI-Powered Feedback API Client
 *
 * API methods for AI-powered preview feedback using AWS Bedrock.
 * This is the slower but more accurate endpoint that catches nuanced issues.
 * Uses the centralized apiClient for authentication and error handling.
 */

import { apiClient } from './api';
import type { PreviewFeedbackRequest, PreviewFeedbackResponse } from './feedback-api';

/**
 * AI Service base URL - goes through API gateway like all other endpoints
 */
const AI_SERVICE_URL = import.meta.env['VITE_AI_SERVICE_URL'] || '/api/ai';

/**
 * Request AI-powered preview feedback for draft content
 *
 * This endpoint provides AI-generated feedback using AWS Bedrock (Claude 3.5 Sonnet).
 * It's slower than the regex-based preview (~2-5 seconds) but catches nuanced issues
 * like subtle dismissiveness, condescension, or context-dependent tone problems.
 *
 * @param request - The preview feedback request
 * @returns Preview feedback with AI-analyzed items
 * @throws ApiError on authentication (401), validation (400), or rate limit (429) errors
 *
 * @example
 * ```typescript
 * const response = await previewFeedbackAI({
 *   content: 'I think your argument is completely wrong...',
 *   sensitivity: 'MEDIUM',
 * });
 *
 * if (!response.readyToPost) {
 *   displayMessage(response.summary); // "AI detected potential issues..."
 *   response.feedback.forEach(item => {
 *     displayFeedback(`${item.type}: ${item.suggestionText}`);
 *   });
 * }
 * ```
 */
export async function previewFeedbackAI(
  request: PreviewFeedbackRequest,
): Promise<PreviewFeedbackResponse> {
  // Use AI service endpoint for AI-powered feedback
  const baseUrl = AI_SERVICE_URL.replace(/\/$/, '');
  const url = `${baseUrl}/feedback/preview/ai`;

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
      throw new Error(`AI analysis paused. Try again in ${retrySeconds} seconds.`);
    }

    // Handle Bedrock/AI service errors gracefully
    if (response.status === 503) {
      throw new Error('AI service temporarily unavailable. Using quick check instead.');
    }

    throw new Error(
      response.status === 401
        ? 'Authentication required'
        : response.status === 400
          ? errorData.message || 'Content must be at least 20 characters'
          : `AI analysis failed: ${response.statusText}`,
    );
  }

  return response.json();
}
