/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useChildSafety } from '../../contexts/ChildSafetyContext';

/**
 * Safety report reason types
 */
export type SafetyReportReason =
  | 'UNCOMFORTABLE' // General discomfort
  | 'SCARY_CONTENT' // Saw something scary
  | 'STRANGER_CONTACT' // Someone unknown contacted me
  | 'PERSONAL_QUESTIONS' // Asked personal questions
  | 'EXIT_QUICKLY' // Just want to leave quickly
  | 'OTHER'; // Other reason

interface SafetyReportData {
  reason: SafetyReportReason;
  additionalInfo?: string;
}

export interface PanicButtonProps {
  /**
   * Callback when a safety report is submitted
   */
  onReport?: (data: SafetyReportData) => void | Promise<void>;

  /**
   * URL to redirect to after "Exit Quickly" (defaults to safe external site)
   */
  exitUrl?: string;

  /**
   * Whether to show the button (controlled mode)
   */
  show?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const REASON_OPTIONS: { value: SafetyReportReason; label: string; description: string }[] = [
  {
    value: 'UNCOMFORTABLE',
    label: "I don't feel comfortable",
    description: 'Something made me feel uneasy',
  },
  {
    value: 'SCARY_CONTENT',
    label: 'I saw something scary',
    description: "Something I didn't want to see",
  },
  {
    value: 'STRANGER_CONTACT',
    label: 'Someone is bothering me',
    description: "A person I don't know is talking to me",
  },
  {
    value: 'PERSONAL_QUESTIONS',
    label: 'Someone asked personal questions',
    description: 'Questions about where I live, my school, etc.',
  },
  {
    value: 'EXIT_QUICKLY',
    label: 'I want to leave now',
    description: 'Take me somewhere safe right away',
  },
  {
    value: 'OTHER',
    label: 'Something else',
    description: 'I need help with something else',
  },
];

/**
 * PanicButton - Child-friendly safety button for minors
 *
 * @remarks
 * Provides a discreet but accessible way for minors to report safety concerns
 * or quickly exit the application. Designed with child-friendly language and
 * calming colors.
 *
 * **Key Features:**
 * - Fixed position for constant visibility
 * - Child-friendly icons and language
 * - Quick exit option to safe external page
 * - Modal dialog for reporting concerns
 * - Keyboard accessible and screen reader friendly
 *
 * **Behavior:**
 * - Only visible when `showPanicButton` is true from ChildSafetyContext
 * - Can be controlled via `show` prop for testing
 * - "Exit Quickly" navigates to safe external site immediately
 *
 * @param props - Component props
 * @returns Rendered panic button or null if not visible
 *
 * @example
 * ```tsx
 * // In AppLayout - auto-shows for minor users
 * <PanicButton onReport={handleSafetyReport} />
 *
 * // Controlled visibility for testing
 * <PanicButton show={true} onReport={mockHandler} />
 * ```
 */
export function PanicButton({
  onReport,
  exitUrl = 'https://www.google.com',
  show,
  className = '',
}: PanicButtonProps): React.ReactElement | null {
  const { showPanicButton } = useChildSafety();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<SafetyReportReason | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use prop if provided, otherwise use context
  const shouldShow = show !== undefined ? show : showPanicButton;

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSelectedReason(null);
    setAdditionalInfo('');
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedReason(null);
    setAdditionalInfo('');
  }, []);

  const handleExitQuickly = useCallback(() => {
    // Clear browser history entry and redirect to safe site
    window.location.replace(exitUrl);
  }, [exitUrl]);

  const handleReasonSelect = useCallback(
    (reason: SafetyReportReason) => {
      setSelectedReason(reason);
      if (reason === 'EXIT_QUICKLY') {
        // Immediate exit without additional steps
        handleExitQuickly();
      }
    },
    [handleExitQuickly],
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedReason || !onReport) return;

    setIsSubmitting(true);
    try {
      await onReport({
        reason: selectedReason,
        additionalInfo: additionalInfo.trim() || undefined,
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReason, additionalInfo, onReport, handleClose]);

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Floating Panic Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={`fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all
          bg-teal-500 hover:bg-teal-600 text-white
          dark:bg-teal-600 dark:hover:bg-teal-700
          focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2
          ${className}`}
        aria-label="Get help or report a concern"
        data-testid="panic-button"
      >
        {/* Shield/Help icon */}
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span className="text-sm font-medium">Need Help?</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="panic-dialog-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            data-testid="panic-dialog"
          >
            {/* Header */}
            <div className="bg-teal-500 dark:bg-teal-600 px-6 py-4">
              <h2
                id="panic-dialog-title"
                className="text-xl font-semibold text-white flex items-center gap-2"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                We're Here to Help
              </h2>
              <p className="text-teal-100 text-sm mt-1">
                Choose what's happening, and we'll help you feel safe.
              </p>
            </div>

            {/* Reason Selection */}
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {REASON_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleReasonSelect(option.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedReason === option.value
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 dark:border-teal-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-500'
                    }`}
                    aria-pressed={selectedReason === option.value}
                    data-testid={`reason-${option.value.toLowerCase()}`}
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {option.label}
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>

              {/* Additional Info (for non-exit options) */}
              {selectedReason && selectedReason !== 'EXIT_QUICKLY' && (
                <div className="mt-4">
                  <label
                    htmlFor="additional-info"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Want to tell us more? (optional)
                  </label>
                  <textarea
                    id="additional-info"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="You can share more details if you want..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                      focus:outline-none focus:ring-2 focus:ring-teal-500"
                    rows={3}
                    maxLength={500}
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              {selectedReason && selectedReason !== 'EXIT_QUICKLY' && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  data-testid="submit-report"
                >
                  {isSubmitting ? 'Sending...' : 'Send Report'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PanicButton;
