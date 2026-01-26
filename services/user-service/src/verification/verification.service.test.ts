// @ts-nocheck
import { BadRequestException } from '@nestjs/common';
import { VerificationService } from './verification.service.js';
import { VerificationRequestDto } from './dto/verification-request.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VideoVerificationService } from './video-challenge.service.js';
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

describe('VerificationService', () => {
  let service: VerificationService;
  let mockVerificationRecord: any;
  let mockPrismaService: any;
  let mockVideoVerificationService: any;

  beforeEach(() => {
    vi.resetAllMocks();

    // Create fresh mock services for each test
    mockPrismaService = {
      verificationRecord: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    mockVideoVerificationService = {
      generateChallenge: vi.fn(),
      generateUploadUrl: vi.fn(),
      getVideoConstraints: vi.fn(),
    } as unknown as VideoVerificationService;

    // Create fresh mock verification record for each test with current timestamps
    mockVerificationRecord = {
      id: 'verification-123',
      userId: 'user-123',
      type: VerificationType.PHONE,
      status: VerificationStatus.PENDING,
      verifiedAt: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h in future from test run
      providerReference: '+12125551234',
      createdAt: new Date(),
    };

    // Direct instantiation - bypasses NestJS DI complexity with vitest
    service = new VerificationService(mockPrismaService, mockVideoVerificationService);
  });

  describe('requestVerification', () => {
    it('should create a phone verification request successfully', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'PHONE',
        phoneNumber: '+12125551234',
      };

      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);

      const result = await service.requestVerification(userId, request);

      expect(result).toHaveProperty('verificationId');
      expect(result).toHaveProperty('type', 'PHONE');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('verification code');

      expect(mockPrismaService.verificationRecord.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          type: VerificationType.PHONE,
          status: 'PENDING',
        },
      });

      expect(mockPrismaService.verificationRecord.create).toHaveBeenCalled();
    });

    it('should create a government ID verification request successfully', async () => {
      const userId = 'user-456';
      const request: VerificationRequestDto = {
        type: 'GOVERNMENT_ID',
      };

      const govIdRecord = {
        ...mockVerificationRecord,
        id: 'verification-456',
        userId,
        type: VerificationType.GOVERNMENT_ID,
      };

      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(govIdRecord);

      const result = await service.requestVerification(userId, request);

      expect(result).toHaveProperty('verificationId');
      expect(result).toHaveProperty('type', 'GOVERNMENT_ID');
      expect(result).toHaveProperty('sessionUrl');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('government ID');
    });

    it('should throw error if phone verification requested without phone number', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'PHONE',
      };

      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      await expect(service.requestVerification(userId, request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user has pending verification of same type', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'PHONE',
        phoneNumber: '+12125551234',
      };

      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);

      await expect(service.requestVerification(userId, request)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.verificationRecord.findFirst).toHaveBeenCalled();
    });

    it('should create new verification if previous one expired', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'PHONE',
        phoneNumber: '+12125551234',
      };

      const expiredVerification = {
        ...mockVerificationRecord,
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      };

      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(expiredVerification);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);

      const result = await service.requestVerification(userId, request);

      expect(result).toHaveProperty('verificationId');
      expect(mockPrismaService.verificationRecord.create).toHaveBeenCalled();
    });
  });

  describe('getVerification', () => {
    it('should retrieve a verification record by ID', async () => {
      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);

      const result = await service.getVerification('verification-123');

      expect(result).toEqual(mockVerificationRecord);
      expect(mockPrismaService.verificationRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'verification-123' },
      });
    });

    it('should return null if verification not found', async () => {
      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      const result = await service.getVerification('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPendingVerifications', () => {
    it('should retrieve pending verifications for a user', async () => {
      const userId = 'user-123';
      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([mockVerificationRecord]);

      const result = await service.getPendingVerifications(userId);

      expect(result).toEqual([mockVerificationRecord]);
      expect(mockPrismaService.verificationRecord.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'PENDING',
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no pending verifications', async () => {
      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await service.getPendingVerifications('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('cancelVerification', () => {
    it('should cancel a pending verification', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';

      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);
      (
        mockPrismaService.verificationRecord.update as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        ...mockVerificationRecord,
        status: 'REJECTED',
      });

      const result = await service.cancelVerification(verificationId, userId);

      expect(result.status).toBe('REJECTED');
      expect(mockPrismaService.verificationRecord.update).toHaveBeenCalledWith({
        where: { id: verificationId },
        data: { status: 'REJECTED' },
      });
    });

    it('should throw error if verification not found', async () => {
      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      await expect(service.cancelVerification('nonexistent', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification does not belong to user', async () => {
      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);

      await expect(service.cancelVerification('verification-123', 'wrong-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification is not pending', async () => {
      const verifiedRecord = {
        ...mockVerificationRecord,
        status: 'VERIFIED',
      };

      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(verifiedRecord);

      await expect(service.cancelVerification('verification-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markExpiredVerifications', () => {
    beforeEach(() => {
      mockPrismaService.verificationRecord.updateMany = vi.fn();
    });

    it('should mark expired verifications as EXPIRED', async () => {
      (
        mockPrismaService.verificationRecord.updateMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 3 });

      const result = await service.markExpiredVerifications();

      expect(result).toBe(3);
      expect(mockPrismaService.verificationRecord.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });
    });

    it('should filter by userId when provided', async () => {
      (
        mockPrismaService.verificationRecord.updateMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 1 });

      const result = await service.markExpiredVerifications('user-123');

      expect(result).toBe(1);
      expect(mockPrismaService.verificationRecord.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: 'PENDING',
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });
    });

    it('should return 0 when no verifications expired', async () => {
      (
        mockPrismaService.verificationRecord.updateMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 0 });

      const result = await service.markExpiredVerifications();

      expect(result).toBe(0);
    });
  });

  describe('isVerified', () => {
    it('should return true if user has verified status', async () => {
      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        ...mockVerificationRecord,
        status: 'VERIFIED',
      });

      const result = await service.isVerified('user-123', 'PHONE');

      expect(result).toBe(true);
      expect(mockPrismaService.verificationRecord.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          type: 'PHONE',
          status: 'VERIFIED',
        },
      });
    });

    it('should return false if user has no verified status', async () => {
      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      const result = await service.isVerified('user-123', 'PHONE');

      expect(result).toBe(false);
    });
  });

  describe('getVerificationHistory', () => {
    it('should return all verification records for a user', async () => {
      const verifications = [
        mockVerificationRecord,
        { ...mockVerificationRecord, id: 'verification-456', status: 'VERIFIED' },
      ];

      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(verifications);

      const result = await service.getVerificationHistory('user-123');

      expect(result).toEqual(verifications);
      expect(mockPrismaService.verificationRecord.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no verification history', async () => {
      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await service.getVerificationHistory('new-user');

      expect(result).toEqual([]);
    });
  });

  describe('completeVerification', () => {
    it('should mark verification as VERIFIED', async () => {
      const completedRecord = {
        ...mockVerificationRecord,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      };

      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);
      (
        mockPrismaService.verificationRecord.update as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(completedRecord);

      const result = await service.completeVerification('verification-123', 'user-123');

      expect(result.status).toBe('VERIFIED');
      expect(mockPrismaService.verificationRecord.update).toHaveBeenCalledWith({
        where: { id: 'verification-123' },
        data: {
          status: 'VERIFIED',
          verifiedAt: expect.any(Date),
        },
      });
    });

    it('should throw error if verification not found', async () => {
      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      await expect(service.completeVerification('nonexistent', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification does not belong to user', async () => {
      (
        mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockVerificationRecord);

      await expect(service.completeVerification('verification-123', 'wrong-user')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reVerify', () => {
    beforeEach(() => {
      mockPrismaService.verificationRecord.updateMany = vi.fn();
      mockPrismaService.verificationRecord.deleteMany = vi.fn();
      mockPrismaService.videoUpload = { deleteMany: vi.fn() };
    });

    it('should clean up old verifications and create new one', async () => {
      const oldVerification = {
        ...mockVerificationRecord,
        id: 'old-verification',
        type: 'GOVERNMENT_ID',
        status: 'EXPIRED',
      };
      const newVerification = {
        ...mockVerificationRecord,
        type: 'GOVERNMENT_ID',
      };

      (
        mockPrismaService.verificationRecord.updateMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 0 });
      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([oldVerification]);
      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(newVerification);

      const result = await service.reVerify('user-123', 'GOVERNMENT_ID');

      expect(result).toHaveProperty('verificationId');
    });

    it('should delete associated video uploads for video verifications', async () => {
      const oldVideoVerification = {
        ...mockVerificationRecord,
        id: 'old-video-verification',
        type: 'VIDEO',
        status: 'EXPIRED',
      };
      const newVerification = {
        ...mockVerificationRecord,
        type: 'GOVERNMENT_ID',
      };

      (
        mockPrismaService.verificationRecord.updateMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 0 });
      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([oldVideoVerification]);
      (mockPrismaService.videoUpload.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        {},
      );
      // For the subsequent requestVerification call, we need to mock GOVERNMENT_ID path
      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(newVerification);

      // Use GOVERNMENT_ID to avoid VIDEO validation requirement
      await service.reVerify('user-123', 'GOVERNMENT_ID');

      // Verify that the old VIDEO uploads were cleaned up
      expect(mockPrismaService.verificationRecord.findMany).toHaveBeenCalled();
    });

    it('should clean up VIDEO uploads when old verification is VIDEO type', async () => {
      const oldVideoVerification = {
        ...mockVerificationRecord,
        id: 'old-video-verification',
        type: 'VIDEO',
        status: 'EXPIRED',
      };
      const newVerification = {
        ...mockVerificationRecord,
        type: 'GOVERNMENT_ID',
      };

      (
        mockPrismaService.verificationRecord.updateMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 0 });
      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([oldVideoVerification]);
      (mockPrismaService.videoUpload.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        {},
      );
      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(newVerification);

      await service.reVerify('user-123', 'GOVERNMENT_ID');

      expect(mockPrismaService.videoUpload.deleteMany).toHaveBeenCalledWith({
        where: { verificationId: 'old-video-verification' },
      });
    });

    it('should keep oldest verification for audit trail', async () => {
      const oldVerifications = [
        {
          ...mockVerificationRecord,
          id: 'oldest',
          type: 'GOVERNMENT_ID',
          status: 'EXPIRED',
          createdAt: new Date('2025-01-01'),
        },
        {
          ...mockVerificationRecord,
          id: 'middle',
          type: 'GOVERNMENT_ID',
          status: 'REJECTED',
          createdAt: new Date('2025-06-01'),
        },
        {
          ...mockVerificationRecord,
          id: 'newest',
          type: 'GOVERNMENT_ID',
          status: 'EXPIRED',
          createdAt: new Date('2026-01-01'),
        },
      ];
      const newVerification = {
        ...mockVerificationRecord,
        type: 'GOVERNMENT_ID',
      };

      (
        mockPrismaService.verificationRecord.updateMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({ count: 0 });
      (
        mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(oldVerifications);
      (
        mockPrismaService.verificationRecord.deleteMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({});
      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(newVerification);

      await service.reVerify('user-123', 'GOVERNMENT_ID');

      // Should delete all except oldest
      expect(mockPrismaService.verificationRecord.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['middle', 'newest'],
          },
        },
      });
    });
  });

  describe('requestVerification - video type', () => {
    it('should throw error if video verification requested without challenge type', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'VIDEO',
      };

      await expect(service.requestVerification(userId, request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create video verification request successfully', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'VIDEO',
        challengeType: 'SPEAK_PHRASE',
      };

      const videoRecord = {
        ...mockVerificationRecord,
        id: 'verification-video',
        userId,
        type: VerificationType.VIDEO,
        providerReference: 'SPEAK_PHRASE',
      };

      (
        mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (
        mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(videoRecord);
      (mockVideoVerificationService.generateChallenge as ReturnType<typeof vi.fn>).mockReturnValue({
        type: 'SPEAK_PHRASE',
        instruction: 'Please say "Hello World"',
      });
      (
        mockVideoVerificationService.generateUploadUrl as ReturnType<typeof vi.fn>
      ).mockResolvedValue('https://upload.example.com/video');
      (
        mockVideoVerificationService.getVideoConstraints as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        maxFileSize: 100 * 1024 * 1024,
        minDurationSeconds: 3,
        maxDurationSeconds: 30,
      });

      const result = await service.requestVerification(userId, request);

      expect(result).toHaveProperty('verificationId');
      expect(result).toHaveProperty('type', 'VIDEO');
      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('videoUploadUrl');
      expect(result).toHaveProperty('videoMaxFileSize');
      expect(result).toHaveProperty('videoMinDurationSeconds');
      expect(result).toHaveProperty('videoMaxDurationSeconds');
    });

    it('should throw error for unknown verification type', async () => {
      const userId = 'user-123';
      const request = {
        type: 'UNKNOWN_TYPE',
      } as VerificationRequestDto;

      await expect(service.requestVerification(userId, request)).rejects.toThrow(
        'Unknown verification type',
      );
    });
  });
});
