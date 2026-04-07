/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ResponseDetailDto } from './dto/response-detail.dto.js';

const MAX_THREAD_DEPTH = 10;

/**
 * Threaded response with nested replies.
 *
 * Extends ResponseDetailDto with recursive replies array and depth tracking
 * for building and displaying response thread trees.
 */
export interface ThreadedResponse extends ResponseDetailDto {
  replies: ThreadedResponse[];
  depth: number;
}

/**
 * Handles response threading operations.
 *
 * Extracted from ResponsesService to isolate thread tree building
 * and depth calculation logic. This service is responsible for:
 * - Calculating how deep a response is in a thread tree
 * - Validating that new replies don't exceed the maximum depth
 * - Building nested thread trees from flat response arrays
 *
 * @remarks
 * The MAX_THREAD_DEPTH (10) serves as a safeguard against:
 * - Excessively nested discussions that become hard to follow
 * - Circular reference bugs causing infinite loops
 * - Performance issues with deeply nested tree traversal
 */
@Injectable()
export class ResponseThreadingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Calculate thread depth for a response.
   *
   * Recursively traverses up the parent chain to determine how deep
   * in the thread tree a response is. Includes a safeguard against
   * infinite loops from circular references.
   *
   * @param responseId - The ID of the response to calculate depth for
   * @returns The depth (0 for top-level, 1 for first reply, etc.), capped at MAX_DEPTH
   *
   * @example
   * ```typescript
   * // Top-level response returns 0
   * const depth = await service.calculateThreadDepth('root-response-id');
   * // depth === 0
   *
   * // Reply to top-level returns 1
   * const depth = await service.calculateThreadDepth('reply-id');
   * // depth === 1
   * ```
   */
  async calculateThreadDepth(responseId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = responseId;

    while (currentId && depth < MAX_THREAD_DEPTH) {
      const response: { parentId: string | null } | null = await this.prisma.response.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!response) break;

      if (response.parentId) {
        depth++;
        currentId = response.parentId;
      } else {
        break; // Reached top-level response
      }
    }

    return depth;
  }

  /**
   * Validate that replying to a response won't exceed depth limit.
   *
   * Call this before creating a reply to ensure the thread doesn't
   * become too deeply nested. A reply to a response at depth N
   * would be at depth N+1.
   *
   * @param parentResponseId - ID of the response being replied to
   * @throws {BadRequestException} If depth limit would be exceeded
   *
   * @example
   * ```typescript
   * // Throws if replying would exceed max depth
   * await service.validateReplyDepth('deep-response-id');
   * // BadRequestException: Thread depth limit exceeded (max 10 levels)
   * ```
   */
  async validateReplyDepth(parentResponseId: string): Promise<void> {
    const depth = await this.calculateThreadDepth(parentResponseId);

    if (depth >= MAX_THREAD_DEPTH) {
      throw new BadRequestException(
        `Thread depth limit exceeded (max ${MAX_THREAD_DEPTH} levels). ` +
          'Please reply to a higher-level response.',
      );
    }
  }

  /**
   * Build recursive thread tree from flat response list.
   *
   * Transforms a flat array of responses into a nested tree structure
   * for display. Each response includes its direct replies as children.
   *
   * @remarks
   * - Maintains chronological order (insertion order) within each level
   * - Calculates depth for each response based on parent chain
   * - Handles orphaned responses gracefully (parent deleted) - treats them as root
   * - Uses O(n) time complexity with Map for lookup
   *
   * @param responses - Flat array of responses from database (should be sorted by createdAt)
   * @returns Tree structure with responses and nested replies
   *
   * @example
   * ```typescript
   * const flatResponses = [
   *   { id: 'r1', parentResponseId: null, ... },
   *   { id: 'r2', parentResponseId: 'r1', ... },
   *   { id: 'r3', parentResponseId: 'r2', ... },
   * ];
   *
   * const tree = service.buildThreadTree(flatResponses);
   * // tree[0].id === 'r1'
   * // tree[0].replies[0].id === 'r2'
   * // tree[0].replies[0].replies[0].id === 'r3'
   * ```
   */
  buildThreadTree(responses: ResponseDetailDto[]): ThreadedResponse[] {
    // Create a map for O(1) lookup
    const responseMap = new Map<string, ThreadedResponse>();
    const rootResponses: ThreadedResponse[] = [];

    // Initialize all responses as threaded responses
    responses.forEach((response) => {
      responseMap.set(response.id, {
        ...response,
        replies: [],
        depth: 0,
      });
    });

    // Build tree structure and calculate depths
    responses.forEach((response) => {
      const threadedResponse = responseMap.get(response.id)!;

      if (response.parentResponseId) {
        const parent = responseMap.get(response.parentResponseId);
        if (parent) {
          parent.replies.push(threadedResponse);
          threadedResponse.depth = parent.depth + 1;
        } else {
          // Orphaned response (parent deleted) - treat as root
          rootResponses.push(threadedResponse);
        }
      } else {
        rootResponses.push(threadedResponse);
      }
    });

    return rootResponses;
  }
}
