/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Regular expression for validating UUID v4 format.
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4 format.
 *
 * @param id - The string to validate
 * @returns true if the string is a valid UUID format, false otherwise
 *
 * @example
 * ```typescript
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUUID('not-a-uuid'); // false
 * isValidUUID(''); // false
 * ```
 */
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}
