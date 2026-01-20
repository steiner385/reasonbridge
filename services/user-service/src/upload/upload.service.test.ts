import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UploadService } from './upload.service.js';

const createMockS3Service = () => ({
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
});

describe('UploadService', () => {
  let service: UploadService;
  let mockS3Service: ReturnType<typeof createMockS3Service>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockS3Service = createMockS3Service();
    service = new UploadService(mockS3Service as any);
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const userId = 'user-123';
      const file = Buffer.from('image data');
      const mimeType = 'image/jpeg';
      const expectedResult = {
        key: 'avatars/user-123/avatar.jpg',
        url: 'https://bucket.s3.amazonaws.com/avatars/user-123/avatar.jpg',
      };
      mockS3Service.uploadAvatar.mockResolvedValue(expectedResult);

      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(result).toEqual(expectedResult);
      expect(mockS3Service.uploadAvatar).toHaveBeenCalledWith(userId, file, mimeType);
    });

    it('should pass correct parameters to S3 service', async () => {
      const userId = 'test-user';
      const file = Buffer.from('test');
      const mimeType = 'image/png';
      mockS3Service.uploadAvatar.mockResolvedValue({ key: 'key' });

      await service.uploadAvatar(userId, file, mimeType);

      expect(mockS3Service.uploadAvatar).toHaveBeenCalledWith(userId, file, mimeType);
    });

    it('should propagate S3 upload error', async () => {
      const error = new Error('S3 upload failed');
      mockS3Service.uploadAvatar.mockRejectedValue(error);

      await expect(
        service.uploadAvatar('user-1', Buffer.from('data'), 'image/jpeg'),
      ).rejects.toThrow('S3 upload failed');
    });

    it('should handle non-Error objects thrown', async () => {
      mockS3Service.uploadAvatar.mockRejectedValue('String error');

      await expect(service.uploadAvatar('user-1', Buffer.from('data'), 'image/jpeg')).rejects.toBe(
        'String error',
      );
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar successfully', async () => {
      mockS3Service.deleteAvatar.mockResolvedValue(undefined);

      await service.deleteAvatar('avatars/user-123/avatar.jpg');

      expect(mockS3Service.deleteAvatar).toHaveBeenCalledWith('avatars/user-123/avatar.jpg');
    });

    it('should pass correct key to S3 service', async () => {
      const key = 'avatars/user-456/profile.png';
      mockS3Service.deleteAvatar.mockResolvedValue(undefined);

      await service.deleteAvatar(key);

      expect(mockS3Service.deleteAvatar).toHaveBeenCalledWith(key);
    });

    it('should propagate S3 deletion error', async () => {
      const error = new Error('S3 deletion failed');
      mockS3Service.deleteAvatar.mockRejectedValue(error);

      await expect(service.deleteAvatar('some-key')).rejects.toThrow('S3 deletion failed');
    });

    it('should handle non-Error objects thrown during deletion', async () => {
      mockS3Service.deleteAvatar.mockRejectedValue('Deletion string error');

      await expect(service.deleteAvatar('some-key')).rejects.toBe('Deletion string error');
    });
  });
});
