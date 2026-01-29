/**
 * T056 [US3] - Simplified unit tests for threading logic (Feature 009)
 *
 * Tests focused on pure threading algorithms:
 * - buildThreadTree() for nested structure creation
 * - Thread depth calculation and validation
 */

import { describe, it, expect } from 'vitest';
import { ResponsesService } from '../responses.service.js';
import type { ResponseDetailDto } from '../dto/response-detail.dto.js';

describe('ResponsesService - Threading (Pure Functions)', () => {
  const mockUser = {
    id: 'user-1',
    displayName: 'Alice',
    verificationLevel: 'BASIC',
  };

  describe('buildThreadTree', () => {
    // Create service instance for testing pure methods
    const service = new ResponsesService({} as any, {} as any);

    it('should build tree from flat response list', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'Top-level response',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-2',
          discussionId: 'discussion-1',
          content: 'Reply to response-1',
          author: mockUser,
          parentResponseId: 'response-1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:05:00Z',
          updatedAt: '2026-01-29T10:05:00Z',
        },
        {
          id: 'response-3',
          discussionId: 'discussion-1',
          content: 'Reply to response-2',
          author: mockUser,
          parentResponseId: 'response-2',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:10:00Z',
          updatedAt: '2026-01-29T10:10:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      expect(tree).toHaveLength(1); // One root
      expect(tree[0].id).toBe('response-1');
      expect(tree[0].depth).toBe(0);
      expect(tree[0].replies).toHaveLength(1);
      expect(tree[0].replies[0].id).toBe('response-2');
      expect(tree[0].replies[0].depth).toBe(1);
      expect(tree[0].replies[0].replies).toHaveLength(1);
      expect(tree[0].replies[0].replies[0].id).toBe('response-3');
      expect(tree[0].replies[0].replies[0].depth).toBe(2);
    });

    it('should handle multiple root responses', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'First root',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-2',
          discussionId: 'discussion-1',
          content: 'Second root',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:05:00Z',
          updatedAt: '2026-01-29T10:05:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('response-1');
      expect(tree[1].id).toBe('response-2');
      expect(tree[0].depth).toBe(0);
      expect(tree[1].depth).toBe(0);
    });

    it('should handle orphaned responses (parent deleted)', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'Top-level response',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-3',
          discussionId: 'discussion-1',
          content: 'Orphaned reply (parent deleted)',
          author: mockUser,
          parentResponseId: 'response-2-deleted',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:10:00Z',
          updatedAt: '2026-01-29T10:10:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      // Orphaned response promoted to root
      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('response-1');
      expect(tree[1].id).toBe('response-3');
      expect(tree[1].depth).toBe(0); // Treated as root
    });

    it('should return empty array for empty input', () => {
      const tree = service.buildThreadTree([]);

      expect(tree).toHaveLength(0);
    });

    it('should preserve chronological order within each level', () => {
      const responses: ResponseDetailDto[] = [
        {
          id: 'response-1',
          discussionId: 'discussion-1',
          content: 'Root',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'response-2',
          discussionId: 'discussion-1',
          content: 'First reply',
          author: mockUser,
          parentResponseId: 'response-1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:05:00Z',
          updatedAt: '2026-01-29T10:05:00Z',
        },
        {
          id: 'response-3',
          discussionId: 'discussion-1',
          content: 'Second reply',
          author: mockUser,
          parentResponseId: 'response-1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:10:00Z',
          updatedAt: '2026-01-29T10:10:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      expect(tree[0].replies).toHaveLength(2);
      expect(tree[0].replies[0].id).toBe('response-2'); // Earlier timestamp
      expect(tree[0].replies[1].id).toBe('response-3'); // Later timestamp
    });

    it('should handle complex multi-branch tree', () => {
      const responses: ResponseDetailDto[] = [
        // Root 1 with 2 direct replies
        {
          id: 'r1',
          discussionId: 'd1',
          content: 'Root 1',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:00:00Z',
          updatedAt: '2026-01-29T10:00:00Z',
        },
        {
          id: 'r1-c1',
          discussionId: 'd1',
          content: 'Reply to R1',
          author: mockUser,
          parentResponseId: 'r1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:01:00Z',
          updatedAt: '2026-01-29T10:01:00Z',
        },
        {
          id: 'r1-c2',
          discussionId: 'd1',
          content: 'Another reply to R1',
          author: mockUser,
          parentResponseId: 'r1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:02:00Z',
          updatedAt: '2026-01-29T10:02:00Z',
        },
        // Nested reply under r1-c1
        {
          id: 'r1-c1-c1',
          discussionId: 'd1',
          content: 'Nested reply',
          author: mockUser,
          parentResponseId: 'r1-c1',
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:03:00Z',
          updatedAt: '2026-01-29T10:03:00Z',
        },
        // Root 2
        {
          id: 'r2',
          discussionId: 'd1',
          content: 'Root 2',
          author: mockUser,
          parentResponseId: null,
          citations: [],
          version: 1,
          editCount: 0,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-01-29T10:04:00Z',
          updatedAt: '2026-01-29T10:04:00Z',
        },
      ];

      const tree = service.buildThreadTree(responses);

      // Two roots
      expect(tree).toHaveLength(2);

      // Root 1 structure
      expect(tree[0].id).toBe('r1');
      expect(tree[0].replies).toHaveLength(2);
      expect(tree[0].replies[0].id).toBe('r1-c1');
      expect(tree[0].replies[1].id).toBe('r1-c2');
      expect(tree[0].replies[0].replies).toHaveLength(1);
      expect(tree[0].replies[0].replies[0].id).toBe('r1-c1-c1');
      expect(tree[0].replies[0].replies[0].depth).toBe(2);

      // Root 2 structure
      expect(tree[1].id).toBe('r2');
      expect(tree[1].replies).toHaveLength(0);
    });
  });
});
