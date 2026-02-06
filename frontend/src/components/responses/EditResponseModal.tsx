/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { Response, UpdateResponseRequest } from '../../types/response';

export interface EditResponseModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * The response being edited
   */
  response: Response;

  /**
   * Callback when the edit is submitted
   */
  onSubmit: (responseId: string, data: UpdateResponseRequest) => void | Promise<void>;

  /**
   * Whether the form is in a loading state
   */
  isLoading?: boolean;

  /**
   * Maximum character limit for the response
   */
  maxLength?: number;

  /**
   * Minimum character limit for the response
   */
  minLength?: number;
}

const EditResponseModal: React.FC<EditResponseModalProps> = ({
  isOpen,
  onClose,
  response,
  onSubmit,
  isLoading = false,
  maxLength = 10000,
  minLength = 10,
}) => {
  const [content, setContent] = useState('');
  const [citedSources, setCitedSources] = useState<string[]>([]);
  const [currentSource, setCurrentSource] = useState('');
  const [containsOpinion, setContainsOpinion] = useState(false);
  const [containsFactualClaims, setContainsFactualClaims] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with response data when modal opens
  useEffect(() => {
    if (isOpen && response) {
      setContent(response.content);
      setCitedSources(response.citedSources?.map((s) => s.url) || []);
      setContainsOpinion(response.containsOpinion);
      setContainsFactualClaims(response.containsFactualClaims);
      setError(null);
    }
  }, [isOpen, response]);

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

    const updateData: UpdateResponseRequest = {
      content: content.trim(),
      containsOpinion,
      containsFactualClaims,
    };

    if (citedSources.length > 0) {
      updateData.citedSources = citedSources;
    }

    try {
      await onSubmit(response.id, updateData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update response');
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
        setError(null);
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

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  const characterCount = content.length;
  const isValid = characterCount >= minLength && characterCount <= maxLength;
  const hasChanges =
    content.trim() !== response.content ||
    citedSources.length !== (response.citedSources?.length || 0) ||
    citedSources.some((source, i) => source !== response.citedSources?.[i]?.url) ||
    containsOpinion !== response.containsOpinion ||
    containsFactualClaims !== response.containsFactualClaims;

  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={handleCancel} disabled={isLoading}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="primary"
        onClick={handleSubmit}
        isLoading={isLoading}
        disabled={!isValid || !hasChanges || isLoading}
      >
        Save Changes
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Edit Response"
      size="lg"
      footer={footer}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Content */}
        <div>
          <label
            htmlFor="edit-response-content"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Your Response
            <span className="text-fallacy-DEFAULT ml-1">*</span>
          </label>
          <textarea
            id="edit-response-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your perspective..."
            className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y min-h-[200px] ${
              error
                ? 'border-fallacy-DEFAULT focus:border-fallacy-DEFAULT focus:ring-fallacy-DEFAULT/20'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
            }`}
            maxLength={maxLength}
            disabled={isLoading}
            aria-invalid={!!error}
            aria-describedby={error ? 'edit-response-error' : 'edit-character-count'}
          />
          <div className="flex justify-between items-center mt-1.5">
            <span
              id="edit-character-count"
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
        </div>

        {error && (
          <p id="edit-response-error" className="text-sm text-fallacy-DEFAULT" role="alert">
            {error}
          </p>
        )}

        {/* Cited Sources */}
        <div>
          <label
            htmlFor="edit-cited-source"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Cited Sources (Optional)
          </label>
          <div className="flex gap-2">
            <Input
              id="edit-cited-source"
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
              id="edit-contains-opinion"
              type="checkbox"
              checked={containsOpinion}
              onChange={(e) => setContainsOpinion(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="edit-contains-opinion"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              This response contains my opinion
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="edit-contains-factual-claims"
              type="checkbox"
              checked={containsFactualClaims}
              onChange={(e) => setContainsFactualClaims(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label
              htmlFor="edit-contains-factual-claims"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              This response contains factual claims
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditResponseModal;
