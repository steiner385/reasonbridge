/**
 * JWT Utilities
 *
 * Lightweight JWT parsing utilities without external dependencies
 */

export interface JWTPayload {
  exp: number; // Expiration time (Unix timestamp in seconds)
  iat?: number; // Issued at time
  sub?: string; // Subject (user ID)
  [key: string]: unknown;
}

/**
 * Decode JWT token payload without verification
 * WARNING: This only decodes the payload, it does NOT verify the signature
 * Use only for client-side UX (reading expiration time), never for security
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Base64URL decode: replace URL-safe chars and add padding if needed
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    // Decode and parse JSON
    const decoded = atob(padded);
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * Returns true if token is expired or invalid
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload?.exp) {
    return true;
  }

  const now = Date.now() / 1000; // Convert to seconds
  return payload.exp < now;
}

/**
 * Get time until JWT expiration in seconds
 * Returns 0 if token is expired or invalid
 */
export function getJWTTimeUntilExpiry(token: string): number {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const now = Date.now() / 1000; // Convert to seconds
  const timeLeft = payload.exp - now;
  return Math.max(0, timeLeft);
}
