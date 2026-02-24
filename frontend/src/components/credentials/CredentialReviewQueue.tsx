/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CredentialReviewQueue component
 * Feature 781: User Ranking System - Task 5.4
 *
 * @remarks
 * Admin interface for reviewing pending credential submissions:
 * - **Queue Display**: List of pending credentials with all relevant info
 * - **Approval Flow**: Modal with optional notes field
 * - **Rejection Flow**: Modal with required reason field
 * - **Feedback**: Success/error messages after actions
 * - **Loading State**: Spinner while fetching credentials
 * - **Empty State**: Message when no pending credentials
 * - **Accessibility**: ARIA labels, keyboard navigation, focus management
 */

import { useState } from 'react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { Credential } from '../../types/ranking';
import CredentialReviewCard from './CredentialReviewCard';

/**
 * Props for CredentialReviewQueue component
 */
export interface CredentialReviewQueueProps {
  /** List of credentials to review */
  credentials: Credential[];
  /** Whether credentials are being loaded */
  isLoading?: boolean;
  /** Callback when a credential is approved */
  onApprove: (id: string, notes?: string) => Promise<void>;
  /** Callback when a credential is rejected */
  onReject: (id: string, reason: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Type for modal state
 */
type ModalState =
  | { type: 'closed' }
  | { type: 'approve'; credentialId: string; credentialTitle: string }
  | { type: 'reject'; credentialId: string; credentialTitle: string };

/**
 * Type for feedback state
 */
type FeedbackState =
  | { type: 'none' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

/**
 * Admin interface for reviewing pending credential submissions
 */
export function CredentialReviewQueue({
  credentials,
  isLoading = false,
  onApprove,
  onReject,
  className = '',
}: CredentialReviewQueueProps) {
  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: 'none' });
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  /**
   * Handle opening the approval modal
   */
  const handleOpenApproveModal = (credential: Credential) => {
    setModalState({
      type: 'approve',
      credentialId: credential.id,
      credentialTitle: credential.title,
    });
    setApprovalNotes('');
    setFeedback({ type: 'none' });
  };

  /**
   * Handle opening the rejection modal
   */
  const handleOpenRejectModal = (credential: Credential) => {
    setModalState({
      type: 'reject',
      credentialId: credential.id,
      credentialTitle: credential.title,
    });
    setRejectionReason('');
    setFeedback({ type: 'none' });
  };

  /**
   * Handle closing the modal
   */
  const handleCloseModal = () => {
    if (isProcessing) return;
    setModalState({ type: 'closed' });
    setApprovalNotes('');
    setRejectionReason('');
    setFeedback({ type: 'none' });
  };

  /**
   * Handle confirming approval
   */
  const handleConfirmApprove = async () => {
    if (modalState.type !== 'approve') return;

    setIsProcessing(true);
    setFeedback({ type: 'none' });

    try {
      await onApprove(modalState.credentialId, approvalNotes || undefined);
      setFeedback({ type: 'success', message: 'Credential approved successfully' });
      // Close modal after short delay to show success message
      setTimeout(() => {
        setModalState({ type: 'closed' });
        setFeedback({ type: 'none' });
      }, 1000);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to approve credential. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle confirming rejection
   */
  const handleConfirmReject = async () => {
    if (modalState.type !== 'reject' || !rejectionReason.trim()) return;

    setIsProcessing(true);
    setFeedback({ type: 'none' });

    try {
      await onReject(modalState.credentialId, rejectionReason.trim());
      setFeedback({ type: 'success', message: 'Credential rejected successfully' });
      // Close modal after short delay to show success message
      setTimeout(() => {
        setModalState({ type: 'closed' });
        setFeedback({ type: 'none' });
      }, 1000);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to reject credential. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              <p className="text-gray-600 dark:text-gray-400 mt-3">Loading credentials...</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (credentials.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                No pending credentials
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                All credential submissions have been reviewed.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Credential Review Queue
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {credentials.length} pending credential{credentials.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Credentials List */}
      <div className="space-y-4">
        {credentials.map((credential) => (
          <CredentialReviewCard
            key={credential.id}
            credential={credential}
            onApprove={() => handleOpenApproveModal(credential)}
            onReject={() => handleOpenRejectModal(credential)}
            isProcessing={
              isProcessing &&
              (modalState.type === 'approve' || modalState.type === 'reject') &&
              modalState.credentialId === credential.id
            }
          />
        ))}
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={modalState.type === 'approve'}
        onClose={handleCloseModal}
        title="Approve Credential"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmApprove}
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modalState.type === 'approve' && (
            <p className="text-gray-700 dark:text-gray-300">
              You are about to approve the credential:{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {modalState.credentialTitle}
              </strong>
            </p>
          )}

          <Input
            label="Notes (optional)"
            id="approval-notes"
            type="text"
            placeholder="Add any notes about this approval..."
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            disabled={isProcessing}
            fullWidth
          />

          {/* Feedback Messages */}
          {feedback.type === 'success' && (
            <div
              className="p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700"
              role="alert"
            >
              Credential approved
            </div>
          )}

          {feedback.type === 'error' && (
            <div
              className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700"
              role="alert"
            >
              Failed to approve credential
            </div>
          )}
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={modalState.type === 'reject'}
        onClose={handleCloseModal}
        title="Reject Credential"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              disabled={isProcessing || !rejectionReason.trim()}
              isLoading={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {modalState.type === 'reject' && (
            <p className="text-gray-700 dark:text-gray-300">
              You are about to reject the credential:{' '}
              <strong className="text-gray-900 dark:text-gray-100">
                {modalState.credentialTitle}
              </strong>
            </p>
          )}

          <Input
            label="Reason for rejection"
            id="rejection-reason"
            type="text"
            placeholder="Please provide a reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            disabled={isProcessing}
            required
            fullWidth
            error={!rejectionReason.trim() ? undefined : undefined}
          />
          {!rejectionReason.trim() && modalState.type === 'reject' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A reason is required to reject a credential.
            </p>
          )}

          {/* Feedback Messages */}
          {feedback.type === 'success' && (
            <div
              className="p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700"
              role="alert"
            >
              Credential rejected
            </div>
          )}

          {feedback.type === 'error' && (
            <div
              className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700"
              role="alert"
            >
              Failed to reject credential
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default CredentialReviewQueue;
