/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VerificationService } from './verification.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VerificationTokenType } from '@prisma/client';
import type { VerificationCodeGenerator } from './verification-code-generator.interface.js';

describe('VerificationService', () => {
  let service: VerificationService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    verificationToken: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockCodeGenerator: VerificationCodeGenerator;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockToken = {
    id: 'token-123',
    userId: 'user-123',
    token: '123456',
    type: VerificationTokenType.EMAIL_VERIFICATION,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h in future
    used: false,
    usedAt: null,
    attempts: 0,
    lockedAt: null,
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      verificationToken: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    // Mock code generator that returns predictable codes
    mockCodeGenerator = {
      generate: vi.fn().mockReturnValue('123456'),
    };

    service = new VerificationService(mockPrisma as unknown as PrismaService, mockCodeGenerator);
  });

  describe('verifyToken', () => {
    it('should verify a valid code successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.findFirst.mockResolvedValue(mockToken);
      mockPrisma.verificationToken.update.mockResolvedValue({ ...mockToken, used: true });

      const result = await service.verifyToken('test@example.com', '123456');

      expect(result).toBe('user-123');
      expect(mockPrisma.verificationToken.update).toHaveBeenCalledWith({
        where: { id: 'token-123' },
        data: {
          used: true,
          usedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyToken('unknown@example.com', '123456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if no token found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyToken('test@example.com', '123456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.findFirst.mockResolvedValue(expiredToken);

      await expect(service.verifyToken('test@example.com', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    describe('brute force protection', () => {
      it('should increment attempts on invalid code', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        mockPrisma.verificationToken.findFirst.mockResolvedValue(mockToken);
        mockPrisma.verificationToken.update.mockResolvedValue({ ...mockToken, attempts: 1 });

        await expect(service.verifyToken('test@example.com', 'wrong!')).rejects.toThrow(
          BadRequestException,
        );

        expect(mockPrisma.verificationToken.update).toHaveBeenCalledWith({
          where: { id: 'token-123' },
          data: {
            attempts: 1,
            lockedAt: null,
          },
        });
      });

      it('should include remaining attempts in error response', async () => {
        const tokenWith3Attempts = { ...mockToken, attempts: 3 };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        mockPrisma.verificationToken.findFirst.mockResolvedValue(tokenWith3Attempts);
        mockPrisma.verificationToken.update.mockResolvedValue({
          ...tokenWith3Attempts,
          attempts: 4,
        });

        try {
          await service.verifyToken('test@example.com', 'wrong!');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const response = (error as BadRequestException).getResponse() as {
            details?: { remainingAttempts?: number };
          };
          expect(response.details?.remainingAttempts).toBe(1);
        }
      });

      it('should lock token after 5 failed attempts', async () => {
        const tokenWith4Attempts = { ...mockToken, attempts: 4 };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        mockPrisma.verificationToken.findFirst.mockResolvedValue(tokenWith4Attempts);
        mockPrisma.verificationToken.update.mockResolvedValue({
          ...tokenWith4Attempts,
          attempts: 5,
          lockedAt: new Date(),
        });

        try {
          await service.verifyToken('test@example.com', 'wrong!');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const response = (error as BadRequestException).getResponse() as { error?: string };
          expect(response.error).toBe('TOKEN_LOCKED');
        }

        expect(mockPrisma.verificationToken.update).toHaveBeenCalledWith({
          where: { id: 'token-123' },
          data: {
            attempts: 5,
            lockedAt: expect.any(Date),
          },
        });
      });

      it('should reject verification for locked token', async () => {
        const lockedToken = {
          ...mockToken,
          attempts: 5,
          lockedAt: new Date(),
        };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        mockPrisma.verificationToken.findFirst.mockResolvedValue(lockedToken);

        try {
          await service.verifyToken('test@example.com', '123456');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          const response = (error as BadRequestException).getResponse() as { error?: string };
          expect(response.error).toBe('TOKEN_LOCKED');
        }

        // Should not update the token since it's already locked
        expect(mockPrisma.verificationToken.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return MAX_ATTEMPTS for fresh token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.findFirst.mockResolvedValue(mockToken);

      const result = await service.getRemainingAttempts('test@example.com');

      expect(result).toBe(5);
    });

    it('should return remaining attempts based on token.attempts', async () => {
      const tokenWith2Attempts = { ...mockToken, attempts: 2 };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.findFirst.mockResolvedValue(tokenWith2Attempts);

      const result = await service.getRemainingAttempts('test@example.com');

      expect(result).toBe(3);
    });

    it('should return 0 for locked token', async () => {
      const lockedToken = { ...mockToken, attempts: 5, lockedAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.findFirst.mockResolvedValue(lockedToken);

      const result = await service.getRemainingAttempts('test@example.com');

      expect(result).toBe(0);
    });

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getRemainingAttempts('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should return null if no token found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      const result = await service.getRemainingAttempts('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should create token with attempts initialized to 0', async () => {
      mockPrisma.verificationToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.verificationToken.create.mockResolvedValue(mockToken);

      const result = await service.generateToken(
        'user-123',
        'test@example.com',
        VerificationTokenType.EMAIL_VERIFICATION,
      );

      expect(result).toMatch(/^\d{6}$/);
      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          attempts: 0,
          lockedAt: null,
        }),
      });
    });
  });
});
