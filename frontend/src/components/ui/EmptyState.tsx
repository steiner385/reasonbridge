import type { ReactNode } from 'react';
import Button from './Button';
import Card from './Card';

export interface EmptyStateProps {
  /**
   * Empty state title
   */
  title?: string;

  /**
   * Empty state description
   */
  message?: string;

  /**
   * Optional action callback
   */
  onAction?: () => void;

  /**
   * Action button label
   */
  actionLabel?: string;

  /**
   * Optional custom icon
   */
  icon?: ReactNode;

  /**
   * Whether to show the action button
   */
  showAction?: boolean;

  /**
   * Whether to wrap in a Card (defaults to true)
   */
  wrapped?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * EmptyState - Displays empty state with optional call-to-action
 *
 * Features:
 * - Customizable title and message
 * - Optional action button
 * - Custom icon support
 * - Dark mode support
 * - Can be wrapped in Card or used standalone
 * - Accessibility attributes
 *
 * @example
 * // Basic empty state
 * <EmptyState
 *   title="No topics yet"
 *   message="Be the first to create a discussion topic"
 *   actionLabel="Create Topic"
 *   onAction={() => navigate('/topics/new')}
 * />
 *
 * @example
 * // Unwrapped empty state
 * <EmptyState
 *   message="No results found"
 *   wrapped={false}
 *   showAction={false}
 * />
 */
function EmptyState({
  title = 'No data',
  message = "There's nothing here yet.",
  onAction,
  actionLabel = 'Get Started',
  icon,
  showAction = true,
  wrapped = true,
  className = '',
}: EmptyStateProps) {
  const content = (
    <div className={`text-center py-12 ${className}`}>
      {/* Icon */}
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        {icon || (
          <svg
            className="h-8 w-8 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>

      {/* Message */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{message}</p>

      {/* Action Button */}
      {showAction && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (wrapped) {
    return (
      <Card variant="elevated" padding="lg">
        {content}
      </Card>
    );
  }

  return content;
}

export default EmptyState;
