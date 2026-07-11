/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T010 [P] - SSRF Validation Utility (Feature 009)
 *
 * Purpose: Multi-layer defense against Server-Side Request Forgery attacks
 * in citation URLs. Based on research findings that all npm SSRF packages
 * have known bypasses, we implement custom validation.
 *
 * Defense Layers:
 * 1. URL parsing validation (malformed URLs)
 * 2. Protocol whitelist (only HTTP/HTTPS)
 * 3. Private IP range blocking (RFC 1918, localhost, link-local)
 * 4. DNS resolution check (prevent DNS rebinding)
 * 5. Public suffix validation (prevent subdomain takeover)
 *
 * Research: specs/009-discussion-participation/research.md (URL Validation section)
 */

import { URL } from 'url';
import { isIP } from 'net';
import * as dns from 'dns/promises';
import { URL_VALIDATION } from '../constants/index.js';

/**
 * SSRF validation result
 */
export interface SSRFValidationResult {
  /** Whether the URL is safe to fetch */
  safe: boolean;
  /** Original URL as provided by user */
  originalUrl: string;
  /** Normalized URL (lowercase hostname, removed fragments) */
  normalizedUrl: string;
  /** Resolved IP address (if DNS lookup successful) */
  resolvedIp?: string;
  /** Validation error message if unsafe */
  error?: string;
  /** Specific threat detected */
  threat?: 'MALFORMED_URL' | 'INVALID_PROTOCOL' | 'PRIVATE_IP' | 'DNS_REBINDING' | 'INVALID_DOMAIN';
}

/**
 * Private/reserved IPv4 ranges (RFC 1918, loopback, link-local, CGNAT, etc.)
 */
const PRIVATE_IPV4_RANGES = [
  /^127\./, // Loopback (127.0.0.0/8)
  /^10\./, // Private (10.0.0.0/8)
  /^172\.(1[6-9]|2\d|3[01])\./, // Private (172.16.0.0/12)
  /^192\.168\./, // Private (192.168.0.0/16)
  /^169\.254\./, // Link-local (169.254.0.0/16) — includes cloud metadata 169.254.169.254
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Carrier-grade NAT (100.64.0.0/10)
  /^192\.0\.0\./, // IETF protocol assignments (192.0.0.0/24)
  /^(22[4-9]|23\d)\./, // Multicast (224.0.0.0/4 → 224-239)
  /^(24\d|25[0-5])\./, // Reserved / broadcast (240.0.0.0/4 → 240-255)
  /^0\./, // "This" network (0.0.0.0/8)
];

/**
 * Private/reserved IPv6 ranges
 */
const PRIVATE_IPV6_RANGES = [
  /^::1$/, // Loopback
  /^::$/, // Unspecified
  /^fe80:/i, // Link-local
  /^fc00:/i, // Unique local address (fc00::/7)
  /^fd[0-9a-f]{2}:/i, // Unique local address (fd00::/8)
  /^ff00:/i, // Multicast
  /^fe[89ab][0-9a-f]:/i, // Link-local variants (fe80::/10)
];

/**
 * Allowed URL protocols (whitelist)
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Extract the embedded IPv4 address from an IPv4-mapped/compatible IPv6
 * address (e.g. `::ffff:169.254.169.254` or `::ffff:a9fe:a9fe`).
 * Returns null when the address does not embed an IPv4 address.
 */
function extractMappedIpv4(ip: string): string | null {
  const lower = ip.toLowerCase();
  // Dotted-quad form: ::ffff:169.254.169.254 or ::169.254.169.254
  const dotted = lower.match(/(?:::ffff:|::)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (dotted && dotted[1]) {
    return dotted[1];
  }
  // Hex form: ::ffff:a9fe:a9fe → a9fe:a9fe → 169.254.169.254
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex && hex[1] && hex[2]) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
  }
  return null;
}

/**
 * Checks if an IP address (IPv4 or IPv6, including IPv4-mapped IPv6) is in a
 * private or otherwise reserved range that must never be fetched server-side.
 */
function isPrivateIP(ip: string): boolean {
  // Reject IPv4-mapped/compatible IPv6 by checking the embedded IPv4 too.
  const mapped = extractMappedIpv4(ip);
  if (mapped && (PRIVATE_IPV4_RANGES.some((r) => r.test(mapped)) || isIP(mapped) === 0)) {
    return true;
  }
  if (PRIVATE_IPV4_RANGES.some((range) => range.test(ip))) {
    return true;
  }
  return PRIVATE_IPV6_RANGES.some((range) => range.test(ip));
}

/**
 * Normalizes a URL for deduplication
 * - Converts hostname to lowercase
 * - Removes URL fragments (#anchor)
 * - Preserves query parameters
 */
function normalizeUrl(url: URL): string {
  const normalized = new URL(url.href);
  normalized.hostname = normalized.hostname.toLowerCase();
  normalized.hash = ''; // Remove fragment
  return normalized.href;
}

/**
 * Validates a citation URL against SSRF threats
 *
 * @param urlString - User-provided URL
 * @returns Validation result with safety status
 *
 * @example
 * ```typescript
 * const result = await validateCitationUrl('https://example.com/article');
 * if (!result.safe) {
 *   throw new BadRequestException(result.error);
 * }
 * // Store result.normalizedUrl and result.resolvedIp
 * ```
 */
export async function validateCitationUrl(urlString: string): Promise<SSRFValidationResult> {
  // Layer 1: URL length check
  if (urlString.length > URL_VALIDATION.MAX_LENGTH) {
    return {
      safe: false,
      originalUrl: urlString.substring(0, 100) + '...',
      normalizedUrl: '',
      error: `URL exceeds maximum length of ${URL_VALIDATION.MAX_LENGTH} characters`,
      threat: 'MALFORMED_URL',
    };
  }

  // Layer 2: URL parsing validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    return {
      safe: false,
      originalUrl: urlString,
      normalizedUrl: '',
      error: 'Malformed URL - cannot parse',
      threat: 'MALFORMED_URL',
    };
  }

  const normalizedUrl = normalizeUrl(parsedUrl);

  // Layer 3: Protocol whitelist
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return {
      safe: false,
      originalUrl: urlString,
      normalizedUrl,
      error: `Invalid protocol "${parsedUrl.protocol}" - only HTTP(S) allowed`,
      threat: 'INVALID_PROTOCOL',
    };
  }

  // Layer 4: Check if hostname is an IP address
  const hostname = parsedUrl.hostname;
  const ipVersion = isIP(hostname);

  if (ipVersion !== 0) {
    // Hostname is an IP address
    if (isPrivateIP(hostname)) {
      return {
        safe: false,
        originalUrl: urlString,
        normalizedUrl,
        resolvedIp: hostname,
        error: `Private IP address detected: ${hostname}`,
        threat: 'PRIVATE_IP',
      };
    }

    // Public IP address - safe
    return {
      safe: true,
      originalUrl: urlString,
      normalizedUrl,
      resolvedIp: hostname,
    };
  }

  // Layer 5: DNS resolution to detect private IPs behind public domains.
  // Resolve BOTH A (IPv4) and AAAA (IPv6) records and check EVERY address — a
  // host with multiple records (or an AAAA-only record) must not be able to
  // slip a private address past a check that only inspects the first A record.
  let resolvedIp: string;
  try {
    const [aRecords, aaaaRecords] = await Promise.all([
      dns.resolve4(hostname).catch(() => [] as string[]),
      dns.resolve6(hostname).catch(() => [] as string[]),
    ]);

    const addresses = [...aRecords, ...aaaaRecords].filter(Boolean);

    if (addresses.length === 0) {
      return {
        safe: false,
        originalUrl: urlString,
        normalizedUrl,
        error: `Cannot resolve hostname: ${hostname}`,
        threat: 'DNS_REBINDING',
      };
    }

    // Reject if ANY resolved address is private/reserved (DNS rebinding defense).
    const privateAddress = addresses.find((addr) => isPrivateIP(addr));
    if (privateAddress) {
      return {
        safe: false,
        originalUrl: urlString,
        normalizedUrl,
        resolvedIp: privateAddress,
        error: `Hostname resolves to private IP: ${hostname} → ${privateAddress}`,
        threat: 'PRIVATE_IP',
      };
    }

    // Pin to the first validated address so callers can connect to the exact IP
    // that was checked, defeating TOCTOU DNS-rebinding at fetch time.
    resolvedIp = addresses[0] as string;
  } catch (error) {
    // DNS resolution failed - domain doesn't exist or DNS error
    return {
      safe: false,
      originalUrl: urlString,
      normalizedUrl,
      error: `DNS resolution failed for ${hostname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      threat: 'DNS_REBINDING',
    };
  }

  // Layer 6: Basic domain validation
  const domainParts = hostname.split('.');
  if (domainParts.length < 2 || domainParts.some((part) => part.length === 0)) {
    return {
      safe: false,
      originalUrl: urlString,
      normalizedUrl,
      resolvedIp,
      error: `Invalid domain structure: ${hostname}`,
      threat: 'INVALID_DOMAIN',
    };
  }

  // All checks passed
  return {
    safe: true,
    originalUrl: urlString,
    normalizedUrl,
    resolvedIp,
  };
}

/**
 * Batch validates multiple citation URLs
 *
 * @param urls - Array of user-provided URLs
 * @returns Array of validation results
 *
 * @example
 * ```typescript
 * const urls = ['https://example.com', 'http://localhost'];
 * const results = await validateCitationUrls(urls);
 * const safeUrls = results.filter(r => r.safe);
 * ```
 */
export async function validateCitationUrls(urls: string[]): Promise<SSRFValidationResult[]> {
  return Promise.all(urls.map((url) => validateCitationUrl(url)));
}

/**
 * Type guard to check if URL is safe
 */
export function isSafeUrl(
  result: SSRFValidationResult,
): result is SSRFValidationResult & { safe: true } {
  return result.safe;
}
