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

      (mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      (mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );

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

      (mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      (mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(govIdRecord);

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

      (mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

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

      (mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );

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

      (mockPrismaService.verificationRecord.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        expiredVerification,
      );
      (mockPrismaService.verificationRecord.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );

      const result = await service.requestVerification(userId, request);

      expect(result).toHaveProperty('verificationId');
      expect(mockPrismaService.verificationRecord.create).toHaveBeenCalled();
    });
  });

  describe('getVerification', () => {
    it('should retrieve a verification record by ID', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );

      const result = await service.getVerification('verification-123');

      expect(result).toEqual(mockVerificationRecord);
      expect(mockPrismaService.verificationRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'verification-123' },
      });
    });

    it('should return null if verification not found', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await service.getVerification('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPendingVerifications', () => {
    it('should retrieve pending verifications for a user', async () => {
      const userId = 'user-123';
      (mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        mockVerificationRecord,
      ]);

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
      (mockPrismaService.verificationRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const result = await service.getPendingVerifications('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('cancelVerification', () => {
    it('should cancel a pending verification', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';

      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );
      (mockPrismaService.verificationRecord.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(service.cancelVerification('nonexistent', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification does not belong to user', async () => {
      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockVerificationRecord,
      );

      await expect(service.cancelVerification('verification-123', 'wrong-user')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if verification is not pending', async () => {
      const verifiedRecord = {
        ...mockVerificationRecord,
        status: 'VERIFIED',
      };

      (mockPrismaService.verificationRecord.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(verifiedRecord);

      await expect(service.cancelVerification('verification-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
