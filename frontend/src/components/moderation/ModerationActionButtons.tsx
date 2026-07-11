/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Moderation Action Buttons Component
 *
 * Provides interactive approve/reject buttons for moderation actions with:
 * - Loading states during processing
 * - Error handling and display
 * - Optional reasoning input
 * - Callback support for parent components
 */

import { useState } from 'react';
import Button from '../ui/Button';
import { approveModerationAction, rejectModerationAction } from '../../lib/moderation-api';
import type { ModerationAction } from '../../types/moderation';
import { useShowNotification } from '../../hooks/useNotification';

export interface ModerationActionButtonsProps {
  /**
   * The moderation action to process
   */
  action: ModerationAction;
  /**
   * Callback when action is successfully approved
   */
  onApprove?: (updatedAction: ModerationAction) => void;
  /**
   * Callback when action is successfully rejected
   */
  onReject?: (updatedAction: ModerationAction) => void;
  /**
   * Callback for errors during processing
   */
  onError?: (error: string) => void;
  /**
   * @deprecated A rejection reason is now always required by the backend, so
   * rejecting always shows the reasoning input. This prop is a no-op kept for
   * backward compatibility.
   */
  showRejectReasoning?: boolean;
  /**
   * Whether buttons should be disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Custom className for the buttons container
   */
  className?: string;
  /**
   * Size of buttons
   * @default 'sm'
   */
  buttonSize?: 'sm' | 'md' | 'lg';
}

/**
 * ModerationActionButtons component
 *
 * Renders approve and reject buttons for moderation actions with
 * proper loading states, error handling, and optional reasoning input.
 */
export default function ModerationActionButtons({
  action,
  onApprove,
  onReject,
  onError,
  disabled = false,
  className = '',
  buttonSize = 'sm',
}: ModerationActionButtonsProps) {
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReasoning, setRejectReasoning] = useState('');
  const [showReasoningInput, setShowReasoningInput] = useState(false);
  const notify = useShowNotification();

  const isProcessing = processingAction !== null;

  // Handle approval
  const handleApprove = async () => {
    try {
      setError(null);
      setProcessingAction('approve');
      const updatedAction = await approveModerationAction(action.id);
      notify.success('Action approved', `Moderation action approved successfully`, 3000);
      onApprove?.(updatedAction);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve action';
      setError(errorMessage);
      notify.error('Approval failed', errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessingAction(null);
    }
  };

  // Handle rejection. The backend requires a non-empty reason and returns no
  // body (Issue #1393), so validate the reason locally and surface the original
  // action to the callback rather than a non-existent response payload.
  const handleReject = async () => {
    const reason = rejectReasoning.trim();
    if (!reason) {
      setError('Please provide a reason for rejecting this action');
      return;
    }
    try {
      setError(null);
      setProcessingAction('reject');
      await rejectModerationAction(action.id, reason);
      notify.success('Action rejected', `Moderation action rejected successfully`, 3000);
      setRejectReasoning('');
      setShowReasoningInput(false);
      onReject?.(action);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject action';
      setError(errorMessage);
      notify.error('Rejection failed', errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessingAction(null);
    }
  };

  // If action is not pending, don't render buttons
  if (action.status !== 'pending') {
    return null;
  }

  // Show reject reasoning input state. A reason is required by the backend, so
  // rejecting always routes through this input (Issue #1393).
  if (showReasoningInput) {
    return (
      <div className={`space-y-2 ${className}`}>
        <textarea
          value={rejectReasoning}
          onChange={(e) => setRejectReasoning(e.target.value)}
          placeholder="Provide a reason for rejecting this action"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          disabled={isProcessing}
        />
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size={buttonSize}
            variant="danger"
            onClick={handleReject}
            disabled={isProcessing || disabled}
          >
            {isProcessing && processingAction === 'reject' ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
          <Button
            size={buttonSize}
            variant="outline"
            onClick={() => {
              setShowReasoningInput(false);
              setRejectReasoning('');
              setError(null);
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Normal buttons state
  return (
    <div className={`space-y-2 ${className}`}>
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size={buttonSize}
          variant="primary"
          onClick={handleApprove}
          disabled={isProcessing || disabled}
        >
          {isProcessing && processingAction === 'approve' ? 'Approving...' : 'Approve'}
        </Button>
        <Button
          size={buttonSize}
          variant="danger"
          onClick={() => setShowReasoningInput(true)}
          disabled={isProcessing || disabled}
        >
          {isProcessing && processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}
