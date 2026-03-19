/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ModeratorGuard
 *
 * Tests the moderator authorization guard that restricts access to
 * moderator and admin-only endpoints.
 *
 * @see services/user-service/src/auth/guards/moderator.guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ModeratorGuard } from '../moderator.guard.js';

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
 * Create a mock PrismaService
 */
const createMockPrismaService = () => ({
  user: {
    findUnique: vi.fn(),
  },
});

describe('ModeratorGuard', () => {
  let guard: ModeratorGuard;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    guard = new ModeratorGuard(mockPrisma as any);
  });

  describe('role-based access', () => {
    it('should allow access for user with MODERATOR role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'mod@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.MODERATOR,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { cognitoSub: 'user-123' },
        select: { id: true, role: true },
      });
    });

    it('should allow access for user with ADMIN role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'admin@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.ADMIN,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for user with USER role', async () => {
      const context = createMockContext({ sub: 'user-123', email: 'user@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.USER,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('moderator privileges required');
    });
  });

  describe('error handling', () => {
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

    it('should throw ForbiddenException when user is null', async () => {
      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('authentication required');
    });
  });

  describe('request modification', () => {
    it('should attach userId and userRole to request on success', async () => {
      const request = { user: { sub: 'user-123', email: 'mod@example.com' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'db-user-id',
        role: UserRole.MODERATOR,
      });

      await guard.canActivate(context);

      expect(request).toHaveProperty('userId', 'db-user-id');
      expect(request).toHaveProperty('userRole', UserRole.MODERATOR);
    });
  });
});
