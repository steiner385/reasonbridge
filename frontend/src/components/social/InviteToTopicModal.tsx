/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * InviteToTopicModal component for inviting users to topic discussions
 *
 * @remarks
 * A modal dialog for sending topic invitations to platform users or email contacts.
 * Supports pre-filling the topic selection and invitee information from parent components.
 *
 * **Features:**
 * - Invite platform users by user ID
 * - Invite external contacts by email address
 * - Optional personal message (max 500 characters)
 * - Topic selection via text input (or pre-filled)
 * - Loading state while sending invitation
 * - Success/error feedback with auto-close on success
 * - Dark mode support
 * - Touch-friendly (44px minimum tap targets)
 * - Accessible form controls with proper ARIA attributes
 *
 * **Validation:**
 * - Topic ID is required
 * - Either inviteeUserId or inviteeEmail must be provided
 * - Message is optional, max 500 characters
 *
 * @example
 * ```tsx
 * // Invite a platform user to a specific topic
 * <InviteToTopicModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   defaultTopicId="topic-123"
 *   inviteeUserId="user-456"
 *   inviteeName="John Smith"
 * />
 *
 * // Invite by email
 * <InviteToTopicModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   inviteeEmail="friend@example.com"
 *   inviteeName="Jane Doe"
 * />
 * ```
 */

import React, { useState, useLayoutEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useCreateInvitation } from '../../hooks/useInvitations';

// ==================
// Component Props
// ==================

export interface InviteToTopicModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * Pre-filled topic ID (optional)
   */
  defaultTopicId?: string;

  /**
   * User ID of the invitee (for platform users)
   */
  inviteeUserId?: string;

  /**
   * Email of the invitee (for external contacts)
   */
  inviteeEmail?: string;

  /**
   * Display name of the invitee
   */
  inviteeName?: string;
}

// ==================
// Constants
// ==================

const MAX_MESSAGE_LENGTH = 500;

// ==================
// Success Message Component
// ==================

interface SuccessMessageProps {
  inviteeName: string | undefined;
  onClose: () => void;
}

function SuccessMessage({ inviteeName, onClose }: SuccessMessageProps) {
  return (
    <div className="text-center py-4">
      {/* Success icon */}
      <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <svg
          className="w-6 h-6 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Invitation Sent!
      </h3>

      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {inviteeName
          ? `Your invitation to ${inviteeName} has been sent successfully.`
          : 'Your invitation has been sent successfully.'}
      </p>

      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

// ==================
// Error Message Component
// ==================

interface ErrorMessageProps {
  message: string;
}

function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div
      className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      </div>
    </div>
  );
}

// ==================
// Main Component
// ==================

export function InviteToTopicModal({
  isOpen,
  onClose,
  defaultTopicId = '',
  inviteeUserId,
  inviteeEmail,
  inviteeName,
}: InviteToTopicModalProps) {
  // Form state
  const [topicId, setTopicId] = useState(defaultTopicId);
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens - using useLayoutEffect to run synchronously
  // before paint, ensuring form is reset before user sees it.
  // This is intentional: we want to reset form state when the modal opens,
  // and useLayoutEffect ensures the reset happens before the first paint.
  useLayoutEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset on modal open
      setTopicId(defaultTopicId);
      setMessage('');
      setShowSuccess(false);
      setValidationError(null);
    }
  }, [isOpen, defaultTopicId]);

  // Create invitation mutation
  const {
    mutate: createInvitation,
    isPending,
    error: apiError,
  } = useCreateInvitation({
    onSuccess: () => {
      setShowSuccess(true);
    },
    onError: () => {
      // Error is handled by the apiError state
    },
  });

  // Validate form
  const validateForm = (): boolean => {
    setValidationError(null);

    // Check if topic ID is provided
    if (!topicId.trim()) {
      setValidationError('Please enter a topic ID');
      return false;
    }

    // Check if invitee is specified (should be provided via props)
    if (!inviteeUserId && !inviteeEmail) {
      setValidationError('No invitee specified');
      return false;
    }

    // Check message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      setValidationError(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createInvitation({
      topicId: topicId.trim(),
      ...(inviteeUserId ? { inviteeUserId } : { inviteeEmail }),
      ...(message.trim() ? { message: message.trim() } : {}),
    });
  };

  // Handle close
  const handleClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  // Calculate remaining characters
  const remainingChars = MAX_MESSAGE_LENGTH - message.length;
  const isOverLimit = remainingChars < 0;

  // Get display error
  const displayError = validationError || (apiError ? apiError.message : null);

  // Render footer buttons
  const renderFooter = () => {
    if (showSuccess) {
      return null; // Success view has its own button
    }

    return (
      <>
        <Button variant="ghost" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="invite-form"
          variant="primary"
          isLoading={isPending}
          disabled={isPending || !topicId.trim()}
        >
          {isPending ? 'Sending...' : 'Send Invitation'}
        </Button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite to Topic"
      size="md"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
      footer={renderFooter()}
    >
      {showSuccess ? (
        <SuccessMessage inviteeName={inviteeName} onClose={handleClose} />
      ) : (
        <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Invitee display */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Inviting:</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {inviteeName || inviteeEmail || 'Unknown User'}
            </p>
            {inviteeEmail && !inviteeUserId && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Invitation will be sent to: {inviteeEmail}
              </p>
            )}
          </div>

          {/* Topic ID input */}
          <Input
            id="topic-id"
            label="Topic ID"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            placeholder="Enter topic ID (e.g., topic-123)"
            required
            disabled={isPending}
            helperText="Enter the ID of the topic you want to invite them to"
          />

          {/* Personal message */}
          <div>
            <label
              htmlFor="invite-message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Personal Message (optional)
            </label>
            <textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I'd love to hear your thoughts on this topic..."
              disabled={isPending}
              rows={3}
              className={`
                w-full px-4 py-2 text-base rounded-lg border transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-1
                disabled:opacity-50 disabled:cursor-not-allowed
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                ${
                  isOverLimit
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:focus:border-primary-400'
                }
              `}
              aria-describedby="message-counter"
            />
            <div
              id="message-counter"
              className={`mt-1 text-xs text-right ${
                isOverLimit
                  ? 'text-red-600 dark:text-red-400'
                  : remainingChars <= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {remainingChars} characters remaining
            </div>
          </div>

          {/* Error message */}
          {displayError && <ErrorMessage message={displayError} />}
        </form>
      )}
    </Modal>
  );
}

export default InviteToTopicModal;
