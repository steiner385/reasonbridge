/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { InternalApiKeyGuard } from './internal-api-key.guard.js';

describe('InternalApiKeyGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createMockExecutionContext = (authHeader?: string): ExecutionContext => {
    const mockRequest = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  };

  describe('when INTERNAL_API_KEY is configured', () => {
    beforeEach(() => {
      process.env['INTERNAL_API_KEY'] = 'test-primary-key-32chars-long!!';
    });

    it('should allow request with valid primary key', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey test-primary-key-32chars-long!!');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request with valid secondary key during rotation', async () => {
      process.env['INTERNAL_API_KEY_SECONDARY'] = 'test-secondary-key-32chars!!';
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey test-secondary-key-32chars!!');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject request with invalid key', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey wrong-key');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with missing Authorization header', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with malformed header (wrong scheme)', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('Bearer test-primary-key-32chars-long!!');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject request with malformed header (no key)', async () => {
      const guard = new InternalApiKeyGuard();
      const context = createMockExecutionContext('ApiKey ');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when INTERNAL_API_KEY is not configured', () => {
    describe('in test/development mode', () => {
      beforeEach(() => {
        process.env['NODE_ENV'] = 'test';
        delete process.env['INTERNAL_API_KEY'];
      });

      it('should allow request without authentication', async () => {
        const guard = new InternalApiKeyGuard();
        const context = createMockExecutionContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('in production mode', () => {
      beforeEach(() => {
        process.env['NODE_ENV'] = 'production';
        delete process.env['INTERNAL_API_KEY'];
      });

      it('should throw error during guard construction', () => {
        expect(() => new InternalApiKeyGuard()).toThrow(
          'INTERNAL_API_KEY is required in production',
        );
      });
    });
  });
});
