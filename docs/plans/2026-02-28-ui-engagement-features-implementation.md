# UI Engagement Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 6 P0 UI engagement features (Share button, Typing indicators, New Messages divider, Bookmarks, Emoji reactions, @Mentions) to improve platform score from 2.3/5 to 3.2/5.

**Architecture:** Full-stack implementation with Prisma migrations for new tables (ResponseReaction, Bookmark, UserTopicReadState), NestJS modules in discussion-service, WebSocket message types for real-time updates, and React components with custom hooks.

**Tech Stack:** Prisma ORM, NestJS, React 18, TypeScript, WebSocket, React Query, Tailwind CSS

---

## Phase 1: Database Schema & Migrations

### Task 1: Add ResponseReaction Model

**Files:**
- Modify: `packages/db-models/prisma/schema.prisma`
- Create: `packages/db-models/prisma/migrations/YYYYMMDDHHMMSS_add_response_reactions/migration.sql`

**Step 1: Add ResponseReaction model to schema**

Add after the Vote model (around line 882):

```prisma
/// Emoji reaction on a response (👍 ❤️ 🎉 etc.)
model ResponseReaction {
  id          String   @id @default(uuid()) @db.Uuid
  responseId  String   @map("response_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  emoji       String   @db.VarChar(32)
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  response    Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([responseId, userId, emoji])
  @@index([responseId])
  @@index([userId])
  @@map("response_reactions")
}
```

**Step 2: Add relation to Response model**

Find `model Response` and add to relations section:

```prisma
  reactions      ResponseReaction[]
```

**Step 3: Add relation to User model**

Find `model User` and add to relations section:

```prisma
  reactions           ResponseReaction[]
```

**Step 4: Generate and run migration**

Run: `cd packages/db-models && pnpm prisma migrate dev --name add_response_reactions`

Expected: Migration created successfully, Prisma client regenerated

**Step 5: Commit**

```bash
git add packages/db-models/prisma/schema.prisma packages/db-models/prisma/migrations/
git commit -m "feat(db): add ResponseReaction model for emoji reactions"
```

---

### Task 2: Add Bookmark Model

**Files:**
- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add Bookmark model to schema**

Add after ResponseReaction model:

```prisma
/// User bookmark on a response
model Bookmark {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  responseId  String   @map("response_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  response    Response @relation(fields: [responseId], references: [id], onDelete: Cascade)

  @@unique([userId, responseId])
  @@index([userId])
  @@index([responseId])
  @@map("bookmarks")
}
```

**Step 2: Add relation to Response model**

```prisma
  bookmarks      Bookmark[]
```

**Step 3: Add relation to User model**

```prisma
  bookmarks           Bookmark[]
```

**Step 4: Generate and run migration**

Run: `cd packages/db-models && pnpm prisma migrate dev --name add_bookmarks`

Expected: Migration created successfully

**Step 5: Commit**

```bash
git add packages/db-models/prisma/
git commit -m "feat(db): add Bookmark model for saved responses"
```

---

### Task 3: Add UserTopicReadState Model

**Files:**
- Modify: `packages/db-models/prisma/schema.prisma`

**Step 1: Add UserTopicReadState model**

Add after Bookmark model:

```prisma
/// Tracks user's read position in a topic for "New Messages" divider
model UserTopicReadState {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  topicId         String   @map("topic_id") @db.Uuid
  lastReadAt      DateTime @map("last_read_at")
  lastResponseId  String?  @map("last_response_id") @db.Uuid

  // Relations
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic           DiscussionTopic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@unique([userId, topicId])
  @@index([userId])
  @@index([topicId])
  @@map("user_topic_read_state")
}
```

**Step 2: Add relation to User model**

```prisma
  topicReadStates     UserTopicReadState[]
```

**Step 3: Add relation to DiscussionTopic model**

```prisma
  userReadStates      UserTopicReadState[]
```

**Step 4: Generate and run migration**

Run: `cd packages/db-models && pnpm prisma migrate dev --name add_user_topic_read_state`

Expected: Migration created successfully

**Step 5: Commit**

```bash
git add packages/db-models/prisma/
git commit -m "feat(db): add UserTopicReadState model for new messages divider"
```

---

## Phase 2: Backend - Reactions Module

### Task 4: Create Reactions DTOs

**Files:**
- Create: `services/discussion-service/src/reactions/dto/create-reaction.dto.ts`
- Create: `services/discussion-service/src/reactions/dto/reaction.dto.ts`
- Create: `services/discussion-service/src/reactions/dto/index.ts`

**Step 1: Create create-reaction.dto.ts**

```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReactionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  emoji: string;
}
```

**Step 2: Create reaction.dto.ts**

```typescript
export class ReactionDto {
  id: string;
  responseId: string;
  userId: string;
  userName: string;
  emoji: string;
  createdAt: Date;
}

export class ReactionSummaryDto {
  emoji: string;
  count: number;
  users: { id: string; displayName: string }[];
  userReacted: boolean;
}

export class ReactionListDto {
  reactions: ReactionSummaryDto[];
  totalCount: number;
}
```

**Step 3: Create index.ts**

```typescript
export * from './create-reaction.dto';
export * from './reaction.dto';
```

**Step 4: Verify files exist**

Run: `ls -la services/discussion-service/src/reactions/dto/`

Expected: 3 files created

**Step 5: Commit**

```bash
git add services/discussion-service/src/reactions/
git commit -m "feat(reactions): add DTOs for reaction API"
```

---

### Task 5: Create Reactions Service

**Files:**
- Create: `services/discussion-service/src/reactions/reactions.service.ts`

**Step 1: Create reactions.service.ts**

```typescript
import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReactionDto, ReactionDto, ReactionListDto, ReactionSummaryDto } from './dto';

@Injectable()
export class ReactionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async addReaction(
    responseId: string,
    userId: string,
    dto: CreateReactionDto,
  ): Promise<ReactionDto> {
    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: responseId },
    });
    if (!response) {
      throw new NotFoundException('Response not found');
    }

    // Check if reaction already exists
    const existing = await this.prisma.responseReaction.findUnique({
      where: {
        responseId_userId_emoji: {
          responseId,
          userId,
          emoji: dto.emoji,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Reaction already exists');
    }

    const reaction = await this.prisma.responseReaction.create({
      data: {
        responseId,
        userId,
        emoji: dto.emoji,
      },
      include: {
        user: {
          select: { id: true, displayName: true },
        },
      },
    });

    return {
      id: reaction.id,
      responseId: reaction.responseId,
      userId: reaction.userId,
      userName: reaction.user.displayName || 'Anonymous',
      emoji: reaction.emoji,
      createdAt: reaction.createdAt,
    };
  }

  async removeReaction(
    responseId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    const reaction = await this.prisma.responseReaction.findUnique({
      where: {
        responseId_userId_emoji: {
          responseId,
          userId,
          emoji,
        },
      },
    });
    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.responseReaction.delete({
      where: { id: reaction.id },
    });
  }

  async getReactions(responseId: string, userId?: string): Promise<ReactionListDto> {
    const reactions = await this.prisma.responseReaction.findMany({
      where: { responseId },
      include: {
        user: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by emoji
    const emojiGroups = new Map<string, { users: { id: string; displayName: string }[] }>();
    for (const reaction of reactions) {
      const group = emojiGroups.get(reaction.emoji) || { users: [] };
      group.users.push({
        id: reaction.user.id,
        displayName: reaction.user.displayName || 'Anonymous',
      });
      emojiGroups.set(reaction.emoji, group);
    }

    const summaries: ReactionSummaryDto[] = Array.from(emojiGroups.entries()).map(
      ([emoji, group]) => ({
        emoji,
        count: group.users.length,
        users: group.users.slice(0, 10), // Limit to first 10 users
        userReacted: userId ? group.users.some((u) => u.id === userId) : false,
      }),
    );

    return {
      reactions: summaries,
      totalCount: reactions.length,
    };
  }
}
```

**Step 2: Verify file exists**

Run: `cat services/discussion-service/src/reactions/reactions.service.ts | head -20`

Expected: Service class with imports visible

**Step 3: Commit**

```bash
git add services/discussion-service/src/reactions/
git commit -m "feat(reactions): add reactions service with CRUD operations"
```

---

### Task 6: Create Reactions Controller

**Files:**
- Create: `services/discussion-service/src/reactions/reactions.controller.ts`

**Step 1: Create reactions.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto, ReactionDto, ReactionListDto } from './dto';

@Controller('responses')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post(':responseId/reactions')
  async addReaction(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateReactionDto,
  ): Promise<ReactionDto> {
    return this.reactionsService.addReaction(responseId, userId, dto);
  }

  @Delete(':responseId/reactions/:emoji')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeReaction(
    @Param('responseId') responseId: string,
    @Param('emoji') emoji: string,
    @Headers('x-user-id') userId: string,
  ): Promise<void> {
    return this.reactionsService.removeReaction(responseId, userId, emoji);
  }

  @Get(':responseId/reactions')
  async getReactions(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<ReactionListDto> {
    return this.reactionsService.getReactions(responseId, userId);
  }
}
```

**Step 2: Verify file exists**

Run: `cat services/discussion-service/src/reactions/reactions.controller.ts | head -20`

**Step 3: Commit**

```bash
git add services/discussion-service/src/reactions/
git commit -m "feat(reactions): add reactions controller with endpoints"
```

---

### Task 7: Create Reactions Module

**Files:**
- Create: `services/discussion-service/src/reactions/reactions.module.ts`
- Modify: `services/discussion-service/src/app.module.ts`

**Step 1: Create reactions.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}
```

**Step 2: Import ReactionsModule in app.module.ts**

Add import and add to imports array:

```typescript
import { ReactionsModule } from './reactions/reactions.module';

@Module({
  imports: [
    // ... existing imports ...
    ReactionsModule,
  ],
})
```

**Step 3: Verify module registration**

Run: `grep -n "ReactionsModule" services/discussion-service/src/app.module.ts`

Expected: Import statement and imports array entry

**Step 4: Commit**

```bash
git add services/discussion-service/src/
git commit -m "feat(reactions): register reactions module in discussion-service"
```

---

### Task 8: Write Reactions Service Unit Tests

**Files:**
- Create: `services/discussion-service/src/reactions/reactions.service.spec.ts`

**Step 1: Create reactions.service.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReactionsService } from './reactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ReactionsService', () => {
  let service: ReactionsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    response: {
      findUnique: jest.fn(),
    },
    responseReaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReactionsService>(ReactionsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('addReaction', () => {
    it('should create a reaction', async () => {
      const responseId = 'response-1';
      const userId = 'user-1';
      const dto = { emoji: '👍' };

      mockPrisma.response.findUnique.mockResolvedValue({ id: responseId });
      mockPrisma.responseReaction.findUnique.mockResolvedValue(null);
      mockPrisma.responseReaction.create.mockResolvedValue({
        id: 'reaction-1',
        responseId,
        userId,
        emoji: '👍',
        createdAt: new Date(),
        user: { id: userId, displayName: 'Test User' },
      });

      const result = await service.addReaction(responseId, userId, dto);

      expect(result.emoji).toBe('👍');
      expect(result.userName).toBe('Test User');
    });

    it('should throw NotFoundException if response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(
        service.addReaction('invalid-id', 'user-1', { emoji: '👍' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if reaction already exists', async () => {
      mockPrisma.response.findUnique.mockResolvedValue({ id: 'response-1' });
      mockPrisma.responseReaction.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.addReaction('response-1', 'user-1', { emoji: '👍' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeReaction', () => {
    it('should delete a reaction', async () => {
      mockPrisma.responseReaction.findUnique.mockResolvedValue({ id: 'reaction-1' });
      mockPrisma.responseReaction.delete.mockResolvedValue({});

      await service.removeReaction('response-1', 'user-1', '👍');

      expect(mockPrisma.responseReaction.delete).toHaveBeenCalledWith({
        where: { id: 'reaction-1' },
      });
    });

    it('should throw NotFoundException if reaction does not exist', async () => {
      mockPrisma.responseReaction.findUnique.mockResolvedValue(null);

      await expect(
        service.removeReaction('response-1', 'user-1', '👍'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReactions', () => {
    it('should return grouped reactions', async () => {
      mockPrisma.responseReaction.findMany.mockResolvedValue([
        { emoji: '👍', user: { id: 'user-1', displayName: 'Alice' } },
        { emoji: '👍', user: { id: 'user-2', displayName: 'Bob' } },
        { emoji: '❤️', user: { id: 'user-1', displayName: 'Alice' } },
      ]);

      const result = await service.getReactions('response-1', 'user-1');

      expect(result.reactions).toHaveLength(2);
      expect(result.reactions[0].emoji).toBe('👍');
      expect(result.reactions[0].count).toBe(2);
      expect(result.reactions[0].userReacted).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

Run: `cd services/discussion-service && pnpm test -- --testPathPattern=reactions.service.spec.ts --passWithNoTests`

Expected: Tests pass

**Step 3: Commit**

```bash
git add services/discussion-service/src/reactions/
git commit -m "test(reactions): add unit tests for reactions service"
```

---

## Phase 3: Backend - Bookmarks Module

### Task 9: Create Bookmarks DTOs

**Files:**
- Create: `services/discussion-service/src/bookmarks/dto/create-bookmark.dto.ts`
- Create: `services/discussion-service/src/bookmarks/dto/bookmark.dto.ts`
- Create: `services/discussion-service/src/bookmarks/dto/index.ts`

**Step 1: Create create-bookmark.dto.ts**

```typescript
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateBookmarkDto {
  @IsNotEmpty()
  @IsUUID()
  responseId: string;
}
```

**Step 2: Create bookmark.dto.ts**

```typescript
export class BookmarkDto {
  id: string;
  userId: string;
  responseId: string;
  createdAt: Date;
  response?: {
    id: string;
    content: string;
    topicId: string;
    topicTitle: string;
    authorDisplayName: string;
    createdAt: Date;
  };
}

export class BookmarkListDto {
  bookmarks: BookmarkDto[];
  total: number;
  limit: number;
  offset: number;
}

export class BookmarkStatusDto {
  isBookmarked: boolean;
}
```

**Step 3: Create index.ts**

```typescript
export * from './create-bookmark.dto';
export * from './bookmark.dto';
```

**Step 4: Commit**

```bash
git add services/discussion-service/src/bookmarks/
git commit -m "feat(bookmarks): add DTOs for bookmark API"
```

---

### Task 10: Create Bookmarks Service

**Files:**
- Create: `services/discussion-service/src/bookmarks/bookmarks.service.ts`

**Step 1: Create bookmarks.service.ts**

```typescript
import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookmarkDto, BookmarkDto, BookmarkListDto, BookmarkStatusDto } from './dto';

@Injectable()
export class BookmarksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async addBookmark(userId: string, dto: CreateBookmarkDto): Promise<BookmarkDto> {
    // Verify response exists
    const response = await this.prisma.response.findUnique({
      where: { id: dto.responseId },
    });
    if (!response) {
      throw new NotFoundException('Response not found');
    }

    // Check if already bookmarked
    const existing = await this.prisma.bookmark.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId: dto.responseId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Response already bookmarked');
    }

    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        responseId: dto.responseId,
      },
    });

    return {
      id: bookmark.id,
      userId: bookmark.userId,
      responseId: bookmark.responseId,
      createdAt: bookmark.createdAt,
    };
  }

  async removeBookmark(userId: string, responseId: string): Promise<void> {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId,
        },
      },
    });
    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.prisma.bookmark.delete({
      where: { id: bookmark.id },
    });
  }

  async getBookmarks(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<BookmarkListDto> {
    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId },
        include: {
          response: {
            include: {
              topic: { select: { id: true, title: true } },
              author: { select: { displayName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);

    return {
      bookmarks: bookmarks.map((b) => ({
        id: b.id,
        userId: b.userId,
        responseId: b.responseId,
        createdAt: b.createdAt,
        response: {
          id: b.response.id,
          content: b.response.content.substring(0, 200),
          topicId: b.response.topic.id,
          topicTitle: b.response.topic.title,
          authorDisplayName: b.response.author.displayName || 'Anonymous',
          createdAt: b.response.createdAt,
        },
      })),
      total,
      limit,
      offset,
    };
  }

  async getBookmarkStatus(userId: string, responseId: string): Promise<BookmarkStatusDto> {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_responseId: {
          userId,
          responseId,
        },
      },
    });

    return { isBookmarked: !!bookmark };
  }
}
```

**Step 2: Commit**

```bash
git add services/discussion-service/src/bookmarks/
git commit -m "feat(bookmarks): add bookmarks service with CRUD operations"
```

---

### Task 11: Create Bookmarks Controller and Module

**Files:**
- Create: `services/discussion-service/src/bookmarks/bookmarks.controller.ts`
- Create: `services/discussion-service/src/bookmarks/bookmarks.module.ts`
- Modify: `services/discussion-service/src/app.module.ts`

**Step 1: Create bookmarks.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto, BookmarkDto, BookmarkListDto, BookmarkStatusDto } from './dto';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  async addBookmark(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateBookmarkDto,
  ): Promise<BookmarkDto> {
    return this.bookmarksService.addBookmark(userId, dto);
  }

  @Delete(':responseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBookmark(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<void> {
    return this.bookmarksService.removeBookmark(userId, responseId);
  }

  @Get()
  async getBookmarks(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<BookmarkListDto> {
    return this.bookmarksService.getBookmarks(userId, limit, offset);
  }

  @Get(':responseId/status')
  async getBookmarkStatus(
    @Param('responseId') responseId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<BookmarkStatusDto> {
    return this.bookmarksService.getBookmarkStatus(userId, responseId);
  }
}
```

**Step 2: Create bookmarks.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
```

**Step 3: Import BookmarksModule in app.module.ts**

```typescript
import { BookmarksModule } from './bookmarks/bookmarks.module';
```

Add to imports array.

**Step 4: Commit**

```bash
git add services/discussion-service/src/
git commit -m "feat(bookmarks): add bookmarks controller and module"
```

---

## Phase 4: Backend - Read State Module

### Task 12: Create Read State DTOs and Service

**Files:**
- Create: `services/discussion-service/src/read-state/dto/update-read-state.dto.ts`
- Create: `services/discussion-service/src/read-state/dto/read-state.dto.ts`
- Create: `services/discussion-service/src/read-state/dto/index.ts`
- Create: `services/discussion-service/src/read-state/read-state.service.ts`

**Step 1: Create DTOs**

update-read-state.dto.ts:
```typescript
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateReadStateDto {
  @IsOptional()
  @IsUUID()
  lastResponseId?: string;
}
```

read-state.dto.ts:
```typescript
export class ReadStateDto {
  userId: string;
  topicId: string;
  lastReadAt: Date;
  lastResponseId: string | null;
}
```

index.ts:
```typescript
export * from './update-read-state.dto';
export * from './read-state.dto';
```

**Step 2: Create read-state.service.ts**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateReadStateDto, ReadStateDto } from './dto';

@Injectable()
export class ReadStateService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async updateReadState(
    userId: string,
    topicId: string,
    dto: UpdateReadStateDto,
  ): Promise<ReadStateDto> {
    const readState = await this.prisma.userTopicReadState.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
      create: {
        userId,
        topicId,
        lastReadAt: new Date(),
        lastResponseId: dto.lastResponseId || null,
      },
      update: {
        lastReadAt: new Date(),
        lastResponseId: dto.lastResponseId || null,
      },
    });

    return {
      userId: readState.userId,
      topicId: readState.topicId,
      lastReadAt: readState.lastReadAt,
      lastResponseId: readState.lastResponseId,
    };
  }

  async getReadState(userId: string, topicId: string): Promise<ReadStateDto | null> {
    const readState = await this.prisma.userTopicReadState.findUnique({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
    });

    if (!readState) {
      return null;
    }

    return {
      userId: readState.userId,
      topicId: readState.topicId,
      lastReadAt: readState.lastReadAt,
      lastResponseId: readState.lastResponseId,
    };
  }
}
```

**Step 3: Commit**

```bash
git add services/discussion-service/src/read-state/
git commit -m "feat(read-state): add read state DTOs and service"
```

---

### Task 13: Create Read State Controller and Module

**Files:**
- Create: `services/discussion-service/src/read-state/read-state.controller.ts`
- Create: `services/discussion-service/src/read-state/read-state.module.ts`
- Modify: `services/discussion-service/src/app.module.ts`

**Step 1: Create read-state.controller.ts**

```typescript
import { Controller, Get, Put, Param, Body, Headers } from '@nestjs/common';
import { ReadStateService } from './read-state.service';
import { UpdateReadStateDto, ReadStateDto } from './dto';

@Controller('topics')
export class ReadStateController {
  constructor(private readonly readStateService: ReadStateService) {}

  @Put(':topicId/read-state')
  async updateReadState(
    @Param('topicId') topicId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateReadStateDto,
  ): Promise<ReadStateDto> {
    return this.readStateService.updateReadState(userId, topicId, dto);
  }

  @Get(':topicId/read-state')
  async getReadState(
    @Param('topicId') topicId: string,
    @Headers('x-user-id') userId: string,
  ): Promise<ReadStateDto | null> {
    return this.readStateService.getReadState(userId, topicId);
  }
}
```

**Step 2: Create read-state.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ReadStateController } from './read-state.controller';
import { ReadStateService } from './read-state.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReadStateController],
  providers: [ReadStateService],
  exports: [ReadStateService],
})
export class ReadStateModule {}
```

**Step 3: Import in app.module.ts**

```typescript
import { ReadStateModule } from './read-state/read-state.module';
```

**Step 4: Commit**

```bash
git add services/discussion-service/src/
git commit -m "feat(read-state): add read state controller and module"
```

---

## Phase 5: Backend - User Search for Mentions

### Task 14: Add User Search Endpoint

**Files:**
- Modify: `services/user-service/src/users/users.controller.ts`
- Modify: `services/user-service/src/users/users.service.ts`

**Step 1: Add search method to users.service.ts**

```typescript
async searchUsers(
  query: string,
  topicId?: string,
  limit = 10,
): Promise<{ id: string; displayName: string }[]> {
  // First, get topic participants if topicId provided
  let participantIds: string[] = [];
  if (topicId) {
    const participants = await this.prisma.response.findMany({
      where: { topicId },
      select: { authorId: true },
      distinct: ['authorId'],
    });
    participantIds = participants.map((p) => p.authorId);
  }

  // Search users matching query
  const users = await this.prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        { accountStatus: 'ACTIVE' },
      ],
    },
    select: { id: true, displayName: true },
    take: limit * 2, // Get extra to sort
    orderBy: { displayName: 'asc' },
  });

  // Sort: participants first, then others
  const participantSet = new Set(participantIds);
  const sorted = users.sort((a, b) => {
    const aIsParticipant = participantSet.has(a.id);
    const bIsParticipant = participantSet.has(b.id);
    if (aIsParticipant && !bIsParticipant) return -1;
    if (!aIsParticipant && bIsParticipant) return 1;
    return 0;
  });

  return sorted.slice(0, limit).map((u) => ({
    id: u.id,
    displayName: u.displayName || 'Anonymous',
  }));
}
```

**Step 2: Add endpoint to users.controller.ts**

```typescript
@Get('search')
async searchUsers(
  @Query('q') query: string,
  @Query('topicId') topicId?: string,
  @Query('limit') limit?: number,
): Promise<{ id: string; displayName: string }[]> {
  return this.usersService.searchUsers(query, topicId, limit);
}
```

**Step 3: Commit**

```bash
git add services/user-service/src/users/
git commit -m "feat(users): add user search endpoint for @mentions"
```

---

## Phase 6: WebSocket Message Types

### Task 15: Add WebSocket Message Types

**Files:**
- Modify: `packages/event-schemas/src/websocket.ts` (or create if doesn't exist)
- Modify: `services/discussion-service/src/websocket/websocket.gateway.ts`

**Step 1: Add new message types to event schemas**

```typescript
export type WebSocketMessageType =
  | 'NEW_RESPONSE'
  | 'RESPONSE_UPDATED'
  | 'RESPONSE_DELETED'
  | 'TOPIC_STATUS_CHANGE'
  | 'COMMON_GROUND_UPDATE'
  | 'USER_TYPING'
  | 'REACTION_ADDED'
  | 'REACTION_REMOVED';

export interface UserTypingMessage {
  type: 'USER_TYPING';
  payload: {
    topicId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  };
}

export interface ReactionAddedMessage {
  type: 'REACTION_ADDED';
  payload: {
    responseId: string;
    userId: string;
    userName: string;
    emoji: string;
  };
}

export interface ReactionRemovedMessage {
  type: 'REACTION_REMOVED';
  payload: {
    responseId: string;
    userId: string;
    emoji: string;
  };
}
```

**Step 2: Add handlers to websocket.gateway.ts**

```typescript
@SubscribeMessage('USER_TYPING')
handleTyping(
  @MessageBody() data: { topicId: string; isTyping: boolean },
  @ConnectedSocket() client: Socket,
): void {
  const userId = client.data.userId;
  const userName = client.data.userName;

  // Broadcast to topic room except sender
  client.to(`topic:${data.topicId}`).emit('USER_TYPING', {
    type: 'USER_TYPING',
    payload: {
      topicId: data.topicId,
      userId,
      userName,
      isTyping: data.isTyping,
    },
  });
}

broadcastReactionAdded(responseId: string, userId: string, userName: string, emoji: string, topicId: string): void {
  this.server.to(`topic:${topicId}`).emit('REACTION_ADDED', {
    type: 'REACTION_ADDED',
    payload: { responseId, userId, userName, emoji },
  });
}

broadcastReactionRemoved(responseId: string, userId: string, emoji: string, topicId: string): void {
  this.server.to(`topic:${topicId}`).emit('REACTION_REMOVED', {
    type: 'REACTION_REMOVED',
    payload: { responseId, userId, emoji },
  });
}
```

**Step 3: Commit**

```bash
git add packages/event-schemas/ services/discussion-service/src/websocket/
git commit -m "feat(websocket): add typing indicators and reaction message types"
```

---

## Phase 7: Frontend - Share Button

### Task 16: Create ShareButton Component

**Files:**
- Create: `frontend/src/components/responses/ShareButton.tsx`
- Create: `frontend/src/components/responses/ShareButton.spec.tsx`

**Step 1: Create ShareButton.tsx**

```typescript
/**
 * Share button for responses
 * - Desktop: Copy URL to clipboard, show toast
 * - Mobile: Use Web Share API if available, fallback to clipboard
 */

import { useCallback } from 'react';
import Button from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface ShareButtonProps {
  topicId: string;
  responseId: string;
  className?: string;
}

export function ShareButton({ topicId, responseId, className }: ShareButtonProps) {
  const toast = useToast();

  const getShareUrl = useCallback(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/topics/${topicId}#response-${responseId}`;
  }, [topicId, responseId]);

  const handleShare = useCallback(async () => {
    const url = getShareUrl();

    // Try Web Share API on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'Check out this response',
          url,
        });
        return;
      } catch (err) {
        // User cancelled or API failed, fallback to clipboard
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getShareUrl, toast]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className={className}
      aria-label="Share response"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    </Button>
  );
}
```

**Step 2: Create ShareButton.spec.tsx**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from './ShareButton';
import { ToastProvider } from '../../contexts/ToastContext';

const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('ShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders share button', () => {
    render(
      <ToastProvider>
        <ShareButton topicId="topic-1" responseId="response-1" />
      </ToastProvider>
    );

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('copies URL to clipboard on click', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);

    render(
      <ToastProvider>
        <ShareButton topicId="topic-1" responseId="response-1" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/topics/topic-1#response-response-1')
      );
    });
  });
});
```

**Step 3: Run tests**

Run: `cd frontend && pnpm test -- --testPathPattern=ShareButton.spec.tsx --passWithNoTests`

**Step 4: Commit**

```bash
git add frontend/src/components/responses/ShareButton*
git commit -m "feat(frontend): add ShareButton component"
```

---

## Phase 8: Frontend - Typing Indicator

### Task 17: Create useTypingIndicator Hook

**Files:**
- Create: `frontend/src/hooks/useTypingIndicator.ts`
- Create: `frontend/src/hooks/useTypingIndicator.spec.ts`

**Step 1: Create useTypingIndicator.ts**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface TypingUser {
  userId: string;
  userName: string;
  lastTypingAt: number;
}

interface UseTypingIndicatorOptions {
  topicId: string;
  debounceMs?: number;
  clearAfterMs?: number;
}

export function useTypingIndicator({
  topicId,
  debounceMs = 300,
  clearAfterMs = 3000,
}: UseTypingIndicatorOptions) {
  const { isConnected, subscribe, send } = useWebSocket({ autoConnect: true });
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);

  // Clear stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((current) => {
        const updated = new Map(current);
        let changed = false;
        for (const [userId, user] of updated) {
          if (now - user.lastTypingAt > clearAfterMs) {
            updated.delete(userId);
            changed = true;
          }
        }
        return changed ? updated : current;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [clearAfterMs]);

  // Subscribe to typing events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('USER_TYPING', (message) => {
      if (message.payload.topicId !== topicId) return;

      const { userId, userName, isTyping } = message.payload;

      setTypingUsers((current) => {
        const updated = new Map(current);
        if (isTyping) {
          updated.set(userId, { userId, userName, lastTypingAt: Date.now() });
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    return unsubscribe;
  }, [isConnected, subscribe, topicId]);

  // Send typing indicator (debounced)
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!isConnected) return;

      const now = Date.now();
      if (isTyping && now - lastSentRef.current < debounceMs) {
        // Clear existing timeout and set new one
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          send('USER_TYPING', { topicId, isTyping: true });
          lastSentRef.current = Date.now();
        }, debounceMs);
        return;
      }

      send('USER_TYPING', { topicId, isTyping });
      lastSentRef.current = now;
    },
    [isConnected, send, topicId, debounceMs],
  );

  // Format typing message
  const typingMessage = useCallback(() => {
    const users = Array.from(typingUsers.values());
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0].userName} is typing...`;
    if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing...`;
    return 'Several people are typing...';
  }, [typingUsers]);

  return {
    typingUsers: Array.from(typingUsers.values()),
    typingMessage: typingMessage(),
    sendTyping,
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useTypingIndicator.ts
git commit -m "feat(frontend): add useTypingIndicator hook"
```

---

### Task 18: Create TypingIndicator Component

**Files:**
- Create: `frontend/src/components/responses/TypingIndicator.tsx`

**Step 1: Create TypingIndicator.tsx**

```typescript
/**
 * Displays typing indicator with animated dots
 * Shows who is typing in a topic
 */

import { useTypingIndicator } from '../../hooks/useTypingIndicator';

interface TypingIndicatorProps {
  topicId: string;
}

export function TypingIndicator({ topicId }: TypingIndicatorProps) {
  const { typingMessage } = useTypingIndicator({ topicId });

  if (!typingMessage) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex space-x-1" aria-label="typing indicator">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{typingMessage}</span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/responses/TypingIndicator.tsx
git commit -m "feat(frontend): add TypingIndicator component"
```

---

## Phase 9: Frontend - New Messages Divider

### Task 19: Create useReadState Hook

**Files:**
- Create: `frontend/src/hooks/useReadState.ts`
- Create: `frontend/src/services/readStateService.ts`

**Step 1: Create readStateService.ts**

```typescript
import { apiClient } from '../lib/api';

export interface ReadState {
  userId: string;
  topicId: string;
  lastReadAt: string;
  lastResponseId: string | null;
}

class ReadStateService {
  async getReadState(topicId: string): Promise<ReadState | null> {
    try {
      return await apiClient.get<ReadState>(`/topics/${topicId}/read-state`);
    } catch {
      return null;
    }
  }

  async updateReadState(topicId: string, lastResponseId?: string): Promise<ReadState> {
    return apiClient.put<ReadState>(`/topics/${topicId}/read-state`, {
      lastResponseId,
    });
  }
}

export const readStateService = new ReadStateService();
```

**Step 2: Create useReadState.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { readStateService, ReadState } from '../services/readStateService';

export function useReadState(topicId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['readState', topicId],
    queryFn: () => readStateService.getReadState(topicId),
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: (lastResponseId?: string) =>
      readStateService.updateReadState(topicId, lastResponseId),
    onSuccess: (data) => {
      queryClient.setQueryData(['readState', topicId], data);
    },
  });

  return {
    readState: query.data,
    isLoading: query.isLoading,
    updateReadState: mutation.mutate,
  };
}
```

**Step 3: Commit**

```bash
git add frontend/src/services/readStateService.ts frontend/src/hooks/useReadState.ts
git commit -m "feat(frontend): add read state service and hook"
```

---

### Task 20: Create NewMessagesDivider Component

**Files:**
- Create: `frontend/src/components/responses/NewMessagesDivider.tsx`

**Step 1: Create NewMessagesDivider.tsx**

```typescript
/**
 * Visual divider showing "New Messages" separator
 * Inserted after last-read response in response list
 */

interface NewMessagesDividerProps {
  className?: string;
}

export function NewMessagesDivider({ className }: NewMessagesDividerProps) {
  return (
    <div
      className={`flex items-center gap-3 my-4 ${className || ''}`}
      role="separator"
      aria-label="New messages below"
    >
      <div className="flex-1 h-px bg-red-400 dark:bg-red-500" />
      <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">
        New Messages
      </span>
      <div className="flex-1 h-px bg-red-400 dark:bg-red-500" />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/responses/NewMessagesDivider.tsx
git commit -m "feat(frontend): add NewMessagesDivider component"
```

---

## Phase 10: Frontend - Bookmarks

### Task 21: Create Bookmark Service and Hook

**Files:**
- Create: `frontend/src/services/bookmarkService.ts`
- Create: `frontend/src/hooks/useBookmarks.ts`

**Step 1: Create bookmarkService.ts**

```typescript
import { apiClient } from '../lib/api';

export interface Bookmark {
  id: string;
  userId: string;
  responseId: string;
  createdAt: string;
  response?: {
    id: string;
    content: string;
    topicId: string;
    topicTitle: string;
    authorDisplayName: string;
    createdAt: string;
  };
}

export interface BookmarkList {
  bookmarks: Bookmark[];
  total: number;
  limit: number;
  offset: number;
}

class BookmarkService {
  async addBookmark(responseId: string): Promise<Bookmark> {
    return apiClient.post<Bookmark>('/bookmarks', { responseId });
  }

  async removeBookmark(responseId: string): Promise<void> {
    return apiClient.delete(`/bookmarks/${responseId}`);
  }

  async getBookmarks(limit = 20, offset = 0): Promise<BookmarkList> {
    return apiClient.get<BookmarkList>('/bookmarks', {
      params: { limit, offset },
    });
  }

  async getBookmarkStatus(responseId: string): Promise<{ isBookmarked: boolean }> {
    return apiClient.get<{ isBookmarked: boolean }>(`/bookmarks/${responseId}/status`);
  }
}

export const bookmarkService = new BookmarkService();
```

**Step 2: Create useBookmarks.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookmarkService, Bookmark, BookmarkList } from '../services/bookmarkService';

export function useBookmarks(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['bookmarks', limit, offset],
    queryFn: () => bookmarkService.getBookmarks(limit, offset),
  });
}

export function useBookmarkStatus(responseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bookmarkStatus', responseId],
    queryFn: () => bookmarkService.getBookmarkStatus(responseId),
  });

  const addMutation = useMutation({
    mutationFn: () => bookmarkService.addBookmark(responseId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['bookmarkStatus', responseId] });
      const previous = queryClient.getQueryData(['bookmarkStatus', responseId]);
      queryClient.setQueryData(['bookmarkStatus', responseId], { isBookmarked: true });
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['bookmarkStatus', responseId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => bookmarkService.removeBookmark(responseId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['bookmarkStatus', responseId] });
      const previous = queryClient.getQueryData(['bookmarkStatus', responseId]);
      queryClient.setQueryData(['bookmarkStatus', responseId], { isBookmarked: false });
      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['bookmarkStatus', responseId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  return {
    isBookmarked: query.data?.isBookmarked ?? false,
    isLoading: query.isLoading,
    toggle: () => {
      if (query.data?.isBookmarked) {
        removeMutation.mutate();
      } else {
        addMutation.mutate();
      }
    },
  };
}
```

**Step 3: Commit**

```bash
git add frontend/src/services/bookmarkService.ts frontend/src/hooks/useBookmarks.ts
git commit -m "feat(frontend): add bookmark service and hooks"
```

---

### Task 22: Create BookmarkButton Component

**Files:**
- Create: `frontend/src/components/responses/BookmarkButton.tsx`

**Step 1: Create BookmarkButton.tsx**

```typescript
/**
 * Toggle bookmark button with optimistic updates
 * Filled icon = bookmarked, outline = not
 */

import Button from '../ui/Button';
import { useBookmarkStatus } from '../../hooks/useBookmarks';

interface BookmarkButtonProps {
  responseId: string;
  className?: string;
}

export function BookmarkButton({ responseId, className }: BookmarkButtonProps) {
  const { isBookmarked, isLoading, toggle } = useBookmarkStatus(responseId);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={isLoading}
      className={className}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-pressed={isBookmarked}
    >
      {isBookmarked ? (
        <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      )}
    </Button>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/responses/BookmarkButton.tsx
git commit -m "feat(frontend): add BookmarkButton component"
```

---

## Phase 11: Frontend - Emoji Reactions

### Task 23: Create Reaction Service and Hook

**Files:**
- Create: `frontend/src/services/reactionService.ts`
- Create: `frontend/src/hooks/useReactions.ts`

**Step 1: Create reactionService.ts**

```typescript
import { apiClient } from '../lib/api';

export interface ReactionSummary {
  emoji: string;
  count: number;
  users: { id: string; displayName: string }[];
  userReacted: boolean;
}

export interface ReactionList {
  reactions: ReactionSummary[];
  totalCount: number;
}

class ReactionService {
  async addReaction(responseId: string, emoji: string): Promise<void> {
    await apiClient.post(`/responses/${responseId}/reactions`, { emoji });
  }

  async removeReaction(responseId: string, emoji: string): Promise<void> {
    await apiClient.delete(`/responses/${responseId}/reactions/${encodeURIComponent(emoji)}`);
  }

  async getReactions(responseId: string): Promise<ReactionList> {
    return apiClient.get<ReactionList>(`/responses/${responseId}/reactions`);
  }
}

export const reactionService = new ReactionService();
```

**Step 2: Create useReactions.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { reactionService, ReactionList, ReactionSummary } from '../services/reactionService';
import { useWebSocket } from './useWebSocket';

export function useReactions(responseId: string, topicId: string) {
  const queryClient = useQueryClient();
  const { subscribe, isConnected } = useWebSocket({ autoConnect: true });

  const query = useQuery({
    queryKey: ['reactions', responseId],
    queryFn: () => reactionService.getReactions(responseId),
    staleTime: 30000,
  });

  // Subscribe to real-time reaction updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeAdd = subscribe('REACTION_ADDED', (message) => {
      if (message.payload.responseId !== responseId) return;
      queryClient.invalidateQueries({ queryKey: ['reactions', responseId] });
    });

    const unsubscribeRemove = subscribe('REACTION_REMOVED', (message) => {
      if (message.payload.responseId !== responseId) return;
      queryClient.invalidateQueries({ queryKey: ['reactions', responseId] });
    });

    return () => {
      unsubscribeAdd();
      unsubscribeRemove();
    };
  }, [isConnected, subscribe, responseId, queryClient]);

  const addMutation = useMutation({
    mutationFn: (emoji: string) => reactionService.addReaction(responseId, emoji),
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey: ['reactions', responseId] });
      const previous = queryClient.getQueryData<ReactionList>(['reactions', responseId]);

      // Optimistic update
      if (previous) {
        const updated = { ...previous };
        const existing = updated.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          existing.count += 1;
          existing.userReacted = true;
        } else {
          updated.reactions.push({
            emoji,
            count: 1,
            users: [],
            userReacted: true,
          });
        }
        queryClient.setQueryData(['reactions', responseId], updated);
      }

      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['reactions', responseId], context?.previous);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (emoji: string) => reactionService.removeReaction(responseId, emoji),
    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey: ['reactions', responseId] });
      const previous = queryClient.getQueryData<ReactionList>(['reactions', responseId]);

      if (previous) {
        const updated = { ...previous };
        const existing = updated.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          existing.count -= 1;
          existing.userReacted = false;
          if (existing.count <= 0) {
            updated.reactions = updated.reactions.filter((r) => r.emoji !== emoji);
          }
        }
        queryClient.setQueryData(['reactions', responseId], updated);
      }

      return { previous };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['reactions', responseId], context?.previous);
    },
  });

  const toggleReaction = (emoji: string) => {
    const reaction = query.data?.reactions.find((r) => r.emoji === emoji);
    if (reaction?.userReacted) {
      removeMutation.mutate(emoji);
    } else {
      addMutation.mutate(emoji);
    }
  };

  return {
    reactions: query.data?.reactions ?? [],
    isLoading: query.isLoading,
    toggleReaction,
    addReaction: addMutation.mutate,
  };
}
```

**Step 3: Commit**

```bash
git add frontend/src/services/reactionService.ts frontend/src/hooks/useReactions.ts
git commit -m "feat(frontend): add reaction service and hook with WebSocket"
```

---

### Task 24: Create ReactionBar and EmojiPicker Components

**Files:**
- Create: `frontend/src/components/responses/ReactionBar.tsx`
- Create: `frontend/src/components/responses/EmojiPicker.tsx`

**Step 1: Create EmojiPicker.tsx**

```typescript
/**
 * Quick emoji picker with common reactions
 * Expandable for full emoji selection
 */

import { useState } from 'react';
import Button from '../ui/Button';

const QUICK_REACTIONS = ['👍', '❤️', '🎉', '🤔', '👀', '🙌'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className || ''}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Add reaction"
        aria-expanded={isOpen}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </Button>

      {isOpen && (
        <div
          className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex gap-1 z-10"
          role="listbox"
          aria-label="Select emoji"
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg transition-colors"
              role="option"
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create ReactionBar.tsx**

```typescript
/**
 * Displays reactions with counts
 * Click reaction to toggle own
 */

import { useReactions } from '../../hooks/useReactions';
import { EmojiPicker } from './EmojiPicker';

interface ReactionBarProps {
  responseId: string;
  topicId: string;
  className?: string;
}

export function ReactionBar({ responseId, topicId, className }: ReactionBarProps) {
  const { reactions, toggleReaction, addReaction } = useReactions(responseId, topicId);

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className || ''}`}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => toggleReaction(reaction.emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm
            transition-colors
            ${
              reaction.userReacted
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent hover:border-gray-300 dark:hover:border-gray-500'
            }
          `}
          aria-label={`${reaction.emoji} ${reaction.count} ${reaction.userReacted ? '(you reacted)' : ''}`}
          aria-pressed={reaction.userReacted}
        >
          <span>{reaction.emoji}</span>
          <span className="text-xs font-medium">{reaction.count}</span>
        </button>
      ))}
      <EmojiPicker onSelect={addReaction} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/responses/ReactionBar.tsx frontend/src/components/responses/EmojiPicker.tsx
git commit -m "feat(frontend): add ReactionBar and EmojiPicker components"
```

---

## Phase 12: Frontend - @Mentions

### Task 25: Create useMentions Hook

**Files:**
- Create: `frontend/src/hooks/useMentions.ts`

**Step 1: Create useMentions.ts**

```typescript
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useDebounce } from './useDebounce';

interface MentionUser {
  id: string;
  displayName: string;
}

async function searchUsers(query: string, topicId?: string): Promise<MentionUser[]> {
  if (!query || query.length < 1) return [];
  return apiClient.get<MentionUser[]>('/users/search', {
    params: { q: query, topicId, limit: 10 },
  });
}

export function useMentions(topicId?: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const debouncedQuery = useDebounce(searchQuery, 150);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['mentionSearch', debouncedQuery, topicId],
    queryFn: () => searchUsers(debouncedQuery, topicId),
    enabled: debouncedQuery.length >= 1,
    staleTime: 10000,
  });

  const handleInput = useCallback((text: string, cursorPosition: number) => {
    // Find @ symbol before cursor
    const beforeCursor = text.slice(0, cursorPosition);
    const atMatch = beforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setSearchQuery(atMatch[1]);
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
      setSearchQuery('');
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || users.length === 0) return false;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % users.length);
          return true;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + users.length) % users.length);
          return true;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          return users[selectedIndex];
        case 'Escape':
          setIsOpen(false);
          return true;
        default:
          return false;
      }
    },
    [isOpen, users, selectedIndex],
  );

  const selectUser = useCallback((user: MentionUser) => {
    setIsOpen(false);
    setSearchQuery('');
    return user;
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  return {
    users,
    isLoading,
    isOpen,
    selectedIndex,
    searchQuery,
    handleInput,
    handleKeyDown,
    selectUser,
    close,
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useMentions.ts
git commit -m "feat(frontend): add useMentions hook for @mention autocomplete"
```

---

### Task 26: Create MentionInput and MentionDropdown Components

**Files:**
- Create: `frontend/src/components/responses/MentionInput.tsx`
- Create: `frontend/src/components/responses/MentionDropdown.tsx`

**Step 1: Create MentionDropdown.tsx**

```typescript
/**
 * Dropdown showing matching users for @mention
 */

interface MentionUser {
  id: string;
  displayName: string;
}

interface MentionDropdownProps {
  users: MentionUser[];
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
  isLoading?: boolean;
}

export function MentionDropdown({
  users,
  selectedIndex,
  onSelect,
  isLoading,
}: MentionDropdownProps) {
  if (users.length === 0 && !isLoading) {
    return (
      <div className="absolute bottom-full mb-1 left-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-500 dark:text-gray-400">
        No users found
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-full mb-1 left-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20"
      role="listbox"
      aria-label="User suggestions"
    >
      {isLoading ? (
        <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        users.map((user, index) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className={`
              w-full px-3 py-2 text-left text-sm flex items-center gap-2
              ${
                index === selectedIndex
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            role="option"
            aria-selected={index === selectedIndex}
          >
            <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium">{user.displayName}</span>
          </button>
        ))
      )}
    </div>
  );
}
```

**Step 2: Create MentionInput.tsx**

```typescript
/**
 * Textarea with @mention detection and autocomplete
 * Wraps standard textarea with mention handling
 */

import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useMentions } from '../../hooks/useMentions';
import { MentionDropdown } from './MentionDropdown';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  topicId?: string;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export interface MentionInputHandle {
  focus: () => void;
}

export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  ({ value, onChange, onKeyDown, topicId, placeholder, className, rows = 3 }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const {
      users,
      isLoading,
      isOpen,
      selectedIndex,
      handleInput,
      handleKeyDown: handleMentionKeyDown,
      selectUser,
    } = useMentions(topicId);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPosition = e.target.selectionStart;
        onChange(newValue);
        handleInput(newValue, cursorPosition);
      },
      [onChange, handleInput],
    );

    const insertMention = useCallback(
      (user: { id: string; displayName: string }) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPosition = textarea.selectionStart;
        const beforeCursor = value.slice(0, cursorPosition);
        const afterCursor = value.slice(cursorPosition);

        // Replace @query with @[displayName](userId)
        const atIndex = beforeCursor.lastIndexOf('@');
        const newValue =
          beforeCursor.slice(0, atIndex) +
          `@[${user.displayName}](${user.id}) ` +
          afterCursor;

        onChange(newValue);

        // Set cursor position after mention
        const newPosition = atIndex + `@[${user.displayName}](${user.id}) `.length;
        setTimeout(() => {
          textarea.setSelectionRange(newPosition, newPosition);
          textarea.focus();
        }, 0);
      },
      [value, onChange],
    );

    const handleKeyDownInternal = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const result = handleMentionKeyDown(e);
        if (result && typeof result === 'object') {
          // User selected
          e.preventDefault();
          insertMention(result);
          return;
        }
        if (result === true) {
          // Key handled by mention system
          return;
        }
        // Pass through to parent
        onKeyDown?.(e);
      },
      [handleMentionKeyDown, insertMention, onKeyDown],
    );

    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          rows={rows}
          className={`
            w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            resize-none
            ${className || ''}
          `}
        />
        {isOpen && (
          <MentionDropdown
            users={users}
            selectedIndex={selectedIndex}
            onSelect={(user) => {
              insertMention(user);
              selectUser(user);
            }}
            isLoading={isLoading}
          />
        )}
      </div>
    );
  },
);

MentionInput.displayName = 'MentionInput';
```

**Step 3: Commit**

```bash
git add frontend/src/components/responses/MentionInput.tsx frontend/src/components/responses/MentionDropdown.tsx
git commit -m "feat(frontend): add MentionInput and MentionDropdown components"
```

---

## Phase 13: Integration

### Task 27: Update ResponseItem with Action Bar

**Files:**
- Modify: `frontend/src/components/responses/ResponseItem.tsx`

**Step 1: Add imports for new components**

```typescript
import { ShareButton } from './ShareButton';
import { BookmarkButton } from './BookmarkButton';
import { ReactionBar } from './ReactionBar';
```

**Step 2: Add action bar in render**

After the response content, add:

```typescript
{/* Action bar */}
<div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
  <ReactionBar responseId={response.id} topicId={response.topicId} />
  <div className="flex-1" />
  <ShareButton topicId={response.topicId} responseId={response.id} />
  <BookmarkButton responseId={response.id} />
  {onReply && (
    <Button variant="ghost" size="sm" onClick={() => onReply(response.id)}>
      Reply
    </Button>
  )}
</div>
```

**Step 3: Commit**

```bash
git add frontend/src/components/responses/ResponseItem.tsx
git commit -m "feat(frontend): add action bar with reactions, share, bookmark to ResponseItem"
```

---

### Task 28: Update ResponseList with Divider and Typing Indicator

**Files:**
- Modify: `frontend/src/components/responses/ResponseList.tsx`

**Step 1: Add imports**

```typescript
import { NewMessagesDivider } from './NewMessagesDivider';
import { TypingIndicator } from './TypingIndicator';
import { useReadState } from '../../hooks/useReadState';
```

**Step 2: Add read state tracking**

In the component, add:

```typescript
const { readState } = useReadState(topicId);

// Find position for new messages divider
const dividerPosition = useMemo(() => {
  if (!readState?.lastResponseId || !responses) return -1;
  return responses.findIndex((r) => r.id === readState.lastResponseId);
}, [readState, responses]);
```

**Step 3: Insert divider in render**

In the row rendering, check if divider should be shown:

```typescript
{index === dividerPosition + 1 && <NewMessagesDivider />}
```

**Step 4: Add TypingIndicator below list**

```typescript
<TypingIndicator topicId={topicId} />
```

**Step 5: Commit**

```bash
git add frontend/src/components/responses/ResponseList.tsx
git commit -m "feat(frontend): add NewMessagesDivider and TypingIndicator to ResponseList"
```

---

### Task 29: Update LightweightReplyComposer with MentionInput

**Files:**
- Modify: `frontend/src/components/responses/LightweightReplyComposer.tsx`

**Step 1: Replace textarea with MentionInput**

Replace the existing textarea with:

```typescript
import { MentionInput } from './MentionInput';

// In render:
<MentionInput
  value={content}
  onChange={setContent}
  topicId={topicId}
  placeholder="Write a reply... (Use @ to mention someone)"
  rows={2}
/>
```

**Step 2: Add sendTyping calls**

```typescript
import { useTypingIndicator } from '../../hooks/useTypingIndicator';

const { sendTyping } = useTypingIndicator({ topicId });

// On content change:
useEffect(() => {
  if (content.length > 0) {
    sendTyping(true);
  }
}, [content, sendTyping]);

// On submit or blur:
sendTyping(false);
```

**Step 3: Commit**

```bash
git add frontend/src/components/responses/LightweightReplyComposer.tsx
git commit -m "feat(frontend): integrate MentionInput and typing indicators in composer"
```

---

## Phase 14: Bookmarks Page

### Task 30: Create BookmarksPage

**Files:**
- Create: `frontend/src/pages/Bookmarks/BookmarksPage.tsx`
- Modify: `frontend/src/routes/index.tsx`

**Step 1: Create BookmarksPage.tsx**

```typescript
/**
 * Page displaying user's bookmarked responses
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBookmarks } from '../../hooks/useBookmarks';
import Card from '../../components/ui/Card';
import { BookmarkButton } from '../../components/responses/BookmarkButton';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export function BookmarksPage() {
  const [page, setPage] = useState(0);
  const limit = 20;
  const { data, isLoading } = useBookmarks(limit, page * limit);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data || data.bookmarks.length === 0) {
    return (
      <EmptyState
        title="No bookmarks yet"
        description="Save responses to find them later"
        icon={
          <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Bookmarks
      </h1>

      <div className="space-y-4">
        {data.bookmarks.map((bookmark) => (
          <Card key={bookmark.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/topics/${bookmark.response?.topicId}#response-${bookmark.responseId}`}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {bookmark.response?.topicTitle}
                </Link>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {bookmark.response?.content}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  by {bookmark.response?.authorDisplayName} •{' '}
                  {new Date(bookmark.response?.createdAt || '').toLocaleDateString()}
                </p>
              </div>
              <BookmarkButton responseId={bookmark.responseId} />
            </div>
          </Card>
        ))}
      </div>

      {data.total > limit && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
            Page {page + 1} of {Math.ceil(data.total / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= data.total}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add route in routes/index.tsx**

```typescript
import { BookmarksPage } from '../pages/Bookmarks/BookmarksPage';

// Add to routes array:
{
  path: '/bookmarks',
  element: <BookmarksPage />,
}
```

**Step 3: Commit**

```bash
git add frontend/src/pages/Bookmarks/ frontend/src/routes/
git commit -m "feat(frontend): add BookmarksPage with pagination"
```

---

## Phase 15: API Gateway Pact Updates

### Task 31: Update API Gateway Pacts

**Files:**
- Modify: `services/pacts/api-gateway-discussion-service.json`
- Modify: `services/pacts/api-gateway-user-service.json`

**Step 1: Add reaction endpoints to discussion-service pact**

Add interactions for:
- POST /responses/:responseId/reactions
- DELETE /responses/:responseId/reactions/:emoji
- GET /responses/:responseId/reactions

**Step 2: Add bookmark endpoints to discussion-service pact**

Add interactions for:
- POST /bookmarks
- DELETE /bookmarks/:responseId
- GET /bookmarks
- GET /bookmarks/:responseId/status

**Step 3: Add user search endpoint to user-service pact**

Add interaction for:
- GET /users/search?q=&topicId=&limit=

**Step 4: Commit**

```bash
git add services/pacts/
git commit -m "feat(pacts): add contract tests for reactions, bookmarks, user search"
```

---

## Phase 16: Final Integration Tests

### Task 32: Run Full Test Suite

**Step 1: Run unit tests**

Run: `pnpm test:unit`

Expected: All tests pass

**Step 2: Run integration tests**

Run: `pnpm test:integration`

Expected: All tests pass

**Step 3: Run E2E tests**

Run: `pnpm test:e2e`

Expected: All tests pass

**Step 4: Fix any failures**

Address any test failures before proceeding.

---

### Task 33: Create Final Commit and PR

**Step 1: Run git status**

Run: `git status`

**Step 2: Stage all remaining files**

Run: `git add .`

**Step 3: Create final commit**

```bash
git commit -m "feat: implement UI engagement features (#956-#961)

- Add emoji reactions with real-time WebSocket updates
- Add typing indicators with debounced broadcasting
- Add new messages divider based on read state
- Add bookmarks with dedicated page
- Add share button with Web Share API support
- Add @mentions with autocomplete

Closes #956, #957, #958, #959, #960, #961

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

**Step 4: Push branch and create PR**

```bash
git push -u origin feat/ui-engagement-features
gh pr create --title "feat: UI Engagement Features - Reactions, Typing, Bookmarks, Mentions, Share, Divider" --body "$(cat <<'EOF'
## Summary
Implements 6 P0 UI engagement features from the UI audit:

- **Emoji Reactions**: 👍 ❤️ 🎉 🤔 👀 🙌 with real-time updates
- **Typing Indicators**: "Alice is typing..." with auto-clear
- **New Messages Divider**: Visual separator for unread content
- **Bookmarks**: Save responses with dedicated /bookmarks page
- **Share Button**: Copy link / Web Share API
- **@Mentions**: Autocomplete with topic participants prioritized

## Database Changes
- Added `response_reactions` table
- Added `bookmarks` table
- Added `user_topic_read_state` table

## API Endpoints
- POST/DELETE/GET `/responses/:id/reactions`
- POST/DELETE/GET `/bookmarks`
- PUT/GET `/topics/:id/read-state`
- GET `/users/search`

## Test Plan
- [ ] Run `pnpm test:unit` - all pass
- [ ] Run `pnpm test:integration` - all pass
- [ ] Run `pnpm test:e2e` - all pass
- [ ] Manual testing: add/remove reactions
- [ ] Manual testing: typing indicator appears for other users
- [ ] Manual testing: bookmark toggle and page
- [ ] Manual testing: share button copies link
- [ ] Manual testing: @mention autocomplete works

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Verification

```bash
# Run full test suite
pnpm test:unit && pnpm test:integration && pnpm test:e2e

# Check build
pnpm build

# Verify migrations
cd packages/db-models && pnpm prisma migrate status

# Check PR status
gh pr status
```

---

## Success Metrics

After implementation:
- [ ] Platform engagement score improved from 2.0 to 3.5
- [ ] All 6 P0 features functional
- [ ] WebSocket real-time updates working
- [ ] Tests passing at all levels
- [ ] No performance regressions (virtual scrolling still 60fps)
