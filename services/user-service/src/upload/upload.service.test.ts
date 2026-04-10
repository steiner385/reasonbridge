/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadService } from './upload.service.js';
import { S3Service } from '../services/s3.service.js';
import { UsersService } from '../users/users.service.js';
import { ImageProcessorService } from '../services/image-processor.service.js';
import type { ProcessedImage } from '../services/image-processor.service.js';
import type { AvatarUrls } from '../services/s3.service.js';

describe('UploadService', () => {
  let service: UploadService;
  let mockS3Service: any;
  let mockUsersService: any;
  let mockImageProcessor: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockS3Service = {
      uploadAvatarVariants: vi.fn(),
      deleteAvatarFolder: vi.fn(),
    } as unknown as S3Service;

    mockUsersService = {
      findAvatarHash: vi.fn(),
      updateAvatarUrls: vi.fn(),
    } as unknown as UsersService;

    mockImageProcessor = {
      processAvatar: vi.fn(),
    } as unknown as ImageProcessorService;

    // Direct instantiation - bypasses NestJS DI issues with vitest mocks
    service = new UploadService(mockS3Service, mockUsersService, mockImageProcessor);
  });

  describe('uploadAvatar', () => {
    it('should process image and return structured avatarUrls', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test image data');
      const mimeType = 'image/jpeg';

      const mockVariants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('s-webp'), width: 32, height: 32 },
        { size: 'small', format: 'jpg', buffer: Buffer.from('s-jpg'), width: 32, height: 32 },
        { size: 'medium', format: 'webp', buffer: Buffer.from('m-webp'), width: 128, height: 128 },
        { size: 'medium', format: 'jpg', buffer: Buffer.from('m-jpg'), width: 128, height: 128 },
        { size: 'large', format: 'webp', buffer: Buffer.from('l-webp'), width: 512, height: 512 },
        { size: 'large', format: 'jpg', buffer: Buffer.from('l-jpg'), width: 512, height: 512 },
      ];

      const mockAvatarUrls: AvatarUrls = {
        small: {
          webp: 'https://cdn.example.com/avatars/user-123/abcd1234/small.webp',
          jpg: 'https://cdn.example.com/avatars/user-123/abcd1234/small.jpg',
        },
        medium: {
          webp: 'https://cdn.example.com/avatars/user-123/abcd1234/medium.webp',
          jpg: 'https://cdn.example.com/avatars/user-123/abcd1234/medium.jpg',
        },
        large: {
          webp: 'https://cdn.example.com/avatars/user-123/abcd1234/large.webp',
          jpg: 'https://cdn.example.com/avatars/user-123/abcd1234/large.jpg',
        },
      };

      mockUsersService.findAvatarHash.mockResolvedValue(null);
      mockImageProcessor.processAvatar.mockResolvedValue(mockVariants);
      mockS3Service.uploadAvatarVariants.mockResolvedValue(mockAvatarUrls);
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(result.avatarUrls).toEqual(mockAvatarUrls);
      expect(mockImageProcessor.processAvatar).toHaveBeenCalledWith(file);
      expect(mockS3Service.uploadAvatarVariants).toHaveBeenCalledWith(
        userId,
        expect.any(String), // hash
        mockVariants,
      );
      expect(mockUsersService.updateAvatarUrls).toHaveBeenCalledWith(
        userId,
        mockAvatarUrls,
        expect.any(String), // hash
      );
    });

    it('should generate consistent hash from file content', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test image data');
      const mimeType = 'image/png';

      const mockVariants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('s'), width: 32, height: 32 },
      ];

      mockUsersService.findAvatarHash.mockResolvedValue(null);
      mockImageProcessor.processAvatar.mockResolvedValue(mockVariants);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      await service.uploadAvatar(userId, file, mimeType);

      // Verify hash is passed to both uploadAvatarVariants and updateAvatarUrls
      const uploadCall = mockS3Service.uploadAvatarVariants.mock.calls[0];
      const updateCall = mockUsersService.updateAvatarUrls.mock.calls[0];

      expect(uploadCall[1]).toBe(updateCall[2]); // Same hash
      expect(uploadCall[1]).toHaveLength(8); // 8 character hash
    });

    it('should delete old avatar folder when hash changes', async () => {
      const userId = 'user-123';
      const oldHash = 'oldhash1';
      const file = Buffer.from('new image data');
      const mimeType = 'image/png';

      const mockVariants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('s'), width: 32, height: 32 },
      ];

      mockUsersService.findAvatarHash.mockResolvedValue(oldHash);
      mockImageProcessor.processAvatar.mockResolvedValue(mockVariants);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);
      mockS3Service.deleteAvatarFolder.mockResolvedValue(undefined);

      await service.uploadAvatar(userId, file, mimeType);

      // Wait for async deletion
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockS3Service.deleteAvatarFolder).toHaveBeenCalledWith(userId, oldHash);
    });

    it('should not delete old avatar folder when hash is the same', async () => {
      const userId = 'user-123';
      const hash = 'samehash';
      const file = Buffer.from('test image data');
      const mimeType = 'image/jpeg';

      const mockVariants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('s'), width: 32, height: 32 },
      ];

      mockUsersService.findAvatarHash.mockResolvedValue(hash);
      mockImageProcessor.processAvatar.mockResolvedValue(mockVariants);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      // Mock the hash generation to return the same hash
      vi.spyOn(service as any, 'generateHash').mockReturnValue(hash);

      await service.uploadAvatar(userId, file, mimeType);

      // Wait for potential async deletion
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockS3Service.deleteAvatarFolder).not.toHaveBeenCalled();
    });

    it('should not delete when no old avatar exists', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test image data');
      const mimeType = 'image/jpeg';

      const mockVariants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('s'), width: 32, height: 32 },
      ];

      mockUsersService.findAvatarHash.mockResolvedValue(null);
      mockImageProcessor.processAvatar.mockResolvedValue(mockVariants);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      await service.uploadAvatar(userId, file, mimeType);

      // Wait for potential async deletion
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockS3Service.deleteAvatarFolder).not.toHaveBeenCalled();
    });

    it('should continue even if old avatar deletion fails', async () => {
      const userId = 'user-123';
      const oldHash = 'oldhash1';
      const file = Buffer.from('new image data');
      const mimeType = 'image/png';

      const mockVariants: ProcessedImage[] = [
        { size: 'small', format: 'webp', buffer: Buffer.from('s'), width: 32, height: 32 },
      ];

      const mockAvatarUrls: AvatarUrls = {
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      };

      mockUsersService.findAvatarHash.mockResolvedValue(oldHash);
      mockImageProcessor.processAvatar.mockResolvedValue(mockVariants);
      mockS3Service.uploadAvatarVariants.mockResolvedValue(mockAvatarUrls);
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);
      mockS3Service.deleteAvatarFolder.mockRejectedValue(new Error('S3 deletion failed'));

      // Should not throw despite deletion failure
      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(result.avatarUrls).toEqual(mockAvatarUrls);

      // Wait for async deletion attempt
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockS3Service.deleteAvatarFolder).toHaveBeenCalledWith(userId, oldHash);
    });

    it('should throw BadRequestException for unsupported MIME type image/heic', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test');
      const mimeType = 'image/heic';

      await expect(service.uploadAvatar(userId, file, mimeType)).rejects.toThrow(
        BadRequestException,
      );

      // Should not call any processing methods
      expect(mockImageProcessor.processAvatar).not.toHaveBeenCalled();
      expect(mockS3Service.uploadAvatarVariants).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for unsupported MIME type image/heif', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test');
      const mimeType = 'image/heif';

      await expect(service.uploadAvatar(userId, file, mimeType)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept image/jpeg', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test');
      const mimeType = 'image/jpeg';

      mockUsersService.findAvatarHash.mockResolvedValue(null);
      mockImageProcessor.processAvatar.mockResolvedValue([]);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      await expect(service.uploadAvatar(userId, file, mimeType)).resolves.not.toThrow();
    });

    it('should accept image/png', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test');
      const mimeType = 'image/png';

      mockUsersService.findAvatarHash.mockResolvedValue(null);
      mockImageProcessor.processAvatar.mockResolvedValue([]);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      await expect(service.uploadAvatar(userId, file, mimeType)).resolves.not.toThrow();
    });

    it('should accept image/webp', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test');
      const mimeType = 'image/webp';

      mockUsersService.findAvatarHash.mockResolvedValue(null);
      mockImageProcessor.processAvatar.mockResolvedValue([]);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      await expect(service.uploadAvatar(userId, file, mimeType)).resolves.not.toThrow();
    });

    it('should accept image/gif', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test');
      const mimeType = 'image/gif';

      mockUsersService.findAvatarHash.mockResolvedValue(null);
      mockImageProcessor.processAvatar.mockResolvedValue([]);
      mockS3Service.uploadAvatarVariants.mockResolvedValue({
        small: { webp: 'url', jpg: 'url' },
        medium: { webp: 'url', jpg: 'url' },
        large: { webp: 'url', jpg: 'url' },
      });
      mockUsersService.updateAvatarUrls.mockResolvedValue(undefined);

      await expect(service.uploadAvatar(userId, file, mimeType)).resolves.not.toThrow();
    });
  });
});
