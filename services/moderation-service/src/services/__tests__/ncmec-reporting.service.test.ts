/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { NCMECReportingService } from '../ncmec-reporting.service.js';
import type { NCMECReportRequest } from '../ncmec-reporting.service.js';

describe('NCMECReportingService', () => {
  let service: NCMECReportingService;
  let httpService: any;
  let prisma: any;

  const mockCsamReport = {
    id: 'csam-123',
    detectionSource: 'AI_DETECTION',
    contentType: 'response',
    contentId: 'resp-456',
    contentAuthorId: 'user-789',
    evidenceS3Key: 'evidence/2025-01-15/response/ev-123.json.enc',
    evidenceHash: 'sha256:abc123def456',
    ncmecDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    aiConfidenceScore: 0.95,
    ncmecReportId: null,
    ncmecSubmittedAt: null,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReportRequest: NCMECReportRequest = {
    csamReportId: 'csam-123',
    incident: {
      incidentType: 'CHILD_PORNOGRAPHY',
      incidentDateTime: new Date('2025-01-15T10:00:00Z'),
      detectionMethod: 'AI_DETECTION',
      aiConfidenceScore: 0.95,
    },
    content: {
      contentType: 'response',
      contentId: 'resp-456',
      contentHash: 'sha256:abc123def456',
      evidenceS3Key: 'evidence/2025-01-15/response/ev-123.json.enc',
    },
    reportedUser: {
      userId: 'user-789',
      displayName: 'TestUser',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment variables
    process.env['NCMEC_ENABLED'] = 'false';
    process.env['NCMEC_API_KEY'] = '';
    process.env['NCMEC_ESP_ID'] = '';

    httpService = {
      post: vi.fn(),
      get: vi.fn(),
    };

    prisma = {
      csamReport: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    service = new NCMECReportingService(httpService, prisma);
  });

  describe('submitReport', () => {
    it('should return mock submission when NCMEC is disabled', async () => {
      prisma.csamReport.update.mockResolvedValue(mockCsamReport);

      const result = await service.submitReport(mockReportRequest);

      expect(result.success).toBe(true);
      expect(result.ncmecReportId).toMatch(/^MOCK-/);
      expect(prisma.csamReport.update).toHaveBeenCalledWith({
        where: { id: 'csam-123' },
        data: expect.objectContaining({
          status: 'MOCK_SUBMITTED',
        }),
      });
    });

    it('should submit to NCMEC API when enabled', async () => {
      process.env['NCMEC_ENABLED'] = 'true';
      process.env['NCMEC_API_KEY'] = 'test-api-key';
      process.env['NCMEC_ESP_ID'] = 'test-esp-id';

      // Recreate service with new env vars
      service = new NCMECReportingService(httpService, prisma);

      httpService.post.mockReturnValue(
        of({
          data: {
            ncmecReportId: 'NCMEC-456',
            confirmationNumber: 'CONF-789',
          },
        }),
      );
      prisma.csamReport.update.mockResolvedValue(mockCsamReport);

      const result = await service.submitReport(mockReportRequest);

      expect(result.success).toBe(true);
      expect(result.ncmecReportId).toBe('NCMEC-456');
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/reports'),
        expect.objectContaining({
          espId: 'test-esp-id',
          incidentSummary: expect.objectContaining({
            incidentType: 'CHILD_PORNOGRAPHY',
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      process.env['NCMEC_ENABLED'] = 'true';
      process.env['NCMEC_API_KEY'] = 'test-api-key';
      process.env['NCMEC_ESP_ID'] = 'test-esp-id';

      service = new NCMECReportingService(httpService, prisma);

      httpService.post.mockReturnValue(throwError(() => new Error('API connection failed')));
      prisma.csamReport.update.mockResolvedValue(mockCsamReport);

      const result = await service.submitReport(mockReportRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API connection failed');
      expect(prisma.csamReport.update).toHaveBeenCalledWith({
        where: { id: 'csam-123' },
        data: expect.objectContaining({
          status: 'SUBMISSION_FAILED',
          ncmecSubmissionError: 'API connection failed',
        }),
      });
    });
  });

  describe('retrySubmission', () => {
    it('should rebuild and resubmit failed report', async () => {
      prisma.csamReport.findUnique.mockResolvedValue({
        ...mockCsamReport,
        status: 'SUBMISSION_FAILED',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-789',
        displayName: 'TestUser',
        email: 'test@example.com',
      });
      prisma.csamReport.update.mockResolvedValue(mockCsamReport);

      const result = await service.retrySubmission('csam-123');

      expect(result.success).toBe(true);
      expect(prisma.csamReport.findUnique).toHaveBeenCalledWith({
        where: { id: 'csam-123' },
      });
    });

    it('should return error if report not found', async () => {
      prisma.csamReport.findUnique.mockResolvedValue(null);

      const result = await service.retrySubmission('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should skip if already submitted', async () => {
      prisma.csamReport.findUnique.mockResolvedValue({
        ...mockCsamReport,
        ncmecReportId: 'NCMEC-existing',
      });

      const result = await service.retrySubmission('csam-123');

      expect(result.success).toBe(true);
      expect(result.ncmecReportId).toBe('NCMEC-existing');
    });
  });

  describe('getPendingSubmissions', () => {
    it('should return pending reports with deadline info', async () => {
      const deadline = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
      prisma.csamReport.findMany.mockResolvedValue([
        {
          id: 'csam-1',
          ncmecDeadline: deadline,
          createdAt: new Date(),
        },
        {
          id: 'csam-2',
          ncmecDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          createdAt: new Date(),
        },
      ]);

      const result = await service.getPendingSubmissions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('csam-1');
      expect(result[0].hoursRemaining).toBeGreaterThan(11);
      expect(result[0].hoursRemaining).toBeLessThan(13);
      expect(result[1].hoursRemaining).toBeGreaterThan(1);
      expect(result[1].hoursRemaining).toBeLessThan(3);
    });

    it('should return empty array when no pending reports', async () => {
      prisma.csamReport.findMany.mockResolvedValue([]);

      const result = await service.getPendingSubmissions();

      expect(result).toEqual([]);
    });
  });

  describe('checkReportStatus', () => {
    it('should return NCMEC_DISABLED when disabled', async () => {
      const result = await service.checkReportStatus('NCMEC-123');

      expect(result.status).toBe('NCMEC_DISABLED');
    });

    it('should call NCMEC API when enabled', async () => {
      process.env['NCMEC_ENABLED'] = 'true';
      process.env['NCMEC_API_KEY'] = 'test-api-key';
      process.env['NCMEC_ESP_ID'] = 'test-esp-id';

      service = new NCMECReportingService(httpService, prisma);

      httpService.get.mockReturnValue(
        of({
          data: {
            status: 'PROCESSED',
            lastUpdated: '2025-01-15T12:00:00Z',
          },
        }),
      );

      const result = await service.checkReportStatus('NCMEC-123');

      expect(result.status).toBe('PROCESSED');
      expect(httpService.get).toHaveBeenCalled();
    });

    it('should return CHECK_FAILED on API error', async () => {
      process.env['NCMEC_ENABLED'] = 'true';
      process.env['NCMEC_API_KEY'] = 'test-api-key';
      process.env['NCMEC_ESP_ID'] = 'test-esp-id';

      service = new NCMECReportingService(httpService, prisma);

      httpService.get.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.checkReportStatus('NCMEC-123');

      expect(result.status).toBe('CHECK_FAILED');
    });
  });
});
