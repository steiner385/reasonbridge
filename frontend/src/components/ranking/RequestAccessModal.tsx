/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RequestAccessModal component
 * Feature 781: User Ranking System - Task 6.4
 *
 * @remarks
 * Modal for users to request provisional access to tier-restricted topics:
 * - **Topic Display**: Shows the topic title being requested
 * - **Reason Field**: Optional textarea for explaining why access should be granted
 * - **Submit Flow**: Handles async submission with loading state
 * - **Error Handling**: Displays errors and allows retry
 * - **Success Feedback**: Shows confirmation before auto-closing
 * - **Accessibility**: ARIA attributes, focus management, keyboard navigation
 */

import { useState, useRef, useId, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Props for RequestAccessModal component
 */
export interface RequestAccessModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** ID of the topic to request access to */
  topicId: string;
  /** Title of the topic to display */
  topicTitle: string;
  /** Callback when access request is submitted */
  onSubmit: (reason?: string) => Promise<void>;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback on successful submission */
  onSuccess?: () => void;
}

/**
 * Type for submission state
 */
type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; message: string };

/**
 * Internal component that renders the modal content
 * This component is unmounted when isOpen is false, so state is naturally reset
 */
function RequestAccessModalContent({
  topicTitle,
  onSubmit,
  onClose,
  onSuccess,
}: Omit<RequestAccessModalProps, 'isOpen' | 'topicId'>) {
  const [reason, setReason] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: 'idle' });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textareaId = useId();
  const isSubmitting = submissionState.status === 'submitting';
  const isSuccess = submissionState.status === 'success';

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    setSubmissionState({ status: 'submitting' });

    try {
      const trimmedReason = reason.trim();
      await onSubmit(trimmedReason || undefined);
      setSubmissionState({ status: 'success' });
      onSuccess?.();
      // Auto-close after success
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      setSubmissionState({
        status: 'error',
        message: 'Failed to submit access request. Please try again.',
      });
    }
  };

  /**
   * Handle reason change and clear error
   */
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (submissionState.status === 'error') {
      setSubmissionState({ status: 'idle' });
    }
  };

  /**
   * Handle close with submission check
   */
  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="Request Access to Topic"
      size="md"
      closeOnEscape={!isSubmitting}
      closeOnBackdropClick={!isSubmitting}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting || isSuccess}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || isSuccess}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Topic Title */}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You&apos;re requesting access to:
          </p>
          <p className="mt-1 text-lg font-medium text-gray-900 dark:text-gray-100">
            &quot;{topicTitle}&quot;
          </p>
        </div>

        {/* Reason Textarea */}
        <div>
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Why should you be granted access?{' '}
            <span className="text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id={textareaId}
            value={reason}
            onChange={handleReasonChange}
            disabled={isSubmitting || isSuccess}
            placeholder="I have a background in environmental science and would like to contribute my expertise..."
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Info Text */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The topic creator will review your request.
        </p>

        {/* Success Message */}
        {isSuccess && (
          <div
            className="p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700"
            role="status"
          >
            Request submitted successfully!
          </div>
        )}

        {/* Error Message */}
        {submissionState.status === 'error' && (
          <div
            className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700"
            role="alert"
          >
            {submissionState.message}
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Modal for requesting provisional access to tier-restricted topics
 *
 * This wrapper component ensures the internal content state is reset
 * when the modal opens by conditionally rendering the content component.
 */
export function RequestAccessModal({
  isOpen,
  topicId: _topicId,
  topicTitle,
  onSubmit,
  onClose,
  onSuccess,
}: RequestAccessModalProps) {
  // Only render content when modal is open - this ensures state is reset on each open
  if (!isOpen) {
    return null;
  }

  return (
    <RequestAccessModalContent
      topicTitle={topicTitle}
      onSubmit={onSubmit}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

export default RequestAccessModal;
