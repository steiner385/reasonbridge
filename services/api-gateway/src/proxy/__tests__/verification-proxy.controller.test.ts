import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerificationProxyController } from '../verification-proxy.controller.js';
import type { ProxyService } from '../proxy.service.js';
import type { FastifyReply } from 'fastify';

describe('VerificationProxyController', () => {
  let controller: VerificationProxyController;
  let mockProxyService: ProxyService;
  let mockRes: FastifyReply;

  beforeEach(() => {
    mockProxyService = {
      proxyToUserService: vi.fn().mockResolvedValue({
        status: 200,
        data: { success: true },
      }),
    } as unknown as ProxyService;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as FastifyReply;

    controller = new VerificationProxyController(mockProxyService);
  });

  describe('requestVerification', () => {
    it('should proxy POST /verification/request to user-service', async () => {
      const body = { method: 'phone' };
      const authHeader = 'Bearer token123';

      await controller.requestVerification(body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/verification/request',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should proxy without auth header when not provided', async () => {
      const body = { method: 'phone' };

      await controller.requestVerification(body, undefined, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/verification/request',
        body,
        headers: undefined,
      });
    });
  });

  describe('requestPhoneVerification', () => {
    it('should proxy POST /verification/phone/request to user-service', async () => {
      const body = { phoneNumber: '+1234567890' };
      const authHeader = 'Bearer token123';

      await controller.requestPhoneVerification(body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/verification/phone/request',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('verifyPhoneOTP', () => {
    it('should proxy POST /verification/phone/verify to user-service', async () => {
      const body = { phoneNumber: '+1234567890', code: '123456' };
      const authHeader = 'Bearer token123';

      await controller.verifyPhoneOTP(body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/verification/phone/verify',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('markVideoUploadComplete', () => {
    it('should proxy POST /verification/video-upload-complete to user-service', async () => {
      const body = { verificationId: 'abc-123' };
      const authHeader = 'Bearer token123';

      await controller.markVideoUploadComplete(body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'POST',
        path: '/verification/video-upload-complete',
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getPendingVerifications', () => {
    it('should proxy GET /verification/user/pending to user-service', async () => {
      const authHeader = 'Bearer token123';

      await controller.getPendingVerifications(authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/verification/user/pending',
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getVerificationHistory', () => {
    it('should proxy GET /verification/user/history to user-service', async () => {
      const authHeader = 'Bearer token123';

      await controller.getVerificationHistory(authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'GET',
        path: '/verification/user/history',
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getVerificationById', () => {
    it('should proxy GET /verification/:verificationId to user-service with valid UUID', async () => {
      const verificationId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      const authHeader = 'Bearer token123';

      await controller.getVerificationById(verificationId, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'GET',
        path: `/verification/${verificationId}`,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'not-a-valid-uuid';
      const authHeader = 'Bearer token123';

      await controller.getVerificationById(invalidId, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        statusCode: 400,
        message: `Invalid verification ID format: expected UUID, received "${invalidId}"`,
        error: 'Bad Request',
      });
    });
  });

  describe('completeVerification', () => {
    it('should proxy PATCH /verification/:verificationId/complete to user-service with valid UUID', async () => {
      const verificationId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      const body = { adminNotes: 'Approved' };
      const authHeader = 'Bearer token123';

      await controller.completeVerification(verificationId, body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'PATCH',
        path: `/verification/${verificationId}/complete`,
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'invalid-uuid';
      const body = { adminNotes: 'Approved' };
      const authHeader = 'Bearer token123';

      await controller.completeVerification(invalidId, body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        statusCode: 400,
        message: `Invalid verification ID format: expected UUID, received "${invalidId}"`,
        error: 'Bad Request',
      });
    });
  });

  describe('requestReVerification', () => {
    it('should proxy POST /verification/:verificationId/re-verify to user-service with valid UUID', async () => {
      const verificationId = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      const body = { reason: 'Documents expired' };
      const authHeader = 'Bearer token123';

      await controller.requestReVerification(verificationId, body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).toHaveBeenCalledWith({
        method: 'POST',
        path: `/verification/${verificationId}/re-verify`,
        body,
        headers: { Authorization: authHeader },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({ success: true });
    });

    it('should return 400 for invalid UUID format', async () => {
      const invalidId = 'bad-id';
      const body = { reason: 'Documents expired' };
      const authHeader = 'Bearer token123';

      await controller.requestReVerification(invalidId, body, authHeader, mockRes);

      expect(mockProxyService.proxyToUserService).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        statusCode: 400,
        message: `Invalid verification ID format: expected UUID, received "${invalidId}"`,
        error: 'Bad Request',
      });
    });
  });
});
