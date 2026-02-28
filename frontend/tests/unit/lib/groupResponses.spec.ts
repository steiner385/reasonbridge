/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  groupResponses,
  shouldShowHeader,
  getGroupStats,
  type GroupableResponse,
  type GroupResponsesConfig as _GroupResponsesConfig,
} from '../../../src/lib/groupResponses';

/**
 * Helper to create test responses
 */
function createResponse(
  id: string,
  authorId: string,
  authorName: string,
  createdAt: string,
  parentResponseId?: string | null,
): GroupableResponse {
  return {
    id,
    author: { id: authorId, displayName: authorName },
    createdAt,
    parentResponseId,
  };
}

describe('groupResponses', () => {
  describe('basic grouping', () => {
    it('should return empty array for empty input', () => {
      const result = groupResponses([]);
      expect(result).toEqual([]);
    });

    it('should wrap single response with group metadata', () => {
      const responses = [createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z')];

      const result = groupResponses(responses);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        response: responses[0],
        isGroupStart: true,
        isGroupEnd: true,
        groupId: '1',
        groupIndex: 0,
        groupSize: 1,
      });
    });

    it('should group consecutive messages from same author', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z'),
        createResponse('3', 'alice', 'Alice', '2025-01-01T10:02:00Z'),
      ];

      const result = groupResponses(responses);

      expect(result).toHaveLength(3);
      expect(result[0].isGroupStart).toBe(true);
      expect(result[0].isGroupEnd).toBe(false);
      expect(result[0].groupSize).toBe(3);

      expect(result[1].isGroupStart).toBe(false);
      expect(result[1].isGroupEnd).toBe(false);
      expect(result[1].groupSize).toBe(3);

      expect(result[2].isGroupStart).toBe(false);
      expect(result[2].isGroupEnd).toBe(true);
      expect(result[2].groupSize).toBe(3);

      // All should share same groupId
      expect(result[0].groupId).toBe('1');
      expect(result[1].groupId).toBe('1');
      expect(result[2].groupId).toBe('1');
    });

    it('should break group when author changes', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z'),
        createResponse('3', 'bob', 'Bob', '2025-01-01T10:02:00Z'),
        createResponse('4', 'bob', 'Bob', '2025-01-01T10:03:00Z'),
      ];

      const result = groupResponses(responses);

      // Alice's group
      expect(result[0].groupId).toBe('1');
      expect(result[0].groupSize).toBe(2);
      expect(result[1].groupId).toBe('1');

      // Bob's group
      expect(result[2].groupId).toBe('3');
      expect(result[2].groupSize).toBe(2);
      expect(result[3].groupId).toBe('3');
    });

    it('should correctly set groupIndex for each response', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z'),
        createResponse('3', 'alice', 'Alice', '2025-01-01T10:02:00Z'),
      ];

      const result = groupResponses(responses);

      expect(result[0].groupIndex).toBe(0);
      expect(result[1].groupIndex).toBe(1);
      expect(result[2].groupIndex).toBe(2);
    });
  });

  describe('time threshold', () => {
    it('should break group when time threshold exceeded (default 5 minutes)', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:06:00Z'), // 6 minutes later
      ];

      const result = groupResponses(responses);

      expect(result[0].groupId).toBe('1');
      expect(result[0].groupSize).toBe(1);
      expect(result[1].groupId).toBe('2');
      expect(result[1].groupSize).toBe(1);
    });

    it('should keep in same group when within time threshold', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:04:59Z'), // 4:59 later (under 5 min)
      ];

      const result = groupResponses(responses);

      expect(result[0].groupId).toBe('1');
      expect(result[0].groupSize).toBe(2);
      expect(result[1].groupId).toBe('1');
    });

    it('should respect custom time threshold', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:30Z'), // 1.5 minutes later
      ];

      // 1 minute threshold - should break
      const result = groupResponses(responses, { timeThresholdMs: 60000 });

      expect(result[0].groupId).toBe('1');
      expect(result[0].groupSize).toBe(1);
      expect(result[1].groupId).toBe('2');
      expect(result[1].groupSize).toBe(1);
    });
  });

  describe('thread boundaries', () => {
    it('should break group when parent response changes (default behavior)', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z', null),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z', 'parent-1'),
      ];

      const result = groupResponses(responses);

      expect(result[0].groupId).toBe('1');
      expect(result[1].groupId).toBe('2');
    });

    it('should keep in same group when same parent response', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z', 'parent-1'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z', 'parent-1'),
      ];

      const result = groupResponses(responses);

      expect(result[0].groupId).toBe('1');
      expect(result[1].groupId).toBe('1');
      expect(result[0].groupSize).toBe(2);
    });

    it('should ignore thread boundaries when breakOnThreadChange is false', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z', null),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z', 'parent-1'),
      ];

      const result = groupResponses(responses, { breakOnThreadChange: false });

      expect(result[0].groupId).toBe('1');
      expect(result[1].groupId).toBe('1');
      expect(result[0].groupSize).toBe(2);
    });
  });

  describe('complex scenarios', () => {
    it('should handle alternating authors correctly', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'bob', 'Bob', '2025-01-01T10:01:00Z'),
        createResponse('3', 'alice', 'Alice', '2025-01-01T10:02:00Z'),
        createResponse('4', 'bob', 'Bob', '2025-01-01T10:03:00Z'),
      ];

      const result = groupResponses(responses);

      // Each response is its own group
      expect(result[0].groupId).toBe('1');
      expect(result[0].groupSize).toBe(1);
      expect(result[1].groupId).toBe('2');
      expect(result[1].groupSize).toBe(1);
      expect(result[2].groupId).toBe('3');
      expect(result[2].groupSize).toBe(1);
      expect(result[3].groupId).toBe('4');
      expect(result[3].groupSize).toBe(1);
    });

    it('should handle mixed grouping patterns', () => {
      const responses = [
        createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
        createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z'),
        createResponse('3', 'bob', 'Bob', '2025-01-01T10:02:00Z'),
        createResponse('4', 'alice', 'Alice', '2025-01-01T10:03:00Z'),
        createResponse('5', 'alice', 'Alice', '2025-01-01T10:04:00Z'),
        createResponse('6', 'alice', 'Alice', '2025-01-01T10:05:00Z'),
      ];

      const result = groupResponses(responses);

      // Alice group 1: responses 1-2
      expect(result[0].groupSize).toBe(2);
      expect(result[1].groupSize).toBe(2);

      // Bob group: response 3
      expect(result[2].groupSize).toBe(1);

      // Alice group 2: responses 4-6
      expect(result[3].groupSize).toBe(3);
      expect(result[4].groupSize).toBe(3);
      expect(result[5].groupSize).toBe(3);
    });
  });
});

describe('shouldShowHeader', () => {
  it('should return true for group start', () => {
    const responses = [
      createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
      createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z'),
    ];

    const grouped = groupResponses(responses);

    expect(shouldShowHeader(grouped[0])).toBe(true);
    expect(shouldShowHeader(grouped[1])).toBe(false);
  });
});

describe('getGroupStats', () => {
  it('should return zeros for empty input', () => {
    const stats = getGroupStats([]);

    expect(stats).toEqual({
      totalGroups: 0,
      averageGroupSize: 0,
      largestGroupSize: 0,
    });
  });

  it('should calculate correct statistics', () => {
    const responses = [
      createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z'),
      createResponse('2', 'alice', 'Alice', '2025-01-01T10:01:00Z'),
      createResponse('3', 'bob', 'Bob', '2025-01-01T10:02:00Z'),
      createResponse('4', 'alice', 'Alice', '2025-01-01T10:03:00Z'),
      createResponse('5', 'alice', 'Alice', '2025-01-01T10:04:00Z'),
      createResponse('6', 'alice', 'Alice', '2025-01-01T10:05:00Z'),
    ];

    const grouped = groupResponses(responses);
    const stats = getGroupStats(grouped);

    expect(stats.totalGroups).toBe(3); // Alice (2), Bob (1), Alice (3)
    expect(stats.averageGroupSize).toBe(2); // 6 responses / 3 groups
    expect(stats.largestGroupSize).toBe(3); // Second Alice group
  });

  it('should handle single response', () => {
    const responses = [createResponse('1', 'alice', 'Alice', '2025-01-01T10:00:00Z')];

    const grouped = groupResponses(responses);
    const stats = getGroupStats(grouped);

    expect(stats.totalGroups).toBe(1);
    expect(stats.averageGroupSize).toBe(1);
    expect(stats.largestGroupSize).toBe(1);
  });
});
