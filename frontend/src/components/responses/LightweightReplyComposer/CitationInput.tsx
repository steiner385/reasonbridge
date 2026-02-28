/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Citation Input
 *
 * Inline URL input for adding citations/sources to a reply.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface CitationInputProps {
  onAdd: (url: string) => void;
  onCancel: () => void;
  existingCitations: string[];
}

export function CitationInput({ onAdd, onCancel, existingCitations }: CitationInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const validateAndAdd = useCallback(() => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setError('Please enter a valid URL (including https://)');
      return;
    }

    // Check for duplicates
    if (existingCitations.includes(trimmedUrl)) {
      setError('This citation has already been added');
      return;
    }

    onAdd(trimmedUrl);
    setUrl('');
    setError(null);
  }, [url, existingCitations, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        validateAndAdd();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [validateAndAdd, onCancel],
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/source"
          className={`flex-1 px-2 py-1 text-xs rounded border ${
            error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500`}
          aria-invalid={!!error}
          aria-describedby={error ? 'citation-error' : undefined}
        />
        <button
          type="button"
          onClick={validateAndAdd}
          className="px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          aria-label="Cancel adding citation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      {error && (
        <p id="citation-error" className="text-[10px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
