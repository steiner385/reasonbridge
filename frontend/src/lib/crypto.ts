/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

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
 * Implemented inline (RFC 1321) to eliminate the ~80KB crypto-js bundle
 * cost (#1389). SubtleCrypto does not support MD5, so an inline
 * implementation is the only zero-dependency option.
 *
 * @param input - Input string to hash
 * @returns Hexadecimal MD5 hash (lowercase, 32 characters)
 *
 * @example
 * ```typescript
 * const hash = getMD5Hash('user@example.com');
 * // Returns: 'b58996c504c5638798eb6b511e6f49af'
 * ```
 */
export function getMD5Hash(input: string): string {
  // Encode to UTF-8 bytes (handles multibyte characters correctly)
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;

  // Pad: append 0x80, then zeros, then 64-bit little-endian bit-length.
  // Final length must be a multiple of 64 bytes (512 bits).
  const padLen = bytes.length % 64 < 56 ? 56 - (bytes.length % 64) : 120 - (bytes.length % 64);
  const msg = new Uint8Array(bytes.length + padLen + 8);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  // Write bit-length as little-endian 64-bit int (low 32 bits sufficient for < 512 MB strings)
  let lo = bitLen >>> 0;
  let hi = Math.floor(bitLen / 0x100000000) >>> 0;
  const lenOff = bytes.length + padLen;
  for (let i = 0; i < 4; i++) {
    msg[lenOff + i] = lo & 0xff;
    lo >>>= 8;
  }
  for (let i = 0; i < 4; i++) {
    msg[lenOff + 4 + i] = hi & 0xff;
    hi >>>= 8;
  }

  // Precomputed per-round sine-derived constants and shift amounts (RFC 1321 §3.4)
  const T = Array.from({ length: 64 }, (_, i) => (Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const rot = (x: number, n: number) => (x << n) | (x >>> (32 - n));

  // Initial hash state (RFC 1321 §3.3)
  let A = 0x67452301,
    B = 0xefcdab89,
    C = 0x98badcfe,
    D = 0x10325476;

  // Process each 512-bit (64-byte) block
  const view = new DataView(msg.buffer);
  for (let off = 0; off < msg.length; off += 64) {
    const M = Array.from({ length: 16 }, (_, i) => view.getUint32(off + i * 4, true));
    let a = A,
      b = B,
      c = C,
      d = D;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      b = (b + rot((a + f + T[i]! + M[g]!) >>> 0, s[i]!)) >>> 0;
      a = tmp;
    }
    A = (A + a) >>> 0;
    B = (B + b) >>> 0;
    C = (C + c) >>> 0;
    D = (D + d) >>> 0;
  }

  // Emit as little-endian hex (4 words × 4 bytes = 32 hex chars)
  return [A, B, C, D]
    .map((n) =>
      Array.from({ length: 4 }, (_, i) =>
        ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0'),
      ).join(''),
    )
    .join('');
}
