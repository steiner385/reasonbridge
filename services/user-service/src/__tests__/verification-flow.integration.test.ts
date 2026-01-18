import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VerificationService } from '../verification/verification.service.js';
import { VideoVerificationService } from '../verification/video-challenge.service.js';
import { VerificationRequestDto } from '../verification/dto/verification-request.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
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

describe('Verification Flow - Integration Tests', () => {
  let verificationService: VerificationService;
  let prismaService: PrismaService;
  let videoVerificationService: VideoVerificationService;

  const mockVerificationRecord = {
    id: 'verification-123',
    userId: 'user-123',
    type: VerificationType.PHONE,
    status: VerificationStatus.PENDING,
    verifiedAt: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    providerReference: '+12125551234',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    verificationRecord: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    videoUpload: {
      deleteMany: vi.fn(),
    },
  };

  const mockVideoVerificationService = {
    generateChallenge: vi.fn((type: string) => {
      switch (type) {
        case 'RANDOM_PHRASE':
          return {
            type: 'RANDOM_PHRASE',
            instruction: 'Say the following phrase: "I am a real human being"',
            randomValue: 'I am a real human being',
          };
        case 'RANDOM_GESTURE':
          return {
            type: 'RANDOM_GESTURE',
            instruction: 'Show both thumbs up',
            randomValue: 'Show both thumbs up',
          };
        case 'TIMESTAMP':
          return {
            type: 'TIMESTAMP',
            instruction: 'Display the current timestamp',
            timestamp: new Date().toISOString(),
          };
        default:
          throw new BadRequestException(`Unknown challenge type: ${type}`);
      }
    }),
    generateUploadUrl: vi.fn(async () =>
      'https://s3.example.com/presigned-url',
    ),
    getVideoConstraints: vi.fn(() => ({
      maxFileSize: 100 * 1024 * 1024,
      minDurationSeconds: 3,
      maxDurationSeconds: 30,
    })),
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create service directly without NestJS module to avoid dependency injection issues
    verificationService = new VerificationService(
      mockPrismaService as any,
      mockVideoVerificationService as any,
    );
    prismaService = mockPrismaService as any;
    videoVerificationService = mockVideoVerificationService as any;
  });

  describe('Complete Verification Flow', () => {
    it('should complete a full verification flow from request to completion', async () => {
      const userId = 'user-123';
      const verificationId = 'verification-123';

      // Step 1: Request verification
      const request: VerificationRequestDto = {
        type: 'PHONE',
        phoneNumber: '+12125551234',
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.verificationRecord.create.mockResolvedValue(
        mockVerificationRecord,
      );

      const response = await verificationService.requestVerification(
        userId,
        request,
      );

      expect(response).toHaveProperty('verificationId');
      expect(response.type).toBe('PHONE');

      // Step 2: Get verification status
      mockPrismaService.verificationRecord.findUnique.mockResolvedValueOnce(
        mockVerificationRecord,
      );

      const verification = await verificationService.getVerification(
        verificationId,
      );

      expect(verification.id).toBe(verificationId);
      expect(verification.status).toBe(VerificationStatus.PENDING);

      // Step 3: Complete verification
      const completedRecord = {
        ...mockVerificationRecord,
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      };

      mockPrismaService.verificationRecord.findUnique.mockResolvedValueOnce(
        mockVerificationRecord,
      );
      mockPrismaService.verificationRecord.update.mockResolvedValueOnce(
        completedRecord,
      );

      const result = await verificationService.completeVerification(
        verificationId,
        userId,
      );

      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.verifiedAt).toBeDefined();
    });

    it('should check if user is verified after completion', async () => {
      const userId = 'user-123';

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce({
        ...mockVerificationRecord,
        status: VerificationStatus.VERIFIED,
      });

      const isVerified = await verificationService.isVerified(
        userId,
        'PHONE',
      );

      expect(isVerified).toBe(true);
    });

    it('should return false if user is not verified', async () => {
      const userId = 'user-456';

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce(null);

      const isVerified = await verificationService.isVerified(
        userId,
        'PHONE',
      );

      expect(isVerified).toBe(false);
    });
  });

  describe('Re-verification Flow', () => {
    it('should mark expired verifications during re-verification process', async () => {
      const userId = 'user-123';

      // Just test that markExpiredVerifications is called
      mockPrismaService.verificationRecord.updateMany.mockResolvedValueOnce({
        count: 2,
      });

      const count = await verificationService.markExpiredVerifications(userId);

      expect(count).toBe(2);
      expect(mockPrismaService.verificationRecord.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: VerificationStatus.PENDING,
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: VerificationStatus.EXPIRED,
        },
      });
    });
  });

  describe('Expiration Flow', () => {
    it('should mark expired verifications as expired', async () => {
      const userId = 'user-123';

      mockPrismaService.verificationRecord.updateMany.mockResolvedValueOnce({
        count: 2,
      });

      const expiredCount = await verificationService.markExpiredVerifications(
        userId,
      );

      expect(expiredCount).toBe(2);
      expect(
        mockPrismaService.verificationRecord.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          userId,
          status: VerificationStatus.PENDING,
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: VerificationStatus.EXPIRED,
        },
      });
    });

    it('should mark all expired verifications when no userId provided', async () => {
      mockPrismaService.verificationRecord.updateMany.mockResolvedValueOnce({
        count: 5,
      });

      const expiredCount = await verificationService.markExpiredVerifications();

      expect(expiredCount).toBe(5);
      expect(
        mockPrismaService.verificationRecord.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          status: VerificationStatus.PENDING,
          expiresAt: {
            lt: expect.any(Date),
          },
        },
        data: {
          status: VerificationStatus.EXPIRED,
        },
      });
    });

    it('should return 0 when no verifications to mark as expired', async () => {
      mockPrismaService.verificationRecord.updateMany.mockResolvedValueOnce({
        count: 0,
      });

      const expiredCount = await verificationService.markExpiredVerifications(
        'user-123',
      );

      expect(expiredCount).toBe(0);
    });
  });

  describe('Video Verification Flow', () => {
    it('should create video verification request with challenge', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'VIDEO',
        challengeType: 'RANDOM_PHRASE',
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.verificationRecord.create.mockResolvedValueOnce({
        id: 'verification-123',
        userId: 'user-123',
        type: 'VIDEO',
        status: VerificationStatus.PENDING,
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        providerReference: 'RANDOM_PHRASE',
        createdAt: new Date(),
      });

      const response = await verificationService.requestVerification(
        userId,
        request,
      );

      expect(response.type).toBe('VIDEO');
      expect(response.challenge).toBeDefined();
      expect(response.challenge.type).toBe('RANDOM_PHRASE');
      expect(response.challenge.instruction).toBeDefined();
      expect(response.videoUploadUrl).toBeDefined();
      expect(response.videoMaxFileSize).toBeDefined();
      expect(response.videoMinDurationSeconds).toBeDefined();
      expect(response.videoMaxDurationSeconds).toBeDefined();
    });

    it('should support RANDOM_GESTURE challenge type', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'VIDEO',
        challengeType: 'RANDOM_GESTURE',
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.verificationRecord.create.mockResolvedValueOnce({
        ...mockVerificationRecord,
        type: VerificationType.VIDEO,
        providerReference: 'RANDOM_GESTURE',
        id: 'verification-gesture',
        userId: userId,
      });

      const response = await verificationService.requestVerification(
        userId,
        request,
      );

      expect(response.challenge.type).toBe('RANDOM_GESTURE');
      expect(response.challenge.randomValue).toBe('Show both thumbs up');
    });

    it('should support TIMESTAMP challenge type', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'VIDEO',
        challengeType: 'TIMESTAMP',
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.verificationRecord.create.mockResolvedValueOnce({
        ...mockVerificationRecord,
        type: VerificationType.VIDEO,
        providerReference: 'TIMESTAMP',
        id: 'verification-timestamp',
        userId: userId,
      });

      const response = await verificationService.requestVerification(
        userId,
        request,
      );

      expect(response.challenge.type).toBe('TIMESTAMP');
      expect(response.challenge.timestamp).toBeDefined();
    });

    it('should throw error for unknown challenge type', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'VIDEO',
        challengeType: 'UNKNOWN_TYPE' as any,
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce(null);

      await expect(
        verificationService.requestVerification(userId, request),
      ).rejects.toThrow('Unknown challenge type');
    });
  });

  describe('Verification History', () => {
    it('should retrieve verification history for a user', async () => {
      const userId = 'user-123';
      const verifications = [
        { ...mockVerificationRecord, id: 'verification-1' },
        { ...mockVerificationRecord, id: 'verification-2' },
        { ...mockVerificationRecord, id: 'verification-3' },
      ];

      mockPrismaService.verificationRecord.findMany.mockResolvedValueOnce(
        verifications,
      );

      const result = await verificationService.getVerificationHistory(userId);

      expect(result).toHaveLength(3);
      expect(
        mockPrismaService.verificationRecord.findMany,
      ).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no history exists', async () => {
      const userId = 'user-456';

      mockPrismaService.verificationRecord.findMany.mockResolvedValueOnce([]);

      const result = await verificationService.getVerificationHistory(userId);

      expect(result).toEqual([]);
    });
  });

  describe('Cancel Verification', () => {
    it('should cancel a pending verification', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';

      mockPrismaService.verificationRecord.findUnique.mockResolvedValueOnce(
        mockVerificationRecord,
      );
      mockPrismaService.verificationRecord.update.mockResolvedValueOnce({
        ...mockVerificationRecord,
        status: VerificationStatus.REJECTED,
      });

      const result = await verificationService.cancelVerification(
        verificationId,
        userId,
      );

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(
        mockPrismaService.verificationRecord.update,
      ).toHaveBeenCalledWith({
        where: { id: verificationId },
        data: { status: VerificationStatus.REJECTED },
      });
    });

    it('should prevent canceling non-pending verification', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';

      mockPrismaService.verificationRecord.findUnique.mockResolvedValueOnce({
        ...mockVerificationRecord,
        status: VerificationStatus.VERIFIED,
      });

      await expect(
        verificationService.cancelVerification(verificationId, userId),
      ).rejects.toThrow('Can only cancel pending verifications');
    });

    it('should prevent unauthorized cancellation', async () => {
      const verificationId = 'verification-123';
      const wrongUserId = 'user-wrong';

      mockPrismaService.verificationRecord.findUnique.mockResolvedValueOnce(
        mockVerificationRecord,
      );

      await expect(
        verificationService.cancelVerification(verificationId, wrongUserId),
      ).rejects.toThrow('Verification does not belong to this user');
    });
  });

  describe('Get Pending Verifications', () => {
    it('should retrieve pending verifications for a user', async () => {
      const userId = 'user-123';
      const pending = [
        { ...mockVerificationRecord, id: 'verification-1' },
        { ...mockVerificationRecord, id: 'verification-2' },
      ];

      mockPrismaService.verificationRecord.findMany.mockResolvedValueOnce(
        pending,
      );

      const result = await verificationService.getPendingVerifications(userId);

      expect(result).toHaveLength(2);
      expect(
        mockPrismaService.verificationRecord.findMany,
      ).toHaveBeenCalledWith({
        where: {
          userId,
          status: VerificationStatus.PENDING,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no pending verifications', async () => {
      mockPrismaService.verificationRecord.findMany.mockResolvedValueOnce([]);

      const result = await verificationService.getPendingVerifications(
        'user-456',
      );

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when verification not found for completion', async () => {
      mockPrismaService.verificationRecord.findUnique.mockResolvedValueOnce(
        null,
      );

      await expect(
        verificationService.completeVerification('nonexistent', 'user-123'),
      ).rejects.toThrow('Verification not found');
    });

    it('should throw error for unknown verification type', async () => {
      const userId = 'user-123';
      const request = {
        type: 'UNKNOWN_TYPE',
      } as any;

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce(null);

      await expect(
        verificationService.requestVerification(userId, request),
      ).rejects.toThrow('Unknown verification type');
    });

    it('should throw error when video verification missing challenge type', async () => {
      const userId = 'user-123';
      const request: VerificationRequestDto = {
        type: 'VIDEO',
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValueOnce(null);

      await expect(
        verificationService.requestVerification(userId, request),
      ).rejects.toThrow('Challenge type is required for video verification');
    });

    it('should handle user having multiple expired verifications', async () => {
      const userId = 'user-123';

      mockPrismaService.verificationRecord.updateMany.mockResolvedValueOnce({
        count: 3,
      });

      const expiredCount = await verificationService.markExpiredVerifications(
        userId,
      );

      expect(expiredCount).toBe(3);
    });
  });
});
