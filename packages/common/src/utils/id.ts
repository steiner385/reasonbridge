/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ID generation utilities
 */

/**
 * Generate a random ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const id = `${timestamp}${random}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Check if a string is a valid ID format
 */
export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 64;
}
