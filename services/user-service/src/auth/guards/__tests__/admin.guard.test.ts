/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for AdminGuard
 *
 * Tests the admin authorization guard that restricts access to admin-only endpoints.
 *
 * @see services/user-service/src/auth/guards/admin.guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from '../admin.guard.js';

/**
 * Helper to create a mock ExecutionContext
 */
const createMockContext = (user: any): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
};

/**
 * Create a mock ConfigService
 */
const createMockConfigService = (config: Record<string, string> = {}) => {
  return {
    get: vi.fn((key: string) => config[key]),
  } as unknown as ConfigService;
};

describe('AdminGuard', () => {
  describe('with ADMIN_USERS configured', () => {
    let guard: AdminGuard;
    let mockConfigService: ConfigService;

    beforeEach(() => {
      vi.clearAllMocks();
      mockConfigService = createMockConfigService({
        ADMIN_USERS: 'admin-123,admin-456,admin-789',
        DEMO_MODE: 'false',
      });
      guard = new AdminGuard(mockConfigService);
    });

    it('should allow access for admin user in ADMIN_USERS list', () => {
      const context = createMockContext({ sub: 'admin-123', email: 'admin@example.com' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access for another admin in ADMIN_USERS list', () => {
      const context = createMockContext({ sub: 'admin-456', email: 'admin2@example.com' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for non-admin user', () => {
      const context = createMockContext({ sub: 'regular-user-123', email: 'user@example.com' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('admin privileges required');
    });

    it('should throw ForbiddenException when no user in request', () => {
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('authentication required');
    });

    it('should throw ForbiddenException when user is null', () => {
      const context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('with DEMO_MODE enabled', () => {
    let guard: AdminGuard;
    let mockConfigService: ConfigService;

    beforeEach(() => {
      vi.clearAllMocks();
      mockConfigService = createMockConfigService({
        ADMIN_USERS: 'admin-123',
        DEMO_MODE: 'true',
      });
      guard = new AdminGuard(mockConfigService);
    });

    it('should allow access for demo-admin in demo mode', () => {
      const context = createMockContext({ sub: 'demo-admin', email: 'demo-admin@example.com' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should still allow access for regular admins in demo mode', () => {
      const context = createMockContext({ sub: 'admin-123', email: 'admin@example.com' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for non-admin users in demo mode', () => {
      const context = createMockContext({ sub: 'regular-user', email: 'user@example.com' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('without ADMIN_USERS configured', () => {
    let guard: AdminGuard;
    let mockConfigService: ConfigService;

    beforeEach(() => {
      vi.clearAllMocks();
      mockConfigService = createMockConfigService({
        DEMO_MODE: 'false',
      });
      guard = new AdminGuard(mockConfigService);
    });

    it('should deny access for all users when no admins configured', () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('isAdmin method', () => {
    let guard: AdminGuard;

    beforeEach(() => {
      vi.clearAllMocks();
      const mockConfigService = createMockConfigService({
        ADMIN_USERS: 'admin-1,admin-2',
        DEMO_MODE: 'true',
      });
      guard = new AdminGuard(mockConfigService);
    });

    it('should return true for configured admin', () => {
      expect(guard.isAdmin('admin-1')).toBe(true);
      expect(guard.isAdmin('admin-2')).toBe(true);
    });

    it('should return true for demo-admin in demo mode', () => {
      expect(guard.isAdmin('demo-admin')).toBe(true);
    });

    it('should return false for non-admin', () => {
      expect(guard.isAdmin('random-user')).toBe(false);
      expect(guard.isAdmin('')).toBe(false);
    });
  });

  describe('ADMIN_USERS parsing', () => {
    it('should handle whitespace in ADMIN_USERS list', () => {
      const mockConfigService = createMockConfigService({
        ADMIN_USERS: ' admin-1 , admin-2 , admin-3 ',
        DEMO_MODE: 'false',
      });
      const guard = new AdminGuard(mockConfigService);

      expect(guard.isAdmin('admin-1')).toBe(true);
      expect(guard.isAdmin('admin-2')).toBe(true);
      expect(guard.isAdmin('admin-3')).toBe(true);
    });

    it('should handle empty entries in ADMIN_USERS list', () => {
      const mockConfigService = createMockConfigService({
        ADMIN_USERS: 'admin-1,,admin-2,',
        DEMO_MODE: 'false',
      });
      const guard = new AdminGuard(mockConfigService);

      expect(guard.isAdmin('admin-1')).toBe(true);
      expect(guard.isAdmin('admin-2')).toBe(true);
      expect(guard.isAdmin('')).toBe(false);
    });
  });
});
