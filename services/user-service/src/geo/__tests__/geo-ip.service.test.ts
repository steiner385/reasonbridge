/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { GeoIpService, GeoIpResult } from '../geo-ip.service.js';

describe('GeoIpService', () => {
  let service: GeoIpService;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new GeoIpService();
    // Spy on NestJS Logger.prototype.warn to capture log calls
    loggerWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lookupIp', () => {
    it('should return US for IPs starting with 1.', async () => {
      const result = await service.lookupIp('1.2.3.4');
      expect(result).toBe('US');
    });

    it('should return US for IPs starting with 2.', async () => {
      const result = await service.lookupIp('2.100.50.25');
      expect(result).toBe('US');
    });

    it('should return GB for IPs starting with 3.', async () => {
      const result = await service.lookupIp('3.0.0.1');
      expect(result).toBe('GB');
    });

    it('should return GB for IPs starting with 4.', async () => {
      const result = await service.lookupIp('4.255.255.255');
      expect(result).toBe('GB');
    });

    it('should return DE for IPs starting with 5.', async () => {
      const result = await service.lookupIp('5.10.20.30');
      expect(result).toBe('DE');
    });

    it('should return null for other IP ranges', async () => {
      const result = await service.lookupIp('192.168.1.1');
      expect(result).toBeNull();
    });

    it('should return null for invalid IP format', async () => {
      const result = await service.lookupIp('invalid-ip');
      expect(result).toBeNull();
    });

    it('should return null for empty string', async () => {
      const result = await service.lookupIp('');
      expect(result).toBeNull();
    });
  });

  describe('getCountry', () => {
    describe('when GeoIP lookup succeeds', () => {
      it('should return country from GeoIP with high confidence', async () => {
        const result = await service.getCountry('1.2.3.4');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'US',
          source: 'geoip',
          confidence: 'high',
        });
      });

      it('should return GB from GeoIP for British IPs', async () => {
        const result = await service.getCountry('3.0.0.1');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'GB',
          source: 'geoip',
          confidence: 'high',
        });
      });

      it('should return DE from GeoIP for German IPs', async () => {
        const result = await service.getCountry('5.10.20.30');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'DE',
          source: 'geoip',
          confidence: 'high',
        });
      });

      it('should ignore userDeclaredCountry when GeoIP succeeds', async () => {
        const result = await service.getCountry('1.2.3.4', 'FR');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'US',
          source: 'geoip',
          confidence: 'high',
        });
      });
    });

    describe('when GeoIP returns null', () => {
      it('should fallback to user declared country with medium confidence', async () => {
        const result = await service.getCountry('192.168.1.1', 'CA');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'CA',
          source: 'user_declared',
          confidence: 'medium',
        });
      });

      it('should log a warning when falling back to user declared', async () => {
        await service.getCountry('192.168.1.1', 'CA');

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('GeoIP lookup failed for IP'),
        );
      });
    });

    describe('when GeoIP throws an error', () => {
      it('should fallback to user declared country with medium confidence', async () => {
        // Mock lookupIp to throw an error
        vi.spyOn(service, 'lookupIp').mockRejectedValueOnce(new Error('GeoIP service unavailable'));

        const result = await service.getCountry('1.2.3.4', 'AU');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'AU',
          source: 'user_declared',
          confidence: 'medium',
        });
      });

      it('should log a warning when GeoIP throws', async () => {
        vi.spyOn(service, 'lookupIp').mockRejectedValueOnce(new Error('Service down'));

        await service.getCountry('1.2.3.4', 'AU');

        expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('GeoIP lookup error'));
      });
    });

    describe('when no country can be determined', () => {
      it('should use US as default with low confidence when no GeoIP and no declared country', async () => {
        const result = await service.getCountry('192.168.1.1');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'US',
          source: 'default',
          confidence: 'low',
        });
      });

      it('should use US default when GeoIP throws and no declared country', async () => {
        vi.spyOn(service, 'lookupIp').mockRejectedValueOnce(new Error('Service down'));

        const result = await service.getCountry('1.2.3.4');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'US',
          source: 'default',
          confidence: 'low',
        });
      });

      it('should log a warning when using default country', async () => {
        await service.getCountry('192.168.1.1');

        expect(loggerWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Using default country US'),
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty user declared country as undefined', async () => {
        const result = await service.getCountry('192.168.1.1', '');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'US',
          source: 'default',
          confidence: 'low',
        });
      });

      it('should normalize user declared country to uppercase', async () => {
        const result = await service.getCountry('192.168.1.1', 'ca');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'CA',
          source: 'user_declared',
          confidence: 'medium',
        });
      });

      it('should handle IPv6 addresses gracefully', async () => {
        const result = await service.getCountry('::1', 'GB');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'GB',
          source: 'user_declared',
          confidence: 'medium',
        });
      });

      it('should handle localhost IP', async () => {
        const result = await service.getCountry('127.0.0.1', 'DE');

        expect(result).toEqual<GeoIpResult>({
          countryCode: 'DE',
          source: 'user_declared',
          confidence: 'medium',
        });
      });
    });
  });
});
