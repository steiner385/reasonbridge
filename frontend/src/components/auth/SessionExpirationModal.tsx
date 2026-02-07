/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';

/**
 * SessionExpirationModal Component
 *
 * Shows a warning modal before session expires, allowing users to:
 * - Continue their session (refresh token)
 * - Log out immediately
 *
 * Features:
 * - Countdown timer showing time until auto-logout
 * - Auto-logout when countdown reaches zero
 * - Cannot be dismissed by clicking backdrop or pressing Escape
 */

export interface SessionExpirationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Time remaining until session expires (in seconds) */
  timeRemaining: number;
  /** Callback when user clicks "Continue Session" */
  onContinue: () => void;
  /** Callback when user clicks "Log Out" or time expires */
  onLogout: () => void;
}

export function SessionExpirationModal({
  isOpen,
  timeRemaining: initialTimeRemaining,
  onContinue,
  onLogout,
}: SessionExpirationModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);

  // Reset time remaining when modal opens or initial time changes
  useEffect(() => {
    // Schedule state update asynchronously to avoid cascading renders
    const timer = setTimeout(() => {
      setTimeRemaining(initialTimeRemaining);
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, initialTimeRemaining]);

  // Update countdown every second
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;

        // Auto-logout when time reaches zero
        if (next <= 0) {
          clearInterval(interval);
          onLogout();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onLogout]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing
      title="Session Expiring"
      size="sm"
      closeOnBackdropClick={false}
      closeOnEscape={false}
      showCloseButton={false}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Log Out
          </button>
          <button
            onClick={onContinue}
            className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            Continue Session
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Your session is about to expire due to inactivity. You'll be automatically logged out in:
        </p>

        <div className="flex items-center justify-center">
          <div className="rounded-lg bg-gray-100 px-6 py-4 dark:bg-gray-800">
            <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-300">
          Click "Continue Session" to stay logged in, or "Log Out" to end your session now.
        </p>
      </div>
    </Modal>
  );
}
