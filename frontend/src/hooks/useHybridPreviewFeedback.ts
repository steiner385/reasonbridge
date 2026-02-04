import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import {
  previewFeedback,
  MIN_CONTENT_LENGTH,
  type PreviewFeedbackResponse,
  type FeedbackSensitivity,
} from '../lib/feedback-api';
import { previewFeedbackAI } from '../lib/feedback-ai-api';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Options for the useHybridPreviewFeedback hook
 */
export interface UseHybridPreviewFeedbackOptions {
  /** Initial sensitivity level (default: MEDIUM) */
  initialSensitivity?: FeedbackSensitivity;
  /** Debounce delay for regex feedback in milliseconds (default: 400ms) */
  regexDebounceMs?: number;
  /** Debounce delay for AI feedback in milliseconds (default: 2500ms) */
  aiDebounceMs?: number;
  /** Discussion ID for caching context */
  discussionId?: string;
  /** Topic ID for caching context */
  topicId?: string;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Whether to enable AI feedback (default: true) */
  enableAI?: boolean;
}

/**
 * Return type for the useHybridPreviewFeedback hook
 */
export interface UseHybridPreviewFeedbackResult {
  /** Array of feedback items (from regex or AI) */
  feedback: PreviewFeedbackResponse['feedback'];
  /** Primary feedback item (highest priority issue) */
  primary?: PreviewFeedbackResponse['primary'];
  /** Whether content is ready to post (no critical issues) */
  readyToPost: boolean;
  /** User-friendly summary message */
  summary: string;
  /** Whether regex feedback is currently being fetched */
  isLoading: boolean;
  /** Whether AI feedback is currently being fetched */
  isAILoading: boolean;
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
  /** Whether the current feedback is from AI (vs regex) */
  isAIFeedback: boolean;
}

/**
 * Hybrid feedback hook that combines fast regex analysis with deeper AI analysis
 *
 * Strategy:
 * 1. User types → Regex feedback after 400ms (instant)
 * 2. User pauses 2.5s → AI analysis begins → "Analyzing with AI..."
 * 3. AI completes → Replace feedback with AI results
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
 *     isAILoading,
 *     isAIFeedback,
 *     summary,
 *   } = useHybridPreviewFeedback(content);
 *
 *   return (
 *     <div>
 *       <textarea value={content} onChange={(e) => setContent(e.target.value)} />
 *
 *       {isAILoading && <span>🤖 Analyzing with AI...</span>}
 *
 *       <PreviewFeedbackPanel
 *         feedback={feedback}
 *         isLoading={isLoading}
 *         readyToPost={readyToPost}
 *         summary={summary}
 *         badge={isAIFeedback ? '✨ AI Analysis' : 'Quick Check'}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useHybridPreviewFeedback(
  content: string,
  options: UseHybridPreviewFeedbackOptions = {},
): UseHybridPreviewFeedbackResult {
  const {
    initialSensitivity = 'MEDIUM',
    regexDebounceMs = 400,
    aiDebounceMs = 2500,
    discussionId,
    topicId,
    enabled = true,
    enableAI = true,
  } = options;

  // Sensitivity state - persisted to localStorage
  const [sensitivity, setSensitivityState] = useState<FeedbackSensitivity>(() => {
    const stored = localStorage.getItem('preview-feedback-sensitivity');
    return (stored as FeedbackSensitivity) || initialSensitivity;
  });

  // Track which feedback source is currently displayed
  const [isAIFeedback, setIsAIFeedback] = useState(false);

  // Update sensitivity with localStorage persistence
  const setSensitivity = useCallback((level: FeedbackSensitivity) => {
    setSensitivityState(level);
    localStorage.setItem('preview-feedback-sensitivity', level);
  }, []);

  // Debounce content for regex (fast)
  const regexDebouncedContent = useDebouncedValue(content, regexDebounceMs);

  // Debounce content for AI (slower - only triggers after user stops typing)
  const aiDebouncedContent = useDebouncedValue(content, aiDebounceMs);

  // Check if content meets minimum length requirement
  const isContentValid = regexDebouncedContent.length >= MIN_CONTENT_LENGTH;

  // Query for fast regex-based preview feedback
  const regexQuery = useQuery({
    queryKey: ['preview-feedback-regex', regexDebouncedContent, sensitivity, discussionId, topicId],
    queryFn: () =>
      previewFeedback({
        content: regexDebouncedContent,
        sensitivity,
        discussionId,
        topicId,
      }),
    enabled: enabled && isContentValid,
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    retryDelay: 1000,
  });

  // Query for slower AI-based feedback
  const aiQuery = useQuery({
    queryKey: ['preview-feedback-ai', aiDebouncedContent, sensitivity, discussionId, topicId],
    queryFn: () =>
      previewFeedbackAI({
        content: aiDebouncedContent,
        sensitivity,
        discussionId,
        topicId,
      }),
    enabled: enabled && enableAI && isContentValid,
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60_000, // AI results stay fresh longer (2 min)
    gcTime: 10 * 60_000,
    retry: 1,
    retryDelay: 2000,
  });

  // When AI data arrives, mark feedback as AI-powered
  useEffect(() => {
    if (aiQuery.data && !aiQuery.isLoading) {
      setIsAIFeedback(true);
    } else if (!aiQuery.data) {
      setIsAIFeedback(false);
    }
  }, [aiQuery.data, aiQuery.isLoading]);

  // Determine which data to use: AI if available, otherwise regex
  const activeData = aiQuery.data || regexQuery.data;
  const activeError = aiQuery.error || regexQuery.error;

  // Parse error message
  const errorMessage = activeError instanceof Error ? activeError.message : null;

  return {
    feedback: activeData?.feedback ?? [],
    primary: activeData?.primary,
    readyToPost: activeData?.readyToPost ?? true,
    summary: activeData?.summary ?? '',
    isLoading: regexQuery.isLoading && isContentValid,
    isAILoading: aiQuery.isLoading && isContentValid,
    isError: regexQuery.isError || aiQuery.isError,
    error: errorMessage,
    sensitivity,
    setSensitivity,
    isContentValid,
    analysisTimeMs: activeData?.analysisTimeMs ?? 0,
    isAIFeedback,
  };
}

export default useHybridPreviewFeedback;
