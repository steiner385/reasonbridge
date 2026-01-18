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
import {
  approveModerationAction,
  rejectModerationAction,
} from '../../lib/moderation-api';
import type { ModerationAction } from '../../types/moderation';

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
   * Whether to show reasoning textarea for reject action
   * @default false
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
  showRejectReasoning = false,
  disabled = false,
  className = '',
  buttonSize = 'sm',
}: ModerationActionButtonsProps) {
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReasoning, setRejectReasoning] = useState('');
  const [showReasoningInput, setShowReasoningInput] = useState(false);

  const isProcessing = processingAction !== null;

  // Handle approval
  const handleApprove = async () => {
    try {
      setError(null);
      setProcessingAction('approve');
      const updatedAction = await approveModerationAction(action.id);
      onApprove?.(updatedAction);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve action';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessingAction(null);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    try {
      setError(null);
      setProcessingAction('reject');
      const updatedAction = await rejectModerationAction(action.id);
      setRejectReasoning('');
      setShowReasoningInput(false);
      onReject?.(updatedAction);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject action';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessingAction(null);
    }
  };

  // If action is not pending, don't render buttons
  if (action.status !== 'pending') {
    return null;
  }

  // Show reject reasoning input state
  if (showRejectReasoning && showReasoningInput) {
    return (
      <div className={`space-y-2 ${className}`}>
        <textarea
          value={rejectReasoning}
          onChange={e => setRejectReasoning(e.target.value)}
          placeholder="Provide reasoning for rejecting this action (optional)"
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
          variant={showRejectReasoning ? 'outline' : 'danger'}
          onClick={() => {
            if (showRejectReasoning) {
              setShowReasoningInput(true);
            } else {
              handleReject();
            }
          }}
          disabled={isProcessing || disabled}
        >
          {isProcessing && processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}
