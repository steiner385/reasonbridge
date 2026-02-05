/**
 * Loading state types for asynchronous operations
 * Tracks API calls, AI analysis, and other async operations
 */

/**
 * Loading status values
 */
export type LoadingStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Loading state interface
 * Generic type T represents the data type being loaded
 */
export interface LoadingState<T = unknown> {
  /** Current loading status */
  status: LoadingStatus;

  /** Error object if status is 'error', null otherwise */
  error: Error | null;

  /** Loaded data if status is 'success', null otherwise */
  data: T | null;

  /** Whether to show skeleton screen (appears after 500ms delay) */
  showSkeleton: boolean;

  /** Optimistic update data (applied immediately, rolled back on error) */
  optimisticData: T | null;
}

/**
 * Loading state helper functions
 */
export const createLoadingState = <T = unknown>(): LoadingState<T> => ({
  status: 'idle',
  error: null,
  data: null,
  showSkeleton: false,
  optimisticData: null,
});

/**
 * Check if loading state is in pending status
 */
export const isLoading = <T>(state: LoadingState<T>): boolean => state.status === 'pending';

/**
 * Check if loading state has data
 */
export const hasData = <T>(state: LoadingState<T>): state is LoadingState<T> & { data: T } =>
  state.status === 'success' && state.data !== null;

/**
 * Check if loading state has error
 */
export const hasError = <T>(state: LoadingState<T>): state is LoadingState<T> & { error: Error } =>
  state.status === 'error' && state.error !== null;
