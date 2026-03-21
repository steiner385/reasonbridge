/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import CryptoJS from 'crypto-js';

/**
 * Generate MD5 hash of input string
 *
 * Used for Gravatar URL generation per Gravatar specification.
 * Gravatar requires MD5 hashes of lowercase, trimmed email addresses.
 *
 * NOTE: This is NOT for cryptographic security purposes.
 * MD5 is broken for security but remains suitable for:
 * - Gravatar URL generation (consistent, non-security-critical)
 * - Checksums for data integrity verification
 * - Cache busting
 *
 * For cryptographic operations, use proper crypto primitives.
 *
 * @param input - Input string to hash
 * @returns Hexadecimal MD5 hash (lowercase, 32 characters)
 *
 * @example
 * ```typescript
 * const hash = getMD5Hash('user@example.com');
 * // Returns: 'bc59ffe3f1718f01b95143b56221bd51'
 * ```
 */
export function getMD5Hash(input: string): string {
  return CryptoJS.MD5(input).toString();
}
