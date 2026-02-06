# WebSocket Message Contracts

**Feature**: Discussion Page Redesign
**Purpose**: Document WebSocket message types for real-time updates in the three-panel discussion interface
**Protocol**: WebSocket (wss:// over HTTPS)
**Message Format**: JSON

---

## Overview

This document defines the WebSocket message contracts for real-time updates in the discussion page. Messages flow **server → client** (broadcast) to notify connected users of new responses, analysis updates, and topic status changes.

**Connection Lifecycle**:
1. Client connects to WebSocket endpoint: `wss://api.reasonbridge.com/discussions/ws`
2. Client sends `SUBSCRIBE` message with topic IDs
3. Server broadcasts relevant messages to subscribed clients
4. Client sends `UNSUBSCRIBE` when leaving topic or closing connection

---

## Message Types

### 1. NEW_RESPONSE

Broadcast when a new response is posted to a topic.

**Direction**: Server → Client (broadcast to all subscribers of the topic)

**Payload**:
```json
{
  "type": "NEW_RESPONSE",
  "topicId": "uuid-v4-string",
  "response": {
    "id": "uuid-v4-string",
    "content": "Response text content (markdown)",
    "authorId": "uuid-v4-string",
    "author": {
      "id": "uuid-v4-string",
      "username": "string",
      "displayName": "string",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "topicId": "uuid-v4-string",
    "parentId": null,
    "citedSources": [
      {
        "url": "https://example.com/source",
        "isValid": true,
        "fetchedTitle": "Source Title"
      }
    ],
    "containsOpinion": true,
    "containsFactualClaims": false,
    "propositions": [],
    "status": "VISIBLE",
    "revisionCount": 0,
    "createdAt": "2026-02-05T19:30:00.000Z",
    "updatedAt": "2026-02-05T19:30:00.000Z"
  },
  "timestamp": "2026-02-05T19:30:00.123Z"
}
```

**TypeScript Interface**:
```typescript
interface NewResponseMessage {
  type: 'NEW_RESPONSE';
  topicId: string;
  response: Response; // Full Response entity (see data-model.md)
  timestamp: string;  // ISO 8601 datetime
}
```

**Client Behavior**:
1. Check if `topicId` matches currently active topic
2. If match:
   - Show notification banner: "1 new response - Click to load"
   - On click: append response to conversation list, scroll to bottom
   - Increment response count in left panel topic item
3. If no match but topic is in left panel:
   - Add unread badge to topic item
   - Increment response count

**Rate Limiting**: Server may throttle broadcasts if >10 responses/second in a topic

---

### 2. COMMON_GROUND_UPDATE

Broadcast when common ground analysis is recalculated for a topic.

**Direction**: Server → Client (broadcast to all subscribers of the topic)

**Payload**:
```json
{
  "type": "COMMON_GROUND_UPDATE",
  "topicId": "uuid-v4-string",
  "analysis": {
    "id": "uuid-v4-string",
    "topicId": "uuid-v4-string",
    "overallConsensusScore": 0.72,
    "agreementZones": [
      {
        "propositionId": "uuid-v4-string",
        "propositionText": "Climate change is a real phenomenon",
        "agreementPercentage": 95,
        "supportingResponseIds": ["uuid1", "uuid2", "uuid3"]
      }
    ],
    "misunderstandings": [
      {
        "term": "carbon neutral",
        "definitions": [
          {
            "text": "Net-zero carbon emissions",
            "responseIds": ["uuid1", "uuid2"]
          },
          {
            "text": "Eliminating all carbon use",
            "responseIds": ["uuid3"]
          }
        ],
        "clarification": "Carbon neutral typically refers to net-zero emissions..."
      }
    ],
    "disagreements": [
      {
        "topic": "Role of government regulation",
        "positions": [
          {
            "stance": "Government should mandate emissions limits",
            "moralFoundations": ["Care/Harm", "Fairness/Cheating"],
            "responseIds": ["uuid1", "uuid2"]
          },
          {
            "stance": "Market solutions are more effective",
            "moralFoundations": ["Liberty/Oppression"],
            "responseIds": ["uuid3", "uuid4"]
          }
        ],
        "explanation": "This disagreement stems from different prioritization..."
      }
    ],
    "participantCount": 12,
    "lastUpdated": "2026-02-05T19:45:00.000Z"
  },
  "timestamp": "2026-02-05T19:45:00.456Z"
}
```

**TypeScript Interface**:
```typescript
interface CommonGroundUpdateMessage {
  type: 'COMMON_GROUND_UPDATE';
  topicId: string;
  analysis: CommonGroundAnalysis; // See data-model.md
  timestamp: string;  // ISO 8601 datetime
}
```

**Client Behavior**:
1. Check if `topicId` matches currently active topic
2. If match and right panel is showing common ground tab:
   - Show indicator: "Analysis updated - Refresh to see changes"
   - On click: replace existing analysis with new data
   - Update consensus score in panel header
3. If no match: update cached analysis in background (no UI change)

**Frequency**: Analysis recalculated max once per 10 minutes per topic

---

### 3. TOPIC_STATUS_CHANGE

Broadcast when a topic's status changes (SEEDING → ACTIVE → ARCHIVED).

**Direction**: Server → Client (broadcast to all subscribers of the topic + topic list subscribers)

**Payload**:
```json
{
  "type": "TOPIC_STATUS_CHANGE",
  "topicId": "uuid-v4-string",
  "oldStatus": "SEEDING",
  "newStatus": "ACTIVE",
  "timestamp": "2026-02-05T20:00:00.789Z"
}
```

**TypeScript Interface**:
```typescript
interface TopicStatusChangeMessage {
  type: 'TOPIC_STATUS_CHANGE';
  topicId: string;
  oldStatus: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';
  newStatus: 'SEEDING' | 'ACTIVE' | 'ARCHIVED';
  timestamp: string;  // ISO 8601 datetime
}
```

**Client Behavior**:
1. Update topic status badge in left panel topic item
2. If `topicId` matches active topic:
   - If `newStatus === 'ACTIVE'`: Show celebratory notification "This topic is now active!"
   - If `newStatus === 'ARCHIVED'`: Show banner "This topic is archived (read-only)", disable response composer
3. Persist status change in topic list cache

**Frequency**: Rare (typically <5 status changes per topic over its lifetime)

---

## Client Control Messages

These messages are sent **client → server** to manage subscriptions.

### 4. SUBSCRIBE

Subscribe to updates for specific topics.

**Direction**: Client → Server

**Payload**:
```json
{
  "type": "SUBSCRIBE",
  "topicIds": ["uuid1", "uuid2", "uuid3"],
  "clientId": "uuid-v4-client-session-id"
}
```

**TypeScript Interface**:
```typescript
interface SubscribeMessage {
  type: 'SUBSCRIBE';
  topicIds: string[];  // Array of topic IDs to subscribe to
  clientId: string;    // Unique client session ID
}
```

**Server Response**: None (subscriptions are fire-and-forget)

**Behavior**:
- Client sends SUBSCRIBE on initial connection (subscribes to all topics in left panel)
- Client sends SUBSCRIBE when new topic is added to left panel
- Server tracks subscriptions per clientId
- Max 50 simultaneous topic subscriptions per client

---

### 5. UNSUBSCRIBE

Unsubscribe from updates for specific topics.

**Direction**: Client → Server

**Payload**:
```json
{
  "type": "UNSUBSCRIBE",
  "topicIds": ["uuid1", "uuid2"],
  "clientId": "uuid-v4-client-session-id"
}
```

**TypeScript Interface**:
```typescript
interface UnsubscribeMessage {
  type: 'UNSUBSCRIBE';
  topicIds: string[];  // Array of topic IDs to unsubscribe from
  clientId: string;    // Unique client session ID
}
```

**Server Response**: None (unsubscriptions are fire-and-forget)

**Behavior**:
- Client sends UNSUBSCRIBE when topics are removed from view (e.g., filtering left panel)
- Client sends UNSUBSCRIBE with all topicIds on disconnect
- Server cleans up subscriptions automatically on client disconnect

---

### 6. PING / PONG

Heartbeat messages to keep connection alive.

**Direction**: Bidirectional (client ↔ server)

**PING Payload** (client → server):
```json
{
  "type": "PING",
  "timestamp": "2026-02-05T20:15:00.000Z"
}
```

**PONG Payload** (server → client):
```json
{
  "type": "PONG",
  "timestamp": "2026-02-05T20:15:00.123Z"
}
```

**TypeScript Interface**:
```typescript
interface PingMessage {
  type: 'PING';
  timestamp: string;
}

interface PongMessage {
  type: 'PONG';
  timestamp: string;
}
```

**Behavior**:
- Client sends PING every 30 seconds of inactivity
- Server responds with PONG within 5 seconds
- Client considers connection dead if no PONG after 3 consecutive PINGs (90 seconds)
- Client attempts reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)

---

## Connection Lifecycle Example

```
1. Client connects to wss://api.reasonbridge.com/discussions/ws
   ↓
2. Client sends SUBSCRIBE with topicIds: ["topic1", "topic2"]
   ↓
3. Server acknowledges (no response, but client is now subscribed)
   ↓
4. Server broadcasts NEW_RESPONSE for topic1
   ↓
5. Client receives message, updates UI
   ↓
6. User switches to topic3 in left panel
   ↓
7. Client sends SUBSCRIBE with topicIds: ["topic3"]
   ↓
8. Client sends UNSUBSCRIBE with topicIds: ["topic1"] (if topic1 not in view)
   ↓
9. Server broadcasts COMMON_GROUND_UPDATE for topic2
   ↓
10. Client receives message, updates UI
   ↓
11. User closes browser tab
   ↓
12. Client WebSocket disconnects
   ↓
13. Server cleans up all subscriptions for this clientId
```

---

## Error Handling

### Connection Errors

**Error Payload** (server → client):
```json
{
  "type": "ERROR",
  "code": "SUBSCRIPTION_LIMIT_EXCEEDED",
  "message": "Maximum 50 topic subscriptions allowed",
  "timestamp": "2026-02-05T20:30:00.000Z"
}
```

**Error Codes**:
- `SUBSCRIPTION_LIMIT_EXCEEDED`: Client attempted to subscribe to >50 topics
- `INVALID_TOPIC_ID`: Topic ID in SUBSCRIBE message does not exist
- `RATE_LIMIT_EXCEEDED`: Client sending messages too quickly (>10 per second)
- `AUTHENTICATION_REQUIRED`: Client must authenticate before subscribing (future enhancement)

**Client Behavior on Error**:
- Log error to console
- Show user-friendly notification (e.g., "Unable to subscribe to topic - try refreshing")
- Do not auto-retry on error (only retry on connection loss)

---

## Security Considerations

### Authentication

**Current**: No authentication required for WebSocket connections (public topics)

**Future Enhancement** (not in this feature):
- Include JWT token in WebSocket handshake headers
- Server validates token before accepting connection
- Restrict subscriptions to topics user has permission to view

### Rate Limiting

- Client messages (SUBSCRIBE, UNSUBSCRIBE, PING): Max 10 per second
- Server enforces rate limits per IP address
- Exceeding limit triggers `RATE_LIMIT_EXCEEDED` error and temporary connection throttling

### Message Validation

- Server validates all message payloads against JSON schema
- Invalid messages are dropped silently (no error response)
- Topic IDs validated against database before broadcasting

---

## Performance Characteristics

### Message Size

| Message Type | Average Size | Max Size |
|--------------|-------------|----------|
| NEW_RESPONSE | 2-5 KB | 15 KB (with long content + citations) |
| COMMON_GROUND_UPDATE | 5-10 KB | 50 KB (large analysis) |
| TOPIC_STATUS_CHANGE | 200 bytes | 300 bytes |
| SUBSCRIBE/UNSUBSCRIBE | 300 bytes | 1 KB (50 topic IDs) |
| PING/PONG | 100 bytes | 150 bytes |

### Broadcast Latency

- NEW_RESPONSE: <500ms from server receive to client delivery
- COMMON_GROUND_UPDATE: <1 second (larger payload)
- TOPIC_STATUS_CHANGE: <200ms (small payload)

### Scalability

- Server supports 10,000 concurrent WebSocket connections per instance
- Horizontal scaling via Redis pub/sub for cross-instance broadcasting
- Topic subscriptions tracked in Redis (in-memory, fast lookups)

---

## Testing Contracts

### Unit Tests

Mock WebSocket messages for frontend components:
```typescript
const mockNewResponseMessage: NewResponseMessage = {
  type: 'NEW_RESPONSE',
  topicId: 'test-topic-id',
  response: mockResponse,
  timestamp: new Date().toISOString()
};

// Simulate receiving message
mockWebSocket.emit('message', JSON.stringify(mockNewResponseMessage));
```

### Integration Tests

Use WebSocket test server (ws library) to simulate server broadcasts:
```typescript
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'NEW_RESPONSE',
    topicId: 'topic1',
    response: testResponse,
    timestamp: new Date().toISOString()
  }));
});
```

### E2E Tests

Playwright can intercept WebSocket connections:
```typescript
await page.route('wss://api.reasonbridge.com/discussions/ws', (route) => {
  // Mock WebSocket connection
  route.fulfill({ status: 101, headers: { 'Upgrade': 'websocket' } });
});
```

---

**WebSocket Contracts Complete**: All message types documented with payloads, behaviors, and error handling.
