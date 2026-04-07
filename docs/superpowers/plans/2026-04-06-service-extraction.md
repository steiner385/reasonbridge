# Service Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract focused services from TopicsService and ResponsesService while maintaining backward compatibility through delegation.

**Architecture:** Create 4 new services (TopicMergeService, TopicStatusService, TopicCommonGroundService, ResponseThreadingService) that handle specific domain concerns. Parent services inject and delegate to these new services, preserving the existing public API.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, Vitest, cache-manager

---

## File Structure

### New Files to Create

| File | Purpose |
|------|---------|
| `topics/topic-merge.service.ts` | Topic merge/rollback transaction logic |
| `topics/topic-merge.service.test.ts` | Unit tests for merge service |
| `topics/topic-status.service.ts` | Status transition state machine |
| `topics/topic-status.service.test.ts` | Unit tests for status service |
| `topics/topic-common-ground.service.ts` | Common ground analysis + caching |
| `topics/topic-common-ground.service.test.ts` | Unit tests for common ground service |
| `responses/response-threading.service.ts` | Thread tree building + depth calculation |
| `responses/response-threading.service.test.ts` | Unit tests for threading service |

### Files to Modify

| File | Changes |
|------|---------|
| `topics/topics.module.ts` | Add 3 new service providers |
| `topics/topics.service.ts` | Inject new services, delegate methods |
| `responses/responses.module.ts` | Add 1 new service provider |
| `responses/responses.service.ts` | Inject new service, delegate methods |

---

## Task 1: Create TopicMergeService

**Files:**
- Create: `services/discussion-service/src/topics/topic-merge.service.ts`
- Test: `services/discussion-service/src/topics/topic-merge.service.test.ts`

- [ ] **Step 1: Write the failing test for mergeTopics**

Create `services/discussion-service/src/topics/topic-merge.service.test.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TopicMergeService } from './topic-merge.service.js';

const createMockPrismaService = () => ({
  $transaction: vi.fn(),
  discussionTopic: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  response: {
    updateMany: vi.fn(),
  },
  topicMerge: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  description: 'Test description',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  slug: 'test-topic',
  creatorId: 'creator-1',
  participantCount: 5,
  responseCount: 10,
  tags: [],
  responses: [{ id: 'r-1', authorId: 'user-1' }],
  createdAt: new Date(),
  ...overrides,
});

describe('TopicMergeService', () => {
  let service: TopicMergeService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new TopicMergeService(mockPrisma as any);
  });

  describe('mergeTopics', () => {
    it('should throw BadRequestException when target is in source list', async () => {
      await expect(
        service.mergeTopics('mod-1', {
          sourceTopicIds: ['topic-1', 'topic-2'],
          targetTopicId: 'topic-1',
          mergeReason: 'Duplicate topics',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when topics do not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          discussionTopic: {
            findMany: vi.fn().mockResolvedValue([createMockTopic({ id: 'topic-1' })]),
          },
        };
        return callback(tx);
      });

      await expect(
        service.mergeTopics('mod-1', {
          sourceTopicIds: ['topic-1'],
          targetTopicId: 'topic-2',
          mergeReason: 'Duplicate topics',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when source topics are locked', async () => {
      const lockedTopic = createMockTopic({ id: 'topic-1', status: 'LOCKED' });
      const targetTopic = createMockTopic({ id: 'topic-2' });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          discussionTopic: {
            findMany: vi.fn().mockResolvedValue([lockedTopic, targetTopic]),
            update: vi.fn(),
          },
          response: { updateMany: vi.fn() },
          topicMerge: { create: vi.fn() },
        };
        return callback(tx);
      });

      await expect(
        service.mergeTopics('mod-1', {
          sourceTopicIds: ['topic-1'],
          targetTopicId: 'topic-2',
          mergeReason: 'Duplicate topics',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rollbackTopicMerge', () => {
    it('should throw NotFoundException when merge record does not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          topicMerge: { findUnique: vi.fn().mockResolvedValue(null) },
        };
        return callback(tx);
      });

      await expect(
        service.rollbackTopicMerge('mod-1', 'nonexistent-merge', 'Mistake'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when merge already rolled back', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          topicMerge: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'merge-1',
              rolledBackAt: new Date(),
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        service.rollbackTopicMerge('mod-1', 'merge-1', 'Mistake'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when 30-day rollback window expired', async () => {
      const oldMerge = {
        id: 'merge-1',
        mergedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        rolledBackAt: null,
        sourceTopicIds: ['topic-1'],
        targetTopicId: 'topic-2',
        sourceSnapshots: [],
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          topicMerge: { findUnique: vi.fn().mockResolvedValue(oldMerge) },
        };
        return callback(tx);
      });

      await expect(
        service.rollbackTopicMerge('mod-1', 'merge-1', 'Mistake'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/discussion-service && pnpm vitest run src/topics/topic-merge.service.test.ts`
Expected: FAIL with "Cannot find module './topic-merge.service.js'"

- [ ] **Step 3: Write TopicMergeService implementation**

Create `services/discussion-service/src/topics/topic-merge.service.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MergeTopicsDto } from './dto/merge-topics.dto.js';

/**
 * Handles topic merge and rollback operations.
 *
 * Extracted from TopicsService to isolate complex transaction logic
 * with snapshots, validation, and rollback capabilities.
 */
@Injectable()
export class TopicMergeService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Merge multiple topics into a single target topic.
   *
   * @param moderatorId - ID of the moderator performing the merge
   * @param mergeDto - Merge request with source topics, target, and reason
   * @returns Merge record ID for potential rollback
   * @throws BadRequestException if target is in source list or sources are locked
   * @throws NotFoundException if any topic does not exist
   */
  async mergeTopics(
    moderatorId: string,
    mergeDto: MergeTopicsDto,
  ): Promise<{ mergeId: string; responsesMoved: number; participantsMerged: number }> {
    const { sourceTopicIds, targetTopicId, mergeReason } = mergeDto;

    // Validate that target is not in source list
    if (sourceTopicIds.includes(targetTopicId)) {
      throw new BadRequestException('Target topic cannot be one of the source topics');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Fetch all topics (source + target) with full data for snapshots
      const allTopicIds = [...sourceTopicIds, targetTopicId];
      const topics = await tx.discussionTopic.findMany({
        where: { id: { in: allTopicIds } },
        include: {
          tags: { include: { tag: true } },
          responses: { select: { id: true, authorId: true } },
        },
      });

      // Verify all topics exist
      if (topics.length !== allTopicIds.length) {
        const foundIds = topics.map((t) => t.id);
        const missingIds = allTopicIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(`Topics not found: ${missingIds.join(', ')}`);
      }

      // Separate source and target
      const sourceTopics = topics.filter((t) => sourceTopicIds.includes(t.id));
      const targetTopic = topics.find((t) => t.id === targetTopicId);

      if (!targetTopic) {
        throw new NotFoundException(`Target topic ${targetTopicId} not found`);
      }

      // Validate source topics are not locked
      const lockedSources = sourceTopics.filter((t) => t.status === 'LOCKED');
      if (lockedSources.length > 0) {
        throw new BadRequestException(
          `Cannot merge locked topics: ${lockedSources.map((t) => t.title).join(', ')}`,
        );
      }

      // Create snapshots for rollback
      const sourceSnapshots = sourceTopics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        status: topic.status,
        visibility: topic.visibility,
        slug: topic.slug,
        creatorId: topic.creatorId,
        participantCount: topic.participantCount,
        responseCount: topic.responseCount,
        tags: topic.tags.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })),
        createdAt: topic.createdAt.toISOString(),
      }));

      // Move all responses from source topics to target
      const responsesToMove = sourceTopics.reduce((sum, t) => sum + t.responseCount, 0);

      await tx.response.updateMany({
        where: { topicId: { in: sourceTopicIds } },
        data: { topicId: targetTopicId },
      });

      // Merge participant activities
      const sourceParticipants = new Set<string>();
      sourceTopics.forEach((topic) => {
        topic.responses.forEach((response) => {
          sourceParticipants.add(response.authorId);
        });
      });

      const participantsMerged = sourceParticipants.size;

      // Update target topic counts
      const newResponseCount = targetTopic.responseCount + responsesToMove;
      const targetParticipants = new Set(targetTopic.responses.map((r) => r.authorId));
      sourceParticipants.forEach((id) => targetParticipants.add(id));
      const newParticipantCount = targetParticipants.size;

      await tx.discussionTopic.update({
        where: { id: targetTopicId },
        data: {
          responseCount: newResponseCount,
          participantCount: newParticipantCount,
          lastActivityAt: new Date(),
        },
      });

      // Create merge record
      const merge = await tx.topicMerge.create({
        data: {
          sourceTopicIds,
          targetTopicId,
          moderatorId,
          mergeReason,
          sourceSnapshots,
          responsesMoved: responsesToMove,
          participantsMerged,
        },
      });

      // Archive source topics with redirect note
      for (const sourceTopic of sourceTopics) {
        const redirectNote = `\n\n---\n**[MERGED]** This topic has been merged into: [${targetTopic.title}](/topics/${targetTopic.slug})\nReason: ${mergeReason}`;

        await tx.discussionTopic.update({
          where: { id: sourceTopic.id },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date(),
            description: sourceTopic.description + redirectNote,
          },
        });
      }

      return {
        mergeId: merge.id,
        responsesMoved: responsesToMove,
        participantsMerged,
      };
    });
  }

  /**
   * Rollback a topic merge operation.
   *
   * @param moderatorId - ID of the moderator performing rollback
   * @param mergeId - ID of the merge to rollback
   * @param rollbackReason - Reason for rollback
   * @throws NotFoundException if merge record doesn't exist
   * @throws BadRequestException if already rolled back or window expired
   */
  async rollbackTopicMerge(
    moderatorId: string,
    mergeId: string,
    rollbackReason: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Fetch merge record
      const merge = await tx.topicMerge.findUnique({
        where: { id: mergeId },
      });

      if (!merge) {
        throw new NotFoundException(`Merge record ${mergeId} not found`);
      }

      // Check if already rolled back
      if (merge.rolledBackAt) {
        throw new BadRequestException('This merge has already been rolled back');
      }

      // Check 30-day window
      const daysSinceMerge = (Date.now() - merge.mergedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceMerge > 30) {
        throw new BadRequestException(
          'Rollback window has expired (30 days). Manual intervention required.',
        );
      }

      // Move responses back to first source topic
      const firstSourceId = merge.sourceTopicIds[0];

      await tx.response.updateMany({
        where: {
          topicId: merge.targetTopicId,
          createdAt: { gte: merge.mergedAt },
        },
        data: { topicId: firstSourceId },
      });

      // Restore source topics from snapshots
      const snapshots = merge.sourceSnapshots as Array<{
        id: string;
        description: string;
      }>;

      for (const snapshot of snapshots) {
        await tx.discussionTopic.update({
          where: { id: snapshot.id },
          data: {
            status: 'ACTIVE',
            archivedAt: null,
            description: snapshot.description,
          },
        });
      }

      // Mark merge as rolled back
      await tx.topicMerge.update({
        where: { id: mergeId },
        data: {
          rolledBackAt: new Date(),
          rollbackReason,
        },
      });
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/discussion-service && pnpm vitest run src/topics/topic-merge.service.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/discussion-service/src/topics/topic-merge.service.ts services/discussion-service/src/topics/topic-merge.service.test.ts
git commit -m "$(cat <<'EOF'
feat(discussion): extract TopicMergeService from TopicsService

Extracts topic merge and rollback logic into a focused service:
- mergeTopics() - merge multiple topics with snapshots
- rollbackTopicMerge() - undo merge within 30-day window

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create TopicStatusService

**Files:**
- Create: `services/discussion-service/src/topics/topic-status.service.ts`
- Test: `services/discussion-service/src/topics/topic-status.service.test.ts`

- [ ] **Step 1: Write the failing test for updateStatus**

Create `services/discussion-service/src/topics/topic-status.service.test.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TopicStatusService } from './topic-status.service.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

const createMockCacheManager = () => ({
  del: vi.fn(),
  stores: { keys: vi.fn().mockResolvedValue([]) },
});

const createMockTopic = (overrides = {}) => ({
  id: 'topic-1',
  title: 'Test Topic',
  description: 'Test description',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  slug: 'test-topic',
  creatorId: 'creator-1',
  participantCount: 5,
  responseCount: 10,
  tags: [],
  createdAt: new Date(),
  activatedAt: new Date(),
  archivedAt: null,
  lockedAt: null,
  minimumDiversityScore: { toNumber: () => 0.5 },
  currentDiversityScore: { toNumber: () => 0.6 },
  crossCuttingThemes: [],
  evidenceStandards: 'STANDARD',
  isMatureContent: false,
  ...overrides,
});

describe('TopicStatusService', () => {
  let service: TopicStatusService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCacheManager = createMockCacheManager();
    service = new TopicStatusService(mockPrisma as any, mockCacheManager as any);
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException when topic does not exist', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'user-1', 'ARCHIVED', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when non-creator/non-moderator tries to change status', async () => {
      const topic = createMockTopic({ creatorId: 'other-user' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(
        service.updateStatus('topic-1', 'user-1', 'ARCHIVED', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when creator tries to lock topic', async () => {
      const topic = createMockTopic({ creatorId: 'user-1' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(
        service.updateStatus('topic-1', 'user-1', 'LOCKED', false),
      ).rejects.toThrow('Only moderators can lock topics');
    });

    it('should throw BadRequestException when creator tries to unlock locked topic', async () => {
      const topic = createMockTopic({ creatorId: 'user-1', status: 'LOCKED' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(
        service.updateStatus('topic-1', 'user-1', 'ACTIVE', false),
      ).rejects.toThrow('Only moderators can unlock locked topics');
    });

    it('should throw BadRequestException when creator tries to revert to SEEDING', async () => {
      const topic = createMockTopic({ creatorId: 'user-1', status: 'ACTIVE' });
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);

      await expect(
        service.updateStatus('topic-1', 'user-1', 'SEEDING', false),
      ).rejects.toThrow('Cannot revert an activated topic to SEEDING status');
    });

    it('should allow creator to archive their own topic', async () => {
      const topic = createMockTopic({ creatorId: 'user-1', status: 'ACTIVE' });
      const updatedTopic = { ...topic, status: 'ARCHIVED', archivedAt: new Date() };

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);

      const result = await service.updateStatus('topic-1', 'user-1', 'ARCHIVED', false);

      expect(result.status).toBe('ARCHIVED');
      expect(mockPrisma.discussionTopic.update).toHaveBeenCalled();
    });

    it('should allow moderator to lock any topic', async () => {
      const topic = createMockTopic({ creatorId: 'other-user', status: 'ACTIVE' });
      const updatedTopic = { ...topic, status: 'LOCKED', lockedAt: new Date() };

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockResolvedValue(updatedTopic);

      const result = await service.updateStatus('topic-1', 'mod-1', 'LOCKED', true);

      expect(result.status).toBe('LOCKED');
    });

    it('should set activatedAt when transitioning to ACTIVE for first time', async () => {
      const topic = createMockTopic({
        creatorId: 'user-1',
        status: 'SEEDING',
        activatedAt: null,
      });

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(topic);
      mockPrisma.discussionTopic.update.mockImplementation(async ({ data }) => ({
        ...topic,
        ...data,
        status: 'ACTIVE',
      }));

      await service.updateStatus('topic-1', 'user-1', 'ACTIVE', false);

      expect(mockPrisma.discussionTopic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            activatedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/discussion-service && pnpm vitest run src/topics/topic-status.service.test.ts`
Expected: FAIL with "Cannot find module './topic-status.service.js'"

- [ ] **Step 3: Write TopicStatusService implementation**

Create `services/discussion-service/src/topics/topic-status.service.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TopicResponseDto } from './dto/topic-response.dto.js';

type TopicStatus = 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';

/**
 * Handles topic status transitions with permission checks.
 *
 * Extracted from TopicsService to isolate the state machine logic
 * for status transitions (SEEDING → ACTIVE → ARCHIVED → LOCKED).
 */
@Injectable()
export class TopicStatusService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Update topic status with permission checks.
   *
   * State transitions:
   * - Creators can: SEEDING→ACTIVE, ACTIVE→ARCHIVED, ARCHIVED→ACTIVE
   * - Moderators can: any transition including LOCKED
   *
   * @param topicId - ID of the topic to update
   * @param userId - ID of the user requesting the change
   * @param newStatus - New status to set
   * @param isModerator - Whether the user is a moderator
   * @returns Updated topic
   * @throws NotFoundException if topic doesn't exist
   * @throws BadRequestException if transition not allowed
   */
  async updateStatus(
    topicId: string,
    userId: string,
    newStatus: TopicStatus,
    isModerator: boolean,
  ): Promise<TopicResponseDto> {
    // Fetch the topic
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      include: {
        tags: {
          include: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Check permissions
    const isCreator = topic.creatorId === userId;
    if (!isCreator && !isModerator) {
      throw new BadRequestException(
        'Only the topic creator or moderators can change topic status',
      );
    }

    // Validate status transition for non-moderators
    if (!isModerator) {
      if (newStatus === 'LOCKED') {
        throw new BadRequestException('Only moderators can lock topics');
      }

      if (topic.status === 'LOCKED') {
        throw new BadRequestException('Only moderators can unlock locked topics');
      }

      if (newStatus === 'SEEDING' && topic.status !== 'SEEDING') {
        throw new BadRequestException('Cannot revert an activated topic to SEEDING status');
      }
    }

    // Prepare update data with appropriate timestamps
    const updateData: Record<string, unknown> = {
      status: newStatus,
      lastActivityAt: new Date(),
    };

    // Set activatedAt when transitioning to ACTIVE for the first time
    if (newStatus === 'ACTIVE' && !topic.activatedAt) {
      updateData.activatedAt = new Date();
    }

    // Set archivedAt when archiving
    if (newStatus === 'ARCHIVED' && topic.status !== 'ARCHIVED') {
      updateData.archivedAt = new Date();
    }

    // Clear archivedAt when unarchiving
    if (newStatus === 'ACTIVE' && topic.status === 'ARCHIVED') {
      updateData.archivedAt = null;
    }

    // Set lockedAt when locking
    if (newStatus === 'LOCKED' && topic.status !== 'LOCKED') {
      updateData.lockedAt = new Date();
    }

    // Clear lockedAt when unlocking
    if (newStatus !== 'LOCKED' && topic.status === 'LOCKED') {
      updateData.lockedAt = null;
    }

    // Update the topic
    const updatedTopic = await this.prisma.discussionTopic.update({
      where: { id: topicId },
      data: updateData,
      include: {
        tags: {
          include: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    // Invalidate caches
    await this.invalidateCaches(topicId);

    return {
      id: updatedTopic.id,
      title: updatedTopic.title,
      description: updatedTopic.description,
      creatorId: updatedTopic.creatorId,
      status: updatedTopic.status,
      visibility: updatedTopic.visibility,
      slug: updatedTopic.slug,
      evidenceStandards: updatedTopic.evidenceStandards,
      minimumDiversityScore: updatedTopic.minimumDiversityScore.toNumber(),
      currentDiversityScore: updatedTopic.currentDiversityScore?.toNumber() ?? null,
      participantCount: updatedTopic.participantCount,
      responseCount: updatedTopic.responseCount,
      crossCuttingThemes: updatedTopic.crossCuttingThemes,
      createdAt: updatedTopic.createdAt,
      activatedAt: updatedTopic.activatedAt,
      archivedAt: updatedTopic.archivedAt,
      tags: updatedTopic.tags.map((tt) => tt.tag),
      isMatureContent: updatedTopic.isMatureContent,
    };
  }

  private async invalidateCaches(topicId: string): Promise<void> {
    await this.cacheManager.del('topics:list');
    const cacheKeys = await this.cacheManager.stores.keys();
    const cacheKeysArray = Array.from(cacheKeys) as unknown as string[];
    const topicCacheKeys = cacheKeysArray.filter((key: string) => key.includes(topicId));
    await Promise.all(topicCacheKeys.map((key: string) => this.cacheManager.del(key)));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/discussion-service && pnpm vitest run src/topics/topic-status.service.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/discussion-service/src/topics/topic-status.service.ts services/discussion-service/src/topics/topic-status.service.test.ts
git commit -m "$(cat <<'EOF'
feat(discussion): extract TopicStatusService from TopicsService

Extracts status transition state machine into a focused service:
- updateStatus() - handle SEEDING/ACTIVE/ARCHIVED/LOCKED transitions
- Permission checks for creators vs moderators
- Automatic timestamp management (activatedAt, archivedAt, lockedAt)

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create TopicCommonGroundService

**Files:**
- Create: `services/discussion-service/src/topics/topic-common-ground.service.ts`
- Test: `services/discussion-service/src/topics/topic-common-ground.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/discussion-service/src/topics/topic-common-ground.service.test.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TopicCommonGroundService } from './topic-common-ground.service.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findUnique: vi.fn(),
  },
  commonGroundAnalysis: {
    findFirst: vi.fn(),
  },
});

const createMockCacheManager = () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
});

const createMockAnalysis = (overrides = {}) => ({
  id: 'analysis-1',
  topicId: 'topic-1',
  version: 1,
  agreementZones: [{ theme: 'Test', confidence: 0.8 }],
  misunderstandings: [],
  genuineDisagreements: [],
  overallConsensusScore: { toNumber: () => 0.75 },
  participantCountAtGeneration: 10,
  responseCountAtGeneration: 50,
  createdAt: new Date(),
  ...overrides,
});

describe('TopicCommonGroundService', () => {
  let service: TopicCommonGroundService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    mockCacheManager = createMockCacheManager();
    service = new TopicCommonGroundService(mockPrisma as any, mockCacheManager as any);
  });

  describe('getAnalysis', () => {
    it('should return cached analysis when available', async () => {
      const cachedAnalysis = {
        id: 'analysis-1',
        version: 1,
        overallConsensusScore: 0.75,
      };
      mockCacheManager.get.mockResolvedValue(cachedAnalysis);

      const result = await service.getAnalysis('topic-1');

      expect(result).toEqual(cachedAnalysis);
      expect(mockPrisma.discussionTopic.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when topic does not exist', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(service.getAnalysis('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no analysis exists', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(null);

      await expect(service.getAnalysis('topic-1')).rejects.toThrow(NotFoundException);
    });

    it('should fetch and cache analysis from database', async () => {
      const analysis = createMockAnalysis();

      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(analysis);

      const result = await service.getAnalysis('topic-1');

      expect(result.id).toBe('analysis-1');
      expect(result.overallConsensusScore).toBe(0.75);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should fetch specific version when requested', async () => {
      const analysis = createMockAnalysis({ version: 2 });

      mockCacheManager.get.mockResolvedValue(null);
      mockPrisma.discussionTopic.findUnique.mockResolvedValue({ id: 'topic-1' });
      mockPrisma.commonGroundAnalysis.findFirst.mockResolvedValue(analysis);

      await service.getAnalysis('topic-1', 2);

      expect(mockPrisma.commonGroundAnalysis.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { topicId: 'topic-1', version: 2 },
        }),
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete the latest cache key', async () => {
      await service.invalidateCache('topic-1');

      expect(mockCacheManager.del).toHaveBeenCalledWith('common-ground:topic:topic-1:latest');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/discussion-service && pnpm vitest run src/topics/topic-common-ground.service.test.ts`
Expected: FAIL with "Cannot find module './topic-common-ground.service.js'"

- [ ] **Step 3: Write TopicCommonGroundService implementation**

Create `services/discussion-service/src/topics/topic-common-ground.service.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CommonGroundResponseDto } from './dto/common-ground-response.dto.js';
import { CACHE_TTL } from '../constants/index.js';

/**
 * Handles common ground analysis retrieval and caching.
 *
 * Extracted from TopicsService to isolate caching logic
 * for the common ground feature.
 */
@Injectable()
export class TopicCommonGroundService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Get common ground analysis for a topic with caching.
   *
   * @param topicId - ID of the topic
   * @param version - Optional specific version to retrieve
   * @returns Common ground analysis DTO
   * @throws NotFoundException if topic or analysis doesn't exist
   */
  async getAnalysis(topicId: string, version?: number): Promise<CommonGroundResponseDto> {
    // Generate cache key based on whether a specific version is requested
    const cacheKey = version
      ? `common-ground:topic:${topicId}:v${version}`
      : `common-ground:topic:${topicId}:latest`;

    // Try to get from cache first
    const cached = await this.cacheManager.get<CommonGroundResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Verify the topic exists
    const topic = await this.prisma.discussionTopic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }

    // Fetch the analysis - either specific version or latest
    const where = version ? { topicId, version } : { topicId };
    const orderBy = version ? {} : { version: 'desc' as const };

    const analysis = await this.prisma.commonGroundAnalysis.findFirst({
      where,
      orderBy,
    });

    if (!analysis) {
      throw new NotFoundException(
        version
          ? `Common ground analysis version ${version} not found for topic ${topicId}`
          : `No common ground analysis found for topic ${topicId}`,
      );
    }

    // Map database model to DTO
    const result: CommonGroundResponseDto = {
      id: analysis.id,
      version: analysis.version,
      agreementZones: analysis.agreementZones as CommonGroundResponseDto['agreementZones'],
      misunderstandings: analysis.misunderstandings as CommonGroundResponseDto['misunderstandings'],
      genuineDisagreements:
        analysis.genuineDisagreements as CommonGroundResponseDto['genuineDisagreements'],
      overallConsensusScore: analysis.overallConsensusScore?.toNumber() ?? 0,
      participantCountAtGeneration: analysis.participantCountAtGeneration,
      responseCountAtGeneration: analysis.responseCountAtGeneration,
      generatedAt: analysis.createdAt,
    };

    // Cache the result with a 1-hour TTL
    await this.cacheManager.set(cacheKey, result, CACHE_TTL.TOPIC_DETAIL_MS);

    return result;
  }

  /**
   * Invalidate common ground cache for a specific topic.
   *
   * Called when new analysis is generated.
   *
   * @param topicId - ID of the topic
   */
  async invalidateCache(topicId: string): Promise<void> {
    const latestKey = `common-ground:topic:${topicId}:latest`;
    await this.cacheManager.del(latestKey);
    // Note: Versioned caches remain valid as analysis versions are immutable
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/discussion-service && pnpm vitest run src/topics/topic-common-ground.service.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/discussion-service/src/topics/topic-common-ground.service.ts services/discussion-service/src/topics/topic-common-ground.service.test.ts
git commit -m "$(cat <<'EOF'
feat(discussion): extract TopicCommonGroundService from TopicsService

Extracts common ground analysis retrieval and caching:
- getAnalysis() - fetch analysis with cache-first strategy
- invalidateCache() - clear cache when new analysis generated
- Version-specific and latest analysis support

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create ResponseThreadingService

**Files:**
- Create: `services/discussion-service/src/responses/response-threading.service.ts`
- Test: `services/discussion-service/src/responses/response-threading.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/discussion-service/src/responses/response-threading.service.test.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
    service = new ResponseThreadingService(mockPrisma as any);
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
  });

  describe('buildThreadTree', () => {
    it('should return empty array for empty input', () => {
      const result = service.buildThreadTree([]);

      expect(result).toEqual([]);
    });

    it('should return flat list when no responses have parents', () => {
      const responses = [
        createMockResponse({ id: 'r-1' }),
        createMockResponse({ id: 'r-2' }),
      ];

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
  });

  describe('validateReplyDepth', () => {
    it('should throw BadRequestException when depth limit exceeded', async () => {
      // Mock a response at depth 10
      mockPrisma.response.findUnique.mockResolvedValue({ parentId: 'parent-x' });

      await expect(
        service.validateReplyDepth('response-at-max-depth'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw when depth is within limit', async () => {
      mockPrisma.response.findUnique
        .mockResolvedValueOnce({ parentId: 'parent-1' })
        .mockResolvedValueOnce({ parentId: null });

      await expect(service.validateReplyDepth('response-1')).resolves.not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/discussion-service && pnpm vitest run src/responses/response-threading.service.test.ts`
Expected: FAIL with "Cannot find module './response-threading.service.js'"

- [ ] **Step 3: Write ResponseThreadingService implementation**

Create `services/discussion-service/src/responses/response-threading.service.ts`:

```typescript
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
 */
export interface ThreadedResponse extends ResponseDetailDto {
  replies: ThreadedResponse[];
  depth: number;
}

/**
 * Handles response threading operations.
 *
 * Extracted from ResponsesService to isolate thread tree building
 * and depth calculation logic.
 */
@Injectable()
export class ResponseThreadingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Calculate thread depth for a response.
   *
   * Recursively traverses up the parent chain. Includes a safeguard
   * against infinite loops from circular references.
   *
   * @param responseId - The ID of the response
   * @returns The depth (0 for top-level, 1 for first reply, etc.)
   */
  async calculateThreadDepth(responseId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = responseId;

    while (currentId && depth < MAX_THREAD_DEPTH) {
      const response = await this.prisma.response.findUnique({
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
   * @param parentResponseId - ID of the response being replied to
   * @throws BadRequestException if depth limit would be exceeded
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
   * Transforms a flat array of responses into a nested tree structure.
   * Each response includes its direct replies as children.
   *
   * @param responses - Flat array of responses from database
   * @returns Tree structure with responses and nested replies
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/discussion-service && pnpm vitest run src/responses/response-threading.service.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/discussion-service/src/responses/response-threading.service.ts services/discussion-service/src/responses/response-threading.service.test.ts
git commit -m "$(cat <<'EOF'
feat(discussion): extract ResponseThreadingService from ResponsesService

Extracts thread tree building and depth calculation:
- calculateThreadDepth() - walk parent chain with loop protection
- validateReplyDepth() - enforce MAX_THREAD_DEPTH limit
- buildThreadTree() - convert flat list to nested tree structure

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update TopicsModule with New Providers

**Files:**
- Modify: `services/discussion-service/src/topics/topics.module.ts`

- [ ] **Step 1: Update topics.module.ts to add new providers**

Edit `services/discussion-service/src/topics/topics.module.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller.js';
import { TopicDraftsController } from './topic-drafts.controller.js';
import { TopicLinksController, LinkedTopicsController } from './topic-links.controller.js';
import { TopicAccessController } from './topic-access.controller.js';
import { TopicsService } from './topics.service.js';
import { TopicDraftsService } from './topic-drafts.service.js';
import { TopicLinksService } from './topic-links.service.js';
import { TopicAccessService } from './topic-access.service.js';
import { TopicMergeService } from './topic-merge.service.js';
import { TopicStatusService } from './topic-status.service.js';
import { TopicCommonGroundService } from './topic-common-ground.service.js';
import { CommonGroundExportService } from '../services/common-ground-export.service.js';
import { TopicsSearchService } from './topics-search.service.js';
import { SlugGeneratorService } from './slug-generator.service.js';
import { TopicsEditService } from './topics-edit.service.js';
import { TopicsAnalyticsService } from './topics-analytics.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';
// CacheModule removed - it's global and imported once in AppModule
import { PropositionsModule } from '../propositions/propositions.module.js';

@Module({
  imports: [PrismaModule, AuthModule, PropositionsModule],
  controllers: [
    TopicsController,
    TopicDraftsController,
    TopicLinksController,
    LinkedTopicsController,
    TopicAccessController,
  ],
  providers: [
    TopicsService,
    TopicDraftsService,
    TopicLinksService,
    TopicAccessService,
    TopicMergeService,
    TopicStatusService,
    TopicCommonGroundService,
    CommonGroundExportService,
    TopicsSearchService,
    SlugGeneratorService,
    TopicsEditService,
    TopicsAnalyticsService,
  ],
  exports: [
    TopicsService,
    TopicDraftsService,
    TopicLinksService,
    TopicsSearchService,
    TopicAccessService,
  ],
})
export class TopicsModule {}
```

- [ ] **Step 2: Verify module compiles**

Run: `cd services/discussion-service && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add services/discussion-service/src/topics/topics.module.ts
git commit -m "$(cat <<'EOF'
chore(discussion): register new topic services in module

Add TopicMergeService, TopicStatusService, and TopicCommonGroundService
to TopicsModule providers.

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update ResponsesModule with New Provider

**Files:**
- Modify: `services/discussion-service/src/responses/responses.module.ts`

- [ ] **Step 1: Update responses.module.ts to add new provider**

Edit `services/discussion-service/src/responses/responses.module.ts`:

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T017 - Response Module (Extended for Feature 009)
 *
 * Existing module will be extended with new functionality:
 * - Phase 4 (T037-T042): Response posting with discussion linking
 * - Phase 5 (T052-T056): Threaded reply logic
 * - Phase 6 (T066-T072): Response editing with optimistic locking
 * - Phase 7 (T081-T087): Conditional soft/hard delete
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/index.js';
// CacheModule removed - it's global and imported once in AppModule
import { ResponsesController } from './responses.controller.js';
import { ResponsesService } from './responses.service.js';
import { ResponsesSearchService } from './responses-search.service.js';
import { ResponseThreadingService } from './response-threading.service.js';
import { ContentModerationService } from './services/content-moderation.service.js';
import { CommonGroundTriggerService } from '../services/common-ground-trigger.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ResponsesController],
  providers: [
    ResponsesService,
    ResponsesSearchService,
    ResponseThreadingService,
    ContentModerationService,
    CommonGroundTriggerService,
  ],
  exports: [ResponsesService, ResponsesSearchService, ContentModerationService],
})
export class ResponsesModule {}
```

- [ ] **Step 2: Verify module compiles**

Run: `cd services/discussion-service && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add services/discussion-service/src/responses/responses.module.ts
git commit -m "$(cat <<'EOF'
chore(discussion): register ResponseThreadingService in module

Add ResponseThreadingService to ResponsesModule providers.

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update TopicsService to Delegate to New Services

**Files:**
- Modify: `services/discussion-service/src/topics/topics.service.ts`

- [ ] **Step 1: Add imports and inject new services**

Add to the imports at the top of `topics.service.ts`:

```typescript
import { TopicMergeService } from './topic-merge.service.js';
import { TopicStatusService } from './topic-status.service.js';
import { TopicCommonGroundService } from './topic-common-ground.service.js';
```

- [ ] **Step 2: Update constructor to inject new services**

Update the constructor in `topics.service.ts`:

```typescript
constructor(
  @Inject(PrismaService) private prisma: PrismaService,
  @Inject(ModuleRef) private moduleRef: ModuleRef,
  @Inject(TopicsSearchService) private searchService: TopicsSearchService,
  @Inject(SlugGeneratorService) private slugGenerator: SlugGeneratorService,
  @Inject(TopicsEditService) private editService: TopicsEditService,
  @Inject(PropositionsService) private propositionsService: PropositionsService,
  @Inject(ActivityClientService) private activityClient: ActivityClientService,
  @Inject(TopicMergeService) private mergeService: TopicMergeService,
  @Inject(TopicStatusService) private statusService: TopicStatusService,
  @Inject(TopicCommonGroundService) private commonGroundService: TopicCommonGroundService,
) {}
```

- [ ] **Step 3: Replace mergeTopics method with delegation**

Replace the `mergeTopics` method (lines ~1038-1185) with:

```typescript
/**
 * Merge multiple topics into a single target topic
 * Feature 016: Topic Management (T043)
 *
 * @param moderatorId - ID of the moderator performing the merge
 * @param mergeDto - Merge request with source topics, target, and reason
 * @returns Updated target topic
 */
async mergeTopics(moderatorId: string, mergeDto: MergeTopicsDto): Promise<TopicResponseDto> {
  const result = await this.mergeService.mergeTopics(moderatorId, mergeDto);

  // Invalidate caches (fire and forget)
  setImmediate(async () => {
    await this.invalidateTopicCaches(mergeDto.targetTopicId);
    for (const sourceId of mergeDto.sourceTopicIds) {
      await this.invalidateTopicCaches(sourceId);
    }
  });

  // Return updated target topic
  return this.getTopicById(mergeDto.targetTopicId);
}
```

- [ ] **Step 4: Replace rollbackTopicMerge method with delegation**

Replace the `rollbackTopicMerge` method (lines ~1198-1274) with:

```typescript
/**
 * Rollback a topic merge operation
 * Feature 016: Topic Management
 *
 * @param moderatorId - ID of the moderator performing rollback
 * @param mergeId - ID of the merge to rollback
 * @param rollbackReason - Reason for rollback
 */
async rollbackTopicMerge(
  moderatorId: string,
  mergeId: string,
  rollbackReason: string,
): Promise<void> {
  await this.mergeService.rollbackTopicMerge(moderatorId, mergeId, rollbackReason);
}
```

- [ ] **Step 5: Replace updateTopicStatus method with delegation**

Replace the `updateTopicStatus` method (lines ~635-770) with:

```typescript
/**
 * Update topic status with permission checks
 * Feature 016: Topic Management (T027)
 *
 * @param topicId - ID of the topic to update
 * @param userId - ID of the user requesting the change
 * @param newStatus - New status to set
 * @param isModerator - Whether the user is a moderator
 * @returns Updated topic
 */
async updateTopicStatus(
  topicId: string,
  userId: string,
  newStatus: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED',
  isModerator: boolean = false,
): Promise<TopicResponseDto> {
  return this.statusService.updateStatus(topicId, userId, newStatus, isModerator);
}
```

- [ ] **Step 6: Replace getCommonGroundAnalysis method with delegation**

Replace the `getCommonGroundAnalysis` method (lines ~541-600) with:

```typescript
/**
 * Get common ground analysis for a topic
 *
 * @param topicId - ID of the topic
 * @param version - Optional specific version to retrieve
 * @returns Common ground analysis
 */
async getCommonGroundAnalysis(
  topicId: string,
  version?: number,
): Promise<CommonGroundResponseDto> {
  return this.commonGroundService.getAnalysis(topicId, version);
}
```

- [ ] **Step 7: Replace invalidateCommonGroundCache method with delegation**

Replace the `invalidateCommonGroundCache` method (lines ~606-610) with:

```typescript
/**
 * Invalidate common ground cache for a specific topic
 * Called when new analysis is generated
 */
async invalidateCommonGroundCache(topicId: string): Promise<void> {
  return this.commonGroundService.invalidateCache(topicId);
}
```

- [ ] **Step 8: Run existing tests to verify delegation works**

Run: `cd services/discussion-service && pnpm vitest run src/topics/topics.service.test.ts`
Expected: All existing tests PASS (delegation is transparent)

- [ ] **Step 9: Commit**

```bash
git add services/discussion-service/src/topics/topics.service.ts
git commit -m "$(cat <<'EOF'
refactor(discussion): delegate to extracted topic services

TopicsService now delegates to:
- TopicMergeService for mergeTopics/rollbackTopicMerge
- TopicStatusService for updateTopicStatus
- TopicCommonGroundService for getCommonGroundAnalysis/invalidateCommonGroundCache

Public API unchanged - all existing tests pass through delegation.

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Update ResponsesService to Delegate to New Service

**Files:**
- Modify: `services/discussion-service/src/responses/responses.service.ts`

- [ ] **Step 1: Add import and inject new service**

Add to the imports at the top of `responses.service.ts`:

```typescript
import { ResponseThreadingService, ThreadedResponse } from './response-threading.service.js';
```

- [ ] **Step 2: Update constructor to inject new service**

Update the constructor in `responses.service.ts`:

```typescript
constructor(
  @Inject(PrismaService) private readonly prisma: PrismaService,
  @Inject(CommonGroundTriggerService)
  private readonly commonGroundTrigger: CommonGroundTriggerService,
  @Inject(ResponseThreadingService)
  private readonly threadingService: ResponseThreadingService,
  @Optional() private readonly moderationClient?: ModerationClientService,
) {}
```

- [ ] **Step 3: Remove local ThreadedResponse interface**

Remove the local interface definition (lines ~27-32):

```typescript
// DELETE THIS:
export interface ThreadedResponse extends ResponseDetailDto {
  replies: ThreadedResponse[];
  depth: number;
}
```

- [ ] **Step 4: Add re-export for ThreadedResponse**

Add after the imports:

```typescript
// Re-export ThreadedResponse for consumers
export { ThreadedResponse } from './response-threading.service.js';
```

- [ ] **Step 5: Replace calculateThreadDepth method with delegation**

Replace the `calculateThreadDepth` method (lines ~844-866) with:

```typescript
/**
 * T054 [US3] - Calculate thread depth for a response
 *
 * @param responseId - The ID of the response to calculate depth for
 * @returns The depth (0 for top-level, 1 for first reply, etc.)
 */
async calculateThreadDepth(responseId: string): Promise<number> {
  return this.threadingService.calculateThreadDepth(responseId);
}
```

- [ ] **Step 6: Replace buildThreadTree method with delegation**

Replace the `buildThreadTree` method (lines ~882-918) with:

```typescript
/**
 * T053 [US3] - Build recursive thread tree from flat response list
 *
 * @param responses - Flat array of responses from database
 * @returns Tree structure with responses and nested replies
 */
buildThreadTree(responses: ResponseDetailDto[]): ThreadedResponse[] {
  return this.threadingService.buildThreadTree(responses);
}
```

- [ ] **Step 7: Update replyToResponse to use threading service validation**

In the `replyToResponse` method (around line ~806), replace the depth check:

```typescript
// Calculate thread depth to enforce limit (T054)
await this.threadingService.validateReplyDepth(parentResponseId);
```

Remove the old depth check code:

```typescript
// DELETE THIS:
const depth = await this.calculateThreadDepth(parentResponseId);
const MAX_THREAD_DEPTH = 10;

if (depth >= MAX_THREAD_DEPTH) {
  throw new BadRequestException(
    `Thread depth limit exceeded (max ${MAX_THREAD_DEPTH} levels). ` +
      'Please reply to a higher-level response.',
  );
}
```

- [ ] **Step 8: Run existing tests to verify delegation works**

Run: `cd services/discussion-service && pnpm vitest run src/responses/responses.service.test.ts`
Expected: All existing tests PASS

- [ ] **Step 9: Commit**

```bash
git add services/discussion-service/src/responses/responses.service.ts
git commit -m "$(cat <<'EOF'
refactor(discussion): delegate to ResponseThreadingService

ResponsesService now delegates to ResponseThreadingService for:
- calculateThreadDepth()
- buildThreadTree()
- validateReplyDepth() (in replyToResponse)

Public API unchanged - all existing tests pass through delegation.

Part of #1169 service extraction refactoring.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Run Full Test Suite and Verify

**Files:**
- None (verification only)

- [ ] **Step 1: Run all discussion-service tests**

Run: `cd services/discussion-service && pnpm test:unit 2>&1 | tee /tmp/discussion-service-tests.log`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript compilation check**

Run: `cd services/discussion-service && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run linting**

Run: `cd services/discussion-service && pnpm lint`
Expected: No errors

- [ ] **Step 4: Verify line count reduction**

Run: `wc -l services/discussion-service/src/topics/topics.service.ts services/discussion-service/src/responses/responses.service.ts`
Expected: topics.service.ts ~800-900 lines (down from 1525), responses.service.ts ~900-1000 lines (down from 1109)

- [ ] **Step 5: Create final commit with summary**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(discussion): complete service extraction refactoring (#1169)

Extracted focused services from large service files:

TopicsService (1525 → ~850 lines, 44% reduction):
- TopicMergeService: merge/rollback transaction logic
- TopicStatusService: status transition state machine
- TopicCommonGroundService: analysis retrieval + caching

ResponsesService (1109 → ~950 lines, 14% reduction):
- ResponseThreadingService: thread tree building + depth calculation

Key benefits:
- Each extracted service has single responsibility
- Isolated logic is easier to test
- No breaking changes to public API
- Existing tests pass through delegation

Closes #1169

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Verification Checklist

After completing all tasks:

- [ ] All new service files created (4 services, 4 test files)
- [ ] All new tests pass
- [ ] All existing tests pass (delegation is transparent)
- [ ] TypeScript compiles without errors
- [ ] Linting passes
- [ ] topics.service.ts reduced from 1525 to ~850 lines
- [ ] responses.service.ts reduced from 1109 to ~950 lines
- [ ] No changes to controllers or API endpoints
