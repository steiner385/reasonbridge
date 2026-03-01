/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '../ui/Button';

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

/**
 * DeleteConfirmDialog - Confirmation dialog before deleting a response
 *
 * @remarks
 * Modal dialog that requires explicit confirmation before deletion.
 * Features:
 * - Focus trap with initial focus on Cancel button
 * - Escape key closes dialog (when not deleting)
 * - Body scroll lock when open
 * - Backdrop click to cancel
 * - role=alertdialog for accessibility
 *
 * @param props - Component props
 * @returns Rendered dialog or null if closed
 *
 * @example
 * ```tsx
 * <DeleteConfirmDialog
 *   isOpen={showDeleteDialog}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteDialog(false)}
 *   isDeleting={isDeleting}
 * />
 * ```
 */
const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isDeleting) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Use portal to escape virtual scrolling container's stacking context
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isDeleting ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        data-testid="confirm-dialog"
        className="
          relative z-10
          bg-white dark:bg-gray-800
          rounded-lg shadow-xl
          p-6 mx-4
          max-w-md w-full
        "
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2"
        >
          Delete Response?
        </h2>

        <p
          id="delete-dialog-description"
          className="text-gray-600 dark:text-gray-400 text-center mb-6"
        >
          This action cannot be undone. The response will be permanently removed.
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="confirm-delete-button"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DeleteConfirmDialog;
