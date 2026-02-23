/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EvidencePreservationService,
  ContentToPreserve,
} from '../evidence-preservation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('EvidencePreservationService', () => {
  let service: EvidencePreservationService;
  let mockPrisma: {
    csamReport: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set environment variables for testing
    process.env['EVIDENCE_S3_BUCKET'] = 'test-evidence-bucket';
    process.env['EVIDENCE_PREFIX'] = 'test-evidence/';

    mockPrisma = {
      csamReport: {
        create: vi.fn(),
      },
    };

    service = new EvidencePreservationService(mockPrisma as unknown as PrismaService);
  });

  describe('preserveContent', () => {
    const sampleContent: ContentToPreserve = {
      contentType: 'response',
      contentId: 'resp-123',
      content: 'Sample content to preserve',
      authorId: 'user-456',
      metadata: { source: 'test' },
    };

    it('should successfully preserve content and return evidence package', async () => {
      const result = await service.preserveContent(sampleContent);

      expect(result.success).toBe(true);
      expect(result.evidence).toBeDefined();
      expect(result.evidence?.contentType).toBe('response');
      expect(result.evidence?.contentId).toBe('resp-123');
      expect(result.evidence?.contentHash).toHaveLength(64); // SHA-256 hash
      expect(result.evidence?.s3Key).toContain('test-evidence/');
      expect(result.evidence?.s3Key).toContain('.json.enc');
    });

    it('should generate unique evidence IDs', async () => {
      const result1 = await service.preserveContent(sampleContent);
      const result2 = await service.preserveContent(sampleContent);

      expect(result1.evidence?.evidenceId).not.toBe(result2.evidence?.evidenceId);
    });

    it('should include preservation timestamp', async () => {
      const before = new Date();
      const result = await service.preserveContent(sampleContent);
      const after = new Date();

      expect(result.evidence?.preservedAt).toBeDefined();
      expect(result.evidence!.preservedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.evidence!.preservedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should handle content without author ID', async () => {
      const contentWithoutAuthor: ContentToPreserve = {
        contentType: 'anonymous_message',
        contentId: 'msg-789',
        content: 'Anonymous content',
      };

      const result = await service.preserveContent(contentWithoutAuthor);

      expect(result.success).toBe(true);
    });

    it('should calculate content size in bytes', async () => {
      const result = await service.preserveContent(sampleContent);

      expect(result.evidence?.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('verifyEvidence', () => {
    it('should verify evidence integrity', async () => {
      const result = await service.verifyEvidence('test-key', 'expected-hash');

      expect(result).toBe(true);
    });
  });

  describe('createCsamReport', () => {
    const sampleContent: ContentToPreserve = {
      contentType: 'response',
      contentId: 'resp-123',
      content: 'Flagged content',
      authorId: 'user-456',
    };

    it('should create CSAM report with preserved evidence', async () => {
      mockPrisma.csamReport.create.mockResolvedValue({
        id: 'csam-report-123',
        detectionSource: 'AI_DETECTION',
        status: 'PENDING_REVIEW',
      });

      const reportId = await service.createCsamReport(sampleContent, 'AI_DETECTION', 0.95);

      expect(reportId).toBe('csam-report-123');
      expect(mockPrisma.csamReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectionSource: 'AI_DETECTION',
            contentType: 'response',
            contentId: 'resp-123',
            contentAuthorId: 'user-456',
            evidenceS3Key: expect.stringContaining('test-evidence/'),
            evidenceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            aiConfidenceScore: 0.95,
          }),
        }),
      );
    });

    it('should set NCMEC deadline 24 hours from creation', async () => {
      const before = new Date(Date.now() + 24 * 60 * 60 * 1000 - 1000);
      const after = new Date(Date.now() + 24 * 60 * 60 * 1000 + 1000);

      mockPrisma.csamReport.create.mockImplementation(async ({ data }) => {
        expect(data.ncmecDeadline.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(data.ncmecDeadline.getTime()).toBeLessThanOrEqual(after.getTime());
        return { id: 'csam-report-456' };
      });

      await service.createCsamReport(sampleContent, 'USER_REPORT');

      expect(mockPrisma.csamReport.create).toHaveBeenCalled();
    });

    it('should handle different detection sources', async () => {
      mockPrisma.csamReport.create.mockResolvedValue({ id: 'csam-report-789' });

      await service.createCsamReport(sampleContent, 'MODERATOR_REVIEW');

      expect(mockPrisma.csamReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectionSource: 'MODERATOR_REVIEW',
          }),
        }),
      );
    });

    it('should handle hash match detection', async () => {
      mockPrisma.csamReport.create.mockResolvedValue({ id: 'csam-report-hash' });

      await service.createCsamReport(sampleContent, 'HASH_MATCH');

      expect(mockPrisma.csamReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectionSource: 'HASH_MATCH',
          }),
        }),
      );
    });
  });
});
