/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T228 [US6] - Framing Suggestions API Client
 *
 * Client for fetching AI-powered framing suggestions for topic titles and descriptions.
 * Analyzes content for loaded language, bias, clarity, and inclusivity issues.
 */

import { apiClient } from './api';

/**
 * Issue types that can be detected in topic framing
 */
export type FramingIssueType =
  | 'LOADED_LANGUAGE'
  | 'ONE_SIDED'
  | 'UNCLEAR'
  | 'POLARIZING'
  | 'IMPROVEMENT';

/**
 * Individual framing suggestion
 */
export interface FramingSuggestion {
  /** Type of framing issue detected */
  issueType: FramingIssueType;
  /** The original problematic text */
  originalText: string;
  /** Suggested alternative text */
  suggestedText: string;
  /** Explanation of why this change matters */
  explanation: string;
  /** Confidence score (0-1) */
  confidenceScore: number;
}

/**
 * Request for framing suggestions
 */
export interface FramingSuggestionsRequest {
  /** Topic title (1-200 characters) */
  title: string;
  /** Topic description (1-5000 characters) */
  description: string;
  /** Optional additional context (1-1000 characters) */
  context?: string;
}

/**
 * Response with framing suggestions
 */
export interface FramingSuggestionsResponse {
  /** Original title analyzed */
  originalTitle: string;
  /** Suggested improved title (null if original is good) */
  suggestedTitle: string | null;
  /** Array of individual suggestions */
  suggestions: FramingSuggestion[];
  /** Neutrality score (0-1, higher is more neutral) */
  neutralityScore: number;
  /** Clarity score (0-1, higher is clearer) */
  clarityScore: number;
  /** Inclusivity score (0-1, higher is more inclusive) */
  inclusivityScore: number;
  /** Overall confidence score */
  confidenceScore: number;
  /** AI reasoning explanation */
  reasoning: string;
  /** Attribution for the analysis */
  attribution: string;
  /** Time taken for analysis in milliseconds */
  analysisTimeMs?: number;
}

/**
 * Score level classification
 */
export type ScoreLevel = 'excellent' | 'good' | 'fair' | 'needs-improvement' | 'poor';

/**
 * Get the score level based on a 0-1 score value
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 0.9) return 'excellent';
  if (score >= 0.7) return 'good';
  if (score >= 0.5) return 'fair';
  if (score >= 0.3) return 'needs-improvement';
  return 'poor';
}

/**
 * Get display color classes for a score level
 */
export function getScoreLevelColors(level: ScoreLevel): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<ScoreLevel, { bg: string; text: string; border: string }> = {
    excellent: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    },
    good: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
    },
    fair: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    'needs-improvement': {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
    },
    poor: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
    },
  };
  return colors[level];
}

/**
 * Get display color classes for an issue type
 */
export function getIssueTypeColors(issueType: FramingIssueType): {
  bg: string;
  text: string;
} {
  const colors: Record<FramingIssueType, { bg: string; text: string }> = {
    LOADED_LANGUAGE: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
    },
    ONE_SIDED: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
    },
    UNCLEAR: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
    },
    POLARIZING: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-300',
    },
    IMPROVEMENT: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
    },
  };
  return colors[issueType];
}

/**
 * Get human-readable label for an issue type
 */
export function getIssueTypeLabel(issueType: FramingIssueType): string {
  const labels: Record<FramingIssueType, string> = {
    LOADED_LANGUAGE: 'Loaded Language',
    ONE_SIDED: 'One-Sided',
    UNCLEAR: 'Unclear',
    POLARIZING: 'Polarizing',
    IMPROVEMENT: 'Suggestion',
  };
  return labels[issueType];
}

/**
 * Minimum content length to trigger framing analysis
 */
export const MIN_FRAMING_CONTENT_LENGTH = 10;

/**
 * Fetch framing suggestions for a topic
 *
 * @param request - The framing suggestions request
 * @returns Promise resolving to framing suggestions response
 * @throws Error if the request fails
 *
 * @example
 * ```ts
 * const suggestions = await fetchFramingSuggestions({
 *   title: 'Why everyone should support X',
 *   description: 'Obviously, X is the best solution...',
 * });
 * // suggestions.neutralityScore → 0.4
 * // suggestions.suggestions → [{issueType: 'LOADED_LANGUAGE', ...}]
 * ```
 */
export async function fetchFramingSuggestions(
  request: FramingSuggestionsRequest,
): Promise<FramingSuggestionsResponse> {
  const baseUrl = import.meta.env['VITE_AI_SERVICE_URL'] || '/api/ai';
  const url = `${baseUrl}/suggest/framing`;

  const startTime = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiClient.getAuthToken() || ''}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required for framing analysis');
    }
    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Invalid request for framing analysis');
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limit exceeded. Please try again in ${retryAfter || '60'} seconds.`);
    }
    if (response.status === 503) {
      throw new Error('Framing analysis service is temporarily unavailable');
    }
    throw new Error(`Failed to get framing suggestions: ${response.statusText}`);
  }

  const data: FramingSuggestionsResponse = await response.json();

  // Add analysis time if not provided by backend
  if (!data.analysisTimeMs) {
    data.analysisTimeMs = Date.now() - startTime;
  }

  return data;
}

export default fetchFramingSuggestions;
