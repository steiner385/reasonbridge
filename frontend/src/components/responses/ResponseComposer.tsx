/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import MarkdownRenderer from '../ui/MarkdownRenderer';
import { PreviewFeedbackPanel } from '../feedback';
import { useHybridPreviewFeedback } from '../../hooks/useHybridPreviewFeedback';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { useAuthContext } from '../../contexts/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { CreateResponseRequest } from '../../types/response';
import type { PreviewFeedbackItem } from '../../lib/feedback-api';
import { PendingResponseNotice } from './PendingResponseNotice';
import MentionInput from './MentionInput';

export interface ResponseComposerProps {
  /**
   * Callback when response is submitted
   */
  onSubmit: (response: CreateResponseRequest) => void | Promise<void>;

  /**
   * Optional parent response ID for threading
   */
  parentId?: string;

  /**
   * Whether the composer is in a loading state
   */
  isLoading?: boolean;

  /**
   * Placeholder text for the content textarea
   */
  placeholder?: string;

  /**
   * Maximum character limit for the response
   */
  maxLength?: number;

  /**
   * Minimum character limit for the response
   */
  minLength?: number;

  /**
   * Optional callback when composer is cancelled
   */
  onCancel?: () => void;

  /**
   * Whether to show the cancel button
   */
  showCancel?: boolean;

  /**
   * Optional topic ID for preview feedback context
   */
  topicId?: string;

  /**
   * Whether this is an inline reply composer
   */
  inline?: boolean;

  /**
   * Callback when preview feedback changes (for right panel display)
   */
  onPreviewFeedbackChange?: (
    feedback: PreviewFeedbackItem[],
    readyToPost: boolean,
    summary: string,
    isLoading?: boolean,
    error?: string | null,
  ) => void;

  /**
   * Whether to show preview feedback inline in the composer
   */
  showPreviewFeedbackInline?: boolean;
}

const ResponseComposer: React.FC<ResponseComposerProps> = ({
  onSubmit,
  parentId,
  isLoading = false,
  placeholder = 'Share your perspective...',
  maxLength = 10000,
  minLength = 10,
  onCancel,
  showCancel = false,
  topicId,
  inline: _inline = false, // Reserved for future inline styling
  onPreviewFeedbackChange,
  showPreviewFeedbackInline: _showPreviewFeedbackInline = true, // Reserved for future conditional rendering
}) => {
  const [content, setContent] = useState('');
  const [citedSources, setCitedSources] = useState<string[]>([]);
  const [currentSource, setCurrentSource] = useState('');
  const [containsOpinion, setContainsOpinion] = useState(false);
  const [containsFactualClaims, setContainsFactualClaims] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPendingReviewMessage, setShowPendingReviewMessage] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  const { user } = useAuthContext();
  const isMinor = user?.isMinor ?? false;
  const { requireAuth } = useRequireAuth();

  // Typing indicator - send typing events when user types
  const { sendTyping } = useTypingIndicator({ topicId: topicId ?? '' });

  // Hybrid preview feedback integration (regex + AI)
  const {
    feedback: previewFeedback,
    readyToPost,
    isLoading: isPreviewLoading,
    isAILoading,
    isAIFeedback,
    error: previewError,
    summary: previewSummary,
    sensitivity,
    setSensitivity,
  } = useHybridPreviewFeedback(content, { topicId });

  // Notify parent component when preview feedback changes
  useEffect(() => {
    if (onPreviewFeedbackChange) {
      onPreviewFeedbackChange(
        previewFeedback,
        readyToPost ?? false, // Convert null to false
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require authentication before submitting
    requireAuth(async () => {
      setError(null);

      // Validation
      if (content.length < minLength) {
        setError(`Response must be at least ${minLength} characters`);
        return;
      }

      if (content.length > maxLength) {
        setError(`Response must not exceed ${maxLength} characters`);
        return;
      }

      const response: CreateResponseRequest = {
        content: content.trim(),
        containsOpinion,
        containsFactualClaims,
      };

      if (parentId) {
        response.parentId = parentId;
      }

      if (citedSources.length > 0) {
        response.citedSources = citedSources;
      }

      try {
        await onSubmit(response);
        // Reset form on successful submission
        setContent('');
        setCitedSources([]);
        setCurrentSource('');
        setContainsOpinion(false);
        setContainsFactualClaims(false);

        // Show pending review message for minor users
        if (isMinor) {
          setShowPendingReviewMessage(true);
          // Auto-hide the message after 10 seconds
          setTimeout(() => setShowPendingReviewMessage(false), 10000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit response');
      }
    });
  };

  const handleAddSource = () => {
    const trimmedSource = currentSource.trim();
    if (trimmedSource && !citedSources.includes(trimmedSource)) {
      try {
        // Basic URL validation
        new URL(trimmedSource);
        setCitedSources([...citedSources, trimmedSource]);
        setCurrentSource('');
      } catch {
        setError('Please enter a valid URL');
      }
    }
  };

  const handleRemoveSource = (index: number) => {
    setCitedSources(citedSources.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSource();
    }
  };

  const characterCount = content.length;
  const isValid = characterCount >= minLength && characterCount <= maxLength;

  /**
   * Insert markdown formatting at the cursor position
   */
  const insertMarkdown = useCallback(
    (prefix: string, suffix: string = '', placeholder: string = '') => {
      // Get the textarea element to access selection
      const textarea = document.getElementById('response-content') as HTMLTextAreaElement | null;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const textToInsert = selectedText || placeholder;

      const newContent =
        content.substring(0, start) + prefix + textToInsert + suffix + content.substring(end);

      setContent(newContent);

      // Set cursor position after the operation
      setTimeout(() => {
        const newCursorPos = start + prefix.length + textToInsert.length + suffix.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    },
    [content],
  );

  return (
    <div className="space-y-4">
      {/* Pending Review Message for Minor Users */}
      <PendingResponseNotice
        show={showPendingReviewMessage}
        onDismiss={() => setShowPendingReviewMessage(false)}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="response-content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Your Response
              <span className="text-fallacy-DEFAULT ml-1">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                showMarkdownPreview
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              aria-pressed={showMarkdownPreview}
              data-testid="preview-toggle"
            >
              {showMarkdownPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>

          {/* Markdown Formatting Toolbar */}
          <div
            className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700"
            role="toolbar"
            aria-label="Markdown formatting"
            data-testid="markdown-toolbar"
          >
            <button
              type="button"
              onClick={() => insertMarkdown('**', '**', 'bold')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Bold (Ctrl+B)"
              aria-label="Bold"
              data-testid="toolbar-bold"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a1 1 0 011-1h5a4 4 0 014 4 4 4 0 01-1.5 3.12A4.5 4.5 0 0114 14.5 4.5 4.5 0 019.5 19H5a1 1 0 01-1-1V4zm3 5h2a2 2 0 100-4H7v4zm0 2v4h2.5a2.5 2.5 0 100-5H7z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('*', '*', 'italic')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Italic (Ctrl+I)"
              aria-label="Italic"
              data-testid="toolbar-italic"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 3a1 1 0 011-1h6a1 1 0 110 2h-2.28l-2.38 12H12a1 1 0 110 2H6a1 1 0 110-2h2.28l2.38-12H9a1 1 0 01-1-1z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('[', '](url)', 'link text')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Insert Link"
              aria-label="Insert Link"
              data-testid="toolbar-link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </button>
            <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              type="button"
              onClick={() => insertMarkdown('`', '`', 'code')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Inline Code"
              aria-label="Inline Code"
              data-testid="toolbar-code"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('> ', '', 'quote')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Blockquote"
              aria-label="Blockquote"
              data-testid="toolbar-quote"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586l-4.707-4.707A1 1 0 013 6V3zm2 2v.586l4.707 4.707A1 1 0 0110 11v4.586l1-1V11a1 1 0 01.293-.707L16 5.586V5H5z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              type="button"
              onClick={() => insertMarkdown('- ', '', 'list item')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Bullet List"
              aria-label="Bullet List"
              data-testid="toolbar-bullet-list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('1. ', '', 'list item')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title="Numbered List"
              aria-label="Numbered List"
              data-testid="toolbar-numbered-list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                />
              </svg>
            </button>
          </div>

          <MentionInput
            id="response-content"
            value={content}
            onChange={(value) => {
              setContent(value);
              sendTyping(); // Send typing indicator
            }}
            placeholder={placeholder}
            className={
              error
                ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20'
                : ''
            }
            maxLength={maxLength}
            disabled={isLoading}
            topicId={topicId}
            ariaLabel="Your Response"
            minRows={5}
            maxRows={15}
          />
          <div className="flex justify-between items-center mt-1.5">
            <span
              id="character-count"
              className={`text-sm ${
                !isValid && characterCount > 0
                  ? 'text-fallacy-DEFAULT'
                  : characterCount >= maxLength * 0.9
                    ? 'text-secondary-600 dark:text-secondary-400'
                    : 'text-gray-500 dark:text-gray-300'
              }`}
            >
              {characterCount} / {maxLength} characters
              {characterCount < minLength && characterCount > 0 && ` (minimum ${minLength})`}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Supports Markdown formatting
            </span>
          </div>

          {/* Live Markdown Preview */}
          {showMarkdownPreview && content.length > 0 && (
            <div
              className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg"
              data-testid="markdown-preview"
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Preview
              </div>
              <MarkdownRenderer content={content} className="prose-sm max-w-none" />
            </div>
          )}

          {/* Hybrid Preview Feedback - shows when content >= 20 chars */}
          {characterCount >= 20 && (
            <PreviewFeedbackPanel
              feedback={previewFeedback}
              isLoading={isPreviewLoading}
              isAILoading={isAILoading}
              isAIFeedback={isAIFeedback}
              readyToPost={readyToPost}
              summary={previewSummary}
              error={previewError}
              sensitivity={sensitivity}
              onSensitivityChange={setSensitivity}
              showEmpty={true}
              aria-label="Preview feedback"
            />
          )}
        </div>

        {error && (
          <p id="response-error" className="text-sm text-fallacy-DEFAULT" role="alert">
            {error}
          </p>
        )}

        {/* Cited Sources */}
        <div>
          <label
            htmlFor="cited-source"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Cited Sources (Optional)
          </label>
          <div className="flex gap-2">
            <Input
              id="cited-source"
              type="url"
              value={currentSource}
              onChange={(e) => setCurrentSource(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/source"
              disabled={isLoading}
              fullWidth
            />
            <Button
              type="button"
              onClick={handleAddSource}
              variant="outline"
              disabled={!currentSource.trim() || isLoading}
            >
              Add
            </Button>
          </div>
          {citedSources.length > 0 && (
            <ul className="mt-2 space-y-1">
              {citedSources.map((source, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md"
                >
                  <a
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 truncate flex-1"
                  >
                    {source}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveSource(index)}
                    className="ml-2 text-gray-400 hover:text-fallacy-DEFAULT"
                    disabled={isLoading}
                    aria-label={`Remove source ${source}`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Response Metadata Checkboxes */}
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              id="contains-opinion"
              type="checkbox"
              checked={containsOpinion}
              onChange={(e) => setContainsOpinion(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded"
            />
            <label
              htmlFor="contains-opinion"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              This response contains my opinion
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="contains-factual-claims"
              type="checkbox"
              checked={containsFactualClaims}
              onChange={(e) => setContainsFactualClaims(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded"
            />
            <label
              htmlFor="contains-factual-claims"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              This response contains factual claims
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!isValid || isLoading}
          >
            {parentId ? 'Post Reply' : 'Post Response'}
          </Button>
          {showCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ResponseComposer;
