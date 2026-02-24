/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for CredentialController
 *
 * Tests the REST API endpoints for domain credential management:
 * - POST /credentials - Submit new credential (requires auth)
 * - GET /credentials/me - List my credentials (requires auth)
 * - DELETE /credentials/:id - Remove credential (requires auth)
 * - GET /admin/credentials/pending - Pending verifications (requires admin)
 * - POST /admin/credentials/:id/verify - Approve credential (requires admin)
 * - POST /admin/credentials/:id/reject - Reject credential (requires admin)
 *
 * @see services/user-service/src/credentials/credential.controller.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CredentialController } from '../credential.controller.js';
import { CredentialDto, SubmitCredentialDto } from '../dto/credential.dto.js';

// Mock Prisma client for CredentialType and CredentialStatus enums
vi.mock('@prisma/client', () => ({
  CredentialType: {
    ACADEMIC_DOCTORATE: 'ACADEMIC_DOCTORATE',
    ACADEMIC_MASTERS: 'ACADEMIC_MASTERS',
    ACADEMIC_BACHELORS: 'ACADEMIC_BACHELORS',
    PROFESSIONAL_LICENSE: 'PROFESSIONAL_LICENSE',
    INDUSTRY_CERTIFICATION: 'INDUSTRY_CERTIFICATION',
    PUBLICATION: 'PUBLICATION',
  },
  CredentialStatus: {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
  },
}));

import { CredentialType, CredentialStatus } from '@prisma/client';

/**
 * Helper to create a mock CredentialDto
 */
const createMockCredentialDto = (overrides: Partial<CredentialDto> = {}): CredentialDto => {
  const data = {
    id: 'cred-123',
    userId: 'user-123',
    tagId: 'tag-123',
    tagName: 'Climate Science',
    type: CredentialType.ACADEMIC_DOCTORATE,
    typeName: 'Academic Doctorate',
    title: 'PhD in Climate Science',
    institution: 'Stanford University',
    documentUrl: 'https://example.com/diploma.pdf',
    verificationUrl: 'https://stanford.edu/verify/123',
    status: CredentialStatus.PENDING,
    boostValue: 0.3,
    createdAt: new Date(),
    ...overrides,
  };
  return new CredentialDto(data);
};

/**
 * Factory to create a mock CredentialService
 */
const createMockCredentialService = () => ({
  submitCredential: vi.fn(),
  getUserCredentials: vi.fn(),
  getCredential: vi.fn(),
  getPendingCredentials: vi.fn(),
  verifyCredential: vi.fn(),
  rejectCredential: vi.fn(),
  deleteCredential: vi.fn(),
});

/**
 * Create a mock JWT payload for authenticated user
 */
const createMockJwtPayload = (sub: string, email = 'user@example.com') => ({
  sub,
  email,
  'cognito:username': email,
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
});

describe('CredentialController', () => {
  let controller: CredentialController;
  let mockCredentialService: ReturnType<typeof createMockCredentialService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCredentialService = createMockCredentialService();
    controller = new CredentialController(mockCredentialService as any);
  });

  describe('POST /credentials', () => {
    it('should create a new credential for authenticated user', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData: SubmitCredentialDto = new SubmitCredentialDto({
        tagId: 'tag-123',
        type: CredentialType.ACADEMIC_DOCTORATE,
        title: 'PhD in Climate Science',
        institution: 'Stanford University',
        documentUrl: 'https://example.com/diploma.pdf',
      });

      const expectedCredential = createMockCredentialDto({
        userId: 'user-123',
        status: CredentialStatus.PENDING,
      });

      mockCredentialService.submitCredential.mockResolvedValue(expectedCredential);

      const result = await controller.submitCredential(jwtPayload as any, submitData);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.status).toBe(CredentialStatus.PENDING);
      expect(mockCredentialService.submitCredential).toHaveBeenCalledWith('user-123', submitData);
    });

    it('should use sub from JWT payload as userId', async () => {
      const jwtPayload = createMockJwtPayload('cognito-sub-456');
      const submitData = new SubmitCredentialDto({
        tagId: 'tag-123',
        type: CredentialType.ACADEMIC_MASTERS,
        title: 'MS in Data Science',
        institution: 'MIT',
      });

      mockCredentialService.submitCredential.mockResolvedValue(
        createMockCredentialDto({ userId: 'cognito-sub-456' }),
      );

      await controller.submitCredential(jwtPayload as any, submitData);

      expect(mockCredentialService.submitCredential).toHaveBeenCalledWith(
        'cognito-sub-456',
        submitData,
      );
    });

    it('should propagate NotFoundException when tag does not exist', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData = new SubmitCredentialDto({
        tagId: 'nonexistent-tag',
        type: CredentialType.ACADEMIC_DOCTORATE,
        title: 'PhD',
        institution: 'University',
      });

      mockCredentialService.submitCredential.mockRejectedValue(
        new NotFoundException('Tag with ID nonexistent-tag not found'),
      );

      await expect(controller.submitCredential(jwtPayload as any, submitData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate service errors', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const submitData = new SubmitCredentialDto({
        tagId: 'tag-123',
        type: CredentialType.ACADEMIC_DOCTORATE,
        title: 'PhD',
        institution: 'University',
      });

      mockCredentialService.submitCredential.mockRejectedValue(new Error('Database error'));

      await expect(controller.submitCredential(jwtPayload as any, submitData)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('GET /credentials/me', () => {
    it('should return current user credentials', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      const mockCredentials = [
        createMockCredentialDto({ id: 'cred-1', title: 'PhD in Physics' }),
        createMockCredentialDto({
          id: 'cred-2',
          title: 'AWS Certification',
          type: CredentialType.INDUSTRY_CERTIFICATION,
        }),
      ];

      mockCredentialService.getUserCredentials.mockResolvedValue(mockCredentials);

      const result = await controller.getMyCredentials(jwtPayload as any);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cred-1');
      expect(result[1].id).toBe('cred-2');
      expect(mockCredentialService.getUserCredentials).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when user has no credentials', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockCredentialService.getUserCredentials.mockResolvedValue([]);

      const result = await controller.getMyCredentials(jwtPayload as any);

      expect(result).toEqual([]);
    });

    it('should use sub from JWT payload to identify current user', async () => {
      const jwtPayload = createMockJwtPayload('jwt-user-id');
      mockCredentialService.getUserCredentials.mockResolvedValue([]);

      await controller.getMyCredentials(jwtPayload as any);

      expect(mockCredentialService.getUserCredentials).toHaveBeenCalledWith('jwt-user-id');
    });

    it('should propagate service errors', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockCredentialService.getUserCredentials.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.getMyCredentials(jwtPayload as any)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('DELETE /credentials/:id', () => {
    it('should delete own credential', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockCredentialService.deleteCredential.mockResolvedValue(undefined);

      await expect(
        controller.deleteCredential(jwtPayload as any, 'cred-123'),
      ).resolves.not.toThrow();

      expect(mockCredentialService.deleteCredential).toHaveBeenCalledWith('cred-123', 'user-123');
    });

    it('should propagate NotFoundException when credential does not exist', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockCredentialService.deleteCredential.mockRejectedValue(
        new NotFoundException('Credential with ID nonexistent-cred not found'),
      );

      await expect(
        controller.deleteCredential(jwtPayload as any, 'nonexistent-cred'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException when user does not own the credential', async () => {
      const jwtPayload = createMockJwtPayload('user-123');
      mockCredentialService.deleteCredential.mockRejectedValue(
        new ForbiddenException('You can only delete your own credentials'),
      );

      await expect(controller.deleteCredential(jwtPayload as any, 'cred-456')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('GET /admin/credentials/pending', () => {
    it('should return all pending credentials for admin review', async () => {
      const mockPendingCredentials = [
        createMockCredentialDto({
          id: 'cred-1',
          status: CredentialStatus.PENDING,
          userId: 'user-1',
        }),
        createMockCredentialDto({
          id: 'cred-2',
          status: CredentialStatus.PENDING,
          userId: 'user-2',
        }),
      ];

      mockCredentialService.getPendingCredentials.mockResolvedValue(mockPendingCredentials);

      const result = await controller.getPendingCredentials();

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.status === CredentialStatus.PENDING)).toBe(true);
      expect(mockCredentialService.getPendingCredentials).toHaveBeenCalled();
    });

    it('should return empty array when no pending credentials', async () => {
      mockCredentialService.getPendingCredentials.mockResolvedValue([]);

      const result = await controller.getPendingCredentials();

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockCredentialService.getPendingCredentials.mockRejectedValue(new Error('Database error'));

      await expect(controller.getPendingCredentials()).rejects.toThrow('Database error');
    });
  });

  describe('POST /admin/credentials/:id/verify', () => {
    it('should verify a credential', async () => {
      const adminJwtPayload = createMockJwtPayload('admin-123', 'admin@example.com');
      const verifiedCredential = createMockCredentialDto({
        id: 'cred-123',
        status: CredentialStatus.VERIFIED,
        reviewedBy: 'admin-123',
        reviewNotes: 'Document verified',
        verifiedAt: new Date(),
      });

      mockCredentialService.verifyCredential.mockResolvedValue(verifiedCredential);

      const result = await controller.verifyCredential(
        adminJwtPayload as any,
        'cred-123',
        'Document verified',
      );

      expect(result.status).toBe(CredentialStatus.VERIFIED);
      expect(result.reviewedBy).toBe('admin-123');
      expect(result.reviewNotes).toBe('Document verified');
      expect(mockCredentialService.verifyCredential).toHaveBeenCalledWith(
        'cred-123',
        'admin-123',
        'Document verified',
      );
    });

    it('should verify a credential without notes', async () => {
      const adminJwtPayload = createMockJwtPayload('admin-123');
      const verifiedCredential = createMockCredentialDto({
        status: CredentialStatus.VERIFIED,
      });

      mockCredentialService.verifyCredential.mockResolvedValue(verifiedCredential);

      await controller.verifyCredential(adminJwtPayload as any, 'cred-123', undefined);

      expect(mockCredentialService.verifyCredential).toHaveBeenCalledWith(
        'cred-123',
        'admin-123',
        undefined,
      );
    });

    it('should propagate NotFoundException when credential does not exist', async () => {
      const adminJwtPayload = createMockJwtPayload('admin-123');
      mockCredentialService.verifyCredential.mockRejectedValue(
        new NotFoundException('Credential with ID nonexistent-cred not found'),
      );

      await expect(
        controller.verifyCredential(adminJwtPayload as any, 'nonexistent-cred', undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException when credential is not pending', async () => {
      const adminJwtPayload = createMockJwtPayload('admin-123');
      mockCredentialService.verifyCredential.mockRejectedValue(
        new BadRequestException('Credential is not pending review'),
      );

      await expect(
        controller.verifyCredential(adminJwtPayload as any, 'cred-123', undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /admin/credentials/:id/reject', () => {
    it('should reject a credential with reason', async () => {
      const adminJwtPayload = createMockJwtPayload('admin-123', 'admin@example.com');
      const rejectedCredential = createMockCredentialDto({
        id: 'cred-123',
        status: CredentialStatus.REJECTED,
        reviewedBy: 'admin-123',
        reviewNotes: 'Document appears to be forged',
      });

      mockCredentialService.rejectCredential.mockResolvedValue(rejectedCredential);

      const result = await controller.rejectCredential(
        adminJwtPayload as any,
        'cred-123',
        'Document appears to be forged',
      );

      expect(result.status).toBe(CredentialStatus.REJECTED);
      expect(result.reviewedBy).toBe('admin-123');
      expect(result.reviewNotes).toBe('Document appears to be forged');
      expect(mockCredentialService.rejectCredential).toHaveBeenCalledWith(
        'cred-123',
        'admin-123',
        'Document appears to be forged',
      );
    });

    it('should propagate NotFoundException when credential does not exist', async () => {
      const adminJwtPayload = createMockJwtPayload('admin-123');
      mockCredentialService.rejectCredential.mockRejectedValue(
        new NotFoundException('Credential with ID nonexistent-cred not found'),
      );

      await expect(
        controller.rejectCredential(adminJwtPayload as any, 'nonexistent-cred', 'Invalid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException when credential is not pending', async () => {
      const adminJwtPayload = createMockJwtPayload('admin-123');
      mockCredentialService.rejectCredential.mockRejectedValue(
        new BadRequestException('Credential is not pending review'),
      );

      await expect(
        controller.rejectCredential(adminJwtPayload as any, 'cred-123', 'Invalid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error handling', () => {
    it('should propagate NotFoundException with correct message for credentials', async () => {
      const credentialId = 'nonexistent-credential-id';
      const jwtPayload = createMockJwtPayload('user-123');

      mockCredentialService.deleteCredential.mockRejectedValue(
        new NotFoundException(`Credential with ID ${credentialId} not found`),
      );

      try {
        await controller.deleteCredential(jwtPayload as any, credentialId);
        expect.fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toBe(
          `Credential with ID ${credentialId} not found`,
        );
      }
    });

    it('should propagate ForbiddenException when attempting to delete others credential', async () => {
      const jwtPayload = createMockJwtPayload('user-123');

      mockCredentialService.deleteCredential.mockRejectedValue(
        new ForbiddenException('You can only delete your own credentials'),
      );

      try {
        await controller.deleteCredential(jwtPayload as any, 'cred-456');
        expect.fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toBe(
          'You can only delete your own credentials',
        );
      }
    });
  });
});
