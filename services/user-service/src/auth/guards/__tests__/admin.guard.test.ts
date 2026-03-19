/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for AdminGuard
 *
 * Tests the admin authorization guard that restricts access to admin-only endpoints.
 * AdminGuard now supports both database role checking and legacy environment variable approach.
 *
 * @see services/user-service/src/auth/guards/admin.guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
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

/**
 * Create a mock PrismaService
 */
const createMockPrismaService = () => ({
  user: {
    findUnique: vi.fn(),
  },
});

describe('AdminGuard', () => {
  describe('with database role checking', () => {
    let guard: AdminGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;

    beforeEach(() => {
      vi.clearAllMocks();
      const mockConfigService = createMockConfigService({
        ADMIN_USERS: '',
        DEMO_MODE: 'false',
      });
      mockPrisma = createMockPrismaService();
      guard = new AdminGuard(mockConfigService, mockPrisma as any);
    });

    it('should allow access for user with ADMIN role in database', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'admin@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.ADMIN,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { cognitoSub: 'user-123' },
        select: { id: true, role: true },
      });
    });

    it('should deny access for user with MODERATOR role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'mod@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.MODERATOR,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('admin privileges required');
    });

    it('should deny access for user with USER role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.USER,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('admin privileges required');
    });

    it('should throw ForbiddenException when user not found in database', async () => {
      const context = createMockContext({ sub: 'nonexistent-user', email: 'unknown@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('user not found');
    });

    it('should throw ForbiddenException when no user in request', async () => {
      const context = createMockContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('authentication required');
    });

    it('should attach userId and userRole to request on success', async () => {
      const request = { user: { sub: 'user-123', email: 'admin@example.com' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.ADMIN,
      });

      await guard.canActivate(context);

      expect(request).toHaveProperty('userId', 'db-user-id');
      expect(request).toHaveProperty('userRole', UserRole.ADMIN);
    });
  });

  describe('with legacy ADMIN_USERS configured', () => {
    let guard: AdminGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;

    beforeEach(() => {
      vi.clearAllMocks();
      const mockConfigService = createMockConfigService({
        ADMIN_USERS: 'legacy-admin-123,legacy-admin-456',
        DEMO_MODE: 'false',
      });
      mockPrisma = createMockPrismaService();
      guard = new AdminGuard(mockConfigService, mockPrisma as any);
    });

    it('should allow access for user in legacy ADMIN_USERS list without DB lookup', async () => {
      const context = createMockContext({ sub: 'legacy-admin-123', email: 'admin@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should not query database for legacy admins
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fall back to database check for non-legacy admin users', async () => {
      const context = createMockContext({ sub: 'db-admin-user', email: 'admin@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.ADMIN,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    });
  });

  describe('with DEMO_MODE enabled', () => {
    let guard: AdminGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;

    beforeEach(() => {
      vi.clearAllMocks();
      const mockConfigService = createMockConfigService({
        ADMIN_USERS: '',
        DEMO_MODE: 'true',
      });
      mockPrisma = createMockPrismaService();
      guard = new AdminGuard(mockConfigService, mockPrisma as any);
    });

    it('should allow access for demo-admin in demo mode', async () => {
      const context = createMockContext({ sub: 'demo-admin', email: 'demo-admin@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should not query database for demo admin
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should still check database for non-demo-admin users in demo mode', async () => {
      const context = createMockContext({ sub: 'regular-user', email: 'user@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.USER,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    });
  });

  describe('isLegacyAdmin method', () => {
    let guard: AdminGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;

    beforeEach(() => {
      vi.clearAllMocks();
      const mockConfigService = createMockConfigService({
        ADMIN_USERS: 'admin-1,admin-2',
        DEMO_MODE: 'true',
      });
      mockPrisma = createMockPrismaService();
      guard = new AdminGuard(mockConfigService, mockPrisma as any);
    });

    it('should return true for configured legacy admin', () => {
      expect(guard.isLegacyAdmin('admin-1')).toBe(true);
      expect(guard.isLegacyAdmin('admin-2')).toBe(true);
    });

    it('should return true for demo-admin in demo mode', () => {
      expect(guard.isLegacyAdmin('demo-admin')).toBe(true);
    });

    it('should return false for non-legacy admin', () => {
      expect(guard.isLegacyAdmin('random-user')).toBe(false);
      expect(guard.isLegacyAdmin('')).toBe(false);
    });
  });
});
