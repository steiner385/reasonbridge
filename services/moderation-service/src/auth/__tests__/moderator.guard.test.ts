/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ModeratorGuard (moderation-service)
 *
 * Verifies that moderation endpoints are accessible to:
 * - env-configured moderators/admins (MODERATOR_USERS / ADMIN_USERS)
 * - demo users when DEMO_MODE is enabled
 * - users whose database role is MODERATOR or ADMIN (source of truth)
 *
 * @see services/moderation-service/src/auth/moderator.guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ModeratorGuard } from '../moderator.guard.js';

const ADMIN_UUID = '11111111-0000-4000-8000-000000000001';

const createMockContext = (user: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

const createConfigService = (values: Record<string, string> = {}) => ({
  get: vi.fn((key: string) => values[key]),
});

const createMockPrisma = () => ({
  user: {
    findFirst: vi.fn(),
  },
});

describe('ModeratorGuard (moderation-service)', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  describe('database role-based access', () => {
    it('allows a user whose database role is ADMIN (UUID sub)', async () => {
      const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
      mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.ADMIN });

      const result = await guard.canActivate(createMockContext({ sub: ADMIN_UUID }));

      expect(result).toBe(true);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ id: ADMIN_UUID }, { cognitoSub: ADMIN_UUID }] },
        select: { id: true, role: true },
      });
    });

    it('allows a user whose database role is MODERATOR', async () => {
      const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
      mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.MODERATOR });

      await expect(guard.canActivate(createMockContext({ sub: ADMIN_UUID }))).resolves.toBe(true);
    });

    it('looks up Cognito-style (non-UUID) subjects by cognitoSub only', async () => {
      const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
      mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.ADMIN });

      await expect(guard.canActivate(createMockContext({ sub: 'demo-admin' }))).resolves.toBe(true);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { cognitoSub: 'demo-admin' },
        select: { id: true, role: true },
      });
    });

    it('denies a user whose database role is USER', async () => {
      const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
      mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.USER });

      await expect(guard.canActivate(createMockContext({ sub: ADMIN_UUID }))).rejects.toThrow(
        'moderator privileges required',
      );
    });

    it('denies when the user is not found in the database', async () => {
      const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(guard.canActivate(createMockContext({ sub: ADMIN_UUID }))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('attaches userId and userRole to the request on success', async () => {
      const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
      const request: Record<string, unknown> = { user: { sub: ADMIN_UUID } };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.ADMIN });

      await guard.canActivate(context);

      expect(request['userId']).toBe(ADMIN_UUID);
      expect(request['userRole']).toBe(UserRole.ADMIN);
    });
  });

  describe('env-configured access', () => {
    it('allows users listed in MODERATOR_USERS without a database lookup', async () => {
      const guard = new ModeratorGuard(
        createConfigService({ MODERATOR_USERS: 'user-a,user-b' }) as any,
        mockPrisma as any,
      );

      await expect(guard.canActivate(createMockContext({ sub: 'user-b' }))).resolves.toBe(true);
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('allows users listed in ADMIN_USERS', async () => {
      const guard = new ModeratorGuard(
        createConfigService({ ADMIN_USERS: 'admin-a' }) as any,
        mockPrisma as any,
      );

      await expect(guard.canActivate(createMockContext({ sub: 'admin-a' }))).resolves.toBe(true);
    });

    it('allows demo users when DEMO_MODE is enabled', async () => {
      const guard = new ModeratorGuard(
        createConfigService({ DEMO_MODE: 'true' }) as any,
        mockPrisma as any,
      );

      await expect(guard.canActivate(createMockContext({ sub: 'demo-moderator' }))).resolves.toBe(
        true,
      );
    });
  });

  describe('error handling', () => {
    it('throws ForbiddenException when no user is present on the request', async () => {
      const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);

      await expect(guard.canActivate(createMockContext(undefined))).rejects.toThrow(
        'authentication required',
      );
    });
  });
});
