/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Result of a GeoIP country lookup
 */
export interface GeoIpResult {
  /** ISO 3166-1 alpha-2 country code, or null if not determinable */
  countryCode: string | null;
  /** Source of the country determination */
  source: 'geoip' | 'user_declared' | 'default';
  /** Confidence level in the result */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Service for determining user's country via GeoIP lookup with fallback mechanisms
 *
 * @remarks
 * This service provides country detection for regional compliance rules (COPPA, GDPR, AADC, OSA).
 * It implements a fallback chain:
 * 1. **Primary**: GeoIP lookup (high confidence)
 * 2. **Fallback 1**: User-declared country from profile (medium confidence)
 * 3. **Fallback 2**: Default to US (low confidence) - most restrictive COPPA applies
 *
 * The mock GeoIP implementation can be replaced with a real provider (MaxMind, IP2Location)
 * in production by extending this class or replacing the lookupIp method.
 *
 * @example
 * ```typescript
 * const geoService = new GeoIpService();
 *
 * // With GeoIP match
 * const result1 = await geoService.getCountry('1.2.3.4');
 * // { countryCode: 'US', source: 'geoip', confidence: 'high' }
 *
 * // With fallback to user-declared
 * const result2 = await geoService.getCountry('192.168.1.1', 'CA');
 * // { countryCode: 'CA', source: 'user_declared', confidence: 'medium' }
 *
 * // With default fallback
 * const result3 = await geoService.getCountry('192.168.1.1');
 * // { countryCode: 'US', source: 'default', confidence: 'low' }
 * ```
 */
@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);

  /** Default country code when all lookups fail (US = most restrictive COPPA) */
  private readonly DEFAULT_COUNTRY = 'US';

  /**
   * Get country code for an IP address with fallback
   *
   * @param ipAddress - The IP address to look up
   * @param userDeclaredCountry - Optional fallback country from user profile
   * @returns Country code and source/confidence info
   *
   * @remarks
   * Implements a cascading fallback strategy:
   * 1. Try GeoIP lookup
   * 2. If GeoIP fails/returns null, use userDeclaredCountry
   * 3. If no declared country, use US as default (most restrictive)
   */
  async getCountry(ipAddress: string, userDeclaredCountry?: string): Promise<GeoIpResult> {
    // Normalize user declared country (treat empty string as undefined)
    const declaredCountry = userDeclaredCountry?.trim()
      ? userDeclaredCountry.trim().toUpperCase()
      : undefined;

    // Step 1: Try GeoIP lookup
    try {
      const geoIpCountry = await this.lookupIp(ipAddress);

      if (geoIpCountry) {
        return {
          countryCode: geoIpCountry,
          source: 'geoip',
          confidence: 'high',
        };
      }

      // GeoIP returned null - fall through to user declared
      this.logger.warn(`GeoIP lookup failed for IP ${this.maskIp(ipAddress)}, falling back`);
    } catch (error) {
      // GeoIP service error - log and fall through
      this.logger.warn(
        `GeoIP lookup error for IP ${this.maskIp(ipAddress)}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Step 2: Use user declared country if available
    if (declaredCountry) {
      return {
        countryCode: declaredCountry,
        source: 'user_declared',
        confidence: 'medium',
      };
    }

    // Step 3: Default to US (most restrictive COPPA)
    this.logger.warn(
      `Using default country ${this.DEFAULT_COUNTRY} for IP ${this.maskIp(ipAddress)} - no GeoIP or user declaration`,
    );

    return {
      countryCode: this.DEFAULT_COUNTRY,
      source: 'default',
      confidence: 'low',
    };
  }

  /**
   * Lookup country from IP address
   *
   * @param ipAddress - The IP address to look up
   * @returns ISO 3166-1 alpha-2 country code, or null if lookup fails
   *
   * @remarks
   * This is a mock implementation for development/testing.
   * In production, replace with a real GeoIP provider (MaxMind, IP2Location, etc.)
   *
   * Mock rules:
   * - IPs starting with 1. or 2. → US
   * - IPs starting with 3. or 4. → GB
   * - IPs starting with 5. → DE
   * - All other ranges → null (unknown)
   */
  async lookupIp(ipAddress: string): Promise<string | null> {
    // Validate IP format (basic check)
    if (!ipAddress || !this.isValidIpFormat(ipAddress)) {
      return null;
    }

    // Mock GeoIP lookup based on first octet
    const firstOctet = this.getFirstOctet(ipAddress);

    if (firstOctet === null) {
      return null;
    }

    // Mock country mappings
    if (firstOctet === 1 || firstOctet === 2) {
      return 'US';
    }

    if (firstOctet === 3 || firstOctet === 4) {
      return 'GB';
    }

    if (firstOctet === 5) {
      return 'DE';
    }

    // Unknown range
    return null;
  }

  /**
   * Validate IP address format (basic check)
   *
   * @param ip - IP address string
   * @returns true if the format appears valid
   */
  private isValidIpFormat(ip: string): boolean {
    // IPv4: four octets separated by dots
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    // IPv6: simplified check (contains colons)
    const isIpv6 = ip.includes(':');

    return ipv4Regex.test(ip) || isIpv6;
  }

  /**
   * Extract first octet from IPv4 address
   *
   * @param ip - IPv4 address string
   * @returns First octet as number, or null if not extractable
   */
  private getFirstOctet(ip: string): number | null {
    const parts = ip.split('.');

    if (parts.length !== 4) {
      return null;
    }

    const firstOctet = parseInt(parts[0] ?? '', 10);

    if (isNaN(firstOctet) || firstOctet < 0 || firstOctet > 255) {
      return null;
    }

    return firstOctet;
  }

  /**
   * Mask IP address for logging (privacy)
   *
   * @param ip - IP address to mask
   * @returns Masked IP (e.g., "1.2.x.x")
   */
  private maskIp(ip: string): string {
    const parts = ip.split('.');

    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }

    // IPv6 or invalid - just return first few chars
    return ip.length > 8 ? `${ip.substring(0, 8)}...` : ip;
  }
}
