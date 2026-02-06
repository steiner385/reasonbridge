/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  previewFeedback,
  MIN_CONTENT_LENGTH,
  type PreviewFeedbackResponse,
  type FeedbackSensitivity,
} from '../lib/feedback-api';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Options for the usePreviewFeedback hook
 */
export interface UsePreviewFeedbackOptions {
  /** Initial sensitivity level (default: MEDIUM) */
  initialSensitivity?: FeedbackSensitivity;
  /** Debounce delay in milliseconds (default: 400ms) */
  debounceMs?: number;
  /** Discussion ID for caching context */
  discussionId?: string;
  /** Topic ID for caching context */
  topicId?: string;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

/**
 * Return type for the usePreviewFeedback hook
 */
export interface UsePreviewFeedbackResult {
  /** Array of feedback items (empty if loading or content too short) */
  feedback: PreviewFeedbackResponse['feedback'];
  /** Primary feedback item (highest priority issue) */
  primary?: PreviewFeedbackResponse['primary'];
  /** Whether content is ready to post (no critical issues) */
  readyToPost: boolean;
  /** User-friendly summary message */
  summary: string;
  /** Whether feedback is currently being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching feedback */
  isError: boolean;
  /** Error message if any */
  error: string | null;
  /** Current sensitivity level */
  sensitivity: FeedbackSensitivity;
  /** Function to update sensitivity level */
  setSensitivity: (level: FeedbackSensitivity) => void;
  /** Whether content meets minimum length for analysis */
  isContentValid: boolean;
  /** Time taken for analysis (ms) - 0 if not analyzed yet */
  analysisTimeMs: number;
}

/**
 * Hook for fetching real-time preview feedback during content composition
 *
 * Automatically debounces input, handles loading states, and gracefully
 * degrades if the service is unavailable.
 *
 * @param content - The draft content to analyze
 * @param options - Configuration options
 * @returns Feedback data and state
 *
 * @example
 * ```tsx
 * function ComposeArea() {
 *   const [content, setContent] = useState('');
 *   const {
 *     feedback,
 *     readyToPost,
 *     isLoading,
 *     summary,
 *     sensitivity,
 *     setSensitivity,
 *   } = usePreviewFeedback(content);
 *
 *   return (
 *     <div>
 *       <textarea value={content} onChange={(e) => setContent(e.target.value)} />
 *
 *       {content.length >= 20 && (
 *         <PreviewFeedbackPanel
 *           feedback={feedback}
 *           isLoading={isLoading}
 *           readyToPost={readyToPost}
 *           summary={summary}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePreviewFeedback(
  content: string,
  options: UsePreviewFeedbackOptions = {},
): UsePreviewFeedbackResult {
  const {
    initialSensitivity = 'MEDIUM',
    debounceMs = 400,
    discussionId,
    topicId,
    enabled = true,
  } = options;

  // Sensitivity state - persisted to localStorage
  const [sensitivity, setSensitivityState] = useState<FeedbackSensitivity>(() => {
    const stored = localStorage.getItem('preview-feedback-sensitivity');
    return (stored as FeedbackSensitivity) || initialSensitivity;
  });

  // Update sensitivity with localStorage persistence
  const setSensitivity = useCallback((level: FeedbackSensitivity) => {
    setSensitivityState(level);
    localStorage.setItem('preview-feedback-sensitivity', level);
  }, []);

  // Debounce the content to avoid excessive API calls
  const debouncedContent = useDebouncedValue(content, debounceMs);

  // Check if content meets minimum length requirement
  const isContentValid = debouncedContent.length >= MIN_CONTENT_LENGTH;

  // Query for preview feedback
  const {
    data,
    isLoading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ['preview-feedback', debouncedContent, sensitivity, discussionId, topicId],
    queryFn: () =>
      previewFeedback({
        content: debouncedContent,
        sensitivity,
        discussionId,
        topicId,
      }),
    // Only fetch when content is valid and hook is enabled
    enabled: enabled && isContentValid,
    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,
    // Stale time - how long before data is considered stale
    staleTime: 30_000, // 30 seconds
    // Garbage collection time - how long to keep unused data
    gcTime: 5 * 60_000, // 5 minutes
    // Retry configuration
    retry: 1,
    retryDelay: 1000,
  });

  // Parse error message
  const errorMessage = queryError instanceof Error ? queryError.message : null;

  return {
    feedback: data?.feedback ?? [],
    primary: data?.primary,
    readyToPost: data?.readyToPost ?? true,
    summary: data?.summary ?? '',
    isLoading: isLoading && isContentValid,
    isError,
    error: errorMessage,
    sensitivity,
    setSensitivity,
    isContentValid,
    analysisTimeMs: data?.analysisTimeMs ?? 0,
  };
}

export default usePreviewFeedback;
