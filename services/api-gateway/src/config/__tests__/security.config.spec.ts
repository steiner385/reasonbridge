import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAllowedOrigins,
  getCorsConfig,
  getHelmetConfig,
  rateLimitTiers,
} from '../security.config.js';

describe('Security Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAllowedOrigins', () => {
    it('should return true in test environment', async () => {
      process.env['NODE_ENV'] = 'test';
      // Re-import to pick up new env
      const { getAllowedOrigins: getOrigins } = await import('../security.config.js');
      expect(getOrigins()).toBe(true);
    });

    it('should return localhost origins in development', async () => {
      process.env['NODE_ENV'] = 'development';
      const { getAllowedOrigins: getOrigins } = await import('../security.config.js');
      const origins = getOrigins();
      expect(Array.isArray(origins)).toBe(true);
      if (Array.isArray(origins)) {
        expect(origins).toContain('http://localhost:5173');
        expect(origins).toContain('http://localhost:3000');
      }
    });

    it('should return production origins in production', async () => {
      process.env['NODE_ENV'] = 'production';
      const { getAllowedOrigins: getOrigins } = await import('../security.config.js');
      const origins = getOrigins();
      expect(Array.isArray(origins)).toBe(true);
      if (Array.isArray(origins)) {
        expect(origins).toContain('https://reasonbridge.org');
      }
    });

    it('should use ALLOWED_ORIGINS env var in production when set', async () => {
      process.env['NODE_ENV'] = 'production';
      process.env['ALLOWED_ORIGINS'] = 'https://custom.com, https://another.com';
      const { getAllowedOrigins: getOrigins } = await import('../security.config.js');
      const origins = getOrigins();
      expect(Array.isArray(origins)).toBe(true);
      if (Array.isArray(origins)) {
        expect(origins).toContain('https://custom.com');
        expect(origins).toContain('https://another.com');
      }
    });
  });

  describe('getCorsConfig', () => {
    it('should include required CORS methods', () => {
      const config = getCorsConfig();
      expect(config.methods).toContain('GET');
      expect(config.methods).toContain('POST');
      expect(config.methods).toContain('PUT');
      expect(config.methods).toContain('DELETE');
      expect(config.methods).toContain('OPTIONS');
    });

    it('should allow credentials', () => {
      const config = getCorsConfig();
      expect(config.credentials).toBe(true);
    });

    it('should include security headers in allowed headers', () => {
      const config = getCorsConfig();
      expect(config.allowedHeaders).toContain('Authorization');
      expect(config.allowedHeaders).toContain('X-Correlation-ID');
    });

    it('should expose rate limit headers', () => {
      const config = getCorsConfig();
      expect(config.exposedHeaders).toContain('X-RateLimit-Limit');
      expect(config.exposedHeaders).toContain('X-RateLimit-Remaining');
    });
  });

  describe('getHelmetConfig', () => {
    it('should enable noSniff header', () => {
      const config = getHelmetConfig();
      expect(config.noSniff).toBe(true);
    });

    it('should enable frameguard with deny', () => {
      const config = getHelmetConfig();
      expect(config.frameguard).toEqual({ action: 'deny' });
    });

    it('should hide powered-by header', () => {
      const config = getHelmetConfig();
      expect(config.hidePoweredBy).toBe(true);
    });

    it('should set referrer policy', () => {
      const config = getHelmetConfig();
      expect(config.referrerPolicy).toEqual({ policy: 'strict-origin-when-cross-origin' });
    });

    it('should disable CSP in non-production', async () => {
      process.env['NODE_ENV'] = 'development';
      const { getHelmetConfig: getConfig } = await import('../security.config.js');
      const config = getConfig();
      expect(config.contentSecurityPolicy).toBe(false);
    });

    it('should enable HSTS in production', async () => {
      process.env['NODE_ENV'] = 'production';
      const { getHelmetConfig: getConfig } = await import('../security.config.js');
      const config = getConfig();
      expect(config.hsts).toBeTruthy();
      if (config.hsts && typeof config.hsts === 'object') {
        expect(config.hsts.maxAge).toBe(31536000);
        expect(config.hsts.includeSubDomains).toBe(true);
      }
    });
  });

  describe('rateLimitTiers', () => {
    it('should have default tier', () => {
      expect(rateLimitTiers.default).toBeDefined();
      expect(rateLimitTiers.default.limit).toBe(100);
      expect(rateLimitTiers.default.ttl).toBe(60000);
    });

    it('should have strict tier with lower limit', () => {
      expect(rateLimitTiers.strict).toBeDefined();
      expect(rateLimitTiers.strict.limit).toBe(10);
    });

    it('should have auth tier for brute force protection', () => {
      expect(rateLimitTiers.auth).toBeDefined();
      expect(rateLimitTiers.auth.limit).toBe(5);
    });

    it('should have api tier for authenticated users', () => {
      expect(rateLimitTiers.api).toBeDefined();
      expect(rateLimitTiers.api.limit).toBe(1000);
    });
  });
});
