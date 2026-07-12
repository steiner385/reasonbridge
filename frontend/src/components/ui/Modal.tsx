/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * Modal title
   */
  title: string;

  /**
   * Modal content
   */
  children: React.ReactNode;

  /**
   * Optional footer content (typically action buttons)
   */
  footer?: React.ReactNode;

  /**
   * Size of the modal
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Whether to close when clicking the backdrop
   */
  closeOnBackdropClick?: boolean;

  /**
   * Whether to close when pressing Escape
   */
  closeOnEscape?: boolean;

  /**
   * Whether to show the close button
   */
  showCloseButton?: boolean;

  /**
   * Optional data-testid for E2E test selectors
   */
  'data-testid'?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  'data-testid': dataTestId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open (reference-counted so overlapping
  // overlays don't clobber each other's lock — see #1378).
  useScrollLock(isOpen);

  // Focus trap: store trigger focus, focus first element, trap Tab, restore on close.
  // Focusable elements are re-queried inside the keydown handler to handle dynamic content.
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Store the element that had focus before the modal opened so we can restore it.
    previousFocusRef.current = document.activeElement as HTMLElement;

    const FOCUSABLE =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      // Re-query on each keydown to reflect dynamic content changes.
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    // Focus the first focusable element in the modal.
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusable[0]?.focus();

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      // Restore focus to the trigger element so keyboard users can continue from where they were.
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      data-testid={dataTestId}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900 dark:bg-black bg-opacity-50 dark:bg-opacity-70 transition-opacity"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-gray-900/50 transition-all w-full ${sizeClasses[size]}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
            <h2
              id="modal-title"
              className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              {title}
            </h2>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 max-h-[calc(100vh-160px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto text-gray-900 dark:text-gray-100">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
