/**
 * Result type for operations that can succeed or fail.
 * Provides type-safe error handling without exceptions.
 */

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Check if a result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Check if a result is an error
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}
