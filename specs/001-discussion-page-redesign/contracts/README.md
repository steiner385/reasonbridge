# API Contracts

**Feature**: Discussion Page Redesign
**Date**: 2026-02-05

## Overview

This directory contains API contracts for the Discussion Page Redesign feature. Since this is a **frontend-only** feature, there are **no new REST API endpoints** or modifications to existing API contracts.

## Contracts Included

### 1. WebSocket Messages

**File**: `websocket-messages.md`

Documents the WebSocket message types for real-time updates:
- NEW_RESPONSE - New response posted to topic
- COMMON_GROUND_UPDATE - Analysis recalculated
- TOPIC_STATUS_CHANGE - Topic status changed
- SUBSCRIBE/UNSUBSCRIBE - Client subscription management
- PING/PONG - Connection heartbeat

**Status**: ✅ Complete

---

## Existing API Endpoints (Unchanged)

The following backend API endpoints are used by this feature but remain **unchanged**:

### Topics API

**GET /api/topics**
- **Purpose**: Fetch list of topics for left panel
- **Query Params**: `?limit=100&offset=0&sort=lastActivity` (pagination support may be added later)
- **Response**: `{ topics: Topic[], total: number }`

**GET /api/topics/:id**
- **Purpose**: Fetch single topic details
- **Response**: `Topic`

**GET /api/topics/:id/bridging-suggestions**
- **Purpose**: Fetch bridging suggestions for a topic
- **Response**: `BridgingSuggestionsResponse`

---

### Responses API

**GET /api/topics/:topicId/responses**
- **Purpose**: Fetch all responses for a topic
- **Query Params**: `?limit=500&offset=0` (optional pagination)
- **Response**: `{ responses: Response[], total: number }`

**POST /api/topics/:topicId/responses**
- **Purpose**: Create new response
- **Request Body**:
  ```json
  {
    "content": "string (10-10000 chars)",
    "citedSources": ["url1", "url2"],
    "containsOpinion": boolean,
    "containsFactualClaims": boolean
  }
  ```
- **Response**: `Response`

---

### Common Ground API

**GET /api/topics/:topicId/common-ground**
- **Purpose**: Fetch common ground analysis for a topic
- **Response**: `CommonGroundAnalysis`

---

### Propositions API

**GET /api/topics/:topicId/propositions**
- **Purpose**: Fetch propositions extracted from topic responses
- **Response**: `{ propositions: Proposition[] }`

---

### Feedback API

**POST /api/feedback/preview**
- **Purpose**: Get real-time AI feedback on draft response
- **Request Body**:
  ```json
  {
    "content": "string (draft response text)",
    "topicId": "string (optional - for context)"
  }
  ```
- **Response**: `PreviewFeedback`

---

## Potential Future API Enhancements

These enhancements are **out of scope** for the initial release but may be added later:

### Pagination Support

**GET /api/topics?limit=100&offset=0**
- Currently returns all topics (frontend filters client-side)
- Future: Backend pagination for 500+ topics

**GET /api/topics/:topicId/responses?limit=200&offset=0**
- Currently returns all responses
- Future: Backend pagination for 1000+ response threads

### Search API

**GET /api/topics/search?q=keyword**
- Currently: Frontend client-side filtering
- Future: Backend full-text search with Elasticsearch

### Subscription API

**GET /api/users/:userId/subscriptions**
- Future: User-specific topic subscriptions (email notifications, etc.)
- Not needed for in-app WebSocket subscriptions

---

## Testing API Contracts

### Existing API Mocks

All API endpoints listed above have existing mocks in:
- `frontend/src/test/mocks/handlers.ts` (MSW request handlers)
- `services/*/tests/` (backend unit test mocks)

### No New Mocks Needed

Since no API contracts are changed, no new mocks are required. Existing mocks will be reused.

---

## Contract Versioning

**API Version**: v1 (unchanged)
**WebSocket Protocol**: v1 (new, documented in websocket-messages.md)

---

**Contracts Summary**:
- ✅ WebSocket contracts documented
- ✅ Existing REST APIs documented (no changes)
- ❌ No new REST API endpoints
- ❌ No API schema changes

This feature is **frontend-only** and does not require backend API changes beyond the existing WebSocket infrastructure.
