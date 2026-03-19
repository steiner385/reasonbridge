/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for RolesGuard
 *
 * Tests the generic role-based authorization guard that uses the @Roles() decorator.
 *
 * @see services/user-service/src/auth/guards/roles.guard.ts
 * @see services/user-service/src/auth/decorators/roles.decorator.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../roles.guard.js';
import { ROLES_KEY } from '../../decorators/roles.decorator.js';

/**
 * Helper to create a mock ExecutionContext
 */
const createMockContext = (user: any): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
  } as unknown as ExecutionContext;
};

/**
 * Create a mock PrismaService
 */
const createMockPrismaService = () => ({
  user: {
    findUnique: vi.fn(),
  },
});

/**
 * Create a mock Reflector
 */
const createMockReflector = (roles: UserRole[] | undefined) => ({
  getAllAndOverride: vi.fn().mockReturnValue(roles),
});

describe('RolesGuard', () => {
  describe('with MODERATOR role required', () => {
    let guard: RolesGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockReflector: ReturnType<typeof createMockReflector>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = createMockPrismaService();
      mockReflector = createMockReflector([UserRole.MODERATOR]);
      guard = new RolesGuard(mockReflector as any, mockPrisma as any);
    });

    it('should allow access for user with exact required role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'mod@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.MODERATOR,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
    });

    it('should allow access for ADMIN user (higher role in hierarchy)', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'admin@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.ADMIN,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for USER (lower role)', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.USER,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('requires one of these roles');
    });
  });

  describe('with ADMIN role required', () => {
    let guard: RolesGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockReflector: ReturnType<typeof createMockReflector>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = createMockPrismaService();
      mockReflector = createMockReflector([UserRole.ADMIN]);
      guard = new RolesGuard(mockReflector as any, mockPrisma as any);
    });

    it('should allow access for ADMIN user', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'admin@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.ADMIN,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for MODERATOR user', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'mod@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.MODERATOR,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should deny access for USER', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.USER,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('with multiple roles required', () => {
    let guard: RolesGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockReflector: ReturnType<typeof createMockReflector>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = createMockPrismaService();
      // Require USER or MODERATOR (not ADMIN)
      mockReflector = createMockReflector([UserRole.USER, UserRole.MODERATOR]);
      guard = new RolesGuard(mockReflector as any, mockPrisma as any);
    });

    it('should allow access for USER role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.USER,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access for MODERATOR role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'mod@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.MODERATOR,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access for ADMIN role (hierarchy includes USER and MODERATOR)', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'admin@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.ADMIN,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('without roles decorator', () => {
    let guard: RolesGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockReflector: ReturnType<typeof createMockReflector>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = createMockPrismaService();
      mockReflector = createMockReflector(undefined);
      guard = new RolesGuard(mockReflector as any, mockPrisma as any);
    });

    it('should allow access when no roles specified (authentication-only)', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should not query database
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('with empty roles array', () => {
    let guard: RolesGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockReflector: ReturnType<typeof createMockReflector>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = createMockPrismaService();
      mockReflector = createMockReflector([]);
      guard = new RolesGuard(mockReflector as any, mockPrisma as any);
    });

    it('should allow access when roles array is empty', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should not query database
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    let guard: RolesGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockReflector: ReturnType<typeof createMockReflector>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = createMockPrismaService();
      mockReflector = createMockReflector([UserRole.USER]);
      guard = new RolesGuard(mockReflector as any, mockPrisma as any);
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
  });

  describe('request modification', () => {
    let guard: RolesGuard;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockReflector: ReturnType<typeof createMockReflector>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = createMockPrismaService();
      mockReflector = createMockReflector([UserRole.USER]);
      guard = new RolesGuard(mockReflector as any, mockPrisma as any);
    });

    it('should attach userId and userRole to request on success', async () => {
      const request = { user: { sub: 'user-123', email: 'user@example.com' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}) as any,
        getClass: () => ({}) as any,
      } as unknown as ExecutionContext;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.USER,
      });

      await guard.canActivate(context);

      expect(request).toHaveProperty('userId', 'db-user-id');
      expect(request).toHaveProperty('userRole', UserRole.USER);
    });
  });
});
