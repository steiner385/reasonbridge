/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataDeletionJob } from '../data-deletion.job.js';
import { DataDeletionService, ProcessDeletionResult } from '../data-deletion.service.js';

describe('DataDeletionJob', () => {
  let job: DataDeletionJob;
  let mockDataDeletionService: {
    processDeletionRequests: ReturnType<typeof vi.fn>;
    getPendingDeletionRequests: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataDeletionService = {
      processDeletionRequests: vi.fn(),
      getPendingDeletionRequests: vi.fn(),
    };

    job = new DataDeletionJob(mockDataDeletionService as unknown as DataDeletionService);
  });

  describe('handleCron', () => {
    it('should process pending deletion requests', async () => {
      const mockResult: ProcessDeletionResult = {
        processed: 3,
        succeeded: 2,
        failed: 1,
      };
      mockDataDeletionService.processDeletionRequests.mockResolvedValue(mockResult);

      await job.handleCron();

      expect(mockDataDeletionService.processDeletionRequests).toHaveBeenCalled();
    });

    it('should handle case with no pending requests', async () => {
      const mockResult: ProcessDeletionResult = {
        processed: 0,
        succeeded: 0,
        failed: 0,
      };
      mockDataDeletionService.processDeletionRequests.mockResolvedValue(mockResult);

      await job.handleCron();

      expect(mockDataDeletionService.processDeletionRequests).toHaveBeenCalled();
    });

    it('should rethrow errors for scheduler to handle', async () => {
      const error = new Error('Database connection failed');
      mockDataDeletionService.processDeletionRequests.mockRejectedValue(error);

      await expect(job.handleCron()).rejects.toThrow('Database connection failed');
    });

    it('should process all pending requests', async () => {
      const mockResult: ProcessDeletionResult = {
        processed: 10,
        succeeded: 10,
        failed: 0,
      };
      mockDataDeletionService.processDeletionRequests.mockResolvedValue(mockResult);

      await job.handleCron();

      expect(mockDataDeletionService.processDeletionRequests).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending requests', async () => {
      mockDataDeletionService.getPendingDeletionRequests.mockResolvedValue([
        { id: 'req-1' },
        { id: 'req-2' },
        { id: 'req-3' },
      ]);

      const count = await job.getPendingCount();

      expect(count).toBe(3);
    });

    it('should return 0 when no pending requests', async () => {
      mockDataDeletionService.getPendingDeletionRequests.mockResolvedValue([]);

      const count = await job.getPendingCount();

      expect(count).toBe(0);
    });
  });
});
