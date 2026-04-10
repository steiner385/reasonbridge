/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BotDetectorService } from '../services/bot-detector.service.js';
import { ModerationServiceClient } from '../clients/moderation-service.client.js';
import { AvatarUrls } from '../services/s3.service.js';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  } as unknown as PrismaService;

  const mockBotDetectorService = {} as unknown as BotDetectorService;

  const mockModerationServiceClient = {
    flagUserAsBot: vi.fn().mockResolvedValue({ success: true, reportId: 'report-123' }),
  } as unknown as ModerationServiceClient;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(
      mockPrismaService,
      mockBotDetectorService,
      mockModerationServiceClient,
    );
  });

  describe('updateAvatarUrls', () => {
    it('should update user avatarUrls and avatarHash', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const avatarUrls: AvatarUrls = {
        small: {
          webp: 'https://cdn.example.com/small.webp',
          jpg: 'https://cdn.example.com/small.jpg',
        },
        medium: {
          webp: 'https://cdn.example.com/medium.webp',
          jpg: 'https://cdn.example.com/medium.jpg',
        },
        large: {
          webp: 'https://cdn.example.com/large.webp',
          jpg: 'https://cdn.example.com/large.jpg',
        },
      };
      const avatarHash = 'abc12345';

      // Mock prisma.user.findUnique to verify user exists
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
      });

      // Mock prisma.user.update
      (mockPrismaService.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
      });

      await service.updateAvatarUrls(userId, avatarUrls, avatarHash);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          avatarUrls,
          avatarHash,
        },
      });
    });

    it('should throw BadRequestException for invalid userId', async () => {
      const avatarUrls: AvatarUrls = {
        small: {
          webp: 'https://cdn.example.com/small.webp',
          jpg: 'https://cdn.example.com/small.jpg',
        },
        medium: {
          webp: 'https://cdn.example.com/medium.webp',
          jpg: 'https://cdn.example.com/medium.jpg',
        },
        large: {
          webp: 'https://cdn.example.com/large.webp',
          jpg: 'https://cdn.example.com/large.jpg',
        },
      };

      await expect(service.updateAvatarUrls('invalid-uuid', avatarUrls, 'hash')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const avatarUrls: AvatarUrls = {
        small: {
          webp: 'https://cdn.example.com/small.webp',
          jpg: 'https://cdn.example.com/small.jpg',
        },
        medium: {
          webp: 'https://cdn.example.com/medium.webp',
          jpg: 'https://cdn.example.com/medium.jpg',
        },
        large: {
          webp: 'https://cdn.example.com/large.webp',
          jpg: 'https://cdn.example.com/large.jpg',
        },
      };

      // Mock user not found
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.updateAvatarUrls(userId, avatarUrls, 'hash')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAvatarHash', () => {
    it('should return avatarHash for user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        avatarHash: 'abc12345',
      });

      const result = await service.findAvatarHash(userId);

      expect(result).toBe('abc12345');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { avatarHash: true },
      });
    });

    it('should return null if user has no avatarHash', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: userId,
        avatarHash: null,
      });

      const result = await service.findAvatarHash(userId);

      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      (mockPrismaService.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.findAvatarHash(userId);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException for invalid userId', async () => {
      await expect(service.findAvatarHash('invalid-uuid')).rejects.toThrow(BadRequestException);
    });
  });
});
