/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ResponseThreadingService } from './response-threading.service.js';
import type { ResponseDetailDto } from './dto/response-detail.dto.js';

const createMockPrismaService = () => ({
  response: {
    findUnique: vi.fn(),
  },
});

const createMockResponse = (overrides = {}): ResponseDetailDto => ({
  id: 'response-1',
  discussionId: 'disc-1',
  content: 'Test content',
  author: {
    id: 'user-1',
    displayName: 'Test User',
    avatarUrl: null,
    verificationLevel: 'BASIC',
  },
  parentResponseId: null,
  citations: [],
  version: 1,
  editCount: 0,
  editedAt: null,
  deletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('ResponseThreadingService', () => {
  let service: ResponseThreadingService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new ResponseThreadingService(
      mockPrisma as unknown as Parameters<
        (typeof ResponseThreadingService)['prototype']['constructor']
      >[0],
    );
  });

  describe('calculateThreadDepth', () => {
    it('should return 0 for top-level response', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ parentId: null });

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(0);
    });

    it('should return 1 for direct reply', async () => {
      mockPrisma.response.findUnique
        .mockResolvedValueOnce({ parentId: 'parent-1' })
        .mockResolvedValueOnce({ parentId: null });

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(1);
    });

    it('should return correct depth for deeply nested response', async () => {
      mockPrisma.response.findUnique
        .mockResolvedValueOnce({ parentId: 'parent-1' })
        .mockResolvedValueOnce({ parentId: 'parent-2' })
        .mockResolvedValueOnce({ parentId: 'parent-3' })
        .mockResolvedValueOnce({ parentId: null });

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(3);
    });

    it('should cap at MAX_DEPTH to prevent infinite loops', async () => {
      // Simulate circular reference by always returning a parent
      mockPrisma.response.findUnique.mockResolvedValue({ parentId: 'parent-x' });

      const depth = await service.calculateThreadDepth('response-1');

      expect(depth).toBe(10); // MAX_DEPTH
    });

    it('should handle non-existent response gracefully', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      const depth = await service.calculateThreadDepth('non-existent');

      expect(depth).toBe(0);
    });
  });

  describe('buildThreadTree', () => {
    it('should return empty array for empty input', () => {
      const result = service.buildThreadTree([]);

      expect(result).toEqual([]);
    });

    it('should return flat list when no responses have parents', () => {
      const responses = [createMockResponse({ id: 'r-1' }), createMockResponse({ id: 'r-2' })];

      const result = service.buildThreadTree(responses);

      expect(result).toHaveLength(2);
      expect(result[0].depth).toBe(0);
      expect(result[1].depth).toBe(0);
    });

    it('should nest replies under their parents', () => {
      const responses = [
        createMockResponse({ id: 'r-1' }),
        createMockResponse({ id: 'r-2', parentResponseId: 'r-1' }),
        createMockResponse({ id: 'r-3', parentResponseId: 'r-1' }),
      ];

      const result = service.buildThreadTree(responses);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r-1');
      expect(result[0].replies).toHaveLength(2);
      expect(result[0].replies[0].depth).toBe(1);
    });

    it('should handle deep nesting', () => {
      const responses = [
        createMockResponse({ id: 'r-1' }),
        createMockResponse({ id: 'r-2', parentResponseId: 'r-1' }),
        createMockResponse({ id: 'r-3', parentResponseId: 'r-2' }),
      ];

      const result = service.buildThreadTree(responses);

      expect(result).toHaveLength(1);
      expect(result[0].replies[0].replies[0].id).toBe('r-3');
      expect(result[0].replies[0].replies[0].depth).toBe(2);
    });

    it('should treat orphaned responses as root level', () => {
      const responses = [
        createMockResponse({ id: 'r-1' }),
        createMockResponse({ id: 'r-2', parentResponseId: 'deleted-parent' }),
      ];

      const result = service.buildThreadTree(responses);

      expect(result).toHaveLength(2);
    });

    it('should preserve chronological order within each level', () => {
      const responses = [
        createMockResponse({
          id: 'r-1',
          createdAt: '2026-01-29T10:00:00Z',
        }),
        createMockResponse({
          id: 'r-2',
          parentResponseId: 'r-1',
          createdAt: '2026-01-29T10:05:00Z',
        }),
        createMockResponse({
          id: 'r-3',
          parentResponseId: 'r-1',
          createdAt: '2026-01-29T10:10:00Z',
        }),
      ];

      const result = service.buildThreadTree(responses);

      expect(result[0].replies).toHaveLength(2);
      expect(result[0].replies[0].id).toBe('r-2');
      expect(result[0].replies[1].id).toBe('r-3');
    });
  });

  describe('validateReplyDepth', () => {
    it('should throw BadRequestException when depth limit exceeded', async () => {
      // Mock a response at depth 10 by always returning a parent
      mockPrisma.response.findUnique.mockResolvedValue({ parentId: 'parent-x' });

      await expect(service.validateReplyDepth('response-at-max-depth')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw with descriptive error message', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ parentId: 'parent-x' });

      await expect(service.validateReplyDepth('response-at-max-depth')).rejects.toThrow(
        'Thread depth limit exceeded',
      );
    });

    it('should not throw when depth is within limit', async () => {
      mockPrisma.response.findUnique
        .mockResolvedValueOnce({ parentId: 'parent-1' })
        .mockResolvedValueOnce({ parentId: null });

      await expect(service.validateReplyDepth('response-1')).resolves.not.toThrow();
    });

    it('should not throw for top-level response', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ parentId: null });

      await expect(service.validateReplyDepth('top-level')).resolves.not.toThrow();
    });
  });
});
