/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react';
import type { AIOperation, AIOperationStatus } from '../../types/simulator';

/**
 * Props for the OperationQueue component
 */
export interface OperationQueueProps {
  /** List of AI operations to display */
  operations: AIOperation[];
  /** Callback when retry is clicked for a failed operation */
  onRetry?: (operationId: string) => void;
  /** Callback when an operation is dismissed */
  onDismiss?: (operationId: string) => void;
  /** Whether the queue is expanded (controlled mode) */
  expanded?: boolean;
  /** Toggle expanded state (controlled mode) */
  onToggleExpand?: () => void;
  /** Custom className */
  className?: string;
}

/**
 * Status configuration for visual indicators
 */
const STATUS_CONFIG: Record<
  AIOperationStatus,
  {
    icon: typeof Loader2;
    iconClass: string;
    bgClass: string;
    textClass: string;
    animate?: boolean;
  }
> = {
  pending: {
    icon: Clock,
    iconClass: 'text-gray-500 dark:text-gray-400',
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  active: {
    icon: Loader2,
    iconClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-200',
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    iconClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-900/30',
    textClass: 'text-green-800 dark:text-green-200',
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-200',
  },
};

/**
 * Format elapsed/estimated time for display
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Individual operation item component
 */
interface OperationItemProps {
  operation: AIOperation;
  onRetry?: (operationId: string) => void;
  onDismiss?: (operationId: string) => void;
}

function OperationItem({ operation, onRetry, onDismiss }: OperationItemProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  // Update elapsed time for active operations
  useEffect(() => {
    if (operation.status !== 'active') {
      return;
    }

    const updateElapsed = () => {
      setElapsedMs(Date.now() - operation.startedAt);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [operation.status, operation.startedAt]);

  // Get config for the status (with fallback to active config for safety)
  const config = STATUS_CONFIG[operation.status] ?? STATUS_CONFIG.active;
  const Icon = config.icon;

  const showTimeInfo = operation.status === 'active' && operation.estimatedMs;
  const progress = showTimeInfo ? Math.min((elapsedMs / operation.estimatedMs!) * 100, 100) : 0;

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg
        ${config.bgClass}
        transition-colors duration-200
      `}
      role="listitem"
      aria-label={`${operation.label} - ${operation.status}`}
    >
      {/* Status icon */}
      <Icon
        className={`
          h-4 w-4 shrink-0
          ${config.iconClass}
          ${config.animate ? 'animate-spin' : ''}
        `}
        aria-hidden="true"
      />

      {/* Label and time info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${config.textClass}`}>{operation.label}</p>

        {/* Progress bar for active operations */}
        {showTimeInfo && (
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {formatTime(elapsedMs)} / {formatTime(operation.estimatedMs!)}
            </span>
          </div>
        )}

        {/* Error message */}
        {operation.status === 'failed' && operation.error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">
            {operation.error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Retry button for failed operations */}
        {operation.status === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(operation.id)}
            className="
              p-1.5 rounded-md
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-800/50
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors
            "
            aria-label={`Retry ${operation.label}`}
            title="Retry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}

        {/* Dismiss button for completed/failed operations */}
        {(operation.status === 'completed' || operation.status === 'failed') && onDismiss && (
          <button
            onClick={() => onDismiss(operation.id)}
            className="
              p-1.5 rounded-md
              text-gray-500 dark:text-gray-400
              hover:bg-gray-200 dark:hover:bg-gray-600
              focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
              transition-colors
            "
            aria-label={`Dismiss ${operation.label}`}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * OperationQueue - Displays pending AI operations with visual feedback
 *
 * @remarks
 * Shows a collapsible banner displaying active/pending AI operations.
 * Features include:
 * - **Status indicators**: Visual icons for pending (gray), active (blue spinner),
 *   completed (green check), and failed (red X) operations
 * - **Progress tracking**: Shows elapsed time and progress bar for active operations
 * - **Error handling**: Displays error messages for failed operations with retry option
 * - **Collapsible UI**: Minimizes distraction while keeping status accessible
 * - **Dark mode**: Full support for dark theme
 * - **Accessibility**: ARIA attributes, keyboard navigation, live regions
 *
 * @param props - Component props
 * @returns Rendered component or null if no operations
 *
 * @example
 * ```tsx
 * const operations: AIOperation[] = [
 *   {
 *     id: 'op-1',
 *     type: 'argument_analysis',
 *     status: 'active',
 *     label: 'Analyzing your argument...',
 *     startedAt: Date.now(),
 *     estimatedMs: 3000,
 *   },
 * ];
 *
 * <OperationQueue
 *   operations={operations}
 *   onRetry={(id) => handleRetry(id)}
 *   onDismiss={(id) => handleDismiss(id)}
 * />
 * ```
 */
function OperationQueue({
  operations,
  onRetry,
  onDismiss,
  expanded: controlledExpanded,
  onToggleExpand,
  className = '',
}: OperationQueueProps) {
  // Internal expanded state (uncontrolled mode)
  const [internalExpanded, setInternalExpanded] = useState(true);

  // Use controlled or uncontrolled mode
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggleExpand = () => {
    if (isControlled && onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  // Calculate operation counts by status
  const counts = useMemo(() => {
    return operations.reduce(
      (acc, op) => {
        acc[op.status]++;
        return acc;
      },
      { pending: 0, active: 0, completed: 0, failed: 0 } as Record<AIOperationStatus, number>,
    );
  }, [operations]);

  const activeCount = counts.pending + counts.active;
  const hasErrors = counts.failed > 0;

  // Don't render if no operations
  if (operations.length === 0) {
    return null;
  }

  // Determine header color based on state
  const headerBgClass = hasErrors
    ? 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800'
    : activeCount > 0
      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800'
      : 'bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800';

  const headerTextClass = hasErrors
    ? 'text-red-900 dark:text-red-100'
    : activeCount > 0
      ? 'text-blue-900 dark:text-blue-100'
      : 'text-green-900 dark:text-green-100';

  // Generate status summary
  const statusParts: string[] = [];
  if (counts.active > 0) {
    statusParts.push(`${counts.active} active`);
  }
  if (counts.pending > 0) {
    statusParts.push(`${counts.pending} pending`);
  }
  if (counts.completed > 0) {
    statusParts.push(`${counts.completed} completed`);
  }
  if (counts.failed > 0) {
    statusParts.push(`${counts.failed} failed`);
  }

  const statusSummary = statusParts.join(', ');

  return (
    <div
      className={`
        rounded-lg border overflow-hidden
        ${headerBgClass}
        ${className}
      `}
      role="region"
      aria-label="AI operations queue"
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Header */}
      <button
        onClick={handleToggleExpand}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-3
          ${headerBgClass}
          focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
          transition-colors
        `}
        aria-expanded={isExpanded}
        aria-controls="operation-queue-list"
      >
        <div className="flex items-center gap-3">
          {/* Animated spinner or status icon */}
          {activeCount > 0 ? (
            <Loader2
              className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin"
              aria-hidden="true"
            />
          ) : hasErrors ? (
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          ) : (
            <CheckCircle2
              className="h-5 w-5 text-green-600 dark:text-green-400"
              aria-hidden="true"
            />
          )}

          <div className="text-left">
            <span className={`text-sm font-medium ${headerTextClass}`}>
              {activeCount > 0
                ? `${activeCount} operation${activeCount !== 1 ? 's' : ''} in progress`
                : hasErrors
                  ? `${counts.failed} operation${counts.failed !== 1 ? 's' : ''} failed`
                  : 'All operations completed'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({statusSummary})</span>
          </div>
        </div>

        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronUp className={`h-5 w-5 ${headerTextClass}`} aria-hidden="true" />
        ) : (
          <ChevronDown className={`h-5 w-5 ${headerTextClass}`} aria-hidden="true" />
        )}
      </button>

      {/* Operation list */}
      {isExpanded && (
        <div
          id="operation-queue-list"
          className="p-3 space-y-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          role="list"
          aria-label="Operation list"
        >
          {operations.map((operation) => (
            <OperationItem
              key={operation.id}
              operation={operation}
              onRetry={onRetry}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

OperationQueue.displayName = 'OperationQueue';

export default OperationQueue;
