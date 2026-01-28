# Optimistic Locking Implementation Guide

Quick reference guide for implementing version-based optimistic locking for response edits.

## Quick Implementation Paths

### Path 1: Minimal (Version Field Only)

**Effort:** 2-3 hours | **Files Changed:** 5

1. Add `version` field to Response schema
2. Create migration
3. Update `UpdateResponseDto` to include `expectedVersion`
4. Update `ResponseDto` to include `version`
5. Modify `updateResponse()` method with version check

### Path 2: Full (Include Conflict Handling)

**Effort:** 4-5 hours | **Files Changed:** 8

All of Path 1 + 6. Create `ConflictException` class 7. Update error middleware 8. Add error handling tests

### Path 3: Production-Ready (Include Client Integration)

**Effort:** 6-8 hours | **Files Changed:** 12+

All of Path 2 + 9. Update frontend components 10. Implement conflict resolution UI 11. Add integration tests 12. Update API documentation

---

## File-by-File Changes

### 1. Schema Migration

**File:** `packages/db-models/prisma/migrations/[timestamp]_add_response_version/migration.sql`

```sql
-- CreateTable for new schema
-- Prisma generates this, but manually:

ALTER TABLE responses ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Verify migration
SELECT COUNT(*), COUNT(DISTINCT version) FROM responses;
-- Should show: (row_count, row_count) if all set to 1
```

**How to generate:**

```bash
cd packages/db-models
npx prisma migrate dev --name add_response_version
```

---

### 2. Prisma Schema Update

**File:** `packages/db-models/prisma/schema.prisma`

**Add to Response model:**

```prisma
model Response {
  id                    String         @id @default(uuid()) @db.Uuid
  topicId               String         @map("topic_id") @db.Uuid
  authorId              String         @map("author_id") @db.Uuid
  parentId              String?        @map("parent_id") @db.Uuid
  content               String         @db.Text
  citedSources          Json?          @map("cited_sources")
  containsOpinion       Boolean        @default(false) @map("contains_opinion")
  containsFactualClaims Boolean        @default(false) @map("contains_factual_claims")
  status                ResponseStatus @default(VISIBLE)
  revisionCount         Int            @default(0) @map("revision_count")
  version               Int            @default(1)              // ADD THIS LINE
  createdAt             DateTime       @default(now()) @map("created_at")
  updatedAt             DateTime       @updatedAt @map("updated_at")

  // ... rest unchanged ...
}
```

---

### 3. DTOs

**File:** `services/discussion-service/src/responses/dto/update-response.dto.ts`

```typescript
export class UpdateResponseDto {
  content?: string;
  containsOpinion?: boolean;
  containsFactualClaims?: boolean;
  citedSources?: string[];
  propositionIds?: string[];
  expectedVersion: number; // ADD THIS LINE - Client sends current version
}
```

**File:** `services/discussion-service/src/responses/dto/response.dto.ts`

```typescript
export interface ResponseDto {
  id: string;
  content: string;
  authorId: string;
  parentId: string | null;
  author?: UserSummaryDto;
  citedSources?: CitedSourceDto[];
  containsOpinion: boolean;
  containsFactualClaims: boolean;
  propositions?: PropositionDto[];
  status: string;
  revisionCount: number;
  version: number; // ADD THIS LINE - Return current version
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 4. Custom Exception

**File:** `services/discussion-service/src/common/exceptions/conflict.exception.ts` (Create new)

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class ConflictException extends HttpException {
  constructor(
    message: string,
    details?: {
      code: string;
      currentVersion?: number;
      expectedVersion?: number;
      currentUpdatedAt?: Date;
    },
  ) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message,
        details,
        preserveUserInput: true,
      },
      HttpStatus.CONFLICT,
    );
  }
}
```

---

### 5. Service Implementation

**File:** `services/discussion-service/src/responses/responses.service.ts`

**Replace the entire `updateResponse()` method:**

```typescript
async updateResponse(
  responseId: string,
  authorId: string,
  updateResponseDto: UpdateResponseDto,
): Promise<ResponseDto> {
  // 1. Fetch the existing response
  const existingResponse = await this.prisma.response.findUnique({
    where: { id: responseId },
    select: {
      id: true,
      authorId: true,
      version: true,
      createdAt: true,
      status: true,
      topic: {
        select: { status: true },
      },
    },
  });

  if (!existingResponse) {
    throw new NotFoundException(`Response with ID ${responseId} not found`);
  }

  // 2. Authorization check
  if (existingResponse.authorId !== authorId) {
    throw new ForbiddenException('You can only edit your own responses');
  }

  // 3. Check 24-hour edit window
  const now = new Date();
  const msElapsed = now.getTime() - existingResponse.createdAt.getTime();
  const hoursElapsed = msElapsed / (1000 * 60 * 60);

  if (hoursElapsed > 24) {
    throw new BadRequestException(
      'Responses can only be edited within 24 hours of creation',
    );
  }

  // 4. Check response status
  if (existingResponse.status === 'HIDDEN' || existingResponse.status === 'REMOVED') {
    throw new BadRequestException(
      `Cannot edit responses with status: ${existingResponse.status}`,
    );
  }

  // 5. Check topic status
  if (existingResponse.topic.status === 'ARCHIVED') {
    throw new BadRequestException('Cannot edit responses in archived topics');
  }

  // 6. Validate content
  if (updateResponseDto.content !== undefined) {
    const content = updateResponseDto.content.trim();
    if (content.length < 10) {
      throw new BadRequestException('Response content must be at least 10 characters');
    }
    if (content.length > 10000) {
      throw new BadRequestException('Response content must not exceed 10000 characters');
    }
  }

  // 7. OPTIMISTIC LOCK CHECK
  if (existingResponse.version !== updateResponseDto.expectedVersion) {
    throw new ConflictException(
      'Response has been modified by another user. Please refresh and try again.',
      {
        code: 'EDIT_CONFLICT',
        currentVersion: existingResponse.version,
        expectedVersion: updateResponseDto.expectedVersion,
      },
    );
  }

  // 8. Prepare update data
  const updateData: any = {
    version: existingResponse.version + 1,  // Increment version
    revisionCount: { increment: 1 },
  };

  if (updateResponseDto.content !== undefined) {
    updateData.content = updateResponseDto.content.trim();
  }

  if (updateResponseDto.containsOpinion !== undefined) {
    updateData.containsOpinion = updateResponseDto.containsOpinion;
  }

  if (updateResponseDto.containsFactualClaims !== undefined) {
    updateData.containsFactualClaims = updateResponseDto.containsFactualClaims;
  }

  if (updateResponseDto.citedSources !== undefined) {
    updateData.citedSources =
      updateResponseDto.citedSources.length > 0
        ? updateResponseDto.citedSources.map((url) => ({
            url,
            title: null,
            extractedAt: new Date().toISOString(),
          }))
        : null;
  }

  // 9. Perform update
  const updatedResponse = await this.prisma.response.update({
    where: { id: responseId },
    data: updateData,
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
        },
      },
      propositions: {
        include: {
          proposition: {
            select: {
              id: true,
              statement: true,
            },
          },
        },
      },
    },
  });

  // 10. Handle proposition associations if provided
  if (updateResponseDto.propositionIds !== undefined) {
    await this.prisma.responseProposition.deleteMany({
      where: { responseId },
    });

    if (updateResponseDto.propositionIds.length > 0) {
      await this.prisma.responseProposition.createMany({
        data: updateResponseDto.propositionIds.map((propositionId) => ({
          responseId,
          propositionId,
        })),
        skipDuplicates: true,
      });
    }

    const responseWithPropositions = await this.prisma.response.findUnique({
      where: { id: responseId },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
          },
        },
        propositions: {
          include: {
            proposition: {
              select: {
                id: true,
                statement: true,
              },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(responseWithPropositions!);
  }

  return this.mapToResponseDto(updatedResponse);
}
```

**Update `mapToResponseDto()` method:**

```typescript
private mapToResponseDto(response: any): ResponseDto {
  const citedSources: CitedSourceDto[] | undefined = response.citedSources
    ? Array.isArray(response.citedSources)
      ? response.citedSources
      : []
    : undefined;

  const author: UserSummaryDto | undefined = response.author
    ? {
        id: response.author.id,
        displayName: response.author.displayName,
      }
    : undefined;

  return {
    id: response.id,
    content: response.content,
    authorId: response.authorId,
    parentId: response.parentId ?? null,
    author,
    citedSources,
    containsOpinion: response.containsOpinion,
    containsFactualClaims: response.containsFactualClaims,
    propositions: response.propositions
      ? response.propositions.map((rp: any) => ({
          id: rp.proposition.id,
          statement: rp.proposition.statement,
          relevanceScore: rp.relevanceScore ? Number(rp.relevanceScore) : undefined,
        }))
      : undefined,
    status: response.status.toLowerCase(),
    revisionCount: response.revisionCount,
    version: response.version,  // ADD THIS LINE
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}
```

---

### 6. Controller Update

**File:** `services/discussion-service/src/responses/responses.controller.ts`

Update the PATCH endpoint to document the expectedVersion requirement:

```typescript
@Patch(':id')
@HttpCode(HttpStatus.OK)
async updateResponse(
  @Param('id') id: string,
  @Body() updateResponseDto: UpdateResponseDto,  // Already accepts expectedVersion
  @Req() request: any,  // Injected request to get user info
) {
  const userId = request.user?.id;
  if (!userId) {
    throw new ForbiddenException('User not authenticated');
  }

  return this.responsesService.updateResponse(id, userId, updateResponseDto);
}
```

**Update API docs comment:**

```typescript
/**
 * Update a response
 *
 * @param id Response ID
 * @param updateResponseDto Update data including expectedVersion for optimistic locking
 * @param request Express request with authenticated user
 * @returns Updated response with new version
 *
 * @throws ConflictException (409) if version doesn't match (concurrent edit detected)
 * @throws ForbiddenException (403) if user is not the author
 * @throws BadRequestException (400) if edit window (24h) has passed
 *
 * Example request:
 * PATCH /responses/abc-123
 * {
 *   "content": "Updated response text",
 *   "expectedVersion": 5
 * }
 *
 * Example response (success):
 * {
 *   "id": "abc-123",
 *   "version": 6,
 *   "content": "Updated response text",
 *   "updatedAt": "2026-01-27T10:30:00Z",
 *   ...
 * }
 *
 * Example response (conflict):
 * {
 *   "statusCode": 409,
 *   "error": "Conflict",
 *   "message": "Response has been modified by another user",
 *   "details": {
 *     "code": "EDIT_CONFLICT",
 *     "currentVersion": 7,
 *     "expectedVersion": 5
 *   },
 *   "preserveUserInput": true
 * }
 */
```

---

### 7. Tests

**File:** `services/discussion-service/src/responses/__tests__/responses.service.unit.test.ts`

Add test cases:

```typescript
describe('updateResponse - Optimistic Locking', () => {
  it('should update response when version matches', async () => {
    mockPrisma.response.findUnique.mockResolvedValue(
      createMockResponse({ version: 5, topic: { status: 'ACTIVE' } }),
    );
    mockPrisma.response.update.mockResolvedValue(
      createMockResponse({ version: 6, content: 'Updated' }),
    );

    const result = await service.updateResponse('response-1', 'user-1', {
      content: 'Updated content',
      expectedVersion: 5,
    });

    expect(result.version).toBe(6);
    expect(mockPrisma.response.update).toHaveBeenCalledWith({
      where: { id: 'response-1' },
      data: expect.objectContaining({
        version: 6,
        content: 'Updated content',
      }),
    });
  });

  it('should throw ConflictException when version mismatches', async () => {
    mockPrisma.response.findUnique.mockResolvedValue(
      createMockResponse({ version: 7, topic: { status: 'ACTIVE' } }),
    );

    await expect(
      service.updateResponse('response-1', 'user-1', {
        content: 'Updated content',
        expectedVersion: 5, // Mismatch!
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.updateResponse('response-1', 'user-1', {
        content: 'Updated content',
        expectedVersion: 5,
      }),
    ).rejects.toMatchObject({
      details: {
        code: 'EDIT_CONFLICT',
        currentVersion: 7,
        expectedVersion: 5,
      },
    });
  });

  it('should include version in response DTO', async () => {
    mockPrisma.response.findUnique.mockResolvedValue(
      createMockResponse({ version: 3, topic: { status: 'ACTIVE' } }),
    );
    mockPrisma.response.update.mockResolvedValue(createMockResponse({ version: 4 }));

    const result = await service.updateResponse('response-1', 'user-1', {
      content: 'Updated',
      expectedVersion: 3,
    });

    expect(result).toHaveProperty('version');
    expect(result.version).toBe(4);
  });

  it('should reject edit after 24 hours', async () => {
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - 25);

    mockPrisma.response.findUnique.mockResolvedValue(
      createMockResponse({ createdAt, version: 1, topic: { status: 'ACTIVE' } }),
    );

    await expect(
      service.updateResponse('response-1', 'user-1', {
        content: 'Updated',
        expectedVersion: 1,
      }),
    ).rejects.toThrow('Responses can only be edited within 24 hours');
  });

  it('should allow edit within 24 hours', async () => {
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - 12);

    mockPrisma.response.findUnique.mockResolvedValue(
      createMockResponse({ createdAt, version: 1, topic: { status: 'ACTIVE' } }),
    );
    mockPrisma.response.update.mockResolvedValue(createMockResponse({ version: 2 }));

    const result = await service.updateResponse('response-1', 'user-1', {
      content: 'Updated',
      expectedVersion: 1,
    });

    expect(result.version).toBe(2);
  });
});
```

---

## Client-Side Integration Example

### React Component

```typescript
// ResponseEditor.tsx
import { useState, useEffect } from 'react';
import { useAsync } from 'react-use';

interface ResponseEditorProps {
  responseId: string;
  onSave?: (response: ResponseDto) => void;
}

export const ResponseEditor: React.FC<ResponseEditorProps> = ({
  responseId,
  onSave,
}) => {
  const [content, setContent] = useState('');
  const [version, setVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictDialog, setConflictDialog] = useState(false);

  // Fetch response on mount
  useAsync(async () => {
    const response = await api.getResponse(responseId);
    setContent(response.content);
    setVersion(response.version);
  }, [responseId]);

  const handleSave = async () => {
    if (version === null) {
      setError('Version not loaded');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await api.updateResponse(responseId, {
        content,
        expectedVersion: version,  // Send current version
      });

      setContent(updated.content);
      setVersion(updated.version);  // Update to new version
      onSave?.(updated);
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Handle conflict
        const details = err.response.data.details;
        setConflictDialog(true);
        setError(
          `Edit conflict: Someone else modified this response (v${details.currentVersion} vs v${details.expectedVersion})`,
        );
      } else {
        setError(err.response?.data?.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshAndRetry = async () => {
    try {
      const latest = await api.getResponse(responseId);
      setContent(latest.content);
      setVersion(latest.version);
      setConflictDialog(false);
      setError(null);
    } catch (err) {
      setError('Failed to refresh response');
    }
  };

  return (
    <div className="response-editor">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Edit your response..."
        disabled={saving}
      />

      {error && (
        <div className="alert alert-error">
          {error}
          {conflictDialog && (
            <button onClick={handleRefreshAndRetry}>
              Refresh & Retry
            </button>
          )}
        </div>
      )}

      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
};
```

---

## Deployment Checklist

- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Update schema in production database
- [ ] Verify version field backfilled with 1
- [ ] Deploy service code with version checks
- [ ] Deploy client code that sends expectedVersion
- [ ] Monitor 409 Conflict responses in logging
- [ ] Update API documentation
- [ ] Test concurrent edits in staging
- [ ] Brief support team on conflict error handling

---

## Rollback Plan

If issues occur:

1. **Remove version requirement** from service temporarily:

   ```typescript
   // Comment out the version check
   // if (existingResponse.version !== updateResponseDto.expectedVersion) {
   //   throw new ConflictException(...);
   // }
   ```

2. **Revert to old service code** (git checkout)

3. **Migration is backwards compatible** - version column remains but unused

4. **No data loss** - all existing data preserved

---

## Monitoring & Metrics

After deployment, monitor:

```typescript
// Log conflicts for analysis
if (error instanceof ConflictException) {
  logger.warn('EDIT_CONFLICT', {
    responseId,
    currentVersion: error.details.currentVersion,
    expectedVersion: error.details.expectedVersion,
    userId: authorId,
  });
}
```

Track metrics:

- Conflict rate: # conflicts / # edit attempts
- Success rate: # successful edits / # edit attempts
- User satisfaction: # users who retry vs abandon

---

## Summary

**To implement version-based optimistic locking:**

1. Run migration to add `version` column
2. Update DTOs to include `expectedVersion` and `version`
3. Add version check in `updateResponse()` method
4. Update response mapper to include version
5. Create tests
6. Update client to send/handle version

**Estimated time: 2-3 hours for basic implementation, 4-5 hours for complete integration with error handling.**
