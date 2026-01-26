import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller.js';

const createMockUploadService = () => ({
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
});

describe('UploadController', () => {
  let controller: UploadController;
  let mockUploadService: ReturnType<typeof createMockUploadService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadService = createMockUploadService();
    controller = new UploadController(mockUploadService as any);
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const userId = 'user-123';
      const dto = {
        file: Buffer.from('test image data').toString('base64'),
        mimetype: 'image/jpeg',
      };
      const uploadResult = {
        key: 'avatars/user-123/avatar.jpg',
        url: 'https://bucket.s3.amazonaws.com/avatars/user-123/avatar.jpg',
      };
      mockUploadService.uploadAvatar.mockResolvedValue(uploadResult);

      const result = await controller.uploadAvatar(userId, dto);

      expect(result).toEqual({
        success: true,
        data: uploadResult,
      });
      expect(mockUploadService.uploadAvatar).toHaveBeenCalledWith(
        userId,
        expect.any(Buffer),
        'image/jpeg',
      );
    });

    it('should accept image/png mimetype', async () => {
      const dto = {
        file: Buffer.from('png data').toString('base64'),
        mimetype: 'image/png',
      };
      mockUploadService.uploadAvatar.mockResolvedValue({ key: 'avatar.png' });

      const result = await controller.uploadAvatar('user-1', dto);

      expect(result.success).toBe(true);
    });

    it('should accept image/gif mimetype', async () => {
      const dto = {
        file: Buffer.from('gif data').toString('base64'),
        mimetype: 'image/gif',
      };
      mockUploadService.uploadAvatar.mockResolvedValue({ key: 'avatar.gif' });

      const result = await controller.uploadAvatar('user-1', dto);

      expect(result.success).toBe(true);
    });

    it('should accept image/webp mimetype', async () => {
      const dto = {
        file: Buffer.from('webp data').toString('base64'),
        mimetype: 'image/webp',
      };
      mockUploadService.uploadAvatar.mockResolvedValue({ key: 'avatar.webp' });

      const result = await controller.uploadAvatar('user-1', dto);

      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when no file data provided', async () => {
      const dto = { file: '', mimetype: 'image/jpeg' };

      await expect(controller.uploadAvatar('user-1', dto)).rejects.toThrow(
        new BadRequestException('No file data provided'),
      );
    });

    it('should throw BadRequestException when file is undefined', async () => {
      const dto = { mimetype: 'image/jpeg' } as any;

      await expect(controller.uploadAvatar('user-1', dto)).rejects.toThrow(
        new BadRequestException('No file data provided'),
      );
    });

    it('should throw BadRequestException for invalid mimetype', async () => {
      const dto = {
        file: Buffer.from('data').toString('base64'),
        mimetype: 'application/pdf',
      };

      await expect(controller.uploadAvatar('user-1', dto)).rejects.toThrow(
        new BadRequestException(
          'Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp',
        ),
      );
    });

    it('should throw BadRequestException for text/plain mimetype', async () => {
      const dto = {
        file: Buffer.from('text').toString('base64'),
        mimetype: 'text/plain',
      };

      await expect(controller.uploadAvatar('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds max size', async () => {
      // Create a file larger than 5MB (5 * 1024 * 1024 bytes)
      const largeData = Buffer.alloc(6 * 1024 * 1024);
      const dto = {
        file: largeData.toString('base64'),
        mimetype: 'image/jpeg',
      };

      await expect(controller.uploadAvatar('user-1', dto)).rejects.toThrow(
        new BadRequestException('File too large. Maximum size: 5MB'),
      );
    });

    it('should accept file at exactly max size boundary', async () => {
      // Create exactly 5MB file
      const exactMaxData = Buffer.alloc(5 * 1024 * 1024);
      const dto = {
        file: exactMaxData.toString('base64'),
        mimetype: 'image/jpeg',
      };
      mockUploadService.uploadAvatar.mockResolvedValue({ key: 'avatar.jpg' });

      const result = await controller.uploadAvatar('user-1', dto);

      expect(result.success).toBe(true);
    });

    it('should decode base64 file data correctly', async () => {
      const originalData = 'test image content';
      const base64Data = Buffer.from(originalData).toString('base64');
      const dto = {
        file: base64Data,
        mimetype: 'image/jpeg',
      };
      mockUploadService.uploadAvatar.mockResolvedValue({ key: 'avatar.jpg' });

      await controller.uploadAvatar('user-1', dto);

      const calledBuffer = mockUploadService.uploadAvatar.mock.calls[0][1];
      expect(calledBuffer.toString()).toBe(originalData);
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar by key', async () => {
      mockUploadService.deleteAvatar.mockResolvedValue(undefined);

      await controller.deleteAvatar('avatars/user-123/avatar.jpg');

      expect(mockUploadService.deleteAvatar).toHaveBeenCalledWith('avatars/user-123/avatar.jpg');
    });

    it('should handle keys with special characters', async () => {
      mockUploadService.deleteAvatar.mockResolvedValue(undefined);

      await controller.deleteAvatar('avatars/user-123/avatar-2026.01.20.jpg');

      expect(mockUploadService.deleteAvatar).toHaveBeenCalledWith(
        'avatars/user-123/avatar-2026.01.20.jpg',
      );
    });

    it('should not throw when key does not exist', async () => {
      mockUploadService.deleteAvatar.mockResolvedValue(undefined);

      await expect(controller.deleteAvatar('non-existent-key')).resolves.not.toThrow();
    });

    it('should propagate service errors', async () => {
      mockUploadService.deleteAvatar.mockRejectedValue(new Error('S3 deletion failed'));

      await expect(controller.deleteAvatar('some-key')).rejects.toThrow('S3 deletion failed');
    });
  });
});
