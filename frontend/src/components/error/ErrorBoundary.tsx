import { Component, type ReactNode, type ErrorInfo } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';

export interface ErrorBoundaryProps {
  /**
   * Child components to render
   */
  children: ReactNode;

  /**
   * Optional fallback UI to render on error
   */
  fallback?: ReactNode;

  /**
   * Optional callback when an error occurs
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /**
   * Optional callback to reset the error boundary
   */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 *
 * Features:
 * - Prevents entire app crash from component errors
 * - Displays user-friendly error UI
 * - Provides error details in development
 * - Reset functionality to recover from errors
 * - Dark mode support
 * - Accessibility attributes
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback and error logging
 * <ErrorBoundary
 *   fallback={<CustomErrorUI />}
 *   onError={(error, info) => logErrorToService(error, info)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card variant="elevated" padding="lg" className="max-w-2xl w-full">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <svg
                  className="h-10 w-10 text-red-600 dark:text-red-400"
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

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We're sorry for the inconvenience. An unexpected error occurred while loading this
                page.
              </p>

              {/* Development Mode: Show error details */}
              {process.env['NODE_ENV'] === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-auto max-h-64">
                    <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" size="lg" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    window.location.href = '/';
                  }}
                >
                  Go to Home
                </Button>
              </div>

              {/* Support Link */}
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                If this problem persists, please{' '}
                <a
                  href="https://github.com/anthropics/claude-code/issues"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  report the issue
                </a>
                .
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
