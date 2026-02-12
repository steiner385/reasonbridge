/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T227 [US6] - Topic Creation AI Feedback Hook
 *
 * Provides AI-powered feedback for topic creation wizard.
 * Analyzes title, description, and propositions for quality and balance.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import type { TopicProposition } from '../components/topics/PropositionInputSection';
import {
  previewFeedback,
  MIN_CONTENT_LENGTH,
  type PreviewFeedbackResponse,
  type FeedbackSensitivity,
} from '../lib/feedback-api';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Topic data for feedback analysis
 */
export interface TopicFeedbackData {
  /** Topic title */
  title: string;
  /** Topic description */
  description: string;
  /** Array of propositions */
  propositions: TopicProposition[];
}

/**
 * Topic-specific feedback insights
 */
export interface TopicFeedbackInsights {
  /** Whether the title is clear and descriptive */
  titleClarity: 'good' | 'needs-improvement' | 'unknown';
  /** Whether propositions are balanced (thesis/antithesis/synthesis) */
  propositionBalance: 'balanced' | 'unbalanced' | 'incomplete' | 'unknown';
  /** Whether the description provides sufficient context */
  descriptionQuality: 'good' | 'needs-improvement' | 'unknown';
  /** Overall topic quality assessment */
  overallQuality: 'excellent' | 'good' | 'needs-improvement' | 'poor' | 'unknown';
  /** Specific suggestions for improvement */
  suggestions: string[];
}

/**
 * Options for the useTopicFeedback hook
 */
export interface UseTopicFeedbackOptions {
  /** Initial sensitivity level (default: MEDIUM) */
  initialSensitivity?: FeedbackSensitivity;
  /** Debounce delay in milliseconds (default: 600ms - longer for topic creation) */
  debounceMs?: number;
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Minimum total content length to trigger analysis (default: 50) */
  minContentLength?: number;
}

/**
 * Return type for the useTopicFeedback hook
 */
export interface UseTopicFeedbackResult {
  /** Array of feedback items from AI analysis */
  feedback: PreviewFeedbackResponse['feedback'];
  /** Primary feedback item (highest priority issue) */
  primary?: PreviewFeedbackResponse['primary'];
  /** Whether topic is ready to create (no critical issues) */
  readyToCreate: boolean;
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
  /** Topic-specific insights derived from feedback */
  insights: TopicFeedbackInsights;
  /** Time taken for analysis (ms) */
  analysisTimeMs: number;
  /** Trigger a manual refresh of feedback */
  refresh: () => void;
}

/**
 * Combine topic data into analyzable content string
 */
function buildTopicContent(data: TopicFeedbackData): string {
  const parts: string[] = [];

  if (data.title.trim()) {
    parts.push(`Topic Title: ${data.title.trim()}`);
  }

  if (data.description.trim()) {
    parts.push(`Description: ${data.description.trim()}`);
  }

  if (data.propositions.length > 0) {
    const propositionStrings = data.propositions.map((p) => `[${p.type.toUpperCase()}] ${p.text}`);
    parts.push(`Propositions:\n${propositionStrings.join('\n')}`);
  }

  return parts.join('\n\n');
}

/**
 * Analyze topic structure for insights
 */
function analyzeTopicStructure(data: TopicFeedbackData): Partial<TopicFeedbackInsights> {
  const insights: Partial<TopicFeedbackInsights> = {};
  const suggestions: string[] = [];

  // Title analysis
  if (data.title.length >= 10 && data.title.length <= 200) {
    insights.titleClarity = 'good';
  } else if (data.title.length > 0) {
    insights.titleClarity = 'needs-improvement';
    if (data.title.length < 10) {
      suggestions.push('Consider a more descriptive title (at least 10 characters)');
    }
  } else {
    insights.titleClarity = 'unknown';
  }

  // Description analysis
  if (data.description.length >= 50) {
    insights.descriptionQuality = 'good';
  } else if (data.description.length > 0) {
    insights.descriptionQuality = 'needs-improvement';
    suggestions.push('Add more context to your description (at least 50 characters)');
  } else {
    insights.descriptionQuality = 'unknown';
  }

  // Proposition balance analysis
  const hasThesis = data.propositions.some((p) => p.type === 'thesis');
  const hasAntithesis = data.propositions.some((p) => p.type === 'antithesis');
  const hasSynthesis = data.propositions.some((p) => p.type === 'synthesis');

  if (data.propositions.length === 0) {
    insights.propositionBalance = 'incomplete';
    suggestions.push('Add at least one proposition to start the discussion');
  } else if (hasThesis && hasAntithesis && hasSynthesis) {
    insights.propositionBalance = 'balanced';
  } else if (hasThesis && hasAntithesis) {
    insights.propositionBalance = 'balanced';
  } else if (hasThesis) {
    insights.propositionBalance = 'unbalanced';
    suggestions.push('Consider adding an antithesis to present an opposing view');
  } else {
    insights.propositionBalance = 'unbalanced';
    suggestions.push('Start with a thesis - the main position or claim');
  }

  // Calculate overall quality
  const scores = {
    title:
      insights.titleClarity === 'good'
        ? 1
        : insights.titleClarity === 'needs-improvement'
          ? 0.5
          : 0,
    description:
      insights.descriptionQuality === 'good'
        ? 1
        : insights.descriptionQuality === 'needs-improvement'
          ? 0.5
          : 0,
    propositions:
      insights.propositionBalance === 'balanced'
        ? 1
        : insights.propositionBalance === 'unbalanced'
          ? 0.5
          : 0,
  };

  const avgScore = (scores.title + scores.description + scores.propositions) / 3;

  if (avgScore >= 0.9) {
    insights.overallQuality = 'excellent';
  } else if (avgScore >= 0.7) {
    insights.overallQuality = 'good';
  } else if (avgScore >= 0.4) {
    insights.overallQuality = 'needs-improvement';
  } else if (avgScore > 0) {
    insights.overallQuality = 'poor';
  } else {
    insights.overallQuality = 'unknown';
  }

  return { ...insights, suggestions };
}

/**
 * Hook for fetching AI feedback during topic creation
 *
 * Combines title, description, and propositions into analyzable content,
 * then provides real-time AI feedback with topic-specific insights.
 *
 * @param data - Topic data to analyze
 * @param options - Configuration options
 * @returns Feedback data, insights, and state
 *
 * @example
 * ```tsx
 * function TopicCreationForm() {
 *   const [title, setTitle] = useState('');
 *   const [description, setDescription] = useState('');
 *   const [propositions, setPropositions] = useState([]);
 *
 *   const {
 *     feedback,
 *     readyToCreate,
 *     isLoading,
 *     insights,
 *     summary,
 *   } = useTopicFeedback({ title, description, propositions });
 *
 *   return (
 *     <div>
 *       <TopicTitleInput value={title} onChange={setTitle} />
 *       <TopicDescriptionEditor value={description} onChange={setDescription} />
 *       <PropositionInputSection propositions={propositions} onChange={setPropositions} />
 *
 *       <TopicFeedbackPanel
 *         feedback={feedback}
 *         insights={insights}
 *         isLoading={isLoading}
 *         readyToCreate={readyToCreate}
 *         summary={summary}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useTopicFeedback(
  data: TopicFeedbackData,
  options: UseTopicFeedbackOptions = {},
): UseTopicFeedbackResult {
  const {
    initialSensitivity = 'MEDIUM',
    debounceMs = 600,
    enabled = true,
    minContentLength = 50,
  } = options;

  // Sensitivity state - persisted to localStorage
  const [sensitivity, setSensitivityState] = useState<FeedbackSensitivity>(() => {
    const stored = localStorage.getItem('topic-feedback-sensitivity');
    return (stored as FeedbackSensitivity) || initialSensitivity;
  });

  // Update sensitivity with localStorage persistence
  const setSensitivity = useCallback((level: FeedbackSensitivity) => {
    setSensitivityState(level);
    localStorage.setItem('topic-feedback-sensitivity', level);
  }, []);

  // Build content from topic data
  const content = useMemo(() => buildTopicContent(data), [data]);

  // Debounce the content to avoid excessive API calls
  const debouncedContent = useDebouncedValue(content, debounceMs);

  // Check if content meets minimum length requirement
  const isContentValid = debouncedContent.length >= Math.max(minContentLength, MIN_CONTENT_LENGTH);

  // Calculate topic-specific insights
  const structureInsights = useMemo(() => analyzeTopicStructure(data), [data]);

  // Query for preview feedback
  const {
    data: feedbackData,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['topic-feedback', debouncedContent, sensitivity],
    queryFn: () =>
      previewFeedback({
        content: debouncedContent,
        sensitivity,
      }),
    // Only fetch when content is valid and hook is enabled
    enabled: enabled && isContentValid,
    // Keep previous data while fetching new data
    placeholderData: (previousData) => previousData,
    // Stale time - how long before data is considered stale
    staleTime: 60_000, // 60 seconds for topic creation
    // Garbage collection time
    gcTime: 10 * 60_000, // 10 minutes
    // Retry configuration
    retry: 1,
    retryDelay: 1000,
  });

  // Parse error message
  const errorMessage = queryError instanceof Error ? queryError.message : null;

  // Combine AI feedback suggestions with structure suggestions
  const combinedSuggestions = useMemo(() => {
    const aiSuggestions =
      feedbackData?.feedback.filter((f) => f.shouldDisplay).map((f) => f.suggestionText) || [];
    return [...(structureInsights.suggestions || []), ...aiSuggestions];
  }, [feedbackData, structureInsights.suggestions]);

  // Build final insights
  const insights: TopicFeedbackInsights = useMemo(
    () => ({
      titleClarity: structureInsights.titleClarity || 'unknown',
      propositionBalance: structureInsights.propositionBalance || 'unknown',
      descriptionQuality: structureInsights.descriptionQuality || 'unknown',
      overallQuality: structureInsights.overallQuality || 'unknown',
      suggestions: combinedSuggestions,
    }),
    [structureInsights, combinedSuggestions],
  );

  // Determine if ready to create
  const readyToCreate = useMemo(() => {
    // Check basic requirements
    if (data.title.length < 10) return false;
    if (data.description.length < 50) return false;
    if (data.propositions.length === 0) return false;

    // Check AI feedback
    const aiReady = feedbackData?.readyToPost ?? true;
    return aiReady;
  }, [data, feedbackData]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    feedback: feedbackData?.feedback ?? [],
    primary: feedbackData?.primary,
    readyToCreate,
    summary: feedbackData?.summary ?? '',
    isLoading: isLoading && isContentValid,
    isError,
    error: errorMessage,
    sensitivity,
    setSensitivity,
    isContentValid,
    insights,
    analysisTimeMs: feedbackData?.analysisTimeMs ?? 0,
    refresh,
  };
}

export default useTopicFeedback;
