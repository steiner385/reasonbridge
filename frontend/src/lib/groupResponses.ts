/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Message Grouping Utility
 *
 * Groups consecutive messages from the same author within a configurable time
 * threshold, enabling compact rendering where only the first message in a group
 * shows avatar/name/timestamp (similar to Discord/Slack patterns).
 *
 * @remarks
 * - Groups are broken when author changes or time threshold is exceeded
 * - Each grouped response includes flags for UI rendering decisions
 * - Works with any response type that has author.id and createdAt fields
 */

/**
 * Minimum interface required for grouping responses
 */
export interface GroupableResponse {
  id: string;
  author: {
    id: string;
    displayName: string;
  };
  createdAt: string;
  parentResponseId?: string | null;
}

/**
 * A response wrapped with grouping metadata
 */
export interface GroupedResponse<T extends GroupableResponse> {
  /** The original response object */
  response: T;
  /** Whether this response starts a new group (show avatar/name/time) */
  isGroupStart: boolean;
  /** Whether this response ends a group (for future styling like rounded corners) */
  isGroupEnd: boolean;
  /** Unique identifier for this group (first response ID in group) */
  groupId: string;
  /** Position within the group (0-indexed) */
  groupIndex: number;
  /** Total responses in this group */
  groupSize: number;
}

/**
 * Configuration options for grouping
 */
export interface GroupResponsesConfig {
  /**
   * Time threshold in milliseconds for grouping consecutive messages
   * from the same author. Messages beyond this threshold start a new group.
   * @default 300000 (5 minutes)
   */
  timeThresholdMs?: number;

  /**
   * Whether to break groups at thread boundaries (different parent IDs)
   * @default true
   */
  breakOnThreadChange?: boolean;
}

const DEFAULT_TIME_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Groups consecutive responses from the same author within a time threshold
 *
 * @example
 * ```typescript
 * const responses = [
 *   { id: '1', author: { id: 'alice', displayName: 'Alice' }, createdAt: '2025-01-01T10:00:00Z' },
 *   { id: '2', author: { id: 'alice', displayName: 'Alice' }, createdAt: '2025-01-01T10:01:00Z' },
 *   { id: '3', author: { id: 'bob', displayName: 'Bob' }, createdAt: '2025-01-01T10:02:00Z' },
 * ];
 *
 * const grouped = groupResponses(responses);
 * // Result:
 * // - Response 1: isGroupStart=true, isGroupEnd=false, groupSize=2
 * // - Response 2: isGroupStart=false, isGroupEnd=true, groupSize=2
 * // - Response 3: isGroupStart=true, isGroupEnd=true, groupSize=1
 * ```
 *
 * @param responses - Array of responses to group (must be in chronological order)
 * @param config - Optional configuration for grouping behavior
 * @returns Array of grouped responses with metadata
 */
export function groupResponses<T extends GroupableResponse>(
  responses: T[],
  config: GroupResponsesConfig = {},
): GroupedResponse<T>[] {
  const { timeThresholdMs = DEFAULT_TIME_THRESHOLD_MS, breakOnThreadChange = true } = config;

  if (responses.length === 0) {
    return [];
  }

  // First pass: assign groups
  const groups: { responses: T[]; groupId: string }[] = [];
  let currentGroup: { responses: T[]; groupId: string } | null = null;

  for (const response of responses) {
    const shouldStartNewGroup = shouldBreakGroup(
      currentGroup?.responses[currentGroup.responses.length - 1],
      response,
      timeThresholdMs,
      breakOnThreadChange,
    );

    if (shouldStartNewGroup || !currentGroup) {
      currentGroup = { responses: [response], groupId: response.id };
      groups.push(currentGroup);
    } else {
      currentGroup.responses.push(response);
    }
  }

  // Second pass: build result with metadata
  const result: GroupedResponse<T>[] = [];

  for (const group of groups) {
    const groupSize = group.responses.length;

    group.responses.forEach((response, i) => {
      result.push({
        response,
        isGroupStart: i === 0,
        isGroupEnd: i === groupSize - 1,
        groupId: group.groupId,
        groupIndex: i,
        groupSize,
      });
    });
  }

  return result;
}

/**
 * Determines if a new group should start based on author, time, and thread
 */
function shouldBreakGroup<T extends GroupableResponse>(
  previous: T | undefined,
  current: T,
  timeThresholdMs: number,
  breakOnThreadChange: boolean,
): boolean {
  if (!previous) {
    return true;
  }

  // Different author
  if (previous.author.id !== current.author.id) {
    return true;
  }

  // Time threshold exceeded
  const prevTime = new Date(previous.createdAt).getTime();
  const currTime = new Date(current.createdAt).getTime();
  if (currTime - prevTime > timeThresholdMs) {
    return true;
  }

  // Different thread (parent response)
  if (breakOnThreadChange && previous.parentResponseId !== current.parentResponseId) {
    return true;
  }

  return false;
}

/**
 * Helper to check if a response should show full header (avatar/name/time)
 */
export function shouldShowHeader<T extends GroupableResponse>(
  grouped: GroupedResponse<T>,
): boolean {
  return grouped.isGroupStart;
}

/**
 * Helper to get group statistics for a set of grouped responses
 */
export function getGroupStats<T extends GroupableResponse>(
  grouped: GroupedResponse<T>[],
): { totalGroups: number; averageGroupSize: number; largestGroupSize: number } {
  const groupIds = new Set(grouped.map((g) => g.groupId));
  const totalGroups = groupIds.size;

  if (totalGroups === 0) {
    return { totalGroups: 0, averageGroupSize: 0, largestGroupSize: 0 };
  }

  const groupSizes = Array.from(groupIds).map(
    (id) => grouped.find((g) => g.groupId === id)?.groupSize ?? 0,
  );

  return {
    totalGroups,
    averageGroupSize: grouped.length / totalGroups,
    largestGroupSize: Math.max(...groupSizes),
  };
}
