/**
 * Custom test assertions and matchers
 */

import type { Result } from '@unite-discord/common';

/**
 * Assertion error with detailed context
 */
export class AssertionError extends Error {
  constructor(
    message: string,
    public readonly expected: unknown,
    public readonly actual: unknown
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AssertionError(
      message ?? `Expected value to be defined, but got ${value}`,
      'defined value',
      value
    );
  }
}

/**
 * Assert that a value is null or undefined
 */
export function assertNullish(
  value: unknown,
  message?: string
): asserts value is null | undefined {
  if (value !== null && value !== undefined) {
    throw new AssertionError(
      message ?? `Expected value to be null or undefined, but got ${typeof value}`,
      'null or undefined',
      value
    );
  }
}

/**
 * Assert that a Result is successful and return the data
 */
export function assertOk<T, E>(result: Result<T, E>, message?: string): T {
  if (!result.success) {
    throw new AssertionError(
      message ?? `Expected Result to be success, but got error: ${String(result.error)}`,
      'successful result',
      result.error
    );
  }
  return result.data;
}

/**
 * Assert that a Result is an error and return the error
 */
export function assertErr<T, E>(result: Result<T, E>, message?: string): E {
  if (result.success) {
    throw new AssertionError(
      message ?? `Expected Result to be error, but got success: ${String(result.data)}`,
      'error result',
      result.data
    );
  }
  return result.error;
}

/**
 * Assert that two values are deeply equal
 */
export function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
  const actualJson = JSON.stringify(actual, null, 2);
  const expectedJson = JSON.stringify(expected, null, 2);

  if (actualJson !== expectedJson) {
    throw new AssertionError(
      message ?? `Values are not deeply equal:\nExpected: ${expectedJson}\nActual: ${actualJson}`,
      expected,
      actual
    );
  }
}

/**
 * Assert that an array contains a specific item
 */
export function assertContains<T>(
  array: readonly T[],
  item: T,
  message?: string
): void {
  const found = array.some((element) => JSON.stringify(element) === JSON.stringify(item));
  if (!found) {
    throw new AssertionError(
      message ?? `Expected array to contain item: ${JSON.stringify(item)}`,
      item,
      array
    );
  }
}

/**
 * Assert that a string matches a pattern
 */
export function assertMatches(
  value: string,
  pattern: RegExp,
  message?: string
): void {
  if (!pattern.test(value)) {
    throw new AssertionError(
      message ?? `Expected "${value}" to match pattern ${pattern}`,
      pattern.toString(),
      value
    );
  }
}

/**
 * Assert that a function throws an error
 */
export function assertThrows(
  fn: () => unknown,
  expectedError?: string | RegExp | (new (...args: unknown[]) => Error),
  message?: string
): Error {
  let thrown: Error | undefined;

  try {
    fn();
  } catch (error) {
    thrown = error as Error;
  }

  if (!thrown) {
    throw new AssertionError(
      message ?? 'Expected function to throw an error',
      'thrown error',
      'no error'
    );
  }

  if (expectedError !== undefined) {
    validateThrownError(thrown, expectedError, message);
  }

  return thrown;
}

/**
 * Helper to validate thrown error matches expected
 */
function validateThrownError(
  thrown: Error,
  expectedError: string | RegExp | (new (...args: unknown[]) => Error),
  message?: string
): void {
  if (typeof expectedError === 'string') {
    if (!thrown.message.includes(expectedError)) {
      throw new AssertionError(
        message ?? `Expected error message to include "${expectedError}"`,
        expectedError,
        thrown.message
      );
    }
  } else if (expectedError instanceof RegExp) {
    if (!expectedError.test(thrown.message)) {
      throw new AssertionError(
        message ?? `Expected error message to match ${expectedError}`,
        expectedError.toString(),
        thrown.message
      );
    }
  } else {
    // expectedError is a constructor
    if (!(thrown instanceof expectedError)) {
      throw new AssertionError(
        message ?? `Expected error to be instance of ${expectedError.name}`,
        expectedError.name,
        (thrown as { constructor: { name: string } }).constructor.name
      );
    }
  }
}

/**
 * Assert that an async function throws an error
 */
export async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  expectedError?: string | RegExp | (new (...args: unknown[]) => Error),
  message?: string
): Promise<Error> {
  let thrown: Error | undefined;

  try {
    await fn();
  } catch (error) {
    thrown = error as Error;
  }

  if (!thrown) {
    throw new AssertionError(
      message ?? 'Expected async function to throw an error',
      'thrown error',
      'no error'
    );
  }

  if (expectedError !== undefined) {
    validateThrownError(thrown, expectedError, message);
  }

  return thrown;
}

/**
 * Wait for a condition to become true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50, message } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new AssertionError(
    message ?? `Condition not met within ${timeout}ms`,
    'condition to be true',
    'condition remained false'
  );
}
