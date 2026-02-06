/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T017 [US1] - Create Topic Modal Component (Feature 016)
 *
 * Modal for creating new discussion topics with:
 * - Form validation
 * - Duplicate detection warnings
 * - Tag input
 * - Visibility and evidence standards selection
 */

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCreateTopic, type TopicCreationError } from '../../hooks/useCreateTopic';
import type { DuplicateSuggestion } from '../../services/topicService';

export interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (topicId: string) => void;
}

export function CreateTopicModal({ isOpen, onClose, onSuccess }: CreateTopicModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'UNLISTED'>('PUBLIC');
  const [evidenceStandards, setEvidenceStandards] = useState<'MINIMAL' | 'STANDARD' | 'RIGOROUS'>(
    'STANDARD',
  );
  const [duplicates, setDuplicates] = useState<DuplicateSuggestion[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const {
    mutate: createTopic,
    isPending,
    error,
  } = useCreateTopic({
    onSuccess: (topic) => {
      resetForm();
      onClose();
      onSuccess?.(topic.id);
    },
    onDuplicateDetected: (suggestions) => {
      setDuplicates(suggestions);
      setShowDuplicateWarning(true);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTagInput('');
    setTags([]);
    setVisibility('PUBLIC');
    setEvidenceStandards('STANDARD');
    setDuplicates([]);
    setShowDuplicateWarning(false);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && tags.length < 5 && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent, ignoreWarning = false) => {
    e.preventDefault();

    // Show warning if duplicates exist and user hasn't acknowledged
    if (duplicates.length > 0 && !ignoreWarning) {
      setShowDuplicateWarning(true);
      return;
    }

    // Validate
    if (title.length < 10 || title.length > 200) {
      return; // Handled by HTML5 validation
    }

    if (description.length < 50 || description.length > 5000) {
      return; // Handled by HTML5 validation
    }

    if (tags.length < 1 || tags.length > 5) {
      return; // Handled by button state
    }

    createTopic({
      title,
      description,
      tags,
      visibility,
      evidenceStandards,
    });
  };

  const titleError = title && (title.length < 10 || title.length > 200);
  const descriptionError = description && (description.length < 50 || description.length > 5000);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create New Discussion Topic"
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={(e) => handleSubmit(e, showDuplicateWarning)}
            disabled={isPending || titleError || descriptionError || tags.length === 0}
            loading={isPending}
          >
            {showDuplicateWarning ? 'Create Anyway' : 'Create Topic'}
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => handleSubmit(e, showDuplicateWarning)} className="space-y-6">
        {/* Duplicate Warning */}
        {showDuplicateWarning && duplicates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">Similar Topics Found</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  We found {duplicates.length} similar topic{duplicates.length > 1 ? 's' : ''}.
                  Consider joining an existing discussion instead:
                </p>
                <div className="space-y-2">
                  {duplicates.slice(0, 3).map((duplicate) => (
                    <div
                      key={duplicate.id}
                      className="bg-white rounded p-3 border border-yellow-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-sm text-gray-900">{duplicate.title}</h5>
                        <span className="text-xs text-yellow-600 font-medium">
                          {Math.round(duplicate.similarityScore * 100)}% match
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{duplicate.description}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-yellow-600 mt-3">
                  If your topic is truly unique, click "Create Anyway" to proceed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && !showDuplicateWarning && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              titleError ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="E.g., Should we implement carbon taxes to combat climate change?"
            minLength={10}
            maxLength={200}
            required
          />
          <div className="flex justify-between mt-1">
            <p className={`text-xs ${titleError ? 'text-red-600' : 'text-gray-500'}`}>
              {titleError
                ? title.length < 10
                  ? `${10 - title.length} more characters needed`
                  : 'Title too long'
                : '10-200 characters'}
            </p>
            <p className="text-xs text-gray-500">{title.length}/200</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              descriptionError ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Provide context, background, and specific questions you'd like to explore..."
            rows={6}
            minLength={50}
            maxLength={5000}
            required
          />
          <div className="flex justify-between mt-1">
            <p className={`text-xs ${descriptionError ? 'text-red-600' : 'text-gray-500'}`}>
              {descriptionError
                ? description.length < 50
                  ? `${50 - description.length} more characters needed`
                  : 'Description too long'
                : '50-5000 characters'}
            </p>
            <p className="text-xs text-gray-500">{description.length}/5000</p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tag-input" className="block text-sm font-medium text-gray-700 mb-2">
            Tags <span className="text-red-500">*</span>{' '}
            <span className="text-gray-500 font-normal">(1-5 tags)</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              id="tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., climate, policy, economics"
              disabled={tags.length >= 5}
              maxLength={50}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 5}
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-primary-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {tags.length === 0 && <p className="text-xs text-red-600">At least 1 tag is required</p>}
        </div>

        {/* Visibility */}
        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-2">
            Visibility
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE' | 'UNLISTED')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="PUBLIC">Public - Anyone can view and participate</option>
            <option value="UNLISTED">Unlisted - Only those with link can view</option>
            <option value="PRIVATE">Private - Invitation only</option>
          </select>
        </div>

        {/* Evidence Standards */}
        <div>
          <label
            htmlFor="evidence-standards"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Evidence Standards
          </label>
          <select
            id="evidence-standards"
            value={evidenceStandards}
            onChange={(e) =>
              setEvidenceStandards(e.target.value as 'MINIMAL' | 'STANDARD' | 'RIGOROUS')
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="MINIMAL">Minimal - Informal discussion</option>
            <option value="STANDARD">Standard - Claims should be sourced</option>
            <option value="RIGOROUS">Rigorous - Academic-level citations required</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

export default CreateTopicModal;
