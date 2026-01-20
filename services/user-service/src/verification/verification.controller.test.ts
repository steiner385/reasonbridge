import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VerificationController } from './verification.controller.js';

const createMockVerificationService = () => ({
  requestVerification: vi.fn(),
  getVerification: vi.fn(),
  getPendingVerifications: vi.fn(),
  completeVerification: vi.fn(),
  reVerify: vi.fn(),
  getVerificationHistory: vi.fn(),
});

const createMockVideoUploadService = () => ({
  confirmVideoUpload: vi.fn(),
});

describe('VerificationController', () => {
  let controller: VerificationController;
  let mockVerificationService: ReturnType<typeof createMockVerificationService>;
  let mockVideoUploadService: ReturnType<typeof createMockVideoUploadService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerificationService = createMockVerificationService();
    mockVideoUploadService = createMockVideoUploadService();
    controller = new VerificationController(
      mockVerificationService as any,
      mockVideoUploadService as any,
    );
  });

  describe('requestVerification', () => {
    it('should request phone verification', async () => {
      const request = { type: 'PHONE', phoneNumber: '+12125551234' };
      const expectedResponse = {
        verificationId: 'verification-1',
        type: 'PHONE',
        expiresAt: new Date(),
        message: 'A verification code will be sent to your phone number shortly...',
      };
      mockVerificationService.requestVerification.mockResolvedValue(expectedResponse);

      const result = await controller.requestVerification('user-1', request as any);

      expect(result).toEqual(expectedResponse);
      expect(mockVerificationService.requestVerification).toHaveBeenCalledWith('user-1', request);
    });

    it('should request government ID verification', async () => {
      const request = { type: 'GOVERNMENT_ID' };
      const expectedResponse = {
        verificationId: 'verification-2',
        type: 'GOVERNMENT_ID',
        uploadUrl: 'https://presigned-url.example.com',
      };
      mockVerificationService.requestVerification.mockResolvedValue(expectedResponse);

      const result = await controller.requestVerification('user-1', request as any);

      expect(result).toEqual(expectedResponse);
    });

    it('should request video verification', async () => {
      const request = { type: 'VIDEO', challengeType: 'random_phrase' };
      const expectedResponse = {
        verificationId: 'verification-3',
        type: 'VIDEO',
        uploadUrl: 'https://video-upload-url.example.com',
        challenge: 'Please say: Hello world',
      };
      mockVerificationService.requestVerification.mockResolvedValue(expectedResponse);

      const result = await controller.requestVerification('user-1', request as any);

      expect(result).toEqual(expectedResponse);
      expect(mockVerificationService.requestVerification).toHaveBeenCalledWith('user-1', request);
    });
  });

  describe('confirmVideoUpload', () => {
    it('should confirm video upload completion', async () => {
      const dto = {
        verificationId: 'verification-1',
        fileName: 'verification.webm',
        fileSize: 2097152,
        mimeType: 'video/webm',
      };
      const expectedResponse = {
        videoUploadId: 'upload-1',
        verificationId: 'verification-1',
        s3Url: 's3://bucket/videos/user-1/file.webm',
        fileName: 'verification.webm',
        fileSize: 2097152,
        completedAt: new Date(),
        expiresAt: new Date(),
        message: 'Video upload confirmed. Your video is being processed...',
      };
      mockVideoUploadService.confirmVideoUpload.mockResolvedValue(expectedResponse);

      const result = await controller.confirmVideoUpload('user-1', dto as any);

      expect(result).toEqual(expectedResponse);
      expect(mockVideoUploadService.confirmVideoUpload).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status for valid user', async () => {
      const verification = {
        id: 'verification-1',
        userId: 'user-1',
        type: 'PHONE',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        verifiedAt: null,
      };
      mockVerificationService.getVerification.mockResolvedValue(verification);

      const result = await controller.getVerificationStatus('verification-1', 'user-1');

      expect(result).toEqual({
        id: verification.id,
        type: verification.type,
        status: verification.status,
        createdAt: verification.createdAt,
        expiresAt: verification.expiresAt,
        verifiedAt: verification.verifiedAt,
        isExpired: false,
      });
    });

    it('should return isExpired true for expired verification', async () => {
      const verification = {
        id: 'verification-1',
        userId: 'user-1',
        type: 'PHONE',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        verifiedAt: null,
      };
      mockVerificationService.getVerification.mockResolvedValue(verification);

      const result = await controller.getVerificationStatus('verification-1', 'user-1');

      expect(result.isExpired).toBe(true);
    });

    it('should throw error when verification not found', async () => {
      mockVerificationService.getVerification.mockResolvedValue(null);

      await expect(controller.getVerificationStatus('verification-1', 'user-1')).rejects.toThrow(
        'Verification not found or unauthorized',
      );
    });

    it('should throw error when user is not authorized', async () => {
      const verification = {
        id: 'verification-1',
        userId: 'different-user',
        type: 'PHONE',
        status: 'PENDING',
      };
      mockVerificationService.getVerification.mockResolvedValue(verification);

      await expect(controller.getVerificationStatus('verification-1', 'user-1')).rejects.toThrow(
        'Verification not found or unauthorized',
      );
    });
  });

  describe('getPendingVerifications', () => {
    it('should return pending verifications for user', async () => {
      const pendingVerifications = [
        { id: 'verification-1', type: 'PHONE', status: 'PENDING' },
        { id: 'verification-2', type: 'GOVERNMENT_ID', status: 'PENDING' },
      ];
      mockVerificationService.getPendingVerifications.mockResolvedValue(pendingVerifications);

      const result = await controller.getPendingVerifications('user-1');

      expect(result).toEqual(pendingVerifications);
      expect(mockVerificationService.getPendingVerifications).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when no pending verifications', async () => {
      mockVerificationService.getPendingVerifications.mockResolvedValue([]);

      const result = await controller.getPendingVerifications('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('completeVerification', () => {
    it('should complete verification', async () => {
      const completedVerification = {
        id: 'verification-1',
        type: 'PHONE',
        status: 'VERIFIED',
        verifiedAt: new Date(),
      };
      mockVerificationService.completeVerification.mockResolvedValue(completedVerification);

      const result = await controller.completeVerification('verification-1', 'user-1');

      expect(result).toEqual(completedVerification);
      expect(mockVerificationService.completeVerification).toHaveBeenCalledWith(
        'verification-1',
        'user-1',
      );
    });
  });

  describe('reVerify', () => {
    it('should initiate re-verification for expired verification', async () => {
      const originalVerification = {
        id: 'verification-1',
        userId: 'user-1',
        type: 'PHONE',
        status: 'EXPIRED',
      };
      const newVerificationResponse = {
        verificationId: 'verification-2',
        type: 'PHONE',
        message: 'New verification started',
      };
      mockVerificationService.getVerification.mockResolvedValue(originalVerification);
      mockVerificationService.reVerify.mockResolvedValue(newVerificationResponse);

      const result = await controller.reVerify('verification-1', 'user-1');

      expect(result).toEqual(newVerificationResponse);
      expect(mockVerificationService.reVerify).toHaveBeenCalledWith('user-1', 'PHONE');
    });

    it('should initiate re-verification for government ID type', async () => {
      const originalVerification = {
        id: 'verification-1',
        userId: 'user-1',
        type: 'GOVERNMENT_ID',
        status: 'EXPIRED',
      };
      mockVerificationService.getVerification.mockResolvedValue(originalVerification);
      mockVerificationService.reVerify.mockResolvedValue({ verificationId: 'verification-2' });

      await controller.reVerify('verification-1', 'user-1');

      expect(mockVerificationService.reVerify).toHaveBeenCalledWith('user-1', 'GOVERNMENT_ID');
    });

    it('should throw error when original verification not found', async () => {
      mockVerificationService.getVerification.mockResolvedValue(null);

      await expect(controller.reVerify('verification-1', 'user-1')).rejects.toThrow(
        'Verification not found or unauthorized',
      );
    });

    it('should throw error when user is not authorized', async () => {
      const originalVerification = {
        id: 'verification-1',
        userId: 'different-user',
        type: 'PHONE',
        status: 'EXPIRED',
      };
      mockVerificationService.getVerification.mockResolvedValue(originalVerification);

      await expect(controller.reVerify('verification-1', 'user-1')).rejects.toThrow(
        'Verification not found or unauthorized',
      );
    });
  });

  describe('getVerificationHistory', () => {
    it('should return verification history for user', async () => {
      const history = [
        { id: 'verification-1', type: 'PHONE', status: 'VERIFIED' },
        { id: 'verification-2', type: 'GOVERNMENT_ID', status: 'EXPIRED' },
        { id: 'verification-3', type: 'VIDEO', status: 'REJECTED' },
      ];
      mockVerificationService.getVerificationHistory.mockResolvedValue(history);

      const result = await controller.getVerificationHistory('user-1');

      expect(result).toEqual(history);
      expect(mockVerificationService.getVerificationHistory).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when no history', async () => {
      mockVerificationService.getVerificationHistory.mockResolvedValue([]);

      const result = await controller.getVerificationHistory('user-1');

      expect(result).toEqual([]);
    });
  });
});
