/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TopicDraftsController } from './topic-drafts.controller.js';

const createMockDraftsService = () => ({
  saveDraft: vi.fn(),
  getDrafts: vi.fn(),
  getDraft: vi.fn(),
  deleteDraft: vi.fn(),
});

const createMockDraft = (overrides = {}) => ({
  id: 'draft-1',
  userId: 'user-1',
  title: 'Draft Title',
  description: 'Draft description',
  tags: ['tag1', 'tag2'],
  visibility: 'PUBLIC',
  evidenceStandards: 'STANDARD',
  isMatureContent: false,
  createdAt: new Date('2026-02-10'),
  updatedAt: new Date('2026-02-10'),
  expiresAt: new Date('2026-03-12'),
  ...overrides,
});

describe('TopicDraftsController', () => {
  let controller: TopicDraftsController;
  let mockDraftsService: ReturnType<typeof createMockDraftsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDraftsService = createMockDraftsService();
    controller = new TopicDraftsController(mockDraftsService as any);
  });

  describe('saveDraft', () => {
    const dto = {
      title: 'New Draft',
      description: 'Description',
      tags: ['tag1'],
    };

    it('should create draft with user ID from header', async () => {
      const draft = createMockDraft(dto);
      mockDraftsService.saveDraft.mockResolvedValue(draft);

      const result = await controller.saveDraft(dto, 'user-123', {});

      expect(result).toEqual(draft);
      expect(mockDraftsService.saveDraft).toHaveBeenCalledWith('user-123', dto);
    });

    it('should create draft with user ID from request object', async () => {
      const draft = createMockDraft(dto);
      mockDraftsService.saveDraft.mockResolvedValue(draft);

      const result = await controller.saveDraft(dto, undefined, {
        user: { id: 'user-456' },
      });

      expect(result).toEqual(draft);
      expect(mockDraftsService.saveDraft).toHaveBeenCalledWith('user-456', dto);
    });

    it('should prefer header user ID over request user ID', async () => {
      const draft = createMockDraft(dto);
      mockDraftsService.saveDraft.mockResolvedValue(draft);

      await controller.saveDraft(dto, 'header-user', {
        user: { id: 'request-user' },
      });

      expect(mockDraftsService.saveDraft).toHaveBeenCalledWith('header-user', dto);
    });

    it('should throw error when no user ID is available', async () => {
      await expect(controller.saveDraft(dto, undefined, {})).rejects.toThrow(
        'User ID not found in request. Authentication required.',
      );
      expect(mockDraftsService.saveDraft).not.toHaveBeenCalled();
    });
  });

  describe('getDrafts', () => {
    it('should return drafts list with user ID from header', async () => {
      const draftsResponse = {
        drafts: [createMockDraft()],
        total: 1,
      };
      mockDraftsService.getDrafts.mockResolvedValue(draftsResponse);

      const result = await controller.getDrafts('user-123', {});

      expect(result).toEqual(draftsResponse);
      expect(mockDraftsService.getDrafts).toHaveBeenCalledWith('user-123');
    });

    it('should return drafts list with user ID from request', async () => {
      const draftsResponse = {
        drafts: [],
        total: 0,
      };
      mockDraftsService.getDrafts.mockResolvedValue(draftsResponse);

      const result = await controller.getDrafts(undefined, { user: { id: 'user-456' } });

      expect(result).toEqual(draftsResponse);
      expect(mockDraftsService.getDrafts).toHaveBeenCalledWith('user-456');
    });

    it('should throw error when no user ID is available', async () => {
      await expect(controller.getDrafts(undefined, {})).rejects.toThrow(
        'User ID not found in request. Authentication required.',
      );
    });
  });

  describe('getDraft', () => {
    it('should return draft by ID', async () => {
      const draft = createMockDraft();
      mockDraftsService.getDraft.mockResolvedValue(draft);

      const result = await controller.getDraft('draft-1', 'user-123', {});

      expect(result).toEqual(draft);
      expect(mockDraftsService.getDraft).toHaveBeenCalledWith('user-123', 'draft-1');
    });

    it('should throw error when no user ID is available', async () => {
      await expect(controller.getDraft('draft-1', undefined, {})).rejects.toThrow(
        'User ID not found in request. Authentication required.',
      );
    });
  });

  describe('deleteDraft', () => {
    it('should delete draft by ID', async () => {
      mockDraftsService.deleteDraft.mockResolvedValue(undefined);

      await controller.deleteDraft('draft-1', 'user-123', {});

      expect(mockDraftsService.deleteDraft).toHaveBeenCalledWith('user-123', 'draft-1');
    });

    it('should throw error when no user ID is available', async () => {
      await expect(controller.deleteDraft('draft-1', undefined, {})).rejects.toThrow(
        'User ID not found in request. Authentication required.',
      );
    });
  });
});
