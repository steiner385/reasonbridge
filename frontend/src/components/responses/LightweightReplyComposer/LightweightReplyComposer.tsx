/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lightweight Reply Composer
 *
 * A compact, two-state reply composer inspired by Discord/Slack patterns.
 * Collapsed state shows a simple placeholder (~40px), expanding on focus
 * to reveal the full composer with auto-grow textarea and toolbar.
 *
 * @remarks
 * **States**:
 * - Collapsed: Single-line placeholder "Reply to {name}..." with arrow icon
 * - Expanded: Auto-grow textarea + toolbar with Citation, Options, Post buttons
 *
 * **Key Behaviors**:
 * - Click collapsed → expand + focus
 * - Blur with empty → collapse
 * - Submit success → collapse + clear
 * - Escape → collapse (confirm if content exists)
 * - Ctrl/Cmd+Enter → submit
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CreateResponseRequest } from '../../../types/response';
import type { PreviewFeedbackItem } from '../../../lib/feedback-api';
import { CollapsedPlaceholder } from './CollapsedPlaceholder';
import { ExpandedComposer } from './ExpandedComposer';

export interface LightweightReplyComposerProps {
  /** Parent response ID for threading */
  parentId: string;
  /** Author name to display in placeholder (e.g., "Reply to Alice...") */
  authorName?: string;
  /** Topic ID for preview feedback context */
  topicId?: string;
  /** Callback when response is submitted */
  onSubmit: (response: CreateResponseRequest) => Promise<void>;
  /** Callback when composer is cancelled/collapsed */
  onCancel?: () => void;
  /** Maximum character limit */
  maxLength?: number;
  /** Minimum character limit */
  minLength?: number;
  /** Callback for preview feedback changes (for right panel) */
  onPreviewFeedbackChange?: (
    feedback: PreviewFeedbackItem[],
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;
  /** Whether to auto-focus when expanded */
  autoFocus?: boolean;
  /** Start in expanded state */
  defaultExpanded?: boolean;
}

export function LightweightReplyComposer({
  parentId,
  authorName,
  topicId,
  onSubmit,
  onCancel,
  maxLength = 10000,
  minLength = 10,
  onPreviewFeedbackChange,
  autoFocus = false,
  defaultExpanded = false,
}: LightweightReplyComposerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when expanding
  useEffect(() => {
    if (isExpanded && autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded, autoFocus]);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(
    (force = false) => {
      // Don't collapse if there's content (unless forced)
      if (content.trim() && !force) {
        return;
      }
      setIsExpanded(false);
      setContent('');
      setError(null);
      onCancel?.();
    },
    [content, onCancel],
  );

  const handleBlur = useCallback(() => {
    // Only collapse if empty
    if (!content.trim()) {
      // Small delay to allow click events on toolbar buttons
      setTimeout(() => {
        if (!content.trim()) {
          handleCollapse(true);
        }
      }, 150);
    }
  }, [content, handleCollapse]);

  // handleSubmit must be defined BEFORE handleKeyDown to satisfy exhaustive-deps
  const handleSubmit = useCallback(async () => {
    setError(null);

    // Validation
    if (content.length < minLength) {
      setError(`Reply must be at least ${minLength} characters`);
      return;
    }

    if (content.length > maxLength) {
      setError(`Reply must not exceed ${maxLength} characters`);
      return;
    }

    const response: CreateResponseRequest = {
      content: content.trim(),
      parentId,
    };

    try {
      setIsSubmitting(true);
      await onSubmit(response);
      // Success: collapse and clear
      setContent('');
      setIsExpanded(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reply');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, minLength, maxLength, parentId, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape to collapse
      if (e.key === 'Escape') {
        e.preventDefault();
        if (content.trim()) {
          // Confirm before discarding content
          if (window.confirm('Discard your reply?')) {
            handleCollapse(true);
          }
        } else {
          handleCollapse(true);
        }
      }

      // Ctrl/Cmd + Enter to submit
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [content, handleCollapse, handleSubmit],
  );

  if (!isExpanded) {
    return <CollapsedPlaceholder authorName={authorName} onClick={handleExpand} />;
  }

  return (
    <ExpandedComposer
      ref={textareaRef}
      content={content}
      onContentChange={setContent}
      onSubmit={handleSubmit}
      onCancel={() => handleCollapse(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      isSubmitting={isSubmitting}
      error={error}
      minLength={minLength}
      maxLength={maxLength}
      topicId={topicId}
      onPreviewFeedbackChange={onPreviewFeedbackChange}
      parentId={parentId}
    />
  );
}
