/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contract tests for the moderation API layer.
 *
 * These lock in the request shapes the backend actually expects, which several
 * moderation surfaces were getting wrong:
 * - reject must send a non-empty `reason` (Issue #1393)
 * - appeal review must send `reasoning` (not `decisionReasoning`) (Issue #1394)
 * - the "your appeals" surface must hit the self-scoped /appeals/me (Issue #1396)
 * - listing must use cursor-based `limit`/`cursor`, not `page`/`pageSize`
 *   (Issue #1397)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '../api';
import {
  getModerationActions,
  getAppeals,
  getMyAppeals,
  rejectModerationAction,
  reviewAppeal,
} from '../moderation-api';

vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

describe('moderation-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({
      actions: [],
      appeals: [],
      nextCursor: null,
      totalCount: 0,
    } as never);
    mockPost.mockResolvedValue(undefined as never);
  });

  describe('getModerationActions (Issue #1397)', () => {
    it('sends cursor-based limit/cursor, never page/pageSize', async () => {
      await getModerationActions({ status: 'pending', limit: 20, cursor: 'abc' });

      const endpoint = mockGet.mock.calls[0]![0] as string;
      expect(endpoint).toContain('limit=20');
      expect(endpoint).toContain('cursor=abc');
      expect(endpoint).toContain('status=pending');
      expect(endpoint).not.toContain('page');
      expect(endpoint).not.toContain('pageSize');
    });
  });

  describe('getAppeals / getMyAppeals (Issue #1396)', () => {
    it('getAppeals hits the unscoped admin endpoint', async () => {
      await getAppeals({ status: 'pending' });
      expect(mockGet.mock.calls[0]![0]).toBe('/moderation/appeals?status=pending');
    });

    it('getMyAppeals hits the self-scoped /appeals/me endpoint', async () => {
      await getMyAppeals({ limit: 10 });
      expect(mockGet.mock.calls[0]![0]).toBe('/moderation/appeals/me?limit=10');
    });

    it('getMyAppeals with no options still targets /appeals/me', async () => {
      await getMyAppeals();
      expect(mockGet.mock.calls[0]![0]).toBe('/moderation/appeals/me');
    });
  });

  describe('rejectModerationAction (Issue #1393)', () => {
    it('posts the required reason in the body', async () => {
      await rejectModerationAction('action-1', 'Not a real violation');

      expect(mockPost).toHaveBeenCalledWith('/moderation/actions/action-1/reject', {
        reason: 'Not a real violation',
      });
    });
  });

  describe('reviewAppeal (Issue #1394)', () => {
    it('posts decision + reasoning (not decisionReasoning)', async () => {
      await reviewAppeal('appeal-1', 'upheld', 'The appeal has merit and is granted.');

      const [endpoint, body] = mockPost.mock.calls[0]!;
      expect(endpoint).toBe('/moderation/appeals/appeal-1/review');
      expect(body).toEqual({
        decision: 'upheld',
        reasoning: 'The appeal has merit and is granted.',
      });
      expect(body).not.toHaveProperty('decisionReasoning');
    });
  });
});
