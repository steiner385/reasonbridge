/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for AdminGuard (moderation-service)
 *
 * Verifies that admin-only endpoints are accessible to:
 * - env-configured admins (ADMIN_USERS)
 * - the demo admin when DEMO_MODE is enabled
 * - users whose database role is ADMIN (source of truth)
 *
 * @see services/moderation-service/src/auth/admin.guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminGuard } from '../admin.guard.js';

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

describe('AdminGuard (moderation-service)', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  it('allows a user whose database role is ADMIN (UUID sub)', async () => {
    const guard = new AdminGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.ADMIN });

    await expect(guard.canActivate(createMockContext({ sub: ADMIN_UUID }))).resolves.toBe(true);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: ADMIN_UUID }, { cognitoSub: ADMIN_UUID }] },
      select: { id: true, role: true },
    });
  });

  it('denies a user whose database role is MODERATOR', async () => {
    const guard = new AdminGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.MODERATOR });

    await expect(guard.canActivate(createMockContext({ sub: ADMIN_UUID }))).rejects.toThrow(
      'admin privileges required',
    );
  });

  it('denies a user whose database role is USER', async () => {
    const guard = new AdminGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: ADMIN_UUID, role: UserRole.USER });

    await expect(guard.canActivate(createMockContext({ sub: ADMIN_UUID }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies when the user is not found in the database', async () => {
    const guard = new AdminGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(createMockContext({ sub: ADMIN_UUID }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows users listed in ADMIN_USERS without a database lookup', async () => {
    const guard = new AdminGuard(
      createConfigService({ ADMIN_USERS: 'admin-a,admin-b' }) as any,
      mockPrisma as any,
    );

    await expect(guard.canActivate(createMockContext({ sub: 'admin-b' }))).resolves.toBe(true);
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('allows the demo admin when DEMO_MODE is enabled', async () => {
    const guard = new AdminGuard(
      createConfigService({ DEMO_MODE: 'true' }) as any,
      mockPrisma as any,
    );

    await expect(guard.canActivate(createMockContext({ sub: 'demo-admin' }))).resolves.toBe(true);
  });

  it('throws ForbiddenException when no user is present on the request', async () => {
    const guard = new AdminGuard(createConfigService() as any, mockPrisma as any);

    await expect(guard.canActivate(createMockContext(undefined))).rejects.toThrow(
      'authentication required',
    );
  });
});
