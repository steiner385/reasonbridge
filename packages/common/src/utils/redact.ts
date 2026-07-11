/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PII redaction helpers for safe logging.
 *
 * @remarks
 * Log sinks (container stdout, CI console, future aggregation) accumulate
 * whatever we interpolate into log messages, so personally-identifiable
 * information must be masked before it reaches a logger. These helpers were
 * previously duplicated as a module-private `redactEmail` inside
 * user-service's auth.service; they now live here so every service shares one
 * implementation (issue #1302).
 */

/**
 * Redact an email address for safe logging.
 *
 * Shows the first two characters of the local part and the full domain, e.g.
 * `"user@example.com"` -> `"us***@example.com"`. Falsy or malformed input
 * collapses to `"***@***"` so the caller never accidentally logs a raw value.
 *
 * @param email - The email address to redact (may be undefined/null)
 * @returns A redacted, log-safe representation of the email
 */
export function redactEmail(email: string | null | undefined): string {
  if (!email) {
    return '***@***';
  }
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts[1];
  if (!local || !domain) {
    return '***@***';
  }
  const redactedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : '***';
  return `${redactedLocal}@${domain}`;
}

/**
 * Mask a phone number for safe logging, keeping only the last two digits.
 *
 * e.g. `"+14155550123"` -> `"***23"`. Falsy input collapses to `"***"`.
 *
 * @param phone - The phone number to mask (may be undefined/null)
 * @returns A masked, log-safe representation of the phone number
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '***';
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 2) {
    return '***';
  }
  return `***${digits.slice(-2)}`;
}

/**
 * Mask an IP address for safe logging.
 *
 * IPv4 keeps the first two octets (`"203.0.113.7"` -> `"203.0.*.*"`); anything
 * else (IPv6 or unexpected formats) is fully redacted to `"***"`.
 *
 * @param ip - The IP address to mask (may be undefined/null)
 * @returns A masked, log-safe representation of the IP address
 */
export function maskIp(ip: string | null | undefined): string {
  if (!ip) {
    return '***';
  }
  const octets = ip.split('.');
  if (octets.length === 4 && octets.every((o) => /^\d{1,3}$/.test(o))) {
    return `${octets[0]}.${octets[1]}.*.*`;
  }
  return '***';
}
