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

import { useState, useCallback, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCreateTopic } from '../../hooks/useCreateTopic';
import { useTopicDraft, type TopicDraftData } from '../../hooks/useTopicDraft';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { DuplicateSuggestion } from '../../services/topicService';
import type { Tag, TagValidation } from '../../types/tag';
import { TagSelector } from './TagSelector';

export interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (topicId: string) => void;
}

export function CreateTopicModal({ isOpen, onClose, onSuccess }: CreateTopicModalProps) {
  const { requireAuth } = useRequireAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagValidation, setTagValidation] = useState<TagValidation | null>(null);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'UNLISTED'>('PUBLIC');
  const [evidenceStandards, setEvidenceStandards] = useState<'MINIMAL' | 'STANDARD' | 'RIGOROUS'>(
    'STANDARD',
  );
  const [duplicates, setDuplicates] = useState<DuplicateSuggestion[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isMatureContent, setIsMatureContent] = useState(false);
  const [draftPromptDismissed, setDraftPromptDismissed] = useState(false);

  // Draft auto-save functionality
  const { hasDraft, saveStatus, lastSavedAt, updateDraft, clearDraft, restoreDraft } =
    useTopicDraft({
      storageKey: 'create-topic-draft',
      onDraftRestored: (draft: TopicDraftData) => {
        setTitle(draft.title);
        setDescription(draft.description);
        // Convert tag names back to Tag objects (temporary IDs for restored tags)
        setTags(
          draft.tags.map((name, index) => ({
            id: `restored-${index}`,
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
          })),
        );
        setVisibility(draft.visibility);
        setEvidenceStandards(draft.evidenceStandards);
        setIsMatureContent(draft.isMatureContent);
      },
    });

  // Derive draft prompt visibility from existing state (avoids setState in effect)
  const showDraftPrompt = useMemo(
    () => isOpen && hasDraft && !draftPromptDismissed,
    [isOpen, hasDraft, draftPromptDismissed],
  );

  // Update draft when form fields change
  useEffect(() => {
    updateDraft({
      title,
      description,
      tags: tags.map((t) => t.name),
      visibility,
      evidenceStandards,
      isMatureContent,
    });
  }, [title, description, tags, visibility, evidenceStandards, isMatureContent, updateDraft]);

  const handleTagValidationChange = useCallback((validation: TagValidation) => {
    setTagValidation(validation);
  }, []);

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
    setTags([]);
    setTagValidation(null);
    setVisibility('PUBLIC');
    setEvidenceStandards('STANDARD');
    setDuplicates([]);
    setShowDuplicateWarning(false);
    setIsMatureContent(false);
    setDraftPromptDismissed(false);
    clearDraft();
  };

  const handleRestoreDraft = () => {
    restoreDraft();
    setDraftPromptDismissed(true);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPromptDismissed(true);
  };

  const handleSubmit = (e: React.FormEvent, ignoreWarning = false) => {
    e.preventDefault();

    requireAuth(() => {
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

      if (!tagValidation?.isValid) {
        return; // Handled by TagSelector validation
      }

      // Convert Tag objects to tag names for API
      const tagNames = tags.map((tag) => tag.name);

      createTopic({
        title,
        description,
        tags: tagNames,
        visibility,
        evidenceStandards,
        isMatureContent,
      });
    });
  };

  const titleError = title && (title.length < 10 || title.length > 200);
  const descriptionError = description && (description.length < 50 || description.length > 5000);
  const tagsValid = tagValidation?.isValid ?? false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create New Discussion Topic"
      size="lg"
      data-testid="create-topic-modal"
      footer={
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
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
            type="button"
            variant="primary"
            onClick={(e) => handleSubmit(e, showDuplicateWarning)}
            disabled={isPending || titleError || descriptionError || !tagsValid}
            isLoading={isPending}
          >
            {showDuplicateWarning ? 'Create Anyway' : 'Create Topic'}
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => handleSubmit(e, showDuplicateWarning)} className="space-y-6">
        {/* Draft Restoration Prompt */}
        {showDraftPrompt && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Unsaved Draft Found
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  You have an unsaved draft from a previous session. Would you like to restore it?
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="primary" size="sm" onClick={handleRestoreDraft}>
                    Restore Draft
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={handleDiscardDraft}>
                    Start Fresh
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Warning */}
        {showDuplicateWarning && duplicates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0"
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
                      className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {duplicate.title}
                        </h5>
                        <span className="text-xs text-yellow-600 font-medium">
                          {Math.round(duplicate.similarityScore * 100)}% match
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {duplicate.description}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-yellow-600 mt-3">
                  If your topic is truly unique, click &quot;Create Anyway&quot; to proceed.
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
                className="w-5 h-5 text-red-700 mt-0.5"
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
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              titleError ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="E.g., Should we implement carbon taxes to combat climate change?"
            minLength={10}
            maxLength={200}
            required
          />
          <div className="flex justify-between mt-1">
            <p
              className={`text-xs ${titleError ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {titleError
                ? title.length < 10
                  ? `${10 - title.length} more characters needed`
                  : 'Title too long'
                : '10-200 characters'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{title.length}/200</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              descriptionError ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Provide context, background, and specific questions you'd like to explore..."
            rows={6}
            minLength={50}
            maxLength={5000}
            required
          />
          <div className="flex justify-between mt-1">
            <p
              className={`text-xs ${descriptionError ? 'text-red-700' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {descriptionError
                ? description.length < 50
                  ? `${50 - description.length} more characters needed`
                  : 'Description too long'
                : '50-5000 characters'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description.length}/5000</p>
          </div>
        </div>

        {/* Tags */}
        <TagSelector
          selectedTags={tags}
          onChange={setTags}
          onValidationChange={handleTagValidationChange}
          disabled={isPending}
          id="topic-tags"
        />

        {/* Visibility */}
        <div>
          <label
            htmlFor="visibility"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Visibility
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE' | 'UNLISTED')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Evidence Standards
          </label>
          <select
            id="evidence-standards"
            value={evidenceStandards}
            onChange={(e) =>
              setEvidenceStandards(e.target.value as 'MINIMAL' | 'STANDARD' | 'RIGOROUS')
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="MINIMAL">Minimal - Informal discussion</option>
            <option value="STANDARD">Standard - Claims should be sourced</option>
            <option value="RIGOROUS">Rigorous - Academic-level citations required</option>
          </select>
        </div>

        {/* Save Status Indicator */}
        {(saveStatus === 'saving' || saveStatus === 'saved') && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {saveStatus === 'saving' && (
              <>
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Saving draft...</span>
              </>
            )}
            {saveStatus === 'saved' && lastSavedAt && (
              <>
                <svg
                  className="w-3.5 h-3.5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>
                  Draft saved at{' '}
                  {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </div>
        )}

        {/* Mature Content Flag */}
        <div className="flex items-start gap-3 mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <input
            type="checkbox"
            id="matureContent"
            checked={isMatureContent}
            onChange={(e) => setIsMatureContent(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-orange-600 focus:ring-orange-500"
          />
          <div>
            <label
              htmlFor="matureContent"
              className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              This topic contains mature content
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Content involving violence, sensitive topics, or themes that may not be appropriate
              for younger users. Mature content will be hidden from minors without verified parental
              consent.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default CreateTopicModal;
