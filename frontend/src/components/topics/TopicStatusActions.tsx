/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T029 [US2] - Topic Status Actions Component (Feature 016)
 *
 * Provides action buttons for managing topic lifecycle:
 * - Archive topic (creator or moderator)
 * - Lock topic (moderator only)
 * - Reopen topic (creator or moderator)
 * - Activate topic (creator, from SEEDING)
 */

import { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useUpdateTopicStatus } from '../../hooks/useUpdateTopicStatus';
import type { Topic } from '../../types/topic';

export interface TopicStatusActionsProps {
  topic: Topic;
  isCreator: boolean;
  isModerator: boolean;
  onSuccess?: () => void;
}

export function TopicStatusActions({
  topic,
  isCreator,
  isModerator,
  onSuccess,
}: TopicStatusActionsProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
    label: string;
    message: string;
  } | null>(null);

  const {
    mutate: updateStatus,
    isPending,
    error,
  } = useUpdateTopicStatus({
    onSuccess: () => {
      setShowConfirmModal(false);
      setPendingAction(null);
      onSuccess?.();
    },
  });

  const canModify = isCreator || isModerator;

  // Don't show any actions if user can't modify
  if (!canModify) {
    return null;
  }

  const handleActionClick = (
    status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED',
    label: string,
    message: string,
  ) => {
    setPendingAction({ status, label, message });
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (pendingAction) {
      updateStatus({
        topicId: topic.id,
        status: pendingAction.status,
      });
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  // Determine available actions based on current status
  const getAvailableActions = () => {
    const actions = [];

    switch (topic.status) {
      case 'SEEDING':
        // Can activate
        if (isCreator || isModerator) {
          actions.push({
            status: 'ACTIVE' as const,
            label: 'Activate Topic',
            message:
              'Activating this topic will make it fully public and allow participants to join the discussion.',
            variant: 'primary' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ),
          });
        }
        break;

      case 'ACTIVE':
        // Can archive
        if (isCreator || isModerator) {
          actions.push({
            status: 'ARCHIVED' as const,
            label: 'Archive Topic',
            message:
              'Archiving this topic will close it to new responses while preserving all content for reference.',
            variant: 'secondary' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
            ),
          });
        }

        // Moderators can lock
        if (isModerator) {
          actions.push({
            status: 'LOCKED' as const,
            label: 'Lock Topic',
            message:
              'Locking this topic will prevent all modifications and new responses. Only moderators can unlock it.',
            variant: 'destructive' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            ),
          });
        }
        break;

      case 'ARCHIVED':
        // Can reopen to ACTIVE
        if (isCreator || isModerator) {
          actions.push({
            status: 'ACTIVE' as const,
            label: 'Reopen Topic',
            message:
              'Reopening this topic will allow new responses and make it active in the discussion list again.',
            variant: 'primary' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ),
          });
        }

        // Moderators can lock even from archived state
        if (isModerator) {
          actions.push({
            status: 'LOCKED' as const,
            label: 'Lock Topic',
            message:
              'Locking this topic will prevent any future modifications. Only moderators can unlock it.',
            variant: 'destructive' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            ),
          });
        }
        break;

      case 'LOCKED':
        // Only moderators can unlock
        if (isModerator) {
          actions.push({
            status: 'ACTIVE' as const,
            label: 'Unlock Topic',
            message:
              'Unlocking this topic will restore it to active status and allow modifications.',
            variant: 'primary' as const,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            ),
          });
        }
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  // Don't render if no actions available
  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableActions.map((action) => (
        <Button
          key={action.status}
          variant={action.variant}
          size="sm"
          onClick={() => handleActionClick(action.status, action.label, action.message)}
          disabled={isPending}
          className="flex items-center gap-2"
        >
          {action.icon}
          {action.label}
        </Button>
      ))}

      {/* Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <Modal
          isOpen={showConfirmModal}
          onClose={handleCancel}
          title={pendingAction.label}
          size="md"
          footer={
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isPending}
                loading={isPending}
              >
                Confirm
              </Button>
            </div>
          }
        >
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
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

          <p className="text-gray-700">{pendingAction.message}</p>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Topic:</strong> {topic.title}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Current Status:</strong> {topic.status}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>New Status:</strong> {pendingAction.status}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TopicStatusActions;
