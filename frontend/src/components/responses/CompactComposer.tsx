/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CompactComposer - Discord/Slack-style message composer
 *
 * A minimal, space-efficient composer that:
 * - Single-line input that expands as you type (max 4 rows)
 * - No cited sources field
 * - No metadata checkboxes
 * - No inline preview feedback (shown in side panel)
 * - Submit on Enter (Shift+Enter for newline)
 * - Compact send button
 */

import { useState, useEffect, useCallback } from 'react';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { CreateResponseRequest } from '../../types/response';
import type { PreviewFeedbackItem } from '../../lib/feedback-api';
import { useHybridPreviewFeedback } from '../../hooks/useHybridPreviewFeedback';
import MentionInput from './MentionInput';

export interface CompactComposerProps {
  /** Topic ID for context */
  topicId: string;
  /** Callback when response is submitted */
  onSubmit: (response: CreateResponseRequest) => void | Promise<void>;
  /** Optional parent response ID for threading */
  parentId?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum character limit */
  minLength?: number;
  /** Maximum character limit */
  maxLength?: number;
  /** Whether the composer is loading */
  isLoading?: boolean;
  /** Callback when preview feedback changes (for side panel) */
  onPreviewFeedbackChange?: (
    feedback: PreviewFeedbackItem[],
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;
  /** Additional CSS classes */
  className?: string;
}

export function CompactComposer({
  topicId,
  onSubmit,
  parentId,
  placeholder = 'Message...',
  minLength = 1,
  maxLength = 10000,
  isLoading = false,
  onPreviewFeedbackChange,
  className = '',
}: CompactComposerProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auth protection for submissions
  const { requireAuth } = useRequireAuth();

  // Typing indicator
  const { sendTyping } = useTypingIndicator({ topicId });

  // Preview feedback for side panel
  const {
    feedback: previewFeedback,
    readyToPost,
    isLoading: isPreviewLoading,
    error: previewError,
    summary: previewSummary,
  } = useHybridPreviewFeedback(content, { topicId });

  // Notify parent of preview feedback changes
  useEffect(() => {
    if (onPreviewFeedbackChange) {
      onPreviewFeedbackChange(
        previewFeedback,
        readyToPost ?? false,
        previewSummary,
        isPreviewLoading,
        previewError,
      );
    }
  }, [
    previewFeedback,
    readyToPost,
    previewSummary,
    isPreviewLoading,
    previewError,
    onPreviewFeedbackChange,
  ]);

  const handleSubmit = useCallback(() => {
    requireAuth(async () => {
      if (isLoading) return;

      const trimmed = content.trim();
      if (trimmed.length < minLength) {
        setError(`Message must be at least ${minLength} character${minLength > 1 ? 's' : ''}`);
        return;
      }
      if (trimmed.length > maxLength) {
        setError(`Message must not exceed ${maxLength} characters`);
        return;
      }

      setError(null);

      const response: CreateResponseRequest = {
        content: trimmed,
        containsOpinion: false,
        containsFactualClaims: false,
      };

      if (parentId) {
        response.parentId = parentId;
      }

      try {
        await onSubmit(response);
        setContent('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      }
    });
  }, [content, minLength, maxLength, isLoading, parentId, onSubmit, requireAuth]);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
      setError(null);
      sendTyping();
    },
    [sendTyping],
  );

  const isValid = content.trim().length >= minLength && content.length <= maxLength;
  const showCharCount = content.length > maxLength * 0.8;

  return (
    <div className={`compact-composer ${className}`}>
      <div className="flex items-end gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
        {/* Text Input */}
        <div className="flex-1 min-w-0">
          <MentionInput
            value={content}
            onChange={handleChange}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            disabled={isLoading}
            topicId={topicId}
            minRows={1}
            maxRows={4}
            className="border-0 bg-transparent focus:ring-0 resize-none py-2.5 px-3 text-sm"
            ariaLabel="Message input"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className={`
            shrink-0 p-2.5 m-1 rounded-md transition-all
            ${
              isValid && !isLoading
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Error and character count */}
      <div className="flex justify-between items-center mt-1 px-1 min-h-[1.25rem]">
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        {!error && showCharCount && (
          <span
            className={`text-xs ml-auto ${
              content.length > maxLength
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {content.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

export default CompactComposer;
