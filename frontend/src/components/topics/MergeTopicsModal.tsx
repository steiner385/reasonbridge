/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T045 [US6] - Merge Topics Modal Component (Feature 016)
 *
 * Moderator-only component for merging duplicate/related topics:
 * - Select source topics (to be archived)
 * - Select target topic (receives all content)
 * - Provide merge reason
 * - Preview merge operation
 * - Warning about permanent nature (30-day rollback window)
 */

import { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useMergeTopics } from '../../hooks/useMergeTopics';
import type { Topic } from '../../types/topic';

export interface MergeTopicsModalProps {
  availableTopics: Topic[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MergeTopicsModal({
  availableTopics,
  isOpen,
  onClose,
  onSuccess,
}: MergeTopicsModalProps) {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [targetTopicId, setTargetTopicId] = useState<string>('');
  const [mergeReason, setMergeReason] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    mutate: mergeTopic,
    isPending,
    error: mutationError,
  } = useMergeTopics({
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedSourceIds([]);
      setTargetTopicId('');
      setMergeReason('');
      setShowPreview(false);
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedSourceIds.length === 0) {
      newErrors.sources = 'Select at least one source topic to merge';
    }

    if (!targetTopicId) {
      newErrors.target = 'Select a target topic';
    }

    if (targetTopicId && selectedSourceIds.includes(targetTopicId)) {
      newErrors.target = 'Target topic cannot be one of the source topics';
    }

    if (mergeReason.trim().length < 20) {
      newErrors.reason = 'Merge reason must be at least 20 characters';
    } else if (mergeReason.trim().length > 1000) {
      newErrors.reason = 'Merge reason must not exceed 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleToggleSource = (topicId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId],
    );
  };

  const handlePreview = () => {
    if (validate()) {
      setShowPreview(true);
    }
  };

  const handleConfirm = () => {
    if (!validate()) {
      return;
    }

    mergeTopic({
      sourceTopicIds: selectedSourceIds,
      targetTopicId,
      mergeReason: mergeReason.trim(),
    });
  };

  if (!isOpen) {
    return null;
  }

  const sourceTopics = availableTopics.filter((t) => selectedSourceIds.includes(t.id));
  const targetTopic = availableTopics.find((t) => t.id === targetTopicId);
  const totalResponses = sourceTopics.reduce((sum, t) => sum + (t.responseCount || 0), 0);
  const totalParticipants = new Set(
    sourceTopics.flatMap((t) => []), // Would need participant data from API
  ).size;

  // Preview View
  if (showPreview) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Confirm Topic Merge"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowPreview(false)} disabled={isPending}>
              Back to Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
              loading={isPending}
            >
              Confirm Merge
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Critical Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0"
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
              <div>
                <p className="text-sm font-semibold text-red-900">Critical Operation</p>
                <p className="text-sm text-red-800 mt-1">
                  This will permanently move all responses and archive the source topics. A 30-day
                  rollback window is available for manual intervention.
                </p>
              </div>
            </div>
          </div>

          {/* Mutation Error */}
          {mutationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{mutationError.message}</p>
            </div>
          )}

          {/* Merge Summary */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Merge Summary</h4>

            {/* Source Topics */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Source Topics (will be archived):
              </p>
              <div className="space-y-2">
                {sourceTopics.map((topic) => (
                  <div key={topic.id} className="bg-red-50 border-l-4 border-red-400 p-3">
                    <p className="text-sm font-medium text-red-900">{topic.title}</p>
                    <p className="text-xs text-red-700 mt-1">
                      {topic.responseCount} responses · {topic.participantCount} participants
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Topic */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Target Topic (receives all content):
              </p>
              {targetTopic && (
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <p className="text-sm font-medium text-green-900">{targetTopic.title}</p>
                  <p className="text-xs text-green-700 mt-1">
                    Currently: {targetTopic.responseCount} responses ·{' '}
                    {targetTopic.participantCount} participants
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    After merge: {targetTopic.responseCount + totalResponses} responses ( +
                    {totalResponses})
                  </p>
                </div>
              )}
            </div>

            {/* Merge Reason */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Merge Reason:</p>
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{mergeReason}</p>
              </div>
            </div>
          </div>

          {/* What Will Happen */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">What Will Happen</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>✓ All {totalResponses} responses will be moved to the target topic</li>
              <li>✓ Source topics will be archived with redirect notices</li>
              <li>✓ Participant counts will be merged (duplicates removed)</li>
              <li>✓ Merge record created with 30-day rollback window</li>
              <li>✓ Analytics will reflect combined activity</li>
            </ul>
          </div>
        </div>
      </Modal>
    );
  }

  // Selection Form View
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Merge Topics"
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePreview}
            disabled={selectedSourceIds.length === 0 || !targetTopicId}
          >
            Preview Merge
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Info Banner */}
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
            <p className="text-sm text-blue-800">
              Merge duplicate or highly related topics to consolidate discussions. All responses
              from source topics will be moved to the target topic.
            </p>
          </div>
        </div>

        {/* Source Topics Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source Topics (select topics to merge) <span className="text-red-500">*</span>
          </label>
          <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
            {availableTopics
              .filter((t) => t.status !== 'LOCKED' && t.id !== targetTopicId)
              .map((topic) => (
                <div
                  key={topic.id}
                  className={`p-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                    selectedSourceIds.includes(topic.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleToggleSource(topic.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.includes(topic.id)}
                      onChange={() => handleToggleSource(topic.id)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{topic.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {topic.responseCount} responses · {topic.participantCount} participants ·{' '}
                        {topic.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {errors.sources && <p className="text-sm text-red-600 mt-1">{errors.sources}</p>}
        </div>

        {/* Target Topic Selection */}
        <div>
          <label htmlFor="target-topic" className="block text-sm font-medium text-gray-700 mb-2">
            Target Topic (receives all content) <span className="text-red-500">*</span>
          </label>
          <select
            id="target-topic"
            value={targetTopicId}
            onChange={(e) => setTargetTopicId(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.target ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select target topic...</option>
            {availableTopics
              .filter((t) => !selectedSourceIds.includes(t.id))
              .map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title} ({topic.responseCount} responses)
                </option>
              ))}
          </select>
          {errors.target && <p className="text-sm text-red-600 mt-1">{errors.target}</p>}
        </div>

        {/* Merge Reason */}
        <div>
          <label htmlFor="merge-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Merge Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="merge-reason"
            value={mergeReason}
            onChange={(e) => setMergeReason(e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.reason ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Explain why these topics should be merged (20-1000 characters)"
          />
          {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
          <p className="text-xs text-gray-500 mt-1">{mergeReason.length}/1000 characters</p>
        </div>
      </div>
    </Modal>
  );
}

export default MergeTopicsModal;
