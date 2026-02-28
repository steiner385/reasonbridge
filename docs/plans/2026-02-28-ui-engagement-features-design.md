# UI Engagement Features Design

**Date:** 2026-02-28
**Status:** Approved
**Author:** Claude Code

## Overview

This design document covers the implementation of 6 P0 UI improvements identified in the UI audit (specs/ui-audit/gap-analysis.md):

1. Share button
2. Typing indicators
3. New Messages divider
4. Bookmarks
5. Emoji reactions
6. @Mentions with autocomplete

These features close critical gaps between reasonBridge and benchmark platforms (Discord, Slack, Reddit), improving the platform score from 2.3/5 to an estimated 3.2/5.

---

## Database Schema

### New Tables

```prisma
model ResponseReaction {
  id          String   @id @default(uuid())
  responseId  String   @map("response_id")
  userId      String   @map("user_id")
  emoji       String   @db.VarChar(32)
  createdAt   DateTime @default(now()) @map("created_at")

  response    Response @relation(fields: [responseId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([responseId, userId, emoji])
  @@map("response_reactions")
}

model Bookmark {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  responseId  String   @map("response_id")
  createdAt   DateTime @default(now()) @map("created_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  response    Response @relation(fields: [responseId], references: [id], onDelete: Cascade)

  @@unique([userId, responseId])
  @@map("bookmarks")
}

model UserTopicReadState {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  topicId         String   @map("topic_id")
  lastReadAt      DateTime @map("last_read_at")
  lastResponseId  String?  @map("last_response_id")

  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic   DiscussionTopic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@unique([userId, topicId])
  @@map("user_topic_read_state")
}
```

### Schema Updates

Add relations to existing models:

```prisma
model Response {
  // ... existing fields ...
  reactions   ResponseReaction[]
  bookmarks   Bookmark[]
}

model User {
  // ... existing fields ...
  reactions       ResponseReaction[]
  bookmarks       Bookmark[]
  topicReadStates UserTopicReadState[]
}

model DiscussionTopic {
  // ... existing fields ...
  userReadStates  UserTopicReadState[]
}
```

---

## API Endpoints

### Reactions (discussion-service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/responses/:responseId/reactions` | Add reaction |
| DELETE | `/responses/:responseId/reactions/:emoji` | Remove reaction |
| GET | `/responses/:responseId/reactions` | List reactions |

### Bookmarks (discussion-service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookmarks` | Add bookmark |
| DELETE | `/bookmarks/:responseId` | Remove bookmark |
| GET | `/bookmarks` | List user's bookmarks |
| GET | `/bookmarks/:responseId/status` | Check if bookmarked |

### Read State (discussion-service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/topics/:topicId/read-state` | Update read position |
| GET | `/topics/:topicId/read-state` | Get read position |

### User Search (user-service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/search?q=&topicId=&limit=` | Search users for mentions |

---

## WebSocket Messages

### New Message Types

```typescript
type WebSocketMessageType =
  // Existing
  | 'NEW_RESPONSE'
  | 'RESPONSE_UPDATED'
  | 'RESPONSE_DELETED'
  | 'TOPIC_STATUS_CHANGE'
  | 'COMMON_GROUND_UPDATE'
  // New
  | 'USER_TYPING'
  | 'REACTION_ADDED'
  | 'REACTION_REMOVED';
```

### Message Payloads

```typescript
interface UserTypingMessage {
  type: 'USER_TYPING';
  payload: {
    topicId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
  };
}

interface ReactionAddedMessage {
  type: 'REACTION_ADDED';
  payload: {
    responseId: string;
    userId: string;
    userName: string;
    emoji: string;
  };
}

interface ReactionRemovedMessage {
  type: 'REACTION_REMOVED';
  payload: {
    responseId: string;
    userId: string;
    emoji: string;
  };
}
```

---

## Frontend Components

### New Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `ShareButton` | Copy link / Web Share API | `components/responses/` |
| `BookmarkButton` | Toggle bookmark state | `components/responses/` |
| `ReactionBar` | Display reactions with counts | `components/responses/` |
| `EmojiPicker` | Quick emoji selection | `components/responses/` |
| `TypingIndicator` | Show who's typing | `components/responses/` |
| `NewMessagesDivider` | Unread separator | `components/responses/` |
| `MentionInput` | Textarea with @ detection | `components/responses/` |
| `MentionDropdown` | User autocomplete | `components/responses/` |

### New Hooks

| Hook | Purpose |
|------|---------|
| `useReactions` | Manage reaction state and mutations |
| `useBookmarks` | Manage bookmark state |
| `useTypingIndicator` | Send/receive typing events |
| `useReadState` | Track read position |
| `useMentions` | User search for autocomplete |

### Modified Components

| Component | Changes |
|-----------|---------|
| `ResponseItem` | Add action bar with new buttons |
| `ResponseList` | Insert NewMessagesDivider |
| `LightweightReplyComposer` | Replace textarea with MentionInput |

---

## Feature Details

### 1. Share Button

**Behavior:**
- Desktop: Copy URL to clipboard, show toast
- Mobile: Use Web Share API if available, fallback to clipboard
- URL format: `/topics/:topicId#response-:responseId`

**No backend required.**

### 2. Typing Indicators

**Behavior:**
- Broadcast `USER_TYPING` on composer input (debounced 300ms)
- Display "[Name] is typing..." below response list
- Multiple users: "Alice and Bob are typing..."
- 3+ users: "Several people are typing..."
- Auto-clear after 3 seconds of no typing

**Animation:** Three dots with CSS keyframe animation

### 3. New Messages Divider

**Behavior:**
- Track `lastResponseId` per user per topic
- On topic visit: fetch read state, find position
- Insert divider after last-read response
- Update read state on scroll/visibility
- Clear divider on subsequent visits

### 4. Bookmarks

**Behavior:**
- Toggle bookmark with icon button
- Filled icon = bookmarked, outline = not
- Optimistic update with rollback on error
- `/bookmarks` page shows saved responses with context

### 5. Emoji Reactions

**Behavior:**
- Quick reactions bar: 👍 ❤️ 🎉 🤔 👀 🙌
- Click reaction to toggle own
- Click + for full emoji picker
- Real-time updates via WebSocket
- Grouped display: "👍 5  ❤️ 3"

**Emoji Set:** Use native Unicode emoji (no library needed for quick reactions)

### 6. @Mentions

**Behavior:**
- Detect `@` character in composer
- Show dropdown with matching users
- Priority: topic participants first, then all users
- Keyboard navigation: up/down/enter/escape
- Insert mention as `@[displayName](userId)`
- Render mentions with highlight style
- Click mention → user profile
- Create notification on mention

---

## File Structure

```
frontend/src/
├── components/responses/
│   ├── ShareButton.tsx
│   ├── BookmarkButton.tsx
│   ├── ReactionBar.tsx
│   ├── EmojiPicker.tsx
│   ├── TypingIndicator.tsx
│   ├── NewMessagesDivider.tsx
│   ├── MentionInput.tsx
│   ├── MentionDropdown.tsx
│   └── ResponseItem.tsx (modified)
├── hooks/
│   ├── useReactions.ts
│   ├── useBookmarks.ts
│   ├── useTypingIndicator.ts
│   ├── useReadState.ts
│   └── useMentions.ts
├── services/
│   ├── reactionService.ts
│   └── bookmarkService.ts
├── pages/
│   └── Bookmarks/
│       └── BookmarksPage.tsx
└── types/
    ├── reaction.ts
    └── bookmark.ts

services/discussion-service/src/
├── reactions/
│   ├── reactions.module.ts
│   ├── reactions.controller.ts
│   ├── reactions.service.ts
│   └── dto/
├── bookmarks/
│   ├── bookmarks.module.ts
│   ├── bookmarks.controller.ts
│   ├── bookmarks.service.ts
│   └── dto/
└── read-state/
    ├── read-state.module.ts
    ├── read-state.controller.ts
    ├── read-state.service.ts
    └── dto/

services/user-service/src/
└── users/
    └── users.controller.ts (add search endpoint)

packages/db-models/prisma/
└── schema.prisma (add new models)
```

---

## Implementation Order

1. **Database migrations** - Add new tables
2. **Share button** - Frontend only, quick win
3. **Typing indicators** - WebSocket infrastructure
4. **New Messages divider** - Read state API + frontend
5. **Bookmarks** - CRUD API + frontend + page
6. **Emoji reactions** - API + WebSocket + frontend
7. **@Mentions** - User search + MentionInput + notifications

---

## Testing Strategy

### Unit Tests
- Service methods for reactions, bookmarks, read-state
- Hook logic for state management
- Component rendering with various props

### Integration Tests
- API endpoints with auth
- WebSocket message handling
- Database operations

### E2E Tests
- Add reaction flow
- Bookmark and view bookmarks
- Typing indicator visibility
- @mention autocomplete and notification

---

## Success Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Reactions | Reactions per response | 2.5 avg |
| Bookmarks | Bookmark rate | 15% of users |
| Typing | Indicator accuracy | 100% |
| Mentions | Usage rate | 25% of responses |
| Share | Click rate | 5% |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Emoji picker bundle size | Use native emoji, defer picker library |
| Mention parsing complexity | Start with simple @word pattern |
| WebSocket scaling | Existing infra handles current load |
| Read state storage | Index on (userId, topicId) |
