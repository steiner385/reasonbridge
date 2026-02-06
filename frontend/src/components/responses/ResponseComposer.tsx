/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { PreviewFeedbackPanel } from '../feedback';
import { useHybridPreviewFeedback } from '../../hooks/useHybridPreviewFeedback';
import type { CreateResponseRequest } from '../../types/response';

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
}) => {
  const [content, setContent] = useState('');
  const [citedSources, setCitedSources] = useState<string[]>([]);
  const [currentSource, setCurrentSource] = useState('');
  const [containsOpinion, setContainsOpinion] = useState(false);
  const [containsFactualClaims, setContainsFactualClaims] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="response-content"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Your Response
          <span className="text-fallacy-DEFAULT ml-1">*</span>
        </label>
        <textarea
          id="response-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y min-h-[120px] ${
            error
              ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
          }`}
          maxLength={maxLength}
          disabled={isLoading}
          aria-invalid={!!error}
          aria-describedby={error ? 'response-error' : 'character-count'}
        />
        <div className="flex justify-between items-center mt-1.5">
          <span
            id="character-count"
            className={`text-sm ${
              !isValid && characterCount > 0
                ? 'text-fallacy-DEFAULT'
                : characterCount >= maxLength * 0.9
                  ? 'text-secondary-600'
                  : 'text-gray-500'
            }`}
          >
            {characterCount} / {maxLength} characters
            {characterCount < minLength && characterCount > 0 && ` (minimum ${minLength})`}
          </span>
        </div>

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
        <label htmlFor="cited-source" className="block text-sm font-medium text-gray-700 mb-1.5">
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
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
              >
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 truncate flex-1"
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
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="contains-opinion" className="ml-2 text-sm text-gray-700">
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
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="contains-factual-claims" className="ml-2 text-sm text-gray-700">
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
  );
};

export default ResponseComposer;
