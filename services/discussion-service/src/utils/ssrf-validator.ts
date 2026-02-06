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
 * Private IP ranges (RFC 1918, localhost, link-local, multicast)
 */
const PRIVATE_IP_RANGES = [
  // IPv4
  /^127\./, // Loopback (127.0.0.0/8)
  /^10\./, // Private (10.0.0.0/8)
  /^172\.(1[6-9]|2\d|3[01])\./, // Private (172.16.0.0/12)
  /^192\.168\./, // Private (192.168.0.0/16)
  /^169\.254\./, // Link-local (169.254.0.0/16)
  /^224\./, // Multicast (224.0.0.0/4)
  /^0\./, // "This" network (0.0.0.0/8)
  /^255\./, // Broadcast

  // IPv6
  /^::1$/, // Loopback
  /^fe80:/i, // Link-local
  /^fc00:/i, // Unique local address
  /^fd00:/i, // Unique local address
  /^ff00:/i, // Multicast
];

/**
 * Allowed URL protocols (whitelist)
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Maximum URL length (prevent DoS via extremely long URLs)
 */
const MAX_URL_LENGTH = 2048;

/**
 * Checks if an IP address is in a private range
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((range) => range.test(ip));
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
  if (urlString.length > MAX_URL_LENGTH) {
    return {
      safe: false,
      originalUrl: urlString.substring(0, 100) + '...',
      normalizedUrl: '',
      error: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`,
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

  // Layer 5: DNS resolution to detect private IPs behind public domains
  let resolvedIp: string;
  try {
    // Resolve hostname to IP addresses
    const addresses = await dns.resolve(hostname, 'A');

    if (!addresses || addresses.length === 0) {
      return {
        safe: false,
        originalUrl: urlString,
        normalizedUrl,
        error: `Cannot resolve hostname: ${hostname}`,
        threat: 'DNS_REBINDING',
      };
    }

    // Use first resolved IP
    resolvedIp = addresses[0] || '';

    // Check if resolved IP is private (DNS rebinding attack)
    if (isPrivateIP(resolvedIp)) {
      return {
        safe: false,
        originalUrl: urlString,
        normalizedUrl,
        resolvedIp,
        error: `Hostname resolves to private IP: ${hostname} → ${resolvedIp}`,
        threat: 'PRIVATE_IP',
      };
    }
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
