/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalBotFlaggedController, BotFlaggedDto } from '../internal-bot-flagged.controller.js';

describe('InternalBotFlaggedController', () => {
  let controller: InternalBotFlaggedController;
  let mockPrisma: any;

  const createMockDto = (overrides: Partial<BotFlaggedDto> = {}): BotFlaggedDto => ({
    userId: 'user-123',
    riskScore: 0.75,
    patterns: ['rapid_posting', 'topic_concentration'],
    reasoning:
      'High risk of automated behavior. Account created 2 hours ago, posting unusually frequently.',
    detectedAt: '2026-03-26T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      report: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    controller = new InternalBotFlaggedController(mockPrisma);
  });

  describe('handleBotFlagged', () => {
    it('should create a new bot suspicion report when none exists', async () => {
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-456',
        reporterId: 'user-123',
        contentType: 'user',
        contentId: 'user-123',
        category: 'BOT_SUSPICION',
        status: 'PENDING',
      });

      const dto = createMockDto();
      const result = await controller.handleBotFlagged(dto);

      expect(result).toEqual({
        success: true,
        reportId: 'report-456',
      });

      expect(mockPrisma.report.findFirst).toHaveBeenCalledWith({
        where: {
          contentType: 'user',
          contentId: 'user-123',
          category: 'BOT_SUSPICION',
          status: 'PENDING',
        },
      });

      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'user-123',
          contentType: 'user',
          contentId: 'user-123',
          category: 'BOT_SUSPICION',
          description: expect.stringContaining('Risk Score: 75%'),
          status: 'PENDING',
        },
      });
    });

    it('should return existing report when pending report already exists', async () => {
      const existingReport = {
        id: 'existing-report-123',
        status: 'PENDING',
      };
      mockPrisma.report.findFirst.mockResolvedValue(existingReport);

      const dto = createMockDto();
      const result = await controller.handleBotFlagged(dto);

      expect(result).toEqual({
        success: true,
        reportId: 'existing-report-123',
      });

      // Should not create a new report
      expect(mockPrisma.report.create).not.toHaveBeenCalled();
    });

    it('should include all patterns in description', async () => {
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({ id: 'report-789' });

      const dto = createMockDto({
        patterns: ['very_new_account', 'rapid_posting', 'topic_concentration'],
      });

      await controller.handleBotFlagged(dto);

      const createCall = mockPrisma.report.create.mock.calls[0][0];
      expect(createCall.data.description).toContain('very_new_account');
      expect(createCall.data.description).toContain('rapid_posting');
      expect(createCall.data.description).toContain('topic_concentration');
    });

    it('should handle low risk scores correctly', async () => {
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({ id: 'report-low' });

      const dto = createMockDto({
        riskScore: 0.4,
        patterns: ['new_account'],
      });

      await controller.handleBotFlagged(dto);

      const createCall = mockPrisma.report.create.mock.calls[0][0];
      expect(createCall.data.description).toContain('Risk Score: 40%');
    });

    it('should return error when database operation fails', async () => {
      mockPrisma.report.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const dto = createMockDto();
      const result = await controller.handleBotFlagged(dto);

      expect(result).toEqual({
        success: false,
        error: 'Database connection failed',
      });
    });

    it('should handle empty patterns array', async () => {
      mockPrisma.report.findFirst.mockResolvedValue(null);
      mockPrisma.report.create.mockResolvedValue({ id: 'report-empty' });

      const dto = createMockDto({
        patterns: [],
        reasoning: 'No specific patterns detected but overall behavior suspicious.',
      });

      await controller.handleBotFlagged(dto);

      const createCall = mockPrisma.report.create.mock.calls[0][0];
      expect(createCall.data.description).toContain('Detected Patterns: None');
    });
  });
});
