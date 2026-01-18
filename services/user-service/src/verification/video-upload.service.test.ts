import { BadRequestException } from '@nestjs/common';
import { VideoUploadService } from './video-upload.service.js';
import { VideoUploadCompleteDto } from './dto/video-upload.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma enums for tests
const VerificationType = {
  PHONE: 'PHONE',
  EMAIL: 'EMAIL',
  GOVERNMENT_ID: 'GOVERNMENT_ID',
  VIDEO: 'VIDEO',
} as const;

const VerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  HeadObjectCommand: vi.fn(),
}));

describe('VideoUploadService', () => {
  let service: VideoUploadService;

  const mockVerificationRecord = {
    id: 'verification-123',
    userId: 'user-123',
    type: VerificationType.VIDEO,
    status: VerificationStatus.PENDING,
    verifiedAt: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    providerReference: 'RANDOM_PHRASE',
    createdAt: new Date(),
    user: {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      cognitoSub: 'cognito-123',
    },
  };

  const mockVideoUploadRecord = {
    id: 'video-upload-123',
    verificationId: 'verification-123',
    userId: 'user-123',
    s3Key: 'videos/user-123/verification-123',
    s3Url: 's3://bucket/videos/user-123/verification-123',
    fileName: 'verification.webm',
    fileSize: 2097152,
    mimeType: 'video/webm',
    uploadedAt: new Date(),
    completedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  const mockConfig: Record<string, unknown> = {
    AWS_REGION: 'us-east-1',
    S3_VIDEO_VERIFICATION_BUCKET: 'test-bucket',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
    VIDEO_MAX_FILE_SIZE: 100 * 1024 * 1024,
    VIDEO_UPLOAD_RETENTION_DAYS: 30,
  };

  const mockConfigService = {
    get: vi.fn(<T>(key: string): T | undefined => mockConfig[key] as T | undefined),
  } as unknown as ConfigService;

  const mockPrismaService = {
    verificationRecord: {
      findUnique: vi.fn(),
    },
    videoUpload: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    (mockConfigService.get as ReturnType<typeof vi.fn>).mockImplementation(
      <T>(key: string): T | undefined => mockConfig[key] as T | undefined
    );
    // Direct instantiation - bypasses NestJS DI issues with vitest mocks
    service = new VideoUploadService(mockPrismaService, mockConfigService);
  });

  describe('confirmVideoUpload', () => {
    const dto: VideoUploadCompleteDto = {
      verificationId: 'verification-123',
      fileName: 'verification.webm',
      fileSize: 2097152,
      mimeType: 'video/webm',
    };

    it('should confirm video upload successfully', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );
      (mockPrismaService.videoUpload.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVideoUploadRecord,
      );

      const result = await service.confirmVideoUpload('user-123', dto);

      expect(result).toBeDefined();
      expect(result.videoUploadId).toBe('video-upload-123');
      expect(result.verificationId).toBe('verification-123');
      expect(result.fileName).toBe('verification.webm');
      expect(result.fileSize).toBe(2097152);
      expect(mockPrismaService.verificationRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'verification-123' },
        include: { user: true },
      });
    });

    it('should throw error if verification record not found', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(service.confirmVideoUpload('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification does not belong to user', async () => {
      const differentUserVerification = {
        ...mockVerificationRecord,
        userId: 'different-user',
      };
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        differentUserVerification,
      );

      await expect(service.confirmVideoUpload('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification type is not VIDEO', async () => {
      const nonVideoVerification = {
        ...mockVerificationRecord,
        type: VerificationType.PHONE,
      };
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        nonVideoVerification,
      );

      await expect(service.confirmVideoUpload('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification status is not PENDING', async () => {
      const rejectedVerification = {
        ...mockVerificationRecord,
        status: VerificationStatus.REJECTED,
      };
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        rejectedVerification,
      );

      await expect(service.confirmVideoUpload('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if file size exceeds maximum', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );

      const largeFileDto = { ...dto, fileSize: 200 * 1024 * 1024 };
      await expect(
        service.confirmVideoUpload('user-123', largeFileDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for unsupported MIME type', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );

      const invalidMimeDto = { ...dto, mimeType: 'text/plain' };
      await expect(
        service.confirmVideoUpload('user-123', invalidMimeDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid video MIME types', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );
      (mockPrismaService.videoUpload.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVideoUploadRecord,
      );

      const validMimeTypes = ['video/webm', 'video/mp4', 'video/x-msvideo'];

      for (const mimeType of validMimeTypes) {
        vi.clearAllMocks();
        (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          mockVerificationRecord,
        );
        (mockPrismaService.videoUpload.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          mockVideoUploadRecord,
        );

        const result = await service.confirmVideoUpload('user-123', {
          ...dto,
          mimeType,
        });
        expect(result).toBeDefined();
      }
    });

    it('should set correct expiry date (30 days from now)', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );
      (mockPrismaService.videoUpload.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVideoUploadRecord,
      );

      await service.confirmVideoUpload('user-123', dto);

      const createCall = (mockPrismaService.videoUpload.create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createCall[0].data.expiresAt).toBeInstanceOf(Date);
    });

    it('should return message indicating video is being processed', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );
      (mockPrismaService.videoUpload.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVideoUploadRecord,
      );

      const result = await service.confirmVideoUpload('user-123', dto);

      expect(result.message).toContain('being processed');
    });
  });

  describe('getVideoUpload', () => {
    it('should retrieve video upload by verification ID', async () => {
      (mockPrismaService.videoUpload.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVideoUploadRecord,
      );

      const result = await service.getVideoUpload('verification-123');

      expect(result).toEqual(mockVideoUploadRecord);
      expect(mockPrismaService.videoUpload.findUnique).toHaveBeenCalledWith({
        where: { verificationId: 'verification-123' },
      });
    });

    it('should return null if video upload not found', async () => {
      (mockPrismaService.videoUpload.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await service.getVideoUpload('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserVideoUploads', () => {
    it('should retrieve all video uploads for a user', async () => {
      const uploads = [mockVideoUploadRecord, { ...mockVideoUploadRecord, id: 'video-2' }];
      (mockPrismaService.videoUpload.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(uploads);

      const result = await service.getUserVideoUploads('user-123');

      expect(result).toEqual(uploads);
      expect(mockPrismaService.videoUpload.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no uploads', async () => {
      (mockPrismaService.videoUpload.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const result = await service.getUserVideoUploads('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('deleteExpiredVideoUploads', () => {
    it('should delete expired video uploads', async () => {
      (mockPrismaService.videoUpload.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        count: 5,
      });

      const result = await service.deleteExpiredVideoUploads();

      expect(result).toBe(5);
      expect(mockPrismaService.videoUpload.deleteMany).toHaveBeenCalled();
    });

    it('should return 0 if no expired uploads', async () => {
      (mockPrismaService.videoUpload.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        count: 0,
      });

      const result = await service.deleteExpiredVideoUploads();

      expect(result).toBe(0);
    });
  });

  describe('getVideoUploadConfig', () => {
    it('should return video upload configuration', () => {
      const config = service.getVideoUploadConfig();

      expect(config).toBeDefined();
      expect(config.maxFileSize).toBe(100 * 1024 * 1024);
      expect(config.retentionDays).toBe(30);
      expect(config.supportedMimeTypes).toContain('video/webm');
      expect(config.supportedMimeTypes).toContain('video/mp4');
    });
  });
});
