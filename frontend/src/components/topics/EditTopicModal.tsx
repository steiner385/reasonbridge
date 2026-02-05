/**
 * T035 [US3] - Edit Topic Modal Component (Feature 016)
 *
 * Allows topic creators and moderators to edit topic details:
 * - Title, description, tags
 * - Edit reason (required if topic is >24 hours old)
 * - Flag for moderation review
 * - Change preview before submission
 */

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { Topic } from '../../types/topic';

export interface EditTopicModalProps {
  topic: Topic;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updates: {
    title?: string;
    description?: string;
    tags?: string[];
    editReason?: string;
    flagForReview?: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function EditTopicModal({
  topic,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: EditTopicModalProps) {
  const [title, setTitle] = useState(topic.title);
  const [description, setDescription] = useState(topic.description);
  const [tags, setTags] = useState<string[]>(topic.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [editReason, setEditReason] = useState('');
  const [flagForReview, setFlagForReview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Reset form when topic changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(topic.title);
      setDescription(topic.description);
      setTags(topic.tags || []);
      setTagInput('');
      setEditReason('');
      setFlagForReview(false);
      setErrors({});
      setShowPreview(false);
    }
  }, [isOpen, topic]);

  // Calculate if topic is older than 24 hours
  const topicAgeHours = (Date.now() - new Date(topic.createdAt).getTime()) / (1000 * 60 * 60);
  const requiresEditReason = topicAgeHours > 24;

  // Check if there are any changes
  const hasChanges =
    title !== topic.title ||
    description !== topic.description ||
    JSON.stringify(tags.sort()) !== JSON.stringify((topic.tags || []).sort());

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (title.trim().length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title must not exceed 200 characters';
    }

    // Description validation
    if (description.trim().length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    } else if (description.trim().length > 5000) {
      newErrors.description = 'Description must not exceed 5000 characters';
    }

    // Tags validation
    if (tags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    } else if (tags.length > 5) {
      newErrors.tags = 'Maximum 5 tags allowed';
    }

    // Edit reason validation (required if topic is >24h old and there are changes)
    if (requiresEditReason && hasChanges && editReason.trim().length < 10) {
      newErrors.editReason =
        'Edit reason is required for topics older than 24 hours (minimum 10 characters)';
    } else if (editReason.trim().length > 0 && editReason.trim().length < 10) {
      newErrors.editReason = 'Edit reason must be at least 10 characters if provided';
    } else if (editReason.trim().length > 500) {
      newErrors.editReason = 'Edit reason must not exceed 500 characters';
    }

    // No changes validation
    if (!hasChanges) {
      newErrors.form = 'No changes detected. Please modify at least one field to submit.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      if (tags.length >= 5) {
        setErrors({ ...errors, tags: 'Maximum 5 tags allowed' });
        return;
      }
      setTags([...tags, trimmedTag]);
      setTagInput('');
      setErrors({ ...errors, tags: '' });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePreview = () => {
    if (validate()) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const updates: {
      title?: string;
      description?: string;
      tags?: string[];
      editReason?: string;
      flagForReview?: boolean;
    } = {};

    if (title !== topic.title) {
      updates.title = title;
    }
    if (description !== topic.description) {
      updates.description = description;
    }
    if (JSON.stringify(tags.sort()) !== JSON.stringify((topic.tags || []).sort())) {
      updates.tags = tags;
    }
    if (editReason.trim()) {
      updates.editReason = editReason.trim();
    }
    if (flagForReview) {
      updates.flagForReview = true;
    }

    try {
      await onSubmit(updates);
      onClose();
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Failed to update topic',
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  // Change Preview View
  if (showPreview) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Review Changes"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isLoading}
              loading={isLoading}
            >
              Confirm & Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Title changes */}
          {title !== topic.title && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Title</h4>
              <div className="space-y-2">
                <div className="bg-red-50 border-l-4 border-red-400 p-3">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Old:</span> {topic.title}
                  </p>
                </div>
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">New:</span> {title}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description changes */}
          {description !== topic.description && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
              <div className="space-y-2">
                <div className="bg-red-50 border-l-4 border-red-400 p-3">
                  <p className="text-sm text-red-700 whitespace-pre-wrap">
                    <span className="font-medium">Old:</span> {topic.description}
                  </p>
                </div>
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <p className="text-sm text-green-700 whitespace-pre-wrap">
                    <span className="font-medium">New:</span> {description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tags changes */}
          {JSON.stringify(tags.sort()) !== JSON.stringify((topic.tags || []).sort()) && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
              <div className="space-y-2">
                <div className="bg-red-50 border-l-4 border-red-400 p-3">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">Old:</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(topic.tags || []).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">New:</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit reason */}
          {editReason.trim() && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Edit Reason</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{editReason}</p>
            </div>
          )}

          {/* Flag for review */}
          {flagForReview && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-yellow-600 mt-0.5"
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
                <p className="text-sm text-yellow-700">
                  This edit will be flagged for moderator review
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // Edit Form View
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Topic"
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handlePreview} disabled={isLoading || !hasChanges}>
            Preview Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Topic age warning */}
        {requiresEditReason && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-blue-700">
                This topic is older than 24 hours. An edit reason is required for transparency.
              </p>
            </div>
          </div>
        )}

        {/* Form error */}
        {errors.form && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{errors.form}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter a clear, descriptive title (10-200 characters)"
          />
          {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
          <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="edit-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Provide detailed context and background (50-5000 characters)"
          />
          {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
          <p className="text-xs text-gray-500 mt-1">{description.length}/5000 characters</p>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="edit-tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="edit-tags"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.tags ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Add a tag and press Enter"
            />
            <Button type="button" variant="secondary" onClick={handleAddTag}>
              Add Tag
            </Button>
          </div>
          {errors.tags && <p className="text-sm text-red-600 mt-1">{errors.tags}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{tags.length}/5 tags</p>
        </div>

        {/* Edit Reason */}
        <div>
          <label htmlFor="edit-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Edit Reason {requiresEditReason && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id="edit-reason"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.editReason ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={
              requiresEditReason
                ? 'Required: Explain why you are editing this topic (10-500 characters)'
                : 'Optional: Explain why you are editing this topic (10-500 characters)'
            }
          />
          {errors.editReason && <p className="text-sm text-red-600 mt-1">{errors.editReason}</p>}
          <p className="text-xs text-gray-500 mt-1">{editReason.length}/500 characters</p>
        </div>

        {/* Flag for Review */}
        <div className="flex items-start gap-2">
          <input
            id="flag-for-review"
            type="checkbox"
            checked={flagForReview}
            onChange={(e) => setFlagForReview(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="flag-for-review" className="text-sm text-gray-700">
            Flag this edit for moderator review (use if making significant changes)
          </label>
        </div>
      </form>
    </Modal>
  );
}

export default EditTopicModal;
