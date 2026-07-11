/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '../ui/Button';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useScrollLock } from '../../hooks/useScrollLock';

export type ReportReason = 'SPAM' | 'HARASSMENT' | 'MISINFORMATION' | 'HATE_SPEECH' | 'OTHER';

export interface ReportDialogProps {
  isOpen: boolean;
  responseId: string;
  onSubmit: (reason: ReportReason, additionalInfo?: string) => Promise<void>;
  onClose: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam or advertising' },
  { value: 'HARASSMENT', label: 'Harassment or bullying' },
  { value: 'MISINFORMATION', label: 'Misinformation' },
  { value: 'HATE_SPEECH', label: 'Hate speech' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * ReportDialog - Modal dialog for reporting a response
 *
 * @remarks
 * Provides a form for users to report inappropriate content with:
 * - Radio buttons for predefined reasons
 * - Optional textarea for additional context
 * - Form validation (reason required)
 * - Loading state during submission
 *
 * @param props - Component props
 * @returns Rendered dialog or null if closed
 *
 * @example
 * ```tsx
 * <ReportDialog
 *   isOpen={showReportDialog}
 *   responseId={response.id}
 *   onSubmit={handleReport}
 *   onClose={() => setShowReportDialog(false)}
 * />
 * ```
 */
const ReportDialog: React.FC<ReportDialogProps> = ({
  isOpen,
  responseId: _responseId,
  onSubmit,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { requireAuth } = useRequireAuth();

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(null);
      setAdditionalInfo('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  // Reference-counted lock so a still-open drawer/modal keeps scroll locked (#1378).
  useScrollLock(isOpen);

  const handleSubmit = () => {
    requireAuth(async () => {
      if (!selectedReason) {
        setError('Please select a reason for your report');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onSubmit(selectedReason, additionalInfo || undefined);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit report');
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  if (!isOpen) return null;

  // Use portal to escape virtual scrolling container's stacking context
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        data-testid="report-dialog"
        className="
          relative z-10
          bg-white dark:bg-gray-800
          rounded-lg shadow-xl
          p-6 mx-4
          max-w-md w-full
          max-h-[90vh] overflow-y-auto
        "
      >
        <h2
          id="report-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Report Response
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}

        <fieldset className="mb-4">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Why are you reporting this response?
          </legend>
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <label key={reason.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="report-reason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={() => setSelectedReason(reason.value)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{reason.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mb-6">
          <label
            htmlFor="additional-info"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Additional information (optional)
          </label>
          <textarea
            id="additional-info"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="Provide any additional context..."
            className="
              w-full px-3 py-2
              border border-gray-300 dark:border-gray-600
              rounded-md
              bg-white dark:bg-gray-700
              text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary-500
              resize-none
            "
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ReportDialog;
