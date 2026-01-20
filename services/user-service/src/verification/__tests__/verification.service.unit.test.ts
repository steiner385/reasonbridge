import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VerificationService } from '../verification.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { VideoVerificationService } from '../video-challenge.service.js';
import type { VerificationRequestDto } from '../dto/verification-request.dto.js';

// Inline type definitions to avoid Prisma import issues in Vitest
enum VerificationType {
  PHONE = 'PHONE',
  GOVERNMENT_ID = 'GOVERNMENT_ID',
  VIDEO = 'VIDEO',
}

enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

describe('VerificationService', () => {
  let service: VerificationService;
  let prismaService: PrismaService;
  let videoVerificationService: VideoVerificationService;

  const mockVerificationRecord = {
    id: 'verify-1',
    userId: 'user-1',
    type: VerificationType.PHONE,
    status: VerificationStatus.PENDING,
    phoneNumber: '+12025551234',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    verificationCode: 'ABC123',
    verifiedAt: null,
    providerReference: null,
    metadata: null,
  };

  const mockVideoChallenge = {
    type: 'RANDOM_PHRASE',
    instruction: 'Please say: hello world',
    randomValue: 'hello world',
  };

  beforeEach(() => {
    prismaService = {
      verificationRecord: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      videoUpload: {
        deleteMany: vi.fn(),
      },
    } as unknown as PrismaService;

    videoVerificationService = {
      generateChallenge: vi.fn().mockResolvedValue(mockVideoChallenge),
      generateUploadUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://s3.example.com/upload',
        expiresIn: 3600,
      }),
      getVideoConstraints: vi.fn().mockReturnValue({
        maxFileSize: 104857600,
        minDurationSeconds: 5,
        maxDurationSeconds: 60,
      }),
    } as unknown as VideoVerificationService;

    service = new VerificationService(prismaService, videoVerificationService);
  });

  describe('requestVerification', () => {
    it('should request phone verification', async () => {
      const request: VerificationRequestDto = {
        type: 'PHONE',
        phoneNumber: '+12025551234',
      };

      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prismaService.verificationRecord.create).mockResolvedValue(
        mockVerificationRecord as any,
      );

      const result = await service.requestVerification('user-1', request);

      expect(result).toBeDefined();
      expect(result.verificationId).toBe('verify-1');
      expect(result.type).toBe('PHONE');
    });

    it('should throw BadRequestException for missing phone number in phone verification', async () => {
      const request: VerificationRequestDto = {
        type: 'PHONE',
        phoneNumber: undefined,
      };

      await expect(service.requestVerification('user-1', request)).rejects.toThrow(
        new BadRequestException('Phone number is required for phone verification'),
      );
    });

    it('should throw BadRequestException for missing challenge type in video verification', async () => {
      const request: VerificationRequestDto = {
        type: 'VIDEO',
        challengeType: undefined,
      };

      await expect(service.requestVerification('user-1', request)).rejects.toThrow(
        new BadRequestException('Challenge type is required for video verification'),
      );
    });

    it('should throw BadRequestException if pending verification already exists', async () => {
      const request: VerificationRequestDto = {
        type: 'PHONE',
        phoneNumber: '+12025551234',
      };

      const pendingVerification = {
        ...mockVerificationRecord,
        expiresAt: new Date(Date.now() + 1000000),
      };
      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(
        pendingVerification as any,
      );

      await expect(service.requestVerification('user-1', request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unknown verification type', async () => {
      const request = {
        type: 'INVALID_TYPE',
      } as any;

      await expect(service.requestVerification('user-1', request)).rejects.toThrow(
        new BadRequestException('Unknown verification type: INVALID_TYPE'),
      );
    });

    it('should request government ID verification', async () => {
      const request: VerificationRequestDto = {
        type: 'GOVERNMENT_ID',
      };

      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prismaService.verificationRecord.create).mockResolvedValue({
        ...mockVerificationRecord,
        type: VerificationType.GOVERNMENT_ID,
      } as any);

      const result = await service.requestVerification('user-1', request);

      expect(result.type).toBe('GOVERNMENT_ID');
    });

    it('should request video verification with challenge type', async () => {
      const request: VerificationRequestDto = {
        type: 'VIDEO',
        challengeType: 'RANDOM_PHRASE',
      };

      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(null);
      vi.mocked(prismaService.verificationRecord.create).mockResolvedValue({
        ...mockVerificationRecord,
        type: VerificationType.VIDEO,
      } as any);

      const result = await service.requestVerification('user-1', request);

      expect(result.type).toBe('VIDEO');
    });
  });

  describe('getVerification', () => {
    it('should retrieve a verification record', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(
        mockVerificationRecord as any,
      );

      const result = await service.getVerification('verify-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('verify-1');
      expect(result.status).toBe(VerificationStatus.PENDING);
    });

    it('should return null if verification not found', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(null);

      const result = await service.getVerification('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getPendingVerifications', () => {
    it('should retrieve pending verifications for user', async () => {
      const pendingVerifications = [
        mockVerificationRecord,
        { ...mockVerificationRecord, id: 'verify-2', type: VerificationType.GOVERNMENT_ID },
      ];
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue(
        pendingVerifications as any,
      );

      const result = await service.getPendingVerifications('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(VerificationStatus.PENDING);
    });

    it('should return empty array if no pending verifications', async () => {
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue([] as any);

      const result = await service.getPendingVerifications('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('cancelVerification', () => {
    it('should cancel a pending verification', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(
        mockVerificationRecord as any,
      );
      vi.mocked(prismaService.verificationRecord.update).mockResolvedValue({
        ...mockVerificationRecord,
        status: VerificationStatus.REJECTED,
      } as any);

      const result = await service.cancelVerification('verify-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(prismaService.verificationRecord.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if verification not found', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(null);

      await expect(service.cancelVerification('non-existent', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if not owned by user', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(
        mockVerificationRecord as any,
      );

      await expect(service.cancelVerification('verify-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already verified', async () => {
      const verifiedRecord = {
        ...mockVerificationRecord,
        status: VerificationStatus.VERIFIED,
      };
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(
        verifiedRecord as any,
      );

      await expect(service.cancelVerification('verify-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markExpiredVerifications', () => {
    it('should mark expired verifications as expired', async () => {
      const expiredRecord = {
        ...mockVerificationRecord,
        expiresAt: new Date(Date.now() - 1000000),
      };
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue([
        expiredRecord,
      ] as any);
      vi.mocked(prismaService.verificationRecord.updateMany).mockResolvedValue({
        count: 1,
      } as any);

      const result = await service.markExpiredVerifications();

      expect(result).toBe(1);
    });

    it('should handle no expired verifications', async () => {
      vi.mocked(prismaService.verificationRecord.updateMany).mockResolvedValue({
        count: 0,
      } as any);

      const result = await service.markExpiredVerifications();

      expect(result).toBe(0);
    });

    it('should mark expired verifications for specific user', async () => {
      const expiredRecord = {
        ...mockVerificationRecord,
        expiresAt: new Date(Date.now() - 1000000),
      };
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue([
        expiredRecord,
      ] as any);
      vi.mocked(prismaService.verificationRecord.updateMany).mockResolvedValue({
        count: 1,
      } as any);

      const result = await service.markExpiredVerifications('user-1');

      expect(result).toBe(1);
    });
  });

  describe('reVerify', () => {
    it('should allow reverification of expired verification', async () => {
      vi.mocked(prismaService.verificationRecord.updateMany).mockResolvedValue({
        count: 1,
      } as any);
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue([] as any);
      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(null);
      const newVerif = {
        ...mockVerificationRecord,
        type: VerificationType.GOVERNMENT_ID,
      };
      vi.mocked(prismaService.verificationRecord.create).mockResolvedValue(newVerif as any);

      const result = await service.reVerify('user-1', 'GOVERNMENT_ID');

      expect(result).toBeDefined();
      expect(prismaService.verificationRecord.updateMany).toHaveBeenCalled();
    });

    it('should clean up old verifications before creating new one', async () => {
      const oldVerification = {
        ...mockVerificationRecord,
        id: 'old-verify',
        status: VerificationStatus.EXPIRED,
      };
      vi.mocked(prismaService.verificationRecord.updateMany).mockResolvedValue({
        count: 0,
      } as any);
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue([
        oldVerification,
      ] as any);
      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(null);
      const newVerif = {
        ...mockVerificationRecord,
        type: VerificationType.GOVERNMENT_ID,
      };
      vi.mocked(prismaService.verificationRecord.create).mockResolvedValue(newVerif as any);

      const result = await service.reVerify('user-1', 'GOVERNMENT_ID');

      expect(result).toBeDefined();
    });
  });

  describe('isVerified', () => {
    it('should return true if user has verified status', async () => {
      const verifiedRecord = {
        ...mockVerificationRecord,
        status: VerificationStatus.VERIFIED,
      };
      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(
        verifiedRecord as any,
      );

      const result = await service.isVerified('user-1', 'PHONE');

      expect(result).toBe(true);
    });

    it('should return false if user has no verified verification', async () => {
      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(null);

      const result = await service.isVerified('user-1', 'PHONE');

      expect(result).toBe(false);
    });

    it('should return false if verification is pending (not verified)', async () => {
      // isVerified only returns true if status is VERIFIED, not PENDING
      // So we need to mock findFirst returning null (no verified record found)
      vi.mocked(prismaService.verificationRecord.findFirst).mockResolvedValue(null);

      const result = await service.isVerified('user-1', 'PHONE');

      expect(result).toBe(false);
    });
  });

  describe('getVerificationHistory', () => {
    it('should retrieve verification history for user', async () => {
      const history = [
        mockVerificationRecord,
        { ...mockVerificationRecord, id: 'verify-2', status: VerificationStatus.VERIFIED },
      ];
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue(history as any);

      const result = await service.getVerificationHistory('user-1');

      expect(result).toHaveLength(2);
    });

    it('should return empty array if no history', async () => {
      vi.mocked(prismaService.verificationRecord.findMany).mockResolvedValue([] as any);

      const result = await service.getVerificationHistory('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('completeVerification', () => {
    it('should mark verification as completed', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(
        mockVerificationRecord as any,
      );
      vi.mocked(prismaService.verificationRecord.update).mockResolvedValue({
        ...mockVerificationRecord,
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      } as any);

      const result = await service.completeVerification('verify-1', 'user-1');

      expect(result).toBeDefined();
      expect(prismaService.verificationRecord.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if verification not found', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(null);

      await expect(service.completeVerification('non-existent', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if not owned by user', async () => {
      vi.mocked(prismaService.verificationRecord.findUnique).mockResolvedValue(
        mockVerificationRecord as any,
      );

      await expect(service.completeVerification('verify-1', 'different-user')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
