# Activity Feed from Followed Users - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a new activity-service that provides a feed of activities (topics created, responses posted, discussions joined) from users the current user follows.

**Architecture:** New NestJS microservice (activity-service) with a denormalized ActivityEvent table. Discussion-service calls activity-service via HTTP when events occur. API Gateway routes /feed and /activity to activity-service.

**Tech Stack:** NestJS 11, Fastify, Prisma 7, PostgreSQL, TypeScript 5.9, Vitest

---

## Task 1: Add ActivityEvent Schema to Prisma

**Files:**
- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1.1: Add the ActivityEvent model and enums**

Open `packages/db-models/prisma/schema.prisma` and add at the end (before closing):

```prisma
// ============================================================================
// ACTIVITY SERVICE ENTITIES
// ============================================================================

/// Activity events for feed generation
/// Denormalized table capturing user activities for efficient feed queries
model ActivityEvent {
  id            String       @id @default(uuid()) @db.Uuid
  userId        String       @map("user_id") @db.Uuid
  activityType  ActivityType @map("activity_type")

  // Target entity reference
  targetId      String       @map("target_id") @db.Uuid
  targetType    TargetType   @map("target_type")

  // Denormalized display data (avoids joins when rendering)
  targetTitle   String?      @map("target_title")
  targetSlug    String?      @map("target_slug")

  createdAt     DateTime     @default(now()) @map("created_at")

  // Relations
  user          User         @relation("UserActivities", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("activity_events")
}

/// Types of activity events
enum ActivityType {
  TOPIC_CREATED
  RESPONSE_POSTED
  DISCUSSION_JOINED

  @@map("activity_type")
}

/// Target entity types for activity events
enum TargetType {
  TOPIC
  RESPONSE
  DISCUSSION

  @@map("target_type")
}
```

**Step 1.2: Add the relation to User model**

Find the User model and add the relation. Look for the existing relations around line 55-76:

```prisma
// In the User model, add after the existing relations:
  activityEvents        ActivityEvent[]       @relation("UserActivities")
```

**Step 1.3: Run Prisma format**

Run: `cd packages/db-models && pnpm prisma format`
Expected: Schema formatted successfully

**Step 1.4: Generate migration**

Run: `cd packages/db-models && pnpm prisma migrate dev --name add_activity_events`
Expected: Migration created successfully

**Step 1.5: Commit schema changes**

```bash
git add packages/db-models/prisma/
git commit -m "feat(db): Add ActivityEvent model for activity feed

Adds denormalized activity events table with:
- userId, activityType, targetId, targetType
- Denormalized targetTitle and targetSlug for display
- Indexes optimized for feed queries

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add ACTIVITY_SERVICE Port

**Files:**
- Modify: `packages/common/src/config/ports.ts`

**Step 2.1: Add port constant**

Add after DISCUSSION_SERVICE line:

```typescript
ACTIVITY_SERVICE: 3008,
```

**Step 2.2: Add env var constant**

Add to SERVICE_URL_ENV_VARS:

```typescript
ACTIVITY_SERVICE: 'ACTIVITY_SERVICE_URL',
```

**Step 2.3: Commit**

```bash
git add packages/common/src/config/ports.ts
git commit -m "feat(common): Add ACTIVITY_SERVICE port 3008

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Scaffold Activity Service

**Files:**
- Create: `services/activity-service/package.json`
- Create: `services/activity-service/tsconfig.json`
- Create: `services/activity-service/vitest.config.ts`
- Create: `services/activity-service/src/main.ts`
- Create: `services/activity-service/src/app.module.ts`
- Create: `services/activity-service/src/prisma/prisma.module.ts`
- Create: `services/activity-service/src/prisma/prisma.service.ts`
- Create: `services/activity-service/src/health/health.module.ts`
- Create: `services/activity-service/src/health/health.controller.ts`

**Step 3.1: Create package.json**

```json
{
  "name": "@reason-bridge/activity-service",
  "version": "0.1.0",
  "description": "Activity feed service for showing followed users' activities",
  "type": "module",
  "main": "./dist/main.js",
  "types": "./dist/main.d.ts",
  "scripts": {
    "build": "tsc --build",
    "clean": "rm -rf dist .tsbuildinfo",
    "typecheck": "tsc --noEmit",
    "dev": "tsx watch src/main.ts",
    "start": "node dist/main.js",
    "start:dev": "tsx watch src/main.ts",
    "start:prod": "node dist/main.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@reason-bridge/common": "workspace:*",
    "@reason-bridge/db-models": "workspace:*",
    "@nestjs/common": "^11.1.13",
    "@nestjs/core": "^11.1.13",
    "@nestjs/platform-fastify": "^11.1.13",
    "@prisma/client": "7.3.0",
    "@prisma/adapter-pg": "^7.3.0",
    "pg": "^8.13.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.2",
    "fastify": "^5.7.4",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@types/node": "25.2.2",
    "@types/pg": "^8.11.10",
    "tsx": "^4.7.0",
    "typescript": "5.9.3",
    "vitest": "^2.1.8"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "license": "Apache-2.0",
  "author": "Tony Stein"
}
```

**Step 3.2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.spec.ts",
    "**/*.test.ts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts"
  ]
}
```

**Step 3.3: Create vitest.config.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts',
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
});
```

**Step 3.4: Create src/main.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SERVICE_PORTS } from '@reason-bridge/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // @ts-ignore - Fastify adapter type compatibility
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: process.env['NODE_ENV'] === 'test' ? ['error'] : undefined,
  });

  const port = process.env['PORT'] || SERVICE_PORTS.ACTIVITY_SERVICE;
  await app.listen(port, '0.0.0.0');

  console.log(`📰 Activity Service is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
```

**Step 3.5: Create src/app.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 3.6: Create src/prisma/prisma.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Step 3.7: Create src/prisma/prisma.service.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
```

**Step 3.8: Create src/health/health.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

**Step 3.9: Create src/health/health.controller.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'activity-service' };
  }
}
```

**Step 3.10: Install dependencies**

Run: `pnpm install`
Expected: Dependencies installed successfully

**Step 3.11: Build to verify**

Run: `cd services/activity-service && pnpm build`
Expected: Build successful

**Step 3.12: Commit scaffold**

```bash
git add services/activity-service/
git commit -m "feat(activity-service): Scaffold new activity service

Basic NestJS service with:
- Fastify adapter on port 3008
- Prisma integration
- Health check endpoint

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Implement Activity Events Module (Internal API)

**Files:**
- Create: `services/activity-service/src/activity-events/activity-events.module.ts`
- Create: `services/activity-service/src/activity-events/activity-events.service.ts`
- Create: `services/activity-service/src/activity-events/activity-events.service.test.ts`
- Create: `services/activity-service/src/activity-events/activity-events.controller.ts`
- Create: `services/activity-service/src/activity-events/dto/create-event.dto.ts`
- Modify: `services/activity-service/src/app.module.ts`

**Step 4.1: Create dto/create-event.dto.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export enum ActivityTypeDto {
  TOPIC_CREATED = 'TOPIC_CREATED',
  RESPONSE_POSTED = 'RESPONSE_POSTED',
  DISCUSSION_JOINED = 'DISCUSSION_JOINED',
}

export enum TargetTypeDto {
  TOPIC = 'TOPIC',
  RESPONSE = 'RESPONSE',
  DISCUSSION = 'DISCUSSION',
}

export class CreateActivityEventDto {
  @IsUUID()
  userId: string;

  @IsEnum(ActivityTypeDto)
  activityType: ActivityTypeDto;

  @IsUUID()
  targetId: string;

  @IsEnum(TargetTypeDto)
  targetType: TargetTypeDto;

  @IsOptional()
  @IsString()
  targetTitle?: string;

  @IsOptional()
  @IsString()
  targetSlug?: string;
}

export class ActivityEventResponseDto {
  id: string;
  createdAt: string;

  constructor(data: { id: string; createdAt: Date }) {
    this.id = data.id;
    this.createdAt = data.createdAt.toISOString();
  }
}
```

**Step 4.2: Create activity-events.service.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateActivityEventDto, ActivityEventResponseDto } from './dto/create-event.dto.js';

@Injectable()
export class ActivityEventsService {
  private readonly logger = new Logger(ActivityEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new activity event
   * Called by other services when activities occur
   */
  async createEvent(dto: CreateActivityEventDto): Promise<ActivityEventResponseDto> {
    const event = await this.prisma.activityEvent.create({
      data: {
        userId: dto.userId,
        activityType: dto.activityType,
        targetId: dto.targetId,
        targetType: dto.targetType,
        targetTitle: dto.targetTitle,
        targetSlug: dto.targetSlug,
      },
    });

    this.logger.log(
      `Created activity event: ${dto.activityType} by user ${dto.userId} for ${dto.targetType} ${dto.targetId}`,
    );

    return {
      id: event.id,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
```

**Step 4.3: Create activity-events.service.test.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityEventsService } from './activity-events.service.js';
import { ActivityTypeDto, TargetTypeDto } from './dto/create-event.dto.js';

describe('ActivityEventsService', () => {
  let service: ActivityEventsService;
  let mockPrisma: {
    activityEvent: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      activityEvent: {
        create: vi.fn(),
      },
    };

    service = new ActivityEventsService(mockPrisma as any);
  });

  describe('createEvent', () => {
    it('should create an activity event and return response', async () => {
      const mockEvent = {
        id: 'event-123',
        userId: 'user-456',
        activityType: 'TOPIC_CREATED',
        targetId: 'topic-789',
        targetType: 'TOPIC',
        targetTitle: 'Test Topic',
        targetSlug: 'test-topic',
        createdAt: new Date('2026-02-13T12:00:00Z'),
      };

      mockPrisma.activityEvent.create.mockResolvedValue(mockEvent);

      const result = await service.createEvent({
        userId: 'user-456',
        activityType: ActivityTypeDto.TOPIC_CREATED,
        targetId: 'topic-789',
        targetType: TargetTypeDto.TOPIC,
        targetTitle: 'Test Topic',
        targetSlug: 'test-topic',
      });

      expect(result).toEqual({
        id: 'event-123',
        createdAt: '2026-02-13T12:00:00.000Z',
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          activityType: 'TOPIC_CREATED',
          targetId: 'topic-789',
          targetType: 'TOPIC',
          targetTitle: 'Test Topic',
          targetSlug: 'test-topic',
        },
      });
    });

    it('should create event without optional fields', async () => {
      const mockEvent = {
        id: 'event-123',
        userId: 'user-456',
        activityType: 'RESPONSE_POSTED',
        targetId: 'response-789',
        targetType: 'RESPONSE',
        targetTitle: null,
        targetSlug: null,
        createdAt: new Date('2026-02-13T12:00:00Z'),
      };

      mockPrisma.activityEvent.create.mockResolvedValue(mockEvent);

      const result = await service.createEvent({
        userId: 'user-456',
        activityType: ActivityTypeDto.RESPONSE_POSTED,
        targetId: 'response-789',
        targetType: TargetTypeDto.RESPONSE,
      });

      expect(result.id).toBe('event-123');
      expect(mockPrisma.activityEvent.create).toHaveBeenCalled();
    });
  });
});
```

**Step 4.4: Create activity-events.controller.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ActivityEventsService } from './activity-events.service.js';
import { CreateActivityEventDto, ActivityEventResponseDto } from './dto/create-event.dto.js';

/**
 * Internal API for creating activity events
 * Called by other services (discussion-service) when activities occur
 */
@Controller('events')
export class ActivityEventsController {
  constructor(private readonly eventsService: ActivityEventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() dto: CreateActivityEventDto): Promise<ActivityEventResponseDto> {
    return this.eventsService.createEvent(dto);
  }
}
```

**Step 4.5: Create activity-events.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ActivityEventsController } from './activity-events.controller.js';
import { ActivityEventsService } from './activity-events.service.js';

@Module({
  controllers: [ActivityEventsController],
  providers: [ActivityEventsService],
  exports: [ActivityEventsService],
})
export class ActivityEventsModule {}
```

**Step 4.6: Update app.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ActivityEventsModule } from './activity-events/activity-events.module.js';

@Module({
  imports: [PrismaModule, HealthModule, ActivityEventsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 4.7: Run tests**

Run: `cd services/activity-service && pnpm test`
Expected: All tests pass

**Step 4.8: Commit**

```bash
git add services/activity-service/src/activity-events/ services/activity-service/src/app.module.ts
git commit -m "feat(activity-service): Add activity events module

Internal API for creating activity events:
- POST /events creates new activity event
- Service validates and stores to database
- Unit tests for service

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Implement Activity Feed Module (Public API)

**Files:**
- Create: `services/activity-service/src/activity-feed/activity-feed.module.ts`
- Create: `services/activity-service/src/activity-feed/activity-feed.service.ts`
- Create: `services/activity-service/src/activity-feed/activity-feed.service.test.ts`
- Create: `services/activity-service/src/activity-feed/activity-feed.controller.ts`
- Create: `services/activity-service/src/activity-feed/dto/activity-feed.dto.ts`
- Modify: `services/activity-service/src/app.module.ts`

**Step 5.1: Create dto/activity-feed.dto.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetFeedQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface ActivityUserDto {
  id: string;
  displayName: string | null;
}

export interface ActivityEventDto {
  id: string;
  activityType: string;
  targetId: string;
  targetType: string;
  targetTitle: string | null;
  targetSlug: string | null;
  createdAt: string;
  user: ActivityUserDto;
}

export interface ActivityFeedResponseDto {
  activities: ActivityEventDto[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

**Step 5.2: Create activity-feed.service.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  GetFeedQueryDto,
  ActivityFeedResponseDto,
  ActivityEventDto,
} from './dto/activity-feed.dto.js';

@Injectable()
export class ActivityFeedService {
  private readonly logger = new Logger(ActivityFeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get activity feed for a user showing activities from followed users
   */
  async getFeed(userId: string, query: GetFeedQueryDto): Promise<ActivityFeedResponseDto> {
    const { limit = 20, cursor } = query;

    // Step 1: Get IDs of users the current user follows
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followedId: true },
    });

    const followedUserIds = follows.map((f) => f.followedId);

    // Early return if not following anyone
    if (followedUserIds.length === 0) {
      this.logger.debug(`User ${userId} is not following anyone - returning empty feed`);
      return {
        activities: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    // Step 2: Build cursor condition
    const cursorCondition = cursor
      ? { createdAt: { lt: new Date(cursor) } }
      : {};

    // Step 3: Query activity events from followed users
    const events = await this.prisma.activityEvent.findMany({
      where: {
        userId: { in: followedUserIds },
        ...cursorCondition,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check hasMore
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // Step 4: Determine pagination
    const hasMore = events.length > limit;
    const activities = events.slice(0, limit);

    const nextCursor =
      hasMore && activities.length > 0
        ? activities[activities.length - 1].createdAt.toISOString()
        : null;

    // Step 5: Map to response DTOs
    const mappedActivities: ActivityEventDto[] = activities.map((event) => ({
      id: event.id,
      activityType: event.activityType,
      targetId: event.targetId,
      targetType: event.targetType,
      targetTitle: event.targetTitle,
      targetSlug: event.targetSlug,
      createdAt: event.createdAt.toISOString(),
      user: {
        id: event.user.id,
        displayName: event.user.displayName,
      },
    }));

    this.logger.debug(
      `Returning ${mappedActivities.length} activities for user ${userId}, hasMore: ${hasMore}`,
    );

    return {
      activities: mappedActivities,
      nextCursor,
      hasMore,
    };
  }
}
```

**Step 5.3: Create activity-feed.service.test.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityFeedService } from './activity-feed.service.js';

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;
  let mockPrisma: {
    userFollow: { findMany: ReturnType<typeof vi.fn> };
    activityEvent: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockPrisma = {
      userFollow: { findMany: vi.fn() },
      activityEvent: { findMany: vi.fn() },
    };

    service = new ActivityFeedService(mockPrisma as any);
  });

  describe('getFeed', () => {
    it('should return empty feed when user follows no one', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([]);

      const result = await service.getFeed('user-123', { limit: 20 });

      expect(result).toEqual({
        activities: [],
        nextCursor: null,
        hasMore: false,
      });

      expect(mockPrisma.activityEvent.findMany).not.toHaveBeenCalled();
    });

    it('should return activities from followed users', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([
        { followedId: 'followed-1' },
        { followedId: 'followed-2' },
      ]);

      mockPrisma.activityEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          userId: 'followed-1',
          activityType: 'TOPIC_CREATED',
          targetId: 'topic-1',
          targetType: 'TOPIC',
          targetTitle: 'Test Topic',
          targetSlug: 'test-topic',
          createdAt: new Date('2026-02-13T12:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane Doe' },
        },
      ]);

      const result = await service.getFeed('user-123', { limit: 20 });

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0]).toEqual({
        id: 'event-1',
        activityType: 'TOPIC_CREATED',
        targetId: 'topic-1',
        targetType: 'TOPIC',
        targetTitle: 'Test Topic',
        targetSlug: 'test-topic',
        createdAt: '2026-02-13T12:00:00.000Z',
        user: { id: 'followed-1', displayName: 'Jane Doe' },
      });
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle pagination with hasMore', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([{ followedId: 'followed-1' }]);

      // Return 3 events when limit is 2 (indicates hasMore)
      mockPrisma.activityEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          createdAt: new Date('2026-02-13T12:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane' },
          activityType: 'TOPIC_CREATED',
          targetId: 't1',
          targetType: 'TOPIC',
          targetTitle: 'Topic 1',
          targetSlug: 'topic-1',
        },
        {
          id: 'event-2',
          createdAt: new Date('2026-02-13T11:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane' },
          activityType: 'RESPONSE_POSTED',
          targetId: 'r1',
          targetType: 'RESPONSE',
          targetTitle: 'Topic 1',
          targetSlug: 'topic-1',
        },
        {
          id: 'event-3',
          createdAt: new Date('2026-02-13T10:00:00Z'),
          user: { id: 'followed-1', displayName: 'Jane' },
          activityType: 'DISCUSSION_JOINED',
          targetId: 'd1',
          targetType: 'DISCUSSION',
          targetTitle: 'Topic 1',
          targetSlug: 'topic-1',
        },
      ]);

      const result = await service.getFeed('user-123', { limit: 2 });

      expect(result.activities).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('2026-02-13T11:00:00.000Z');
    });

    it('should apply cursor for pagination', async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([{ followedId: 'followed-1' }]);
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);

      await service.getFeed('user-123', {
        limit: 20,
        cursor: '2026-02-13T12:00:00.000Z',
      });

      expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: new Date('2026-02-13T12:00:00.000Z') },
          }),
        }),
      );
    });
  });
});
```

**Step 5.4: Create activity-feed.controller.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ActivityFeedService } from './activity-feed.service.js';
import { GetFeedQueryDto, ActivityFeedResponseDto } from './dto/activity-feed.dto.js';

/**
 * Public API for retrieving activity feed
 * Requires authenticated user (user ID from X-User-Id header set by API Gateway)
 */
@Controller('feed')
export class ActivityFeedController {
  constructor(private readonly feedService: ActivityFeedService) {}

  @Get()
  async getFeed(
    @Headers('x-user-id') userId: string | undefined,
    @Query() query: GetFeedQueryDto,
  ): Promise<ActivityFeedResponseDto> {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    return this.feedService.getFeed(userId, query);
  }
}
```

**Step 5.5: Create activity-feed.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { ActivityFeedController } from './activity-feed.controller.js';
import { ActivityFeedService } from './activity-feed.service.js';

@Module({
  controllers: [ActivityFeedController],
  providers: [ActivityFeedService],
  exports: [ActivityFeedService],
})
export class ActivityFeedModule {}
```

**Step 5.6: Update app.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ActivityEventsModule } from './activity-events/activity-events.module.js';
import { ActivityFeedModule } from './activity-feed/activity-feed.module.js';

@Module({
  imports: [PrismaModule, HealthModule, ActivityEventsModule, ActivityFeedModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 5.7: Run tests**

Run: `cd services/activity-service && pnpm test`
Expected: All tests pass

**Step 5.8: Commit**

```bash
git add services/activity-service/src/activity-feed/ services/activity-service/src/app.module.ts
git commit -m "feat(activity-service): Add activity feed module

Public API for retrieving activity feed:
- GET /feed returns activities from followed users
- Cursor-based pagination support
- Returns empty feed when not following anyone
- Unit tests for service

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Add API Gateway Routing

**Files:**
- Modify: `services/api-gateway/src/proxy/proxy.service.ts`
- Modify: `services/api-gateway/src/gateway/gateway.controller.ts`

**Step 6.1: Add activityService to ProxyService**

In `proxy.service.ts`, add the service config declaration (around line 61):

```typescript
private readonly activityService: ServiceConfig;
```

Add initialization in constructor (around line 104):

```typescript
this.activityService = {
  url: getConfig<string>('ACTIVITY_SERVICE_URL', getServiceUrl('ACTIVITY_SERVICE')),
  timeout: getConfig<number>('ACTIVITY_SERVICE_TIMEOUT', DEFAULT_TIMEOUT),
  retryAttempts: getConfig<number>('ACTIVITY_SERVICE_RETRY_ATTEMPTS', DEFAULT_RETRY_ATTEMPTS),
};
```

Add proxy method (after proxyToModerationService):

```typescript
async proxyToActivityService<T = unknown>(request: ProxyRequest): Promise<AxiosResponse<T>> {
  return this.proxyWithResilience<T>('activity-service', this.activityService, request);
}
```

**Step 6.2: Add routes in GatewayController**

Add routes for /feed and /activity/events in `gateway.controller.ts`:

```typescript
// Activity Feed routes
@Get('feed')
async getFeed(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
  return this.proxyWithAuth(req, res, 'activity');
}

@Post('activity/events')
async createActivityEvent(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
  // Internal endpoint - allow without auth for service-to-service calls
  return this.proxyWithoutAuth(req, res, 'activity');
}
```

Add to the service routing logic (in the proxy methods):

```typescript
case 'activity':
  response = await this.proxyService.proxyToActivityService(proxyRequest);
  break;
```

**Step 6.3: Commit**

```bash
git add services/api-gateway/
git commit -m "feat(api-gateway): Add routing for activity-service

Routes /feed and /activity/events to activity-service
with standard resilience patterns (circuit breaker, retry)

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Discussion Service Integration (Event Emitting)

**Files:**
- Create: `services/discussion-service/src/clients/activity-client.service.ts`
- Create: `services/discussion-service/src/clients/clients.module.ts`
- Modify: `services/discussion-service/src/topics/topics.service.ts`
- Modify: `services/discussion-service/src/topics/topics.module.ts`

**Step 7.1: Create activity-client.service.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { SERVICE_PORTS, getServiceUrl } from '@reason-bridge/common';

interface CreateActivityEventDto {
  userId: string;
  activityType: 'TOPIC_CREATED' | 'RESPONSE_POSTED' | 'DISCUSSION_JOINED';
  targetId: string;
  targetType: 'TOPIC' | 'RESPONSE' | 'DISCUSSION';
  targetTitle?: string;
  targetSlug?: string;
}

/**
 * HTTP client for calling activity-service
 * Fire-and-forget pattern - failures are logged but don't block main operations
 */
@Injectable()
export class ActivityClientService {
  private readonly logger = new Logger(ActivityClientService.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env['ACTIVITY_SERVICE_URL'] || getServiceUrl('ACTIVITY_SERVICE');
  }

  /**
   * Create an activity event (fire-and-forget)
   * Failures are logged but don't block the calling operation
   */
  async createEvent(dto: CreateActivityEventDto): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to create activity event: ${response.status} ${response.statusText}`,
        );
      } else {
        this.logger.debug(
          `Created activity event: ${dto.activityType} for ${dto.targetType} ${dto.targetId}`,
        );
      }
    } catch (error) {
      // Fire-and-forget - log but don't throw
      this.logger.warn(
        `Error creating activity event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
```

**Step 7.2: Create clients.module.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global } from '@nestjs/common';
import { ActivityClientService } from './activity-client.service.js';

@Global()
@Module({
  providers: [ActivityClientService],
  exports: [ActivityClientService],
})
export class ClientsModule {}
```

**Step 7.3: Update topics.service.ts**

Add import at top:

```typescript
import { ActivityClientService } from '../clients/activity-client.service.js';
```

Add to constructor:

```typescript
private activityClient: ActivityClientService,
```

After successful topic creation (around line 357, after discussion creation), add:

```typescript
// Step 5: Create activity event (fire-and-forget)
this.activityClient.createEvent({
  userId: userId,
  activityType: 'TOPIC_CREATED',
  targetId: topic.id,
  targetType: 'TOPIC',
  targetTitle: topic.title,
  targetSlug: topic.slug,
});
```

**Step 7.4: Update topics.module.ts**

Import ClientsModule:

```typescript
import { ClientsModule } from '../clients/clients.module.js';
```

Add to imports array:

```typescript
imports: [..., ClientsModule],
```

**Step 7.5: Update app.module.ts in discussion-service**

Import and add ClientsModule to the main app module imports.

**Step 7.6: Commit**

```bash
git add services/discussion-service/src/clients/ services/discussion-service/src/topics/ services/discussion-service/src/app.module.ts
git commit -m "feat(discussion-service): Emit activity events on topic creation

Adds ActivityClientService that calls activity-service when:
- Topic is created -> TOPIC_CREATED event

Fire-and-forget pattern ensures main operations aren't blocked
if activity-service is unavailable.

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.e2e.yml` (if exists)

**Step 8.1: Add activity-service to docker-compose.yml**

Add after other services:

```yaml
activity-service:
  build:
    context: .
    dockerfile: services/activity-service/Dockerfile
  ports:
    - "3008:3008"
  environment:
    - NODE_ENV=development
    - DATABASE_URL=${DATABASE_URL}
  depends_on:
    - postgres
  networks:
    - reasonbridge-network
```

**Step 8.2: Commit**

```bash
git add docker-compose*.yml
git commit -m "chore(docker): Add activity-service to compose files

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Dockerfile for Activity Service

**Files:**
- Create: `services/activity-service/Dockerfile`

**Step 9.1: Create Dockerfile**

```dockerfile
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/common/package.json ./packages/common/
COPY packages/db-models/package.json ./packages/db-models/
COPY services/activity-service/package.json ./services/activity-service/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=dependencies /app/packages/db-models/node_modules ./packages/db-models/node_modules
COPY --from=dependencies /app/services/activity-service/node_modules ./services/activity-service/node_modules
COPY . .
RUN pnpm --filter @reason-bridge/common build
RUN pnpm --filter @reason-bridge/db-models build
RUN pnpm --filter @reason-bridge/activity-service build

FROM base AS production
COPY --from=build /app/packages/common/dist ./packages/common/dist
COPY --from=build /app/packages/common/package.json ./packages/common/
COPY --from=build /app/packages/db-models/dist ./packages/db-models/dist
COPY --from=build /app/packages/db-models/package.json ./packages/db-models/
COPY --from=build /app/services/activity-service/dist ./services/activity-service/dist
COPY --from=build /app/services/activity-service/package.json ./services/activity-service/
COPY --from=build /app/node_modules ./node_modules
WORKDIR /app/services/activity-service
EXPOSE 3008
CMD ["node", "dist/main.js"]
```

**Step 9.2: Commit**

```bash
git add services/activity-service/Dockerfile
git commit -m "chore(activity-service): Add Dockerfile

Issue: #245

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Run Full Test Suite and Final Verification

**Step 10.1: Run all unit tests**

Run: `pnpm test`
Expected: All tests pass

**Step 10.2: Run linting**

Run: `pnpm lint`
Expected: No errors

**Step 10.3: Run type checking**

Run: `pnpm typecheck`
Expected: No errors

**Step 10.4: Build all packages**

Run: `pnpm build`
Expected: Build successful

**Step 10.5: Push and create PR**

```bash
git push -u origin 245-activity-feed-from-followed-users
gh pr create --title "feat: Implement activity feed from followed users (T249)" --body "$(cat <<'EOF'
## Summary

Implements activity feed showing activities from followed users (Issue #245).

### Changes
- **Database**: Added ActivityEvent model with optimized indexes
- **New Service**: activity-service on port 3008
  - GET /feed - Returns paginated activity feed
  - POST /events - Creates activity events (internal API)
- **API Gateway**: Routes /feed and /activity/* to activity-service
- **Discussion Service**: Emits TOPIC_CREATED events when topics created

### Architecture
- Denormalized ActivityEvent table for fast feed queries
- Cursor-based pagination for scalability
- Fire-and-forget event emission (doesn't block main operations)

## Test plan
- [ ] Unit tests pass for activity-service
- [ ] Integration: Create topic → event appears in followed user's feed
- [ ] Empty feed when following no one
- [ ] Pagination works correctly

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Success Criteria Checklist

- [ ] ActivityEvent model created with migration
- [ ] activity-service scaffolded with health endpoint
- [ ] GET /feed returns activities from followed users
- [ ] POST /events creates activity events (internal API)
- [ ] discussion-service emits events on topic creation
- [ ] API gateway routes to activity-service
- [ ] Unit tests pass (>80% coverage)
- [ ] All lint and type checks pass
- [ ] Docker compose updated
