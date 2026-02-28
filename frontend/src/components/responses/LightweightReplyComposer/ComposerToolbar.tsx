/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Composer Toolbar
 *
 * Compact toolbar with Citation, Options, and Post buttons.
 * Shows feedback status indicator when preview feedback is active.
 */

import Button from '../../ui/Button';

export interface ComposerToolbarProps {
  onCitationClick: () => void;
  onOptionsClick: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isValid: boolean;
  feedbackStatus: 'idle' | 'loading' | 'ready' | 'warning';
  hasCitations: boolean;
  hasOptions: boolean;
}

export function ComposerToolbar({
  onCitationClick,
  onOptionsClick,
  onSubmit,
  onCancel,
  isSubmitting,
  isValid,
  feedbackStatus,
  hasCitations,
  hasOptions,
}: ComposerToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Left side: action buttons */}
      <div className="flex items-center gap-1">
        {/* Citation button */}
        <button
          type="button"
          onClick={onCitationClick}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            hasCitations ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
          }`}
          aria-label="Add citation"
          title="Add citation (URL)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <span className="hidden sm:inline">Citation</span>
          {hasCitations && <span className="text-[10px]">✓</span>}
        </button>

        {/* Options button */}
        <button
          type="button"
          onClick={onOptionsClick}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            hasOptions ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
          }`}
          aria-label="Response options"
          title="Response options (opinion/factual)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="hidden sm:inline">Options</span>
          {hasOptions && <span className="text-[10px]">✓</span>}
        </button>

        {/* Feedback indicator */}
        {feedbackStatus !== 'idle' && (
          <div className="ml-2 flex items-center gap-1">
            {feedbackStatus === 'loading' && (
              <div
                className="w-3 h-3 border-2 border-gray-300 dark:border-gray-600 border-t-primary-500 rounded-full animate-spin"
                aria-label="Analyzing content"
              />
            )}
            {feedbackStatus === 'ready' && (
              <span className="text-green-500" title="Ready to post">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            {feedbackStatus === 'warning' && (
              <span className="text-amber-500" title="Review feedback">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: cancel and submit */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-xs py-1 px-2"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          isLoading={isSubmitting}
          className="text-xs py-1 px-3"
        >
          Post
        </Button>
      </div>
    </div>
  );
}
