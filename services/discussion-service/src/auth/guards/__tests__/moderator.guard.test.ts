/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for ModeratorGuard (discussion-service)
 *
 * Verifies that moderator-only endpoints are accessible to:
 * - env-configured moderators/admins (MODERATOR_USERS / ADMIN_USERS)
 * - demo users when DEMO_MODE is enabled
 * - users whose database role is MODERATOR or ADMIN (source of truth)
 *
 * @see services/discussion-service/src/auth/guards/moderator.guard.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ModeratorGuard } from '../moderator.guard.js';

const MOD_UUID = '11111111-0000-4000-8000-000000000002';

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

describe('ModeratorGuard (discussion-service)', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  it('allows a user whose database role is MODERATOR (UUID sub)', async () => {
    const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: MOD_UUID, role: UserRole.MODERATOR });

    await expect(guard.canActivate(createMockContext({ sub: MOD_UUID }))).resolves.toBe(true);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: MOD_UUID }, { cognitoSub: MOD_UUID }] },
      select: { id: true, role: true },
    });
  });

  it('allows a user whose database role is ADMIN', async () => {
    const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: MOD_UUID, role: UserRole.ADMIN });

    await expect(guard.canActivate(createMockContext({ sub: MOD_UUID }))).resolves.toBe(true);
  });

  it('looks up Cognito-style (non-UUID) subjects by cognitoSub only', async () => {
    const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: MOD_UUID, role: UserRole.MODERATOR });

    await expect(guard.canActivate(createMockContext({ sub: 'demo-mod' }))).resolves.toBe(true);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { cognitoSub: 'demo-mod' },
      select: { id: true, role: true },
    });
  });

  it('denies a user whose database role is USER', async () => {
    const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: MOD_UUID, role: UserRole.USER });

    await expect(guard.canActivate(createMockContext({ sub: MOD_UUID }))).rejects.toThrow(
      'moderator privileges required',
    );
  });

  it('denies when the user is not found in the database', async () => {
    const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(createMockContext({ sub: MOD_UUID }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows users listed in MODERATOR_USERS without a database lookup', async () => {
    const guard = new ModeratorGuard(
      createConfigService({ MODERATOR_USERS: 'user-a,user-b' }) as any,
      mockPrisma as any,
    );

    await expect(guard.canActivate(createMockContext({ sub: 'user-a' }))).resolves.toBe(true);
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
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

  it('throws ForbiddenException when no user is present on the request', async () => {
    const guard = new ModeratorGuard(createConfigService() as any, mockPrisma as any);

    await expect(guard.canActivate(createMockContext(undefined))).rejects.toThrow(
      'authentication required',
    );
  });
});
