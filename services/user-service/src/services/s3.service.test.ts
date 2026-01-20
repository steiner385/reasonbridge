import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3Service } from './s3.service.js';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

const createMockConfigService = (overrides = {}) => ({
  get: vi.fn((key: string) => {
    const defaults: Record<string, string> = {
      AWS_REGION: 'us-east-1',
      S3_AVATAR_BUCKET: 'test-bucket',
      AWS_ACCESS_KEY_ID: 'test-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
    };
    return overrides[key] ?? defaults[key] ?? null;
  }),
});

describe('S3Service', () => {
  let service: S3Service;
  let mockConfigService: ReturnType<typeof createMockConfigService>;
  let mockS3ClientSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService = createMockConfigService();
    mockS3ClientSend = vi.fn().mockResolvedValue({});
    (S3Client as any).mockImplementation(() => ({
      send: mockS3ClientSend,
    }));
    service = new S3Service(mockConfigService as any);
  });

  describe('constructor', () => {
    it('should initialize with config values', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_REGION');
      expect(mockConfigService.get).toHaveBeenCalledWith('S3_AVATAR_BUCKET');
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_ACCESS_KEY_ID');
      expect(mockConfigService.get).toHaveBeenCalledWith('AWS_SECRET_ACCESS_KEY');
    });

    it('should use default values when config is not provided', () => {
      const emptyConfigService = {
        get: vi.fn(() => null),
      };
      const newService = new S3Service(emptyConfigService as any);

      expect(emptyConfigService.get).toHaveBeenCalledWith('AWS_REGION');
      expect(newService).toBeDefined();
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const userId = 'user-123';
      const file = Buffer.from('test image content');
      const mimeType = 'image/png';

      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Body: file,
          ContentType: mimeType,
          CacheControl: 'max-age=31536000',
        }),
      );
      expect(mockS3ClientSend).toHaveBeenCalled();
      expect(result.bucket).toBe('test-bucket');
      expect(result.key).toContain(`avatars/${userId}/`);
      expect(result.key).toContain('.png');
      expect(result.url).toContain('https://test-bucket.s3.us-east-1.amazonaws.com/');
    });

    it('should generate correct key with hash', async () => {
      const userId = 'user-456';
      const file = Buffer.from('unique content');
      const mimeType = 'image/jpeg';

      const result = await service.uploadAvatar(userId, file, mimeType);

      expect(result.key).toMatch(/^avatars\/user-456\/[a-f0-9]{32}\.jpg$/);
    });

    it('should handle different MIME types', async () => {
      const testCases = [
        { mimeType: 'image/jpeg', ext: '.jpg' },
        { mimeType: 'image/jpg', ext: '.jpg' },
        { mimeType: 'image/png', ext: '.png' },
        { mimeType: 'image/gif', ext: '.gif' },
        { mimeType: 'image/webp', ext: '.webp' },
        { mimeType: 'image/unknown', ext: '.jpg' }, // default fallback
      ];

      for (const { mimeType, ext } of testCases) {
        const result = await service.uploadAvatar('user-1', Buffer.from('test'), mimeType);
        expect(result.key).toContain(ext);
      }
    });

    it('should throw error when S3 upload fails', async () => {
      mockS3ClientSend.mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        service.uploadAvatar('user-123', Buffer.from('test'), 'image/png'),
      ).rejects.toThrow('Failed to upload avatar: S3 upload failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockS3ClientSend.mockRejectedValue('string error');

      await expect(
        service.uploadAvatar('user-123', Buffer.from('test'), 'image/png'),
      ).rejects.toThrow('Failed to upload avatar: string error');
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar successfully', async () => {
      const key = 'avatars/user-123/hash.png';

      await service.deleteAvatar(key);

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
      });
      expect(mockS3ClientSend).toHaveBeenCalled();
    });

    it('should throw error when S3 delete fails', async () => {
      mockS3ClientSend.mockRejectedValue(new Error('S3 delete failed'));

      await expect(service.deleteAvatar('some-key')).rejects.toThrow(
        'Failed to delete avatar: S3 delete failed',
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockS3ClientSend.mockRejectedValue({ message: 'object error' });

      await expect(service.deleteAvatar('some-key')).rejects.toThrow('Failed to delete avatar:');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL with default expiry', async () => {
      const key = 'avatars/user-123/hash.png';
      const expectedUrl = 'https://signed-url.example.com';
      (getSignedUrl as any).mockResolvedValue(expectedUrl);

      const result = await service.getSignedUrl(key);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
      });
      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 3600,
      });
      expect(result).toBe(expectedUrl);
    });

    it('should accept custom expiry time', async () => {
      const key = 'avatars/user-123/hash.png';
      (getSignedUrl as any).mockResolvedValue('https://signed-url.example.com');

      await service.getSignedUrl(key, 7200);

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 7200,
      });
    });

    it('should throw error when signed URL generation fails', async () => {
      (getSignedUrl as any).mockRejectedValue(new Error('URL generation failed'));

      await expect(service.getSignedUrl('some-key')).rejects.toThrow(
        'Failed to generate signed URL: URL generation failed',
      );
    });

    it('should handle non-Error exceptions', async () => {
      (getSignedUrl as any).mockRejectedValue('string error');

      await expect(service.getSignedUrl('some-key')).rejects.toThrow(
        'Failed to generate signed URL: string error',
      );
    });
  });
});
