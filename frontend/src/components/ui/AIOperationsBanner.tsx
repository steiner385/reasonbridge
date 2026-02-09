/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Loader2, AlertCircle } from 'lucide-react';

interface AIOperation {
  id: string;
  label: string;
  status: 'active' | 'error';
}

interface AIOperationsBannerProps {
  operations: AIOperation[];
}

/**
 * Status banner showing active AI operations
 * Provides visual feedback for long-running AI tasks
 */
export function AIOperationsBanner({ operations }: AIOperationsBannerProps) {
  if (operations.length === 0) {
    return null;
  }

  const hasErrors = operations.some((op) => op.status === 'error');
  const activeOps = operations.filter((op) => op.status === 'active');

  return (
    <div
      className={`
        mb-6 p-4 rounded-lg border
        ${
          hasErrors
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        }
      `}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {hasErrors ? (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
        )}

        <div className="flex-1 min-w-0">
          <h3
            className={`text-sm font-semibold mb-1 ${
              hasErrors ? 'text-red-900 dark:text-red-100' : 'text-blue-900 dark:text-blue-100'
            }`}
          >
            {hasErrors
              ? `AI operation error (${operations.length})`
              : `AI operations in progress (${activeOps.length})`}
          </h3>

          <ul className="space-y-1">
            {operations.map((operation) => (
              <li
                key={operation.id}
                className={`text-sm flex items-center gap-2 ${
                  operation.status === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-blue-800 dark:text-blue-200'
                }`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    operation.status === 'error'
                      ? 'bg-red-600 dark:bg-red-400'
                      : 'bg-blue-600 dark:bg-blue-400'
                  }`}
                  aria-hidden="true"
                />
                {operation.label}
              </li>
            ))}
          </ul>

          {!hasErrors && activeOps.length > 0 && (
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              This may take 10-30 seconds depending on the complexity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
