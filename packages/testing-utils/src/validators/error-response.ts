/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Error Response Schema Validator
 *
 * T311: Create error response schema validator
 *
 * Validates API error responses to ensure they conform to the
 * standard error response schema. Reusable across integration tests.
 */

import { AssertionError } from '../assertions/index.js';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  /** Error code (e.g., AUTH_001, VALIDATION_002) */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Timestamp of the error */
  timestamp?: string;
  /** Request path that caused the error */
  path?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the response is valid */
  valid: boolean;
  /** Validation errors if invalid */
  errors: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Require correlationId to be present */
  requireCorrelationId?: boolean;
  /** Require timestamp to be present */
  requireTimestamp?: boolean;
  /** Require path to be present */
  requirePath?: boolean;
  /** Expected HTTP status code */
  expectedStatus?: number;
  /** Expected error code */
  expectedCode?: string;
  /** Expected error code prefix (e.g., 'AUTH_', 'VALIDATION_') */
  expectedCodePrefix?: string;
  /** Pattern for correlation ID validation */
  correlationIdPattern?: RegExp;
}

/**
 * Default correlation ID pattern (UUID format)
 */
export const DEFAULT_CORRELATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Error code pattern (CATEGORY_NNN)
 * Supports multi-word categories with underscores (e.g., RATE_LIMIT_005)
 */
export const ERROR_CODE_PATTERN = /^[A-Z]+(?:_[A-Z]+)*_\d{3}$/;

/**
 * ISO 8601 timestamp pattern
 */
export const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

/**
 * Validate an error response against the schema
 *
 * @param response - The response body to validate
 * @param options - Validation options
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateErrorResponse(response.body, {
 *   requireCorrelationId: true,
 *   expectedCodePrefix: 'AUTH_',
 * });
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateErrorResponse(
  response: unknown,
  options: ValidationOptions = {},
): ValidationResult {
  const errors: string[] = [];

  // Check if response is an object
  if (!response || typeof response !== 'object') {
    return {
      valid: false,
      errors: ['Response must be a non-null object'],
    };
  }

  const errorResponse = response as Record<string, unknown>;

  // Validate required 'code' field
  if (!('code' in errorResponse)) {
    errors.push("Missing required field: 'code'");
  } else if (typeof errorResponse['code'] !== 'string') {
    errors.push("Field 'code' must be a string");
  } else if (!ERROR_CODE_PATTERN.test(errorResponse['code'])) {
    errors.push(`Field 'code' must match pattern CATEGORY_NNN, got: ${errorResponse['code']}`);
  } else {
    // Check expected code
    if (options.expectedCode && errorResponse['code'] !== options.expectedCode) {
      errors.push(`Expected error code '${options.expectedCode}', got: ${errorResponse['code']}`);
    }

    // Check expected code prefix
    if (
      options.expectedCodePrefix &&
      !String(errorResponse['code']).startsWith(options.expectedCodePrefix)
    ) {
      errors.push(
        `Expected error code prefix '${options.expectedCodePrefix}', got: ${errorResponse['code']}`,
      );
    }
  }

  // Validate required 'message' field
  if (!('message' in errorResponse)) {
    errors.push("Missing required field: 'message'");
  } else if (typeof errorResponse['message'] !== 'string') {
    errors.push("Field 'message' must be a string");
  } else if (errorResponse['message'].length === 0) {
    errors.push("Field 'message' must not be empty");
  }

  // Validate optional 'correlationId' field
  if (options.requireCorrelationId && !('correlationId' in errorResponse)) {
    errors.push("Missing required field: 'correlationId'");
  }

  if ('correlationId' in errorResponse && errorResponse['correlationId'] !== undefined) {
    if (typeof errorResponse['correlationId'] !== 'string') {
      errors.push("Field 'correlationId' must be a string");
    } else {
      const pattern = options.correlationIdPattern ?? DEFAULT_CORRELATION_ID_PATTERN;
      if (!pattern.test(errorResponse['correlationId'])) {
        errors.push(
          `Field 'correlationId' must match pattern ${pattern}, got: ${errorResponse['correlationId']}`,
        );
      }
    }
  }

  // Validate optional 'timestamp' field
  if (options.requireTimestamp && !('timestamp' in errorResponse)) {
    errors.push("Missing required field: 'timestamp'");
  }

  if ('timestamp' in errorResponse && errorResponse['timestamp'] !== undefined) {
    if (typeof errorResponse['timestamp'] !== 'string') {
      errors.push("Field 'timestamp' must be a string");
    } else if (!ISO_TIMESTAMP_PATTERN.test(errorResponse['timestamp'])) {
      errors.push(`Field 'timestamp' must be ISO 8601 format, got: ${errorResponse['timestamp']}`);
    }
  }

  // Validate optional 'path' field
  if (options.requirePath && !('path' in errorResponse)) {
    errors.push("Missing required field: 'path'");
  }

  if ('path' in errorResponse && errorResponse['path'] !== undefined) {
    if (typeof errorResponse['path'] !== 'string') {
      errors.push("Field 'path' must be a string");
    } else if (!errorResponse['path'].startsWith('/')) {
      errors.push(`Field 'path' must start with '/', got: ${errorResponse['path']}`);
    }
  }

  // Validate optional 'details' field
  if ('details' in errorResponse && errorResponse['details'] !== undefined) {
    if (
      typeof errorResponse['details'] !== 'object' ||
      errorResponse['details'] === null ||
      Array.isArray(errorResponse['details'])
    ) {
      errors.push("Field 'details' must be a non-null object");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Assert that an error response is valid
 *
 * @param response - The response body to validate
 * @param options - Validation options
 * @throws AssertionError if validation fails
 *
 * @example
 * ```typescript
 * // In an integration test
 * const response = await api.post('/login').send({ email: 'bad' });
 * assertErrorResponse(response.body, {
 *   expectedCodePrefix: 'VALIDATION_',
 *   requireCorrelationId: true,
 * });
 * ```
 */
export function assertErrorResponse(
  response: unknown,
  options: ValidationOptions = {},
): asserts response is ErrorResponse {
  const result = validateErrorResponse(response, options);

  if (!result.valid) {
    throw new AssertionError(
      `Invalid error response:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
      'valid error response',
      response,
    );
  }
}

/**
 * Assert that a response has a specific error code
 *
 * @param response - The response body to check
 * @param expectedCode - The expected error code
 * @throws AssertionError if the code doesn't match
 */
export function assertErrorCode(response: unknown, expectedCode: string): void {
  assertErrorResponse(response, { expectedCode });
}

/**
 * Assert that a response has an error code starting with a prefix
 *
 * @param response - The response body to check
 * @param prefix - The expected error code prefix
 * @throws AssertionError if the prefix doesn't match
 */
export function assertErrorCodePrefix(response: unknown, prefix: string): void {
  assertErrorResponse(response, { expectedCodePrefix: prefix });
}

/**
 * Assert that a response has a correlation ID
 *
 * @param response - The response body to check
 * @throws AssertionError if correlationId is missing
 */
export function assertHasCorrelationId(response: unknown): void {
  assertErrorResponse(response, { requireCorrelationId: true });
}

/**
 * Extract error code from a response
 *
 * @param response - The response body
 * @returns The error code or undefined if not found
 */
export function extractErrorCode(response: unknown): string | undefined {
  if (response && typeof response === 'object' && 'code' in response) {
    const code = (response as { code: unknown })['code'];
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Extract error message from a response
 *
 * @param response - The response body
 * @returns The error message or undefined if not found
 */
export function extractErrorMessage(response: unknown): string | undefined {
  if (response && typeof response === 'object' && 'message' in response) {
    const message = (response as { message: unknown })['message'];
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

/**
 * Extract correlation ID from a response
 *
 * @param response - The response body
 * @returns The correlation ID or undefined if not found
 */
export function extractCorrelationId(response: unknown): string | undefined {
  if (response && typeof response === 'object' && 'correlationId' in response) {
    const correlationId = (response as { correlationId: unknown })['correlationId'];
    return typeof correlationId === 'string' ? correlationId : undefined;
  }
  return undefined;
}

/**
 * Check if a response is an error response
 *
 * @param response - The response body to check
 * @returns true if the response has the structure of an error response
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  const result = validateErrorResponse(response);
  return result.valid;
}

/**
 * Create a mock error response for testing
 *
 * @param overrides - Fields to override in the mock
 * @returns A valid error response object
 */
export function createMockErrorResponse(overrides: Partial<ErrorResponse> = {}): ErrorResponse {
  return {
    code: 'VALIDATION_001',
    message: 'Request validation failed.',
    correlationId: '12345678-1234-1234-1234-123456789abc',
    timestamp: new Date().toISOString(),
    path: '/api/test',
    ...overrides,
  };
}
