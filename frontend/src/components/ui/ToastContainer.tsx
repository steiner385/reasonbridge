import Toast, { type ToastProps } from './Toast';

export interface ToastContainerProps {
  /**
   * Array of active toasts to display
   */
  toasts: Omit<ToastProps, 'onDismiss'>[];

  /**
   * Callback to dismiss a toast
   */
  onDismiss: (id: string) => void;

  /**
   * Position of the toast container on screen
   */
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
}

/**
 * ToastContainer - Manages and displays multiple toast notifications
 *
 * Features:
 * - Stacks multiple toasts vertically
 * - Configurable screen position
 * - Fixed positioning above other content
 * - Responsive spacing
 * - Z-index management
 *
 * @example
 * <ToastContainer
 *   toasts={toasts}
 *   onDismiss={handleDismiss}
 *   position="top-right"
 * />
 */
function ToastContainer({ toasts, onDismiss, position = 'top-right' }: ToastContainerProps) {
  // Position classes mapping
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        fixed z-50 flex flex-col gap-3
        w-full max-w-sm px-4 sm:px-0
        ${positionClasses[position]}
      `}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default ToastContainer;
