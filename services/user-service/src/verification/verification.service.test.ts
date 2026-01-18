import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { VideoVerificationService } from './video-challenge.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { VerificationType, VerificationStatus } from '@prisma/client';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: PrismaService;
  let videoVerificationService: VideoVerificationService;

  const mockPrismaService = {
    verificationRecord: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    videoUpload: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockVideoVerificationService = {
    generateChallenge: jest.fn(),
    generateUploadUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: VideoVerificationService, useValue: mockVideoVerificationService },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    prisma = module.get<PrismaService>(PrismaService);
    videoVerificationService = module.get<VideoVerificationService>(
      VideoVerificationService,
    );

    jest.clearAllMocks();
  });

  describe('requestVerification', () => {
    it('should create a new verification request', async () => {
      const userId = 'user-123';
      const request = { type: 'PHONE', phoneNumber: '+1234567890' };
      const mockVerification = {
        id: 'verification-123',
        userId,
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: '+1234567890',
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.verificationRecord.create.mockResolvedValue(mockVerification);

      const result = await service.requestVerification(userId, request as any);

      expect(result.verificationId).toBe('verification-123');
      expect(result.type).toBe('PHONE');
      expect(mockPrismaService.verificationRecord.create).toHaveBeenCalled();
    });

    it('should throw error if user already has pending verification', async () => {
      const userId = 'user-123';
      const request = { type: 'PHONE', phoneNumber: '+1234567890' };
      const existingVerification = {
        id: 'verification-existing',
        userId,
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: '+1234567890',
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValue(
        existingVerification,
      );

      await expect(
        service.requestVerification(userId, request as any),
      ).rejects.toThrow();
    });
  });

  describe('markExpiredVerifications', () => {
    it('should mark expired verifications as EXPIRED', async () => {
      const userId = 'user-123';
      const mockResult = { count: 2 };

      mockPrismaService.verificationRecord.updateMany.mockResolvedValue(mockResult);

      const result = await service.markExpiredVerifications(userId);

      expect(result).toBe(2);
      expect(mockPrismaService.verificationRecord.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            status: VerificationStatus.PENDING,
          }),
          data: { status: VerificationStatus.EXPIRED },
        }),
      );
    });

    it('should mark all expired verifications without user filter', async () => {
      const mockResult = { count: 5 };

      mockPrismaService.verificationRecord.updateMany.mockResolvedValue(mockResult);

      const result = await service.markExpiredVerifications();

      expect(result).toBe(5);
      expect(mockPrismaService.verificationRecord.updateMany).toHaveBeenCalled();
    });
  });

  describe('reVerify', () => {
    it('should initiate re-verification and cleanup old records', async () => {
      const userId = 'user-123';
      const verificationType = VerificationType.VIDEO;
      const oldVerifications = [
        {
          id: 'old-1',
          userId,
          type: VerificationType.VIDEO,
          status: VerificationStatus.EXPIRED,
          createdAt: new Date('2026-01-01'),
          expiresAt: new Date(),
          verifiedAt: null,
          providerReference: null,
        },
      ];

      const newVerification = {
        id: 'new-verification',
        userId,
        type: VerificationType.VIDEO,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: null,
      };

      mockPrismaService.verificationRecord.findMany.mockResolvedValue(
        oldVerifications,
      );
      mockPrismaService.videoUpload.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.verificationRecord.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.verificationRecord.create.mockResolvedValue(newVerification);
      mockVideoVerificationService.generateChallenge.mockReturnValue({
        type: 'RANDOM_PHRASE',
        instruction: 'Say this phrase',
        randomValue: 'test phrase',
      });
      mockVideoVerificationService.generateUploadUrl.mockResolvedValue(
        'https://s3.example.com/upload-url',
      );

      const result = await service.reVerify(userId, verificationType);

      expect(result.verificationId).toBe('new-verification');
      expect(mockPrismaService.videoUpload.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.verificationRecord.deleteMany).toHaveBeenCalled();
    });

    it('should request new verification without old records', async () => {
      const userId = 'user-123';
      const verificationType = VerificationType.PHONE;

      mockPrismaService.verificationRecord.findMany.mockResolvedValue([]);
      mockPrismaService.verificationRecord.findFirst.mockResolvedValue(null);
      mockPrismaService.verificationRecord.create.mockResolvedValue({
        id: 'new-phone-verification',
        userId,
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: null,
      });

      const result = await service.reVerify(userId, verificationType);

      expect(result.verificationId).toBe('new-phone-verification');
    });
  });

  describe('getVerification', () => {
    it('should return verification if not expired', async () => {
      const verificationId = 'verification-123';
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockVerification = {
        id: verificationId,
        userId: 'user-123',
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: futureDate,
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: null,
      };

      mockPrismaService.verificationRecord.findUnique.mockResolvedValue(
        mockVerification,
      );

      const result = await service.getVerification(verificationId);

      expect(result).toEqual(mockVerification);
    });

    it('should auto-mark verification as expired if past expiry', async () => {
      const verificationId = 'verification-123';
      const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const mockVerification = {
        id: verificationId,
        userId: 'user-123',
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: pastDate,
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: null,
      };

      mockPrismaService.verificationRecord.findUnique.mockResolvedValue(
        mockVerification,
      );
      mockPrismaService.verificationRecord.update.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.EXPIRED,
      });

      const result = await service.getVerification(verificationId);

      expect(result.status).toBe(VerificationStatus.EXPIRED);
      expect(mockPrismaService.verificationRecord.update).toHaveBeenCalled();
    });
  });

  describe('completeVerification', () => {
    it('should mark verification as VERIFIED', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';
      const mockVerification = {
        id: verificationId,
        userId,
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: null,
      };

      mockPrismaService.verificationRecord.findUnique.mockResolvedValue(
        mockVerification,
      );
      mockPrismaService.verificationRecord.update.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      });

      const result = await service.completeVerification(verificationId, userId);

      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(mockPrismaService.verificationRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: verificationId },
          data: {
            status: VerificationStatus.VERIFIED,
            verifiedAt: expect.any(Date),
          },
        }),
      );
    });

    it('should throw error if verification not found', async () => {
      const verificationId = 'non-existent';
      const userId = 'user-123';

      mockPrismaService.verificationRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.completeVerification(verificationId, userId),
      ).rejects.toThrow();
    });

    it('should throw error if unauthorized', async () => {
      const verificationId = 'verification-123';
      const userId = 'user-123';
      const differentUserId = 'user-456';
      const mockVerification = {
        id: verificationId,
        userId: differentUserId,
        type: VerificationType.PHONE,
        status: VerificationStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        verifiedAt: null,
        providerReference: null,
      };

      mockPrismaService.verificationRecord.findUnique.mockResolvedValue(
        mockVerification,
      );

      await expect(
        service.completeVerification(verificationId, userId),
      ).rejects.toThrow();
    });
  });

  describe('isVerified', () => {
    it('should return true if user has verified status', async () => {
      const userId = 'user-123';
      const verificationType = VerificationType.PHONE;
      const mockVerification = {
        id: 'verification-123',
        userId,
        type: verificationType,
        status: VerificationStatus.VERIFIED,
        expiresAt: new Date(),
        createdAt: new Date(),
        verifiedAt: new Date(),
        providerReference: null,
      };

      mockPrismaService.verificationRecord.findFirst.mockResolvedValue(
        mockVerification,
      );

      const result = await service.isVerified(userId, verificationType);

      expect(result).toBe(true);
    });

    it('should return false if user does not have verified status', async () => {
      const userId = 'user-123';
      const verificationType = VerificationType.PHONE;

      mockPrismaService.verificationRecord.findFirst.mockResolvedValue(null);

      const result = await service.isVerified(userId, verificationType);

      expect(result).toBe(false);
    });
  });
});
