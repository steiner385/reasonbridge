/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Expanded Composer for Lightweight Reply
 *
 * Full composer with auto-grow textarea and toolbar containing
 * Citation, Options, and Post buttons.
 */

import { forwardRef, useState, useEffect, useCallback } from 'react';
import type { PreviewFeedbackItem } from '../../../lib/feedback-api';
import { useHybridPreviewFeedback } from '../../../hooks/useHybridPreviewFeedback';
import { ComposerToolbar } from './ComposerToolbar';
import { CitationInput } from './CitationInput';
import { OptionsPopover } from './OptionsPopover';

export interface ExpandedComposerProps {
  content: string;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isSubmitting: boolean;
  error: string | null;
  minLength: number;
  maxLength: number;
  topicId?: string;
  parentId: string;
  onPreviewFeedbackChange?: (
    feedback: PreviewFeedbackItem[],
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;
}

export const ExpandedComposer = forwardRef<HTMLTextAreaElement, ExpandedComposerProps>(
  function ExpandedComposer(
    {
      content,
      onContentChange,
      onSubmit,
      onCancel,
      onBlur,
      onKeyDown,
      isSubmitting,
      error,
      minLength,
      maxLength,
      topicId,
      parentId: _parentId,
      onPreviewFeedbackChange,
    },
    ref,
  ) {
    const [showCitationInput, setShowCitationInput] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [citations, setCitations] = useState<string[]>([]);
    const [containsOpinion, setContainsOpinion] = useState(false);
    const [containsFactualClaims, setContainsFactualClaims] = useState(false);

    // Preview feedback integration
    const {
      feedback: previewFeedback,
      readyToPost,
      isLoading: isPreviewLoading,
      summary: previewSummary,
      error: previewError,
    } = useHybridPreviewFeedback(content, { topicId, enabled: content.length >= 20 });

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

    // Auto-resize textarea
    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = e.target;
        onContentChange(textarea.value);

        // Reset height to auto to shrink if needed
        textarea.style.height = 'auto';
        // Set to scrollHeight to expand
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      },
      [onContentChange],
    );

    const handleAddCitation = useCallback((url: string) => {
      setCitations((prev) => [...prev, url]);
      setShowCitationInput(false);
    }, []);

    const handleRemoveCitation = useCallback((index: number) => {
      setCitations((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const characterCount = content.length;
    const isValid = characterCount >= minLength && characterCount <= maxLength;
    const showCharacterCount = characterCount >= maxLength * 0.8;

    // Calculate if feedback indicator should show
    const hasFeedbackIssues = previewFeedback.length > 0;
    const feedbackStatus = isPreviewLoading
      ? 'loading'
      : hasFeedbackIssues
        ? 'warning'
        : content.length >= 20
          ? 'ready'
          : 'idle';

    return (
      <div
        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden"
        data-testid="expanded-composer"
      >
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={ref}
            value={content}
            onChange={handleInput}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder="Write your reply..."
            className="w-full px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
            style={{ minHeight: '60px', maxHeight: '200px' }}
            maxLength={maxLength}
            disabled={isSubmitting}
            aria-invalid={!!error}
            aria-describedby={error ? 'composer-error' : undefined}
          />
        </div>

        {/* Citations display */}
        {citations.length > 0 && (
          <div className="px-3 pb-2 space-y-1">
            {citations.map((url, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded"
              >
                <svg
                  className="w-3 h-3 text-blue-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span className="flex-1 truncate text-blue-700 dark:text-blue-300">{url}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCitation(index)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label={`Remove citation ${url}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Citation input (inline) */}
        {showCitationInput && (
          <div className="px-3 pb-2">
            <CitationInput
              onAdd={handleAddCitation}
              onCancel={() => setShowCitationInput(false)}
              existingCitations={citations}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-3 pb-2">
            <p id="composer-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          </div>
        )}

        {/* Character count (only when close to limit) */}
        {showCharacterCount && (
          <div className="px-3 pb-1">
            <span
              className={`text-xs ${
                characterCount > maxLength
                  ? 'text-red-600 dark:text-red-400'
                  : characterCount >= maxLength * 0.9
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-500'
              }`}
            >
              {characterCount} / {maxLength}
            </span>
          </div>
        )}

        {/* Options popover */}
        {showOptions && (
          <div className="px-3 pb-2">
            <OptionsPopover
              containsOpinion={containsOpinion}
              containsFactualClaims={containsFactualClaims}
              onContainsOpinionChange={setContainsOpinion}
              onContainsFactualClaimsChange={setContainsFactualClaims}
              onClose={() => setShowOptions(false)}
            />
          </div>
        )}

        {/* Toolbar */}
        <ComposerToolbar
          onCitationClick={() => setShowCitationInput(!showCitationInput)}
          onOptionsClick={() => setShowOptions(!showOptions)}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          isValid={isValid}
          feedbackStatus={feedbackStatus}
          hasCitations={citations.length > 0}
          hasOptions={containsOpinion || containsFactualClaims}
        />
      </div>
    );
  },
);
