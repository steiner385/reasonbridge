# Real-time Features Audit Report

## Category Weight: 12%

---

## Current State

### Score: 2.5/5 (Functional)

WebSocket infrastructure exists but key real-time features (typing indicators, presence, read receipts) are not implemented. Current implementation handles message updates but lacks the "live" feel of modern messaging platforms.

---

## Feature Assessment

### New Message Indicators ✅

**Score: 4/5**

**Implemented:**
- WebSocket `NEW_RESPONSE` message type
- "X new posts" badge in conversation panel
- Scroll-to-new button
- Topic status change banners

**Evidence:**
```typescript
// frontend/src/hooks/useWebSocket.ts
type MessageType =
  | 'NEW_RESPONSE'
  | 'COMMON_GROUND_UPDATE'
  | 'TOPIC_STATUS_CHANGE'
  | 'RESPONSE_DELETED'
  | 'RESPONSE_UPDATED';
```

**Gap:** No "New Messages" divider line

### Typing Indicators ❌

**Score: 0/5**

**Not Implemented:**
- No "Alice is typing..." indicator
- No WebSocket message type for typing
- No composer state broadcast

**Impact:** High - creates perception of static, non-live experience

### Online Presence ❌

**Score: 0/5**

**Not Implemented:**
- No user online/offline status
- No green dot indicators
- No "last seen" timestamps
- No active participant list

**Impact:** Medium - users can't see who's available

### Connection Status Feedback ⚠️

**Score: 3/5**

**Implemented:**
- Connection state enum: `connecting`, `connected`, `disconnected`, `error`
- Auto-reconnect logic (configurable attempts)
- Heartbeat mechanism (30s PING)

**Missing:**
- User-visible connection status indicator
- "Reconnecting..." toast
- Offline mode banner

### Reconnection Handling ✅

**Score: 4/5**

**Implemented:**
- Auto-reconnect with configurable delay
- Max reconnection attempts
- Exponential backoff (likely)

**Evidence:**
```typescript
// frontend/src/hooks/useWebSocket.ts
const options = {
  autoConnect: true,
  autoReconnect: true,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5
};
```

### Optimistic Updates ⚠️

**Score: 2/5**

**Implemented:**
- React Query mutation patterns exist

**Missing:**
- Visual pending state for new responses
- Rollback UI on failure
- Optimistic vote counts

---

## Benchmark Comparison

| Platform | New Msg | Typing | Presence | Connection | Reconnect | Overall |
|----------|---------|--------|----------|------------|-----------|---------|
| Discord | 5 | 5 | 5 | 5 | 5 | 5.0 |
| Slack | 5 | 5 | 4 | 4 | 5 | 4.6 |
| WhatsApp | 5 | 5 | 4 | 5 | 5 | 4.8 |
| GitHub | 3 | 0 | 0 | 2 | 3 | 1.6 |
| **reasonBridge** | 4 | 0 | 0 | 3 | 4 | **2.5** |

---

## Gaps Identified

### 1. Typing Indicators
- **Impact:** High (5/5)
- **Effort:** Low (2/5)
- **Description:** Show "X is typing..." when users compose
- **Implementation:**
  - New WebSocket message type: `USER_TYPING`
  - Debounced broadcast from composer
  - Display component below thread

### 2. User Presence
- **Impact:** Medium (3/5)
- **Effort:** Medium (3/5)
- **Description:** Online/offline/idle status
- **Implementation:**
  - Presence service tracking connections
  - Green/yellow/gray dot on avatars
  - "Active now" / "Last seen 5m ago"

### 3. Read Receipts
- **Impact:** Medium (3/5)
- **Effort:** Medium (3/5)
- **Description:** Show who has read responses
- **Implementation:**
  - Track last-read position per user
  - Single/double check marks (WhatsApp pattern)
  - Privacy setting to opt out

### 4. Connection Status UI
- **Impact:** Medium (3/5)
- **Effort:** Low (2/5)
- **Description:** Visible reconnecting/offline states
- **Implementation:**
  - Banner component for disconnected state
  - Toast on reconnection success

---

## Recommendations

### Quick Wins (Low Effort, High Impact)

1. **Typing Indicator** (Est: 1-2 days)
   ```typescript
   // New WebSocket message type
   interface TypingMessage {
     type: 'USER_TYPING';
     payload: {
       userId: string;
       topicId: string;
       isTyping: boolean;
     };
   }

   // Component
   <TypingIndicator topicId={topicId} />
   // "Alice is typing..." with animated dots
   ```

2. **Connection Status Banner** (Est: 0.5 days)
   ```typescript
   const { connectionState } = useWebSocket();

   {connectionState === 'disconnected' && (
     <Banner variant="warning">
       Reconnecting... <Spinner />
     </Banner>
   )}
   ```

### Major Projects (High Effort, High Impact)

1. **Presence System** (Est: 1 week)
   - Backend presence service
   - Heartbeat-based status
   - Idle detection (5 min)
   - WebSocket broadcast on change

2. **Read Receipts** (Est: 1 week)
   - Last-read tracking per user per topic
   - Unread count badges
   - "New Messages" divider

---

## Technical Architecture

### Current WebSocket Flow
```
User Action → API Call → Database → Event Published → WebSocket Broadcast
                                                              ↓
                                        All connected clients receive update
```

### Proposed Typing Indicator Flow
```
User Types → Debounce (300ms) → WebSocket Send → Server Broadcast
                                                       ↓
                              Other clients show "X is typing..."
                                                       ↓
                              Auto-clear after 3s of no typing
```

### Proposed Presence Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Presence Service                       │
├─────────────────────────────────────────────────────────────┤
│  Redis Hash: presence:{topicId}                             │
│    user:123 → { status: 'online', lastSeen: timestamp }     │
│    user:456 → { status: 'idle', lastSeen: timestamp }       │
├─────────────────────────────────────────────────────────────┤
│  WebSocket heartbeat → Update lastSeen                      │
│  Idle detection → 5min no activity = idle                   │
│  Disconnect → Set offline, broadcast                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Typing indicator coverage | 0% | 100% | Feature presence |
| Presence accuracy | N/A | 95% | Status correctness |
| Reconnection success | Unknown | 99% | WebSocket metrics |
| User perception of "liveness" | TBD | 4/5 | User survey |

---

## Related Files

- `frontend/src/hooks/useWebSocket.ts`
- `frontend/src/components/discussion-layout/ConversationPanel.tsx`
- `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- `services/notification-service/` (backend)
