import { useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  /**
   * Unique identifier for the toast
   */
  id: string;

  /**
   * Toast message content
   */
  message: string;

  /**
   * Visual variant of the toast
   */
  variant: ToastVariant;

  /**
   * Duration in milliseconds before auto-dismissing (0 = no auto-dismiss)
   */
  duration?: number;

  /**
   * Callback when toast is dismissed
   */
  onDismiss: (id: string) => void;
}

/**
 * Toast - Individual toast notification component
 *
 * Features:
 * - Multiple visual variants (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss button
 * - Slide-in animation
 * - Dark mode support
 * - Accessibility attributes
 */
function Toast({ id, message, variant, duration = 5000, onDismiss }: ToastProps) {
  // Auto-dismiss after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [id, duration, onDismiss]);

  // Variant styling
  const variantClasses = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-300',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-300',
    warning:
      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-300',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300',
  };

  // Icons for each variant
  const icons = {
    success: (
      <svg
        className="h-5 w-5 text-green-600 dark:text-green-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    error: (
      <svg
        className="h-5 w-5 text-red-600 dark:text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg
        className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg
        className="h-5 w-5 text-blue-600 dark:text-blue-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`
        flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg
        animate-slide-up
        ${variantClasses[variant]}
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{icons[variant]}</div>

      {/* Message */}
      <div className="flex-1 text-sm font-medium">{message}</div>

      {/* Dismiss Button */}
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        aria-label="Dismiss notification"
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
    </div>
  );
}

export default Toast;
