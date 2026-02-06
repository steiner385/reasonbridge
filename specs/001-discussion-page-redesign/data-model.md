# Data Model: Discussion Page Redesign for Chat-Style UX

**Date**: 2026-02-05
**Feature**: Discussion Page Redesign
**Purpose**: Define data structures for client-side panel state, unchanged backend entities, and WebSocket message types

---

## Overview

This document defines the data model for the three-panel discussion page redesign. The model is divided into three categories:

1. **Unchanged Backend Entities** - Existing server-side data structures (Topic, Response, Proposition, etc.) that remain as-is
2. **New Client-Side State Models** - Frontend-only state for panel management, UI preferences, and navigation
3. **WebSocket Message Types** - Real-time update payloads for new responses and analysis updates

---

## 1. Unchanged Backend Entities

These entities exist in the backend database (PostgreSQL via Prisma ORM) and are **not modified** by this feature. They are documented here for reference and to clarify relationships.

### Topic

Represents a discussion topic.

```typescript
interface Topic {
  id: string;                    // UUID
  title: string;                 // Topic title (max 200 chars)
  description: string;           // Topic description (markdown, max 5000 chars)
  status: TopicStatus;           // SEEDING | ACTIVE | ARCHIVED
  creatorId: string;             // User who created the topic
  participantCount: number;      // Number of unique participants
  responseCount: number;         // Total responses in topic
  currentDiversityScore: number; // 0.0-1.0 score based on MFT alignment diversity
  minimumDiversityScore: number; // Required score for ACTIVE status
  tags: string[];                // Array of topic tags
  crossCuttingThemes: string[];  // Identified themes across responses
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
  lastActivityAt: Date;          // Last response or edit timestamp
}

enum TopicStatus {
  SEEDING = 'SEEDING',       // Gathering initial responses
  ACTIVE = 'ACTIVE',         // Open for discussion
  ARCHIVED = 'ARCHIVED'      // Closed, read-only
}
```

**Relationships**:
- Topic has many Responses
- Topic has many Propositions (extracted from responses)
- Topic has one CommonGroundAnalysis

**Validation Rules** (enforced by backend):
- Title: 10-200 characters
- Description: 50-5000 characters
- Status transition: SEEDING → ACTIVE (when diversity met) → ARCHIVED (manual)

---

### Response

Represents a single response/message in a discussion.

```typescript
interface Response {
  id: string;                    // UUID
  content: string;               // Response text (markdown, max 10000 chars)
  authorId: string;              // User who posted the response
  author: UserSummary;           // Nested user data (name, avatar)
  topicId: string;               // Parent topic ID
  parentId: string | null;       // Parent response ID (for threading - Phase 5)
  citedSources: CitedSource[];   // URLs referenced in response
  containsOpinion: boolean;      // User-declared: contains opinion
  containsFactualClaims: boolean;// User-declared: contains factual claims
  propositions: Proposition[];   // Extracted propositions (AI-generated)
  status: ResponseStatus;        // VISIBLE | HIDDEN | REMOVED
  revisionCount: number;         // Number of edits
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last edit timestamp
}

enum ResponseStatus {
  VISIBLE = 'VISIBLE',       // Publicly visible
  HIDDEN = 'HIDDEN',         // Temporarily hidden (moderation)
  REMOVED = 'REMOVED'        // Permanently removed
}

interface CitedSource {
  url: string;                   // Source URL
  isValid: boolean;              // URL validation status
  fetchedTitle?: string;         // Fetched page title (if available)
  fetchedDescription?: string;   // Fetched meta description
}

interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}
```

**Relationships**:
- Response belongs to Topic
- Response has many Propositions
- Response may have parent Response (threading - not implemented in this feature)

**Validation Rules** (enforced by backend):
- Content: 10-10000 characters
- Cited sources: Max 10 URLs
- Status: Only VISIBLE responses shown to non-moderators

---

### Proposition

A key claim or statement extracted from responses (AI-generated).

```typescript
interface Proposition {
  id: string;                    // UUID
  text: string;                  // Proposition statement (max 500 chars)
  topicId: string;               // Parent topic ID
  responseIds: string[];         // Responses mentioning this proposition
  alignmentData: AlignmentData;  // Aggregated user stances
  createdAt: Date;               // Extraction timestamp
}

interface AlignmentData {
  supportCount: number;          // Users supporting proposition
  opposeCount: number;           // Users opposing proposition
  nuancedCount: number;          // Users with nuanced stance
  totalResponses: number;        // Total responses aligned
  consensusScore: number;        // 0.0-1.0 score (1.0 = full consensus)
}
```

**Relationships**:
- Proposition belongs to Topic
- Proposition mentioned in many Responses

---

### CommonGroundAnalysis

Aggregated analysis of a topic conversation (AI-generated).

```typescript
interface CommonGroundAnalysis {
  id: string;                    // UUID
  topicId: string;               // Parent topic ID
  overallConsensusScore: number; // 0.0-1.0 overall agreement score
  agreementZones: AgreementZone[];       // Areas of high agreement
  misunderstandings: Misunderstanding[]; // Conflicting term definitions
  disagreements: Disagreement[];         // Fundamental value differences
  participantCount: number;      // Number of participants analyzed
  lastUpdated: Date;             // Last analysis run timestamp
}

interface AgreementZone {
  propositionId: string;         // Related proposition
  propositionText: string;       // Proposition statement
  agreementPercentage: number;   // 0-100% agreement
  supportingResponseIds: string[];// Responses in agreement
}

interface Misunderstanding {
  term: string;                  // Ambiguous term
  definitions: {                 // Conflicting definitions
    text: string;
    responseIds: string[];
  }[];
  clarification: string;         // AI-suggested clarification
}

interface Disagreement {
  topic: string;                 // Topic of disagreement
  positions: {                   // Opposing positions
    stance: string;
    moralFoundations: string[];  // MFT categories
    responseIds: string[];
  }[];
  explanation: string;           // AI analysis of difference
}
```

**Relationships**:
- CommonGroundAnalysis belongs to Topic
- References Propositions and Responses

---

### BridgingSuggestion

AI-generated bridge between opposing viewpoints.

```typescript
interface BridgingSuggestion {
  id: string;                    // UUID
  topicId: string;               // Parent topic ID
  sourcePosition: string;        // Position A statement
  targetPosition: string;        // Position B statement
  bridgingLanguage: string;      // Suggested bridge text
  commonGround: string;          // Shared values/goals explanation
  reasoning: string;             // AI rationale for bridge
  confidenceScore: number;       // 0.0-1.0 confidence in bridge quality
  createdAt: Date;               // Generation timestamp
}
```

**Relationships**:
- BridgingSuggestion belongs to Topic

---

### PreviewFeedback

Real-time AI feedback during response composition.

```typescript
interface PreviewFeedback {
  feedback: FeedbackItem[];      // Array of identified issues
  primary: FeedbackItem | null;  // Highest priority issue
  readyToPost: boolean;          // True if no blocking issues
  summary: string;               // Overall feedback summary
  analysisTimeMs: number;        // Time taken for analysis (ms)
}

interface FeedbackItem {
  type: FeedbackType;            // Category of feedback
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;               // User-facing message
  suggestion: string;            // Suggested rewording/fix
  affectedText?: string;         // Text segment causing issue
}

enum FeedbackType {
  BIAS = 'BIAS',
  TONE = 'TONE',
  FALLACY = 'FALLACY',
  CLARITY = 'CLARITY',
  CLAIM_WITHOUT_SOURCE = 'CLAIM_WITHOUT_SOURCE'
}
```

**Relationships**:
- PreviewFeedback is transient (not persisted to database)
- Generated per-request for response composition

---

## 2. New Client-Side State Models

These models exist **only in the frontend** (React state, sessionStorage) and are not persisted to the backend database.

### PanelState

Tracks panel widths, collapse state, and active topic.

```typescript
interface PanelState {
  leftPanelWidth: number;        // Left panel width in pixels (240-480)
  rightPanelWidth: number;       // Right panel width in pixels (280-600)
  isLeftPanelCollapsed: boolean; // True if left panel hidden (tablet/mobile)
  isRightPanelCollapsed: boolean;// True if right panel hidden (rare)
  activeTopic: string | null;    // Currently selected topic ID
}

const DEFAULT_PANEL_STATE: PanelState = {
  leftPanelWidth: 300,
  rightPanelWidth: 360,
  isLeftPanelCollapsed: false,
  isRightPanelCollapsed: false,
  activeTopic: null
};
```

**Storage**: `sessionStorage` under key `discussion-panel-state` (cleared on browser close)

**Validation Rules** (enforced by frontend):
- leftPanelWidth: 240-480 pixels
- rightPanelWidth: 280-600 pixels
- activeTopic: Must match existing topic ID or null

---

### BreakpointState

Tracks current responsive breakpoint.

```typescript
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface BreakpointState {
  current: Breakpoint;           // Current breakpoint
  width: number;                 // Current viewport width in pixels
}

// Breakpoint thresholds
const BREAKPOINTS = {
  mobile: { max: 767 },          // < 768px
  tablet: { min: 768, max: 1279 },// 768-1279px
  desktop: { min: 1280 }         // >= 1280px
};
```

**Storage**: React state only (recalculated on resize)

**Derivation Logic**:
```typescript
function getBreakpoint(width: number): Breakpoint {
  if (width < 768) return 'mobile';
  if (width < 1280) return 'tablet';
  return 'desktop';
}
```

---

### UnsavedChangesState

Tracks unsaved response composition to prevent data loss.

```typescript
interface UnsavedChangesState {
  hasUnsavedChanges: boolean;    // True if compose area has content
  draftContent: string;          // Current draft response text
  draftTopicId: string | null;   // Topic ID for draft
  lastSavedAt: Date | null;      // Timestamp of last auto-save
}
```

**Storage**: React state + localStorage (for auto-save drafts)

**Behavior**:
- Sets `hasUnsavedChanges = true` when user types 10+ characters
- Shows confirmation dialog if user navigates away with unsaved changes
- Auto-saves draft to localStorage every 30 seconds
- Clears draft on successful post or explicit discard

---

### VirtualScrollState

Tracks scroll position for virtual lists (topic list, response list).

```typescript
interface VirtualScrollState {
  topicListScrollOffset: number;     // Topic list scroll position (pixels)
  responseListScrollOffset: number;  // Response list scroll position (pixels)
}
```

**Storage**: React state only (restored on topic switch)

**Purpose**: Preserve scroll position when user switches topics and returns

---

### MetadataPanelTab

Tracks active tab in right panel metadata sections.

```typescript
type MetadataPanelTab =
  | 'propositions'
  | 'common-ground'
  | 'bridging'
  | 'topic-info';

interface MetadataPanelState {
  activeTab: MetadataPanelTab;   // Currently selected tab
  collapsedSections: Set<string>;// IDs of collapsed accordion sections
}

const DEFAULT_METADATA_STATE: MetadataPanelState = {
  activeTab: 'propositions',
  collapsedSections: new Set()
};
```

**Storage**: React state only (resets on topic change)

---

## 3. WebSocket Message Types

These message types define real-time updates pushed from the backend to frontend via WebSocket connection.

### NewResponseMessage

Notifies clients when a new response is posted to the active topic.

```typescript
interface NewResponseMessage {
  type: 'NEW_RESPONSE';
  topicId: string;               // Topic ID where response was posted
  response: Response;            // Full response object (see backend entity)
  timestamp: Date;               // Server timestamp of event
}
```

**Client Behavior**:
1. Check if `topicId` matches `activeTopic`
2. If match, show "New response available - Click to load" notification
3. On click, append `response` to conversation list and scroll to bottom
4. Increment response count in topic list item

---

### CommonGroundUpdateMessage

Notifies clients when common ground analysis is recalculated.

```typescript
interface CommonGroundUpdateMessage {
  type: 'COMMON_GROUND_UPDATE';
  topicId: string;               // Topic ID with updated analysis
  analysis: CommonGroundAnalysis;// Updated analysis object
  timestamp: Date;               // Server timestamp of event
}
```

**Client Behavior**:
1. Check if `topicId` matches `activeTopic`
2. If match and right panel showing common ground, show "Updated - Refresh to see changes" indicator
3. On click, replace existing analysis with new `analysis` data
4. Update consensus score in right panel header

---

### TopicStatusChangeMessage

Notifies clients when a topic's status changes (SEEDING → ACTIVE → ARCHIVED).

```typescript
interface TopicStatusChangeMessage {
  type: 'TOPIC_STATUS_CHANGE';
  topicId: string;               // Topic ID with status change
  oldStatus: TopicStatus;        // Previous status
  newStatus: TopicStatus;        // New status
  timestamp: Date;               // Server timestamp of event
}
```

**Client Behavior**:
1. Update topic status badge in left panel topic list item
2. If `newStatus === 'ARCHIVED'` and `topicId === activeTopic`, show banner: "This topic is now archived (read-only)"
3. Disable response composer if archived

---

### UserPresenceMessage (Future Enhancement - NOT in this feature)

Notifies clients of user presence (who's online, typing indicators).

```typescript
interface UserPresenceMessage {
  type: 'USER_PRESENCE';
  topicId: string;
  userId: string;
  action: 'joined' | 'left' | 'typing';
  timestamp: Date;
}
```

**Status**: Out of scope for initial release (see spec Out of Scope section)

---

## Data Flow Diagrams

### Topic Selection Flow

```
User clicks topic in left panel
  ↓
usePanelState sets activeTopic
  ↓
React Router updates URL (/discussions?topic={id})
  ↓
useEffect triggers data fetch:
  - useTopic(topicId) → Topic data
  - useResponses(topicId) → Response[] data
  - useCommonGroundAnalysis(topicId) → Analysis data
  - useBridgingSuggestions(topicId) → Suggestions data
  ↓
Center panel renders ResponseList (virtual scrolled)
Right panel renders MetadataPanel (tabs)
  ↓
WebSocket subscribes to topic channel for real-time updates
```

### Real-Time Response Update Flow

```
Backend posts new response
  ↓
WebSocket emits NewResponseMessage
  ↓
Frontend useWebSocket hook receives message
  ↓
Check: message.topicId === activeTopic?
  ↓ YES
Show notification banner: "1 new response"
  ↓
User clicks notification
  ↓
Append message.response to ResponseList
Scroll to bottom (smooth scroll)
Increment topic.responseCount in left panel
```

### Panel Resize Flow

```
User drags PanelResizer divider
  ↓
usePanelResize tracks mouse position
  ↓
Calculate new panel width (clamped to min/max)
  ↓
Update CSS custom property --left-panel-width (or --right-panel-width)
  ↓
Debounced write to sessionStorage (max 1 write per 200ms)
  ↓
On mouse up, persist final width to sessionStorage
```

---

## Validation Rules Summary

### Client-Side Validation (Frontend)

| Field | Rule | Error Message |
|-------|------|---------------|
| `leftPanelWidth` | 240-480 pixels | "Panel width out of bounds" |
| `rightPanelWidth` | 280-600 pixels | "Panel width out of bounds" |
| `activeTopic` | Must exist in topic list | "Topic not found" |
| `draftContent` | 10-10000 characters | "Response too short/long" |

### Backend Validation (Unchanged)

All backend entities retain existing validation rules. No changes to API contracts or database schema.

---

## State Transitions

### Topic Status State Machine

```
[SEEDING] → (diversity threshold met) → [ACTIVE]
[ACTIVE] → (manual archive by moderator) → [ARCHIVED]
```

**Irreversible Transitions**: ARCHIVED cannot transition back to ACTIVE or SEEDING

### Response Status State Machine

```
[VISIBLE] → (moderation flag) → [HIDDEN]
[HIDDEN] → (moderation appeal approved) → [VISIBLE]
[HIDDEN] → (moderation confirmed) → [REMOVED]
```

**Irreversible Transitions**: REMOVED cannot transition back to VISIBLE or HIDDEN

---

## Performance Considerations

### Data Fetching Strategy

- **Topic list**: Fetch first 100 topics on mount, paginate on scroll (API supports `?limit=100&offset=0`)
- **Response list**: Fetch all responses on topic select (virtual scrolling handles rendering)
- **Common ground analysis**: Lazy load on right panel tab activation (not fetched on initial topic select)
- **Bridging suggestions**: Lazy load on right panel tab activation

### Caching Strategy

- **Topic metadata**: Cache in React Query with 5-minute stale time
- **Responses**: Cache with 1-minute stale time (balance between freshness and performance)
- **Common ground/bridging**: Cache with 10-minute stale time (expensive to generate)

### Memory Management

- Virtual scrolling limits DOM nodes to ~20 items per list
- Topic list: ~1KB per item × 100 items = 100KB
- Response list: ~2KB per item × 20 rendered = 40KB
- Total estimated memory footprint: <5MB for large discussions

---

## Data Model Versioning

**Current Version**: 1.0.0 (initial release)

**Compatibility Notes**:
- All frontend state models are versioned separately from backend entities
- Breaking changes to PanelState structure require sessionStorage key change (e.g., `discussion-panel-state-v2`)
- WebSocket message types follow semantic versioning (type field includes version: `NEW_RESPONSE_V1`)

---

**Data Model Complete**: All entities, state models, and WebSocket types documented. Ready for contract generation.
