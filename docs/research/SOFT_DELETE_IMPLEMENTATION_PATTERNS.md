# Soft Delete Implementation Patterns - Technical Guide

**Feature**: Discussion Participation (009)
**Component**: Response deletion with conditional soft/hard delete
**Date**: 2026-01-27

---

## Table of Contents

1. [Deletion Service Pattern](#deletion-service-pattern)
2. [Query Building Patterns](#query-building-patterns)
3. [Testing Patterns](#testing-patterns)
4. [Error Handling Patterns](#error-handling-patterns)
5. [Performance Patterns](#performance-patterns)

---

## Deletion Service Pattern

### Complete ResponsesService.deleteResponse Implementation

```typescript
// File: services/discussion-service/src/responses/responses.service.ts

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Delete a response with conditional soft/hard delete logic
   * - SOFT DELETE: If response has child replies (preserves thread integrity)
   * - HARD DELETE: If response has no replies (respects user privacy)
   *
   * @param responseId - The ID of the response to delete
   * @param authorId - The ID of the user requesting deletion (for authorization)
   * @returns The deleted or soft-deleted response
   * @throws ForbiddenException - If user is not the response author
   * @throws NotFoundException - If response doesn't exist
   * @throws BadRequestException - If response is cited in fact-checks
   */
  async deleteResponse(responseId: string, authorId: string): Promise<void> {
    // Step 1: Fetch response with all necessary relationships
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        authorId: true,
        topicId: true,
        status: true,
        _count: {
          select: {
            replies: true,
            factCheckResults: true,
            feedback: true,
          },
        },
      },
    });

    // Step 2: Validate existence
    if (!response) {
      throw new NotFoundException(`Response with ID ${responseId} not found`);
    }

    // Step 3: Authorize - only author can delete
    if (response.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own responses');
    }

    // Step 4: Check for hard-delete blockers
    // Responses cited in fact-checks should not be hard-deleted
    if (response._count.factCheckResults > 0 && response._count.replies === 0) {
      throw new BadRequestException(
        'Cannot delete response with active fact-check citations. ' +
          'This response will be kept as a placeholder to preserve citation integrity. ' +
          'Contact support if you need further assistance.',
      );
    }

    // Step 5: Determine soft vs hard delete
    const hasReplies = response._count.replies > 0;

    if (hasReplies) {
      // SOFT DELETE: Response has replies - preserve thread structure
      await this.softDeleteResponse(responseId, response.topicId);
    } else {
      // HARD DELETE: Response has no replies - safe to remove completely
      await this.hardDeleteResponse(responseId);
    }

    // Step 6: Update topic metrics (decrement response count)
    // Only if hard-deleted; soft-deleted responses still count
    if (!hasReplies) {
      await this.prisma.discussionTopic.update({
        where: { id: response.topicId },
        data: {
          responseCount: {
            decrement: 1,
          },
        },
      });
    }
  }

  /**
   * Soft delete: Set deletedAt timestamp and replace content with placeholder
   * Maintains referential integrity for threaded responses
   */
  private async softDeleteResponse(responseId: string, topicId: string): Promise<void> {
    await this.prisma.response.update({
      where: { id: responseId },
      data: {
        deletedAt: new Date(),
        content: '[deleted by author]',
        status: 'DELETED', // If using ResponseStatus enum
      },
    });

    // Log for audit trail
    console.log(
      `[SOFT DELETE] Response ${responseId} in topic ${topicId} ` +
        `soft-deleted at ${new Date().toISOString()}`,
    );
  }

  /**
   * Hard delete: Completely remove response from database
   * Cascades delete to related records (Feedback, Votes, ResponseProposition)
   */
  private async hardDeleteResponse(responseId: string): Promise<void> {
    // Prisma will cascade delete:
    // - ResponseProposition records (via onDelete: Cascade)
    // - Feedback records (via onDelete: Cascade)
    // - Vote records (via onDelete: Cascade)
    // - FactCheckResult records (via onDelete: Cascade)
    await this.prisma.response.delete({
      where: { id: responseId },
    });

    // Log for audit trail
    console.log(
      `[HARD DELETE] Response ${responseId} permanently deleted ` +
        `at ${new Date().toISOString()}`,
    );
  }

  /**
   * Un-delete a soft-deleted response (restore)
   * Only works for responses that were soft-deleted (deletedAt is not null)
   *
   * @param responseId - The ID of the response to restore
   * @param authorId - The ID of the user requesting restoration
   * @throws NotFoundException - If response or author mismatch
   * @throws BadRequestException - If response was hard-deleted
   */
  async restoreDeletedResponse(responseId: string, authorId: string): Promise<any> {
    // Fetch soft-deleted response (includeDeleted: true to find it)
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      includeDeleted: true, // Custom extension flag
    });

    if (!response) {
      throw new NotFoundException(`Response ${responseId} not found`);
    }

    if (response.authorId !== authorId) {
      throw new ForbiddenException('Can only restore own responses');
    }

    if (!response.deletedAt) {
      throw new BadRequestException('Response is not deleted');
    }

    // Restore: Clear deletedAt and set content back
    // Original content is lost, so restore with generic message
    return this.prisma.response.update({
      where: { id: responseId },
      data: {
        deletedAt: null,
        content: '[This response was deleted and has been restored]',
        status: 'VISIBLE',
      },
    });
  }
}
```

### ResponsesController - Delete Endpoint

```typescript
// File: services/discussion-service/src/responses/responses.controller.ts

@Controller('responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  /**
   * DELETE /responses/:id
   * Delete a response with conditional soft/hard delete behavior
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteResponse(
    @Param('id') responseId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ message: string; deleted: boolean }> {
    await this.responsesService.deleteResponse(responseId, user.id);

    return {
      message: 'Response deleted successfully',
      deleted: true,
    };
  }
}
```

---

## Query Building Patterns

### Pattern 1: Fetch Topic with All Responses (Soft-Deleted Excluded)

```typescript
/**
 * Get a complete discussion thread with all responses
 * Soft-deleted responses are automatically excluded
 */
async getDiscussionThread(topicId: string): Promise<DiscussionWithResponses> {
  const topic = await this.prisma.discussionTopic.findUnique({
    where: { id: topicId },
    include: {
      responses: {
        where: {
          parentId: null, // Top-level only
        },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              verificationLevel: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
              replies: {
                include: {
                  author: {
                    select: {
                      id: true,
                      displayName: true,
                    },
                  },
                  // Could nest deeper...
                },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: { responses: true },
      },
    },
  });

  if (!topic) {
    throw new NotFoundException(`Topic ${topicId} not found`);
  }

  return topic;
  // All soft-deleted responses automatically excluded from includes/selects
}
```

### Pattern 2: Efficient Pagination with Reply Counts

```typescript
/**
 * Get paginated responses with reply count (avoids N+1)
 */
async getResponsesPaginated(
  topicId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ responses: any[]; total: number; hasMore: boolean }> {
  const skip = (page - 1) * pageSize;

  // Fetch total count (excludes soft-deleted)
  const total = await this.prisma.response.count({
    where: { topicId, parentId: null },
  });

  // Fetch paginated responses with aggregation for reply count
  const responses = await this.prisma.response.findMany({
    where: {
      topicId,
      parentId: null,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
      author: {
        select: { id: true, displayName: true },
      },
      _count: {
        select: { replies: true }, // Aggregation - single query, not N queries
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize,
  });

  return {
    responses: responses.map(r => ({
      ...r,
      replyCount: r._count.replies,
    })),
    total,
    hasMore: skip + pageSize < total,
  };
}
```

### Pattern 3: Include Soft-Deleted for Moderation

```typescript
/**
 * Fetch responses including soft-deleted (for moderation dashboard)
 */
async getResponsesForModeration(topicId: string): Promise<any[]> {
  return this.prisma.response.findMany({
    where: { topicId },
    includeDeleted: true, // Custom extension flag to include soft-deleted
    include: {
      author: { select: { id: true, displayName: true } },
    },
    orderBy: { deletedAt: { sort: 'desc', nulls: 'last' } },
  });
}
```

### Pattern 4: Only Deleted Responses (Audit/Recovery)

```typescript
/**
 * Get only soft-deleted responses for a topic
 * Used for audit logs or recovery features
 */
async getDeletedResponses(topicId: string): Promise<any[]> {
  return this.prisma.response.findMany({
    where: { topicId },
    onlyDeleted: true, // Custom extension flag for only deleted
    select: {
      id: true,
      content: true,
      deletedAt: true,
      author: { select: { id: true, displayName: true } },
    },
    orderBy: { deletedAt: 'desc' },
  });
}
```

### Pattern 5: Check Reply Count Before Deletion

```typescript
/**
 * Pre-check if response can be safely hard-deleted
 */
async canHardDeleteResponse(responseId: string): Promise<boolean> {
  const response = await this.prisma.response.findUnique({
    where: { id: responseId },
    select: {
      _count: {
        select: {
          replies: true,
          factCheckResults: true,
        },
      },
    },
  });

  if (!response) return false;

  // Can hard-delete only if: no replies AND no fact-check citations
  return response._count.replies === 0 && response._count.factCheckResults === 0;
}
```

### Pattern 6: Complex Filter with Soft-Delete

```typescript
/**
 * Find responses by multiple criteria, excluding soft-deleted
 */
async searchResponses(
  topicId: string,
  filters: {
    authorId?: string;
    hasOpinion?: boolean;
    hasFactualClaims?: boolean;
    minCreatedAt?: Date;
  },
): Promise<any[]> {
  const where: Prisma.ResponseWhereInput = {
    topicId,
    // Soft-deleted auto-excluded by extension
  };

  if (filters.authorId) {
    where.authorId = filters.authorId;
  }

  if (filters.hasOpinion !== undefined) {
    where.containsOpinion = filters.hasOpinion;
  }

  if (filters.hasFactualClaims !== undefined) {
    where.containsFactualClaims = filters.hasFactualClaims;
  }

  if (filters.minCreatedAt) {
    where.createdAt = { gte: filters.minCreatedAt };
  }

  return this.prisma.response.findMany({
    where,
    include: { author: { select: { id: true, displayName: true } } },
  });
}
```

---

## Testing Patterns

### Unit Test: Soft Delete Logic

```typescript
// File: services/discussion-service/src/responses/__tests__/responses.service.unit.test.ts

describe('ResponsesService - deleteResponse', () => {
  let service: ResponsesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ResponsesService,
        {
          provide: PrismaService,
          useValue: createMockPrismaClient(), // Mocked Prisma
        },
      ],
    }).compile();

    service = module.get(ResponsesService);
    prisma = module.get(PrismaService);
  });

  describe('Soft Delete (response has replies)', () => {
    it('should soft-delete response with replies', async () => {
      const response = {
        id: 'resp-1',
        authorId: 'user-1',
        topicId: 'topic-1',
        status: 'VISIBLE',
        _count: { replies: 2, factCheckResults: 0, feedback: 0 },
      };

      jest.spyOn(prisma.response, 'findUnique').mockResolvedValue(response as any);
      jest.spyOn(prisma.response, 'update').mockResolvedValue({
        id: response.id,
        deletedAt: new Date(),
        content: '[deleted by author]',
        status: 'DELETED',
      } as any);

      await service.deleteResponse('resp-1', 'user-1');

      expect(prisma.response.update).toHaveBeenCalledWith({
        where: { id: 'resp-1' },
        data: {
          deletedAt: expect.any(Date),
          content: '[deleted by author]',
          status: 'DELETED',
        },
      });
    });

    it('should NOT decrement response count for soft-deleted', async () => {
      const response = {
        id: 'resp-1',
        authorId: 'user-1',
        topicId: 'topic-1',
        _count: { replies: 1, factCheckResults: 0, feedback: 0 },
      };

      jest.spyOn(prisma.response, 'findUnique').mockResolvedValue(response as any);
      jest.spyOn(prisma.response, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.discussionTopic, 'update').mockResolvedValue({} as any);

      await service.deleteResponse('resp-1', 'user-1');

      expect(prisma.discussionTopic.update).not.toHaveBeenCalled();
    });
  });

  describe('Hard Delete (response has no replies)', () => {
    it('should hard-delete response without replies', async () => {
      const response = {
        id: 'resp-1',
        authorId: 'user-1',
        topicId: 'topic-1',
        _count: { replies: 0, factCheckResults: 0, feedback: 0 },
      };

      jest.spyOn(prisma.response, 'findUnique').mockResolvedValue(response as any);
      jest.spyOn(prisma.response, 'delete').mockResolvedValue({} as any);
      jest.spyOn(prisma.discussionTopic, 'update').mockResolvedValue({} as any);

      await service.deleteResponse('resp-1', 'user-1');

      expect(prisma.response.delete).toHaveBeenCalledWith({
        where: { id: 'resp-1' },
      });
    });

    it('should decrement response count for hard-deleted', async () => {
      const response = {
        id: 'resp-1',
        authorId: 'user-1',
        topicId: 'topic-1',
        _count: { replies: 0, factCheckResults: 0, feedback: 0 },
      };

      jest.spyOn(prisma.response, 'findUnique').mockResolvedValue(response as any);
      jest.spyOn(prisma.response, 'delete').mockResolvedValue({} as any);
      jest.spyOn(prisma.discussionTopic, 'update').mockResolvedValue({} as any);

      await service.deleteResponse('resp-1', 'user-1');

      expect(prisma.discussionTopic.update).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        data: { responseCount: { decrement: 1 } },
      });
    });
  });

  describe('Authorization checks', () => {
    it('should throw ForbiddenException if not author', async () => {
      const response = {
        id: 'resp-1',
        authorId: 'user-2', // Different author
        topicId: 'topic-1',
        _count: { replies: 0, factCheckResults: 0, feedback: 0 },
      };

      jest.spyOn(prisma.response, 'findUnique').mockResolvedValue(response as any);

      await expect(service.deleteResponse('resp-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if response has fact-checks', async () => {
      const response = {
        id: 'resp-1',
        authorId: 'user-1',
        topicId: 'topic-1',
        _count: { replies: 0, factCheckResults: 1, feedback: 0 },
      };

      jest.spyOn(prisma.response, 'findUnique').mockResolvedValue(response as any);

      await expect(service.deleteResponse('resp-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
```

### Integration Test: Soft Delete with Real Database

```typescript
// File: services/discussion-service/src/responses/__tests__/responses.integration.test.ts

describe('ResponsesService - Soft Delete Integration', () => {
  let service: ResponsesService;
  let prisma: PrismaService;
  let topicId: string;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  beforeEach(async () => {
    topicId = await createTestTopic();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Thread Preservation on Soft Delete', () => {
    it('should preserve thread structure when parent is soft-deleted', async () => {
      // Create thread: parent -> child1 -> child2
      const parent = await createTestResponse(topicId);
      const child1 = await createTestResponse(topicId, parent.id);
      const child2 = await createTestResponse(topicId, parent.id);

      // Soft-delete parent
      await service.deleteResponse(parent.id, parent.authorId);

      // Verify soft-deleted parent still exists
      const softDeletedParent = await prisma.response.findUnique({
        where: { id: parent.id },
        includeDeleted: true,
        include: { replies: true },
      });

      expect(softDeletedParent).toBeDefined();
      expect(softDeletedParent.deletedAt).toBeDefined();
      expect(softDeletedParent.content).toBe('[deleted by author]');
      expect(softDeletedParent.replies).toHaveLength(2);

      // Verify children still exist and reference parent
      expect(softDeletedParent.replies).toContainEqual(
        expect.objectContaining({ parentId: parent.id, id: child1.id }),
      );
      expect(softDeletedParent.replies).toContainEqual(
        expect.objectContaining({ parentId: parent.id, id: child2.id }),
      );
    });

    it('should exclude soft-deleted parent from normal queries', async () => {
      const parent = await createTestResponse(topicId);
      const child = await createTestResponse(topicId, parent.id);

      await service.deleteResponse(parent.id, parent.authorId);

      // Query top-level responses (normal query, soft-deleted excluded)
      const topLevelResponses = await prisma.response.findMany({
        where: { topicId, parentId: null },
      });

      expect(topLevelResponses).not.toContainEqual(expect.objectContaining({ id: parent.id }));

      // But child should still exist and be queryable
      const childResponse = await prisma.response.findUnique({
        where: { id: child.id },
      });
      expect(childResponse).toBeDefined();
      expect(childResponse.parentId).toBe(parent.id);
    });
  });

  describe('Hard Delete for Orphan Responses', () => {
    it('should hard-delete response without replies', async () => {
      const response = await createTestResponse(topicId);

      await service.deleteResponse(response.id, response.authorId);

      // Verify hard-deleted (record doesn't exist even with includeDeleted)
      const deleted = await prisma.response.findUnique({
        where: { id: response.id },
        includeDeleted: true,
      });

      expect(deleted).toBeNull();
    });

    it('should cascade delete related records on hard-delete', async () => {
      const response = await createTestResponse(topicId);

      // Add related records
      const feedback = await createTestFeedback(response.id);
      const vote = await createTestVote(response.id);

      await service.deleteResponse(response.id, response.authorId);

      // Verify cascade deleted feedback and vote
      const feedbackExists = await prisma.feedback.findUnique({
        where: { id: feedback.id },
      });
      expect(feedbackExists).toBeNull();

      const voteExists = await prisma.vote.findUnique({
        where: { id: vote.id },
      });
      expect(voteExists).toBeNull();
    });
  });
});
```

### E2E Test: User Deletion Workflow

```typescript
// File: frontend/e2e/responses.spec.ts

test.describe('Response Deletion E2E', () => {
  let discussionUrl: string;
  let responseId: string;

  test.beforeEach(async ({ page, context }) => {
    // Setup: Create topic and discussion
    const topic = await createTestTopic(context);
    const response = await createTestResponse(topic.id, context);
    responseId = response.id;
    discussionUrl = `/discussions/${topic.id}`;
  });

  test('should delete response without replies and remove completely', async ({ page }) => {
    await page.goto(discussionUrl);

    // Find and delete response
    const deleteButton = page.locator(`[data-testid="delete-response-${responseId}"]`);
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator('[data-testid="confirm-delete"]');
    await confirmButton.click();

    // Verify response is gone
    const responseContent = page.locator(`text=${responseContent}`);
    await expect(responseContent).not.toBeVisible();

    // Verify pagination/count updated
    const responseCount = page.locator('[data-testid="response-count"]');
    await expect(responseCount).toHaveText('0 responses');
  });

  test('should delete response with replies and show placeholder', async ({ page }) => {
    // Setup: Add reply to response
    const reply = await createTestReply(responseId);

    await page.goto(discussionUrl);

    // Delete response with reply
    const deleteButton = page.locator(`[data-testid="delete-response-${responseId}"]`);
    await deleteButton.click();
    const confirmButton = page.locator('[data-testid="confirm-delete"]');
    await confirmButton.click();

    // Verify placeholder appears
    const placeholder = page.locator('text=[deleted by author]');
    await expect(placeholder).toBeVisible();

    // Verify reply is still visible
    const replyContent = page.locator(`text=${reply.content}`);
    await expect(replyContent).toBeVisible();

    // Verify thread structure intact (reply still nested)
    const replyThread = page.locator('[data-testid="threaded-reply"]');
    await expect(replyThread).toBeVisible();
  });

  test('should prevent hard delete if response cited in fact-check', async ({ page }) => {
    // Setup: Create fact-check citation
    const factCheck = await createTestFactCheck(responseId);

    await page.goto(discussionUrl);

    // Try to delete response
    const deleteButton = page.locator(`[data-testid="delete-response-${responseId}"]`);
    await deleteButton.click();
    const confirmButton = page.locator('[data-testid="confirm-delete"]');
    await confirmButton.click();

    // Verify error message
    const errorMessage = page.locator('text=Cannot delete response with active fact-check');
    await expect(errorMessage).toBeVisible();

    // Verify response still exists
    const responseContent = page.locator(`[data-testid="response-content-${responseId}"]`);
    await expect(responseContent).toBeVisible();
  });
});
```

---

## Error Handling Patterns

### Custom Error Classes

```typescript
// File: shared/errors/response-deletion.errors.ts

/**
 * Base class for response deletion errors
 */
export class ResponseDeletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResponseDeletionError';
  }
}

/**
 * Response cannot be deleted because it's cited in fact-checks
 */
export class ResponseCitedInFactCheckError extends ResponseDeletionError {
  constructor(responseId: string, factCheckCount: number) {
    super(
      `Response ${responseId} is cited in ${factCheckCount} fact-check reports. ` +
        `These responses cannot be hard-deleted to preserve citation integrity. ` +
        `Contact support if you need further assistance.`,
    );
    this.name = 'ResponseCitedInFactCheckError';
  }
}

/**
 * Response cannot be deleted because user is not the author
 */
export class ResponseAuthorizationError extends ResponseDeletionError {
  constructor(responseId: string) {
    super(
      `You can only delete responses you created. ` +
        `If you believe this response violates community guidelines, ` +
        `please use the "Report" button instead.`,
    );
    this.name = 'ResponseAuthorizationError';
  }
}
```

### Error Handling in Service

```typescript
async deleteResponse(
  responseId: string,
  authorId: string,
): Promise<void> {
  try {
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        authorId: true,
        topicId: true,
        _count: {
          select: {
            replies: true,
            factCheckResults: true,
          },
        },
      },
    });

    if (!response) {
      throw new NotFoundException(`Response ${responseId} not found`);
    }

    if (response.authorId !== authorId) {
      throw new ResponseAuthorizationError(responseId);
    }

    // Check if can hard-delete
    if (
      response._count.factCheckResults > 0 &&
      response._count.replies === 0
    ) {
      throw new ResponseCitedInFactCheckError(
        responseId,
        response._count.factCheckResults
      );
    }

    // Proceed with deletion...
  } catch (error) {
    // Log error with context
    this.logger.error(
      `Error deleting response ${responseId}: ${error.message}`,
      error.stack,
      { userId: authorId, errorType: error.constructor.name }
    );

    // Re-throw for controller to handle
    throw error;
  }
}
```

### Exception Filters

```typescript
// File: shared/filters/response-deletion-exception.filter.ts

@Catch(ResponseDeletionError)
export class ResponseDeletionExceptionFilter implements ExceptionFilter {
  catch(exception: ResponseDeletionError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode = this.getHttpStatus(exception);
    const message = this.getClientMessage(exception);

    response.status(statusCode).json({
      statusCode,
      message,
      error: exception.constructor.name,
      timestamp: new Date().toISOString(),
    });
  }

  private getHttpStatus(exception: ResponseDeletionError): number {
    if (exception instanceof ResponseAuthorizationError) {
      return HttpStatus.FORBIDDEN;
    }
    if (exception instanceof ResponseCitedInFactCheckError) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.BAD_REQUEST;
  }

  private getClientMessage(exception: ResponseDeletionError): string {
    return exception.message;
  }
}
```

---

## Performance Patterns

### Batch Deletion Optimization

```typescript
/**
 * Soft-delete multiple responses (e.g., when user deletes account)
 * Uses updateMany to avoid N individual queries
 */
async softDeleteUserResponses(userId: string): Promise<number> {
  const result = await this.prisma.response.updateMany({
    where: {
      authorId: userId,
      // Only soft-delete responses with replies (preserve threads)
      replies: {
        some: {} // Has at least one reply
      }
    },
    data: {
      deletedAt: new Date(),
      content: '[deleted by author]',
      status: 'DELETED',
    },
  });

  return result.count;
}
```

### Index Verification

```typescript
/**
 * Verify soft-delete indexes are present
 * Run after schema migrations
 */
async verifyIndexes(): Promise<boolean> {
  const indexes = await this.prisma.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'responses'
    AND indexname LIKE '%deleted_at%'
  `;

  const hasDeletedAtIndex = indexes.length > 0;
  const hasCompositeIndex = indexes.some(
    (idx: any) => idx.indexname === 'responses_topic_id_deleted_at_idx'
  );

  return hasDeletedAtIndex && hasCompositeIndex;
}
```

### Query Cost Analysis

```typescript
/**
 * Analyze query performance for soft-delete queries
 * Use EXPLAIN ANALYZE in development
 */
async analyzeQueryPerformance(): Promise<any> {
  const plan = await this.prisma.$queryRaw`
    EXPLAIN ANALYZE
    SELECT * FROM responses
    WHERE topic_id = $1
    AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return plan;
}
```

---

**End of Implementation Patterns Guide**

**Related Documents**:

- [Prisma Soft Delete Research](./PRISMA_SOFT_DELETE_RESEARCH.md)
- [Feature Specification](./specs/009-discussion-participation/spec.md)
- [Data Model Documentation](./specs/009-discussion-participation/data-model.md)
