import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadService } from './upload.service.js';

const createMockS3Service = () => ({
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
});

const createMockUsersService = () => ({
  getAvatarS3Key: vi.fn(),
  updateAvatar: vi.fn(),
  removeAvatar: vi.fn(),
});

describe('UploadService', () => {
  let service: UploadService;
  let mockS3Service: ReturnType<typeof createMockS3Service>;
  let mockUsersService: ReturnType<typeof createMockUsersService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockS3Service = createMockS3Service();
    mockUsersService = createMockUsersService();
    service = new UploadService(mockS3Service as any, mockUsersService as any);
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully when no existing avatar', async () => {
      const userId = 'user-123';
      const file = Buffer.from('image data');
      const mimeType = 'image/jpeg';
      const expectedResult = {
        key: 'avatars/user-123/avatar.jpg',
        url: 'https://bucket.s3.amazonaws.com/avatars/user-123/avatar.jpg',
      };
      mockUsersService.getAvatarS3Key.mockResolvedValue(null);
      mockS3Service.uploadAvatar.mockResolvedValue(expectedResult);
      mockUsersService.updateAvatar.mockResolvedValue(undefined);

      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(result).toEqual(expectedResult);
      expect(mockUsersService.getAvatarS3Key).toHaveBeenCalledWith(userId);
      expect(mockS3Service.deleteAvatar).not.toHaveBeenCalled();
      expect(mockS3Service.uploadAvatar).toHaveBeenCalledWith(userId, file, mimeType);
      expect(mockUsersService.updateAvatar).toHaveBeenCalledWith(
        userId,
        expectedResult.url,
        expectedResult.key,
      );
    });

    it('should delete existing avatar before uploading new one', async () => {
      const userId = 'user-123';
      const file = Buffer.from('image data');
      const mimeType = 'image/jpeg';
      const existingKey = 'avatars/user-123/old-avatar.jpg';
      const newResult = {
        key: 'avatars/user-123/new-avatar.jpg',
        url: 'https://bucket.s3.amazonaws.com/avatars/user-123/new-avatar.jpg',
      };
      mockUsersService.getAvatarS3Key.mockResolvedValue(existingKey);
      mockS3Service.deleteAvatar.mockResolvedValue(undefined);
      mockS3Service.uploadAvatar.mockResolvedValue(newResult);
      mockUsersService.updateAvatar.mockResolvedValue(undefined);

      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(result).toEqual(newResult);
      expect(mockUsersService.getAvatarS3Key).toHaveBeenCalledWith(userId);
      expect(mockS3Service.deleteAvatar).toHaveBeenCalledWith(existingKey);
      expect(mockS3Service.uploadAvatar).toHaveBeenCalledWith(userId, file, mimeType);
      expect(mockUsersService.updateAvatar).toHaveBeenCalledWith(
        userId,
        newResult.url,
        newResult.key,
      );
    });

    it('should continue upload even if old avatar deletion fails', async () => {
      const userId = 'user-123';
      const file = Buffer.from('image data');
      const mimeType = 'image/jpeg';
      const existingKey = 'avatars/user-123/old-avatar.jpg';
      const newResult = {
        key: 'avatars/user-123/new-avatar.jpg',
        url: 'https://bucket.s3.amazonaws.com/avatars/user-123/new-avatar.jpg',
      };
      mockUsersService.getAvatarS3Key.mockResolvedValue(existingKey);
      mockS3Service.deleteAvatar.mockRejectedValue(new Error('S3 delete failed'));
      mockS3Service.uploadAvatar.mockResolvedValue(newResult);
      mockUsersService.updateAvatar.mockResolvedValue(undefined);

      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(result).toEqual(newResult);
      expect(mockS3Service.deleteAvatar).toHaveBeenCalledWith(existingKey);
      expect(mockS3Service.uploadAvatar).toHaveBeenCalledWith(userId, file, mimeType);
    });

    it('should propagate S3 upload error', async () => {
      const error = new Error('S3 upload failed');
      mockUsersService.getAvatarS3Key.mockResolvedValue(null);
      mockS3Service.uploadAvatar.mockRejectedValue(error);

      await expect(
        service.uploadAvatar('user-1', Buffer.from('data'), 'image/jpeg'),
      ).rejects.toThrow('S3 upload failed');
    });

    it('should handle non-Error objects thrown', async () => {
      mockUsersService.getAvatarS3Key.mockResolvedValue(null);
      mockS3Service.uploadAvatar.mockRejectedValue('String error');

      await expect(service.uploadAvatar('user-1', Buffer.from('data'), 'image/jpeg')).rejects.toBe(
        'String error',
      );
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar successfully when avatar exists', async () => {
      const userId = 'user-123';
      const s3Key = 'avatars/user-123/avatar.jpg';
      mockUsersService.getAvatarS3Key.mockResolvedValue(s3Key);
      mockS3Service.deleteAvatar.mockResolvedValue(undefined);
      mockUsersService.removeAvatar.mockResolvedValue(undefined);

      await service.deleteAvatar(userId);

      expect(mockUsersService.getAvatarS3Key).toHaveBeenCalledWith(userId);
      expect(mockS3Service.deleteAvatar).toHaveBeenCalledWith(s3Key);
      expect(mockUsersService.removeAvatar).toHaveBeenCalledWith(userId);
    });

    it('should skip S3 deletion when no avatar exists but still clear database', async () => {
      const userId = 'user-456';
      mockUsersService.getAvatarS3Key.mockResolvedValue(null);
      mockUsersService.removeAvatar.mockResolvedValue(undefined);

      await service.deleteAvatar(userId);

      expect(mockUsersService.getAvatarS3Key).toHaveBeenCalledWith(userId);
      expect(mockS3Service.deleteAvatar).not.toHaveBeenCalled();
      expect(mockUsersService.removeAvatar).toHaveBeenCalledWith(userId);
    });

    it('should propagate S3 deletion error', async () => {
      const userId = 'user-123';
      const s3Key = 'avatars/user-123/avatar.jpg';
      const error = new Error('S3 deletion failed');
      mockUsersService.getAvatarS3Key.mockResolvedValue(s3Key);
      mockS3Service.deleteAvatar.mockRejectedValue(error);

      await expect(service.deleteAvatar(userId)).rejects.toThrow('S3 deletion failed');
    });

    it('should handle non-Error objects thrown during deletion', async () => {
      const userId = 'user-123';
      mockUsersService.getAvatarS3Key.mockResolvedValue('some-key');
      mockS3Service.deleteAvatar.mockRejectedValue('Deletion string error');

      await expect(service.deleteAvatar(userId)).rejects.toBe('Deletion string error');
    });
  });
});
