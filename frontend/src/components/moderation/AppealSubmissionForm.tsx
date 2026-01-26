/**
 * AppealSubmissionForm - Modal form for submitting appeals against moderation actions
 *
 * Allows users to appeal moderation decisions by providing the moderation action ID
 * and a reason for their appeal.
 */

import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { ModerationAction } from '../../types/moderation';
import { useSubmitAppeal } from '../../lib/useSubmitAppeal';

export interface AppealSubmissionFormProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * The moderation action being appealed
   */
  moderationAction: ModerationAction | null;

  /**
   * Optional callback when appeal is successfully submitted
   */
  onSuccess?: (appealId: string) => void;
}

const AppealSubmissionForm: React.FC<AppealSubmissionFormProps> = ({
  isOpen,
  onClose,
  moderationAction,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { submitAppeal, isLoading, isSuccess, isError, error, appealId, reset } = useSubmitAppeal();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setValidationError(null);
      reset();
    }
  }, [isOpen, reset]);

  // Close modal and call onSuccess when appeal is submitted successfully
  useEffect(() => {
    if (isSuccess && appealId) {
      onSuccess?.(appealId);
      onClose();
    }
  }, [isSuccess, appealId, onClose, onSuccess]);

  if (!moderationAction) {
    return null;
  }

  const validateForm = (): boolean => {
    if (!reason.trim()) {
      setValidationError('Please provide a reason for your appeal');
      return false;
    }
    if (reason.trim().length < 10) {
      setValidationError('Please provide at least 10 characters in your appeal reason');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await submitAppeal({
        moderationActionId: moderationAction.id,
        reason: reason.trim(),
      });
    } catch {
      // Error is handled by the hook state
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Appeal Moderation Decision"
      size="lg"
      showCloseButton={!isLoading}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Submit Appeal
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              Thank you! Your appeal has been submitted and will be reviewed by our moderation team.
              You can track the status of your appeal in your account.
            </p>
          </div>
        )}

        {/* Error Message */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              {error || 'Failed to submit appeal. Please try again.'}
            </p>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">{validationError}</p>
          </div>
        )}

        {/* Moderation Action Details */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-xs text-gray-500">Action Type</p>
            <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
              {moderationAction.actionType}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Severity</p>
            <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
              {moderationAction.severity}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reason</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{moderationAction.reasoning}</p>
          </div>
        </div>

        {/* Appeal Reason Input */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Why are you appealing this decision? <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            placeholder="Explain why you believe this moderation action was incorrect or unjust. Be specific and factual..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            maxLength={1000}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm resize-none"
            rows={5}
            required
            aria-invalid={validationError ? 'true' : 'false'}
            aria-describedby={validationError ? 'reason-error' : undefined}
          />
          <p className="text-xs text-gray-500 mt-1">{reason.length}/1000 characters</p>
        </div>

        {/* Information Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-900">
            Your appeal will be reviewed by our moderation team. Provide specific details and be
            respectful in your response. Appeals are typically reviewed within 5-7 business days.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default AppealSubmissionForm;
