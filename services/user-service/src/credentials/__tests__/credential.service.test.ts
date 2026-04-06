/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for CredentialService
 *
 * Tests the credential management service that handles submission, verification,
 * and rejection of domain credentials for expertise boosts.
 *
 * @see services/user-service/src/credentials/credential.service.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Mock Prisma before importing services
vi.mock('@prisma/client', () => {
  class MockDecimal {
    private value: number;
    constructor(value: string | number) {
      this.value = typeof value === 'string' ? parseFloat(value) : value;
    }
    toNumber(): number {
      return this.value;
    }
    toString(): string {
      return this.value.toString();
    }
  }

  return {
    Prisma: { Decimal: MockDecimal },
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
    // PrismaClient mock required for PrismaService which extends it
    PrismaClient: vi.fn(function (this: any) {
      this.$connect = vi.fn();
      this.$disconnect = vi.fn();
    }),
  };
});

// Import after mocking
import { CredentialService } from '../credential.service.js';
import { ExpertiseService } from '../../expertise/expertise.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CredentialType, CredentialStatus } from '@prisma/client';

/**
 * Mock Tag type
 */
interface MockTag {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
  createdAt: Date;
}

/**
 * Mock DomainCredential type matching essential Prisma fields
 */
interface MockDomainCredential {
  id: string;
  userId: string;
  tagId: string;
  type: CredentialType;
  title: string;
  institution: string | null;
  documentUrl: string | null;
  verificationUrl: string | null;
  status: CredentialStatus;
  reviewedById: string | null;
  reviewNotes: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  boostValue: { toNumber: () => number };
  createdAt: Date;
  updatedAt: Date;
  tag?: MockTag;
}

/**
 * Helper to create a mock Tag
 */
const createMockTag = (overrides: Partial<MockTag> = {}): MockTag => ({
  id: 'tag-123',
  name: 'Climate Science',
  slug: 'climate-science',
  usageCount: 50,
  createdAt: new Date(),
  ...overrides,
});

/**
 * Helper to create a mock DomainCredential
 */
const createMockCredential = (
  overrides: Partial<MockDomainCredential> = {},
): MockDomainCredential => ({
  id: 'cred-123',
  userId: 'user-123',
  tagId: 'tag-123',
  type: CredentialType.ACADEMIC_DOCTORATE,
  title: 'PhD in Climate Science',
  institution: 'Stanford University',
  documentUrl: 'https://example.com/diploma.pdf',
  verificationUrl: 'https://stanford.edu/verify/123',
  status: CredentialStatus.PENDING,
  reviewedById: null,
  reviewNotes: null,
  verifiedAt: null,
  expiresAt: null,
  boostValue: { toNumber: () => 0.3 },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('CredentialService', () => {
  let service: CredentialService;
  let mockPrisma: {
    domainCredential: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    tag: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };
  let mockExpertiseService: {
    recalculateExpertise: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Prisma service
    mockPrisma = {
      domainCredential: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      tag: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    // Create mock ExpertiseService
    mockExpertiseService = {
      recalculateExpertise: vi.fn(),
    };

    // Instantiate the service
    service = new CredentialService(
      mockPrisma as unknown as PrismaService,
      mockExpertiseService as unknown as ExpertiseService,
    );
  });

  describe('submitCredential', () => {
    it('should create a credential with PENDING status', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({ tag: mockTag });

      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.domainCredential.create.mockResolvedValue(mockCredential);

      const result = await service.submitCredential('user-123', {
        tagId: 'tag-123',
        type: CredentialType.ACADEMIC_DOCTORATE,
        title: 'PhD in Climate Science',
        institution: 'Stanford University',
        documentUrl: 'https://example.com/diploma.pdf',
        verificationUrl: 'https://stanford.edu/verify/123',
      });

      expect(result.status).toBe(CredentialStatus.PENDING);
      expect(result.userId).toBe('user-123');
      expect(result.tagId).toBe('tag-123');
      expect(result.title).toBe('PhD in Climate Science');
      expect(mockPrisma.domainCredential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            tagId: 'tag-123',
            type: CredentialType.ACADEMIC_DOCTORATE,
            title: 'PhD in Climate Science',
            institution: 'Stanford University',
            status: CredentialStatus.PENDING,
          }),
        }),
      );
    });

    it('should set the correct boost value based on credential type', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({
        type: CredentialType.ACADEMIC_MASTERS,
        boostValue: { toNumber: () => 0.2 },
        tag: mockTag,
      });

      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.domainCredential.create.mockResolvedValue(mockCredential);

      const result = await service.submitCredential('user-123', {
        tagId: 'tag-123',
        type: CredentialType.ACADEMIC_MASTERS,
        title: 'MS in Data Science',
        institution: 'MIT',
      });

      expect(result.boostValue).toBe(0.2);
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      await expect(
        service.submitCredential('user-123', {
          tagId: 'nonexistent-tag',
          type: CredentialType.ACADEMIC_DOCTORATE,
          title: 'PhD',
          institution: 'University',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle optional fields (documentUrl, verificationUrl, expiresAt)', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({
        documentUrl: null,
        verificationUrl: null,
        expiresAt: null,
        tag: mockTag,
      });

      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.domainCredential.create.mockResolvedValue(mockCredential);

      const result = await service.submitCredential('user-123', {
        tagId: 'tag-123',
        type: CredentialType.ACADEMIC_DOCTORATE,
        title: 'PhD in Physics',
        institution: 'Caltech',
      });

      expect(result.documentUrl).toBeUndefined();
      expect(result.verificationUrl).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
    });

    it('should handle expiresAt for time-limited certifications', async () => {
      const mockTag = createMockTag();
      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const mockCredential = createMockCredential({
        type: CredentialType.INDUSTRY_CERTIFICATION,
        expiresAt: expiryDate,
        tag: mockTag,
      });

      mockPrisma.tag.findUnique.mockResolvedValue(mockTag);
      mockPrisma.domainCredential.create.mockResolvedValue(mockCredential);

      const result = await service.submitCredential('user-123', {
        tagId: 'tag-123',
        type: CredentialType.INDUSTRY_CERTIFICATION,
        title: 'AWS Solutions Architect',
        institution: 'Amazon',
        expiresAt: expiryDate,
      });

      expect(result.expiresAt).toEqual(expiryDate);
    });
  });

  describe('getUserCredentials', () => {
    it('should return all credentials for a user', async () => {
      const mockTag1 = createMockTag({ id: 'tag-1', name: 'Climate Science' });
      const mockTag2 = createMockTag({ id: 'tag-2', name: 'Data Science' });

      const mockCredentials = [
        createMockCredential({
          id: 'cred-1',
          tagId: 'tag-1',
          type: CredentialType.ACADEMIC_DOCTORATE,
          tag: mockTag1,
        }),
        createMockCredential({
          id: 'cred-2',
          tagId: 'tag-2',
          type: CredentialType.INDUSTRY_CERTIFICATION,
          tag: mockTag2,
        }),
      ];

      mockPrisma.domainCredential.findMany.mockResolvedValue(mockCredentials);

      const result = await service.getUserCredentials('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].tagName).toBe('Climate Science');
      expect(result[1].tagName).toBe('Data Science');
      expect(mockPrisma.domainCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        }),
      );
    });

    it('should return empty array when user has no credentials', async () => {
      mockPrisma.domainCredential.findMany.mockResolvedValue([]);

      const result = await service.getUserCredentials('user-123');

      expect(result).toEqual([]);
    });

    it('should order credentials by creation date descending', async () => {
      mockPrisma.domainCredential.findMany.mockResolvedValue([]);

      await service.getUserCredentials('user-123');

      expect(mockPrisma.domainCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getCredential', () => {
    it('should return a specific credential by ID', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({ tag: mockTag });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(mockCredential);

      const result = await service.getCredential('cred-123');

      expect(result.id).toBe('cred-123');
      expect(result.tagName).toBe('Climate Science');
      expect(mockPrisma.domainCredential.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cred-123' },
        }),
      );
    });

    it('should throw NotFoundException when credential does not exist', async () => {
      mockPrisma.domainCredential.findUnique.mockResolvedValue(null);

      await expect(service.getCredential('nonexistent-cred')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPendingCredentials', () => {
    it('should return all pending credentials for admin review', async () => {
      const mockTag = createMockTag();
      const mockCredentials = [
        createMockCredential({
          id: 'cred-1',
          status: CredentialStatus.PENDING,
          tag: mockTag,
        }),
        createMockCredential({
          id: 'cred-2',
          status: CredentialStatus.PENDING,
          tag: mockTag,
        }),
      ];

      mockPrisma.domainCredential.findMany.mockResolvedValue(mockCredentials);

      const result = await service.getPendingCredentials();

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.status === CredentialStatus.PENDING)).toBe(true);
      expect(mockPrisma.domainCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CredentialStatus.PENDING },
        }),
      );
    });

    it('should return empty array when no pending credentials', async () => {
      mockPrisma.domainCredential.findMany.mockResolvedValue([]);

      const result = await service.getPendingCredentials();

      expect(result).toEqual([]);
    });

    it('should order pending credentials by creation date ascending (oldest first)', async () => {
      mockPrisma.domainCredential.findMany.mockResolvedValue([]);

      await service.getPendingCredentials();

      expect(mockPrisma.domainCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('verifyCredential', () => {
    it('should update credential status to VERIFIED', async () => {
      const mockTag = createMockTag();
      const pendingCredential = createMockCredential({
        status: CredentialStatus.PENDING,
        tag: mockTag,
      });
      const verifiedCredential = createMockCredential({
        status: CredentialStatus.VERIFIED,
        reviewedById: 'admin-123',
        reviewNotes: 'Document verified',
        verifiedAt: new Date(),
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(pendingCredential);
      mockPrisma.domainCredential.update.mockResolvedValue(verifiedCredential);
      mockExpertiseService.recalculateExpertise.mockResolvedValue({});

      const result = await service.verifyCredential('cred-123', 'admin-123', 'Document verified');

      expect(result.status).toBe(CredentialStatus.VERIFIED);
      expect(result.reviewedBy).toBe('admin-123');
      expect(result.reviewNotes).toBe('Document verified');
      expect(result.verifiedAt).toBeDefined();
      expect(mockPrisma.domainCredential.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cred-123' },
          data: expect.objectContaining({
            status: CredentialStatus.VERIFIED,
            reviewedById: 'admin-123',
            verifiedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should trigger expertise recalculation after verification', async () => {
      const mockTag = createMockTag();
      const pendingCredential = createMockCredential({
        status: CredentialStatus.PENDING,
        tag: mockTag,
      });
      const verifiedCredential = createMockCredential({
        status: CredentialStatus.VERIFIED,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(pendingCredential);
      mockPrisma.domainCredential.update.mockResolvedValue(verifiedCredential);
      mockExpertiseService.recalculateExpertise.mockResolvedValue({});

      await service.verifyCredential('cred-123', 'admin-123');

      expect(mockExpertiseService.recalculateExpertise).toHaveBeenCalledWith('user-123', 'tag-123');
    });

    it('should throw NotFoundException when credential does not exist', async () => {
      mockPrisma.domainCredential.findUnique.mockResolvedValue(null);

      await expect(service.verifyCredential('nonexistent-cred', 'admin-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when credential is not pending', async () => {
      const mockTag = createMockTag();
      const verifiedCredential = createMockCredential({
        status: CredentialStatus.VERIFIED,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(verifiedCredential);

      await expect(service.verifyCredential('cred-123', 'admin-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectCredential', () => {
    it('should update credential status to REJECTED with reason', async () => {
      const mockTag = createMockTag();
      const pendingCredential = createMockCredential({
        status: CredentialStatus.PENDING,
        tag: mockTag,
      });
      const rejectedCredential = createMockCredential({
        status: CredentialStatus.REJECTED,
        reviewedById: 'admin-123',
        reviewNotes: 'Document appears to be forged',
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(pendingCredential);
      mockPrisma.domainCredential.update.mockResolvedValue(rejectedCredential);

      const result = await service.rejectCredential(
        'cred-123',
        'admin-123',
        'Document appears to be forged',
      );

      expect(result.status).toBe(CredentialStatus.REJECTED);
      expect(result.reviewedBy).toBe('admin-123');
      expect(result.reviewNotes).toBe('Document appears to be forged');
      expect(mockPrisma.domainCredential.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cred-123' },
          data: expect.objectContaining({
            status: CredentialStatus.REJECTED,
            reviewedById: 'admin-123',
            reviewNotes: 'Document appears to be forged',
          }),
        }),
      );
    });

    it('should throw NotFoundException when credential does not exist', async () => {
      mockPrisma.domainCredential.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectCredential('nonexistent-cred', 'admin-123', 'Invalid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when credential is not pending', async () => {
      const mockTag = createMockTag();
      const verifiedCredential = createMockCredential({
        status: CredentialStatus.VERIFIED,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(verifiedCredential);

      await expect(
        service.rejectCredential('cred-123', 'admin-123', 'Invalid reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not trigger expertise recalculation on rejection', async () => {
      const mockTag = createMockTag();
      const pendingCredential = createMockCredential({
        status: CredentialStatus.PENDING,
        tag: mockTag,
      });
      const rejectedCredential = createMockCredential({
        status: CredentialStatus.REJECTED,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(pendingCredential);
      mockPrisma.domainCredential.update.mockResolvedValue(rejectedCredential);

      await service.rejectCredential('cred-123', 'admin-123', 'Invalid document');

      expect(mockExpertiseService.recalculateExpertise).not.toHaveBeenCalled();
    });
  });

  describe('deleteCredential', () => {
    it('should delete a credential owned by the user', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({
        userId: 'user-123',
        status: CredentialStatus.PENDING,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(mockCredential);
      mockPrisma.domainCredential.delete.mockResolvedValue(mockCredential);

      await expect(service.deleteCredential('cred-123', 'user-123')).resolves.not.toThrow();

      expect(mockPrisma.domainCredential.delete).toHaveBeenCalledWith({
        where: { id: 'cred-123' },
      });
    });

    it('should throw NotFoundException when credential does not exist', async () => {
      mockPrisma.domainCredential.findUnique.mockResolvedValue(null);

      await expect(service.deleteCredential('nonexistent-cred', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the credential', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({
        userId: 'other-user',
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(mockCredential);

      await expect(service.deleteCredential('cred-123', 'user-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should trigger expertise recalculation when deleting a verified credential', async () => {
      const mockTag = createMockTag();
      const verifiedCredential = createMockCredential({
        userId: 'user-123',
        status: CredentialStatus.VERIFIED,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(verifiedCredential);
      mockPrisma.domainCredential.delete.mockResolvedValue(verifiedCredential);
      mockExpertiseService.recalculateExpertise.mockResolvedValue({});

      await service.deleteCredential('cred-123', 'user-123');

      expect(mockExpertiseService.recalculateExpertise).toHaveBeenCalledWith('user-123', 'tag-123');
    });

    it('should not trigger expertise recalculation when deleting a pending credential', async () => {
      const mockTag = createMockTag();
      const pendingCredential = createMockCredential({
        userId: 'user-123',
        status: CredentialStatus.PENDING,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(pendingCredential);
      mockPrisma.domainCredential.delete.mockResolvedValue(pendingCredential);

      await service.deleteCredential('cred-123', 'user-123');

      expect(mockExpertiseService.recalculateExpertise).not.toHaveBeenCalled();
    });
  });

  describe('getBoostValue', () => {
    it('should return +0.30 for ACADEMIC_DOCTORATE', () => {
      expect(service.getBoostValue(CredentialType.ACADEMIC_DOCTORATE)).toBe(0.3);
    });

    it('should return +0.20 for ACADEMIC_MASTERS', () => {
      expect(service.getBoostValue(CredentialType.ACADEMIC_MASTERS)).toBe(0.2);
    });

    it('should return +0.10 for ACADEMIC_BACHELORS', () => {
      expect(service.getBoostValue(CredentialType.ACADEMIC_BACHELORS)).toBe(0.1);
    });

    it('should return +0.25 for PROFESSIONAL_LICENSE', () => {
      expect(service.getBoostValue(CredentialType.PROFESSIONAL_LICENSE)).toBe(0.25);
    });

    it('should return +0.15 for INDUSTRY_CERTIFICATION', () => {
      expect(service.getBoostValue(CredentialType.INDUSTRY_CERTIFICATION)).toBe(0.15);
    });

    it('should return +0.10 for PUBLICATION', () => {
      expect(service.getBoostValue(CredentialType.PUBLICATION)).toBe(0.1);
    });
  });

  describe('getCredentialTypeName', () => {
    it('should return human-readable name for credential types', () => {
      expect(service.getCredentialTypeName(CredentialType.ACADEMIC_DOCTORATE)).toBe(
        'Academic Doctorate',
      );
      expect(service.getCredentialTypeName(CredentialType.ACADEMIC_MASTERS)).toBe(
        "Academic Master's",
      );
      expect(service.getCredentialTypeName(CredentialType.ACADEMIC_BACHELORS)).toBe(
        "Academic Bachelor's",
      );
      expect(service.getCredentialTypeName(CredentialType.PROFESSIONAL_LICENSE)).toBe(
        'Professional License',
      );
      expect(service.getCredentialTypeName(CredentialType.INDUSTRY_CERTIFICATION)).toBe(
        'Industry Certification',
      );
      expect(service.getCredentialTypeName(CredentialType.PUBLICATION)).toBe('Publication');
    });
  });

  describe('CredentialDto transformation', () => {
    it('should include tagName in the result', async () => {
      const mockTag = createMockTag({ name: 'Environmental Policy' });
      const mockCredential = createMockCredential({ tag: mockTag });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(mockCredential);

      const result = await service.getCredential('cred-123');

      expect(result.tagName).toBe('Environmental Policy');
    });

    it('should include typeName in the result', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({
        type: CredentialType.PROFESSIONAL_LICENSE,
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(mockCredential);

      const result = await service.getCredential('cred-123');

      expect(result.typeName).toBe('Professional License');
    });

    it('should convert Decimal boostValue to number', async () => {
      const mockTag = createMockTag();
      const mockCredential = createMockCredential({
        boostValue: { toNumber: () => 0.25 },
        tag: mockTag,
      });

      mockPrisma.domainCredential.findUnique.mockResolvedValue(mockCredential);

      const result = await service.getCredential('cred-123');

      expect(typeof result.boostValue).toBe('number');
      expect(result.boostValue).toBe(0.25);
    });
  });
});
