# Feature Specification: Discussion Page Redesign for Chat-Style UX

**Feature Branch**: `001-discussion-page-redesign`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "i want to refactor our topic details / discussion page to conform more closely with norms for chat platforms, optimizing space and promoting intuitive flow, clarity of conversation/activity/status, and thoughtfully integrating the feedback mechanisms we've introduced for this platform. i am envisioning a UI similar to a blend between discord and reddit. topics on the left. main chat/conversation in the center, bridges/proposals/conversation metadata on the right. however please don't take my direction as a demand. i want you to examine this from a UX perspective and propose the proper design considering all factors"

## Executive Summary

Transform the topic details/discussion page from a vertical-scroll forum layout into a modern three-panel chat-style interface that optimizes space usage, promotes intuitive conversation flow, and thoughtfully integrates reasonBridge's unique AI-powered feedback mechanisms (preview feedback, common ground analysis, bridging suggestions).

**Design Philosophy**: Blend Discord's real-time chat focus with Reddit's threaded discussion depth, while preserving reasonBridge's commitment to constructive dialogue through visible feedback integration.

**Core UX Principles**:
1. **Spatial separation of concerns** - Navigation (left), conversation (center), metadata/feedback (right)
2. **Progressive disclosure** - Essential info always visible, detailed analysis on-demand
3. **Conversation-first design** - Maximize readability and flow in the center panel
4. **Contextual feedback** - Show relevant AI insights without disrupting conversation rhythm
5. **Responsive degradation** - Gracefully adapt panels for tablet/mobile viewports

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Topic Discovery and Entry (Priority: P1)

A user wants to browse active discussions and quickly jump into a topic that interests them, without navigating through multiple pages.

**Why this priority**: This is the primary entry point to the platform. If users can't quickly find and access discussions, all other features become irrelevant. This story delivers immediate value - a working navigation and topic selection system.

**Independent Test**: Can be fully tested by loading the page, clicking through different topics in the left panel, and verifying that the center panel loads the correct conversation. Delivers value by providing seamless topic browsing without page reloads.

**Acceptance Scenarios**:

1. **Given** a user lands on the discussion page, **When** they view the left panel, **Then** they see a list of active topics with titles, participant counts, and recent activity indicators
2. **Given** a user is viewing Topic A in the center panel, **When** they click Topic B in the left panel, **Then** Topic B's conversation loads in the center panel without a full page refresh
3. **Given** a user has many topics in the list, **When** they scroll the left panel, **Then** the center and right panels remain stationary (independent scrolling)
4. **Given** a topic has unread responses, **When** the user views the topic list, **Then** the topic displays an unread badge or indicator
5. **Given** a user searches for a topic keyword in the left panel, **When** they type in the search input, **Then** the topic list filters in real-time to matching results

---

### User Story 2 - Reading Conversation with Contextual Metadata (Priority: P1)

A user reads through a discussion while simultaneously viewing relevant metadata (propositions, alignment, common ground) without switching views or scrolling.

**Why this priority**: This is the core value proposition of the redesign - parallel access to conversation and analysis. Without this, the three-panel layout offers no advantage over the current vertical design. Delivers value by allowing users to understand both the conversation content and its analytical context simultaneously.

**Independent Test**: Can be fully tested by selecting a topic with existing responses and propositions, then verifying that the right panel displays relevant metadata while the center panel shows the conversation. Delivers value by eliminating the need to scroll or switch between conversation and analysis.

**Acceptance Scenarios**:

1. **Given** a user is reading a conversation in the center panel, **When** they scroll through responses, **Then** the right panel remains visible showing contextual metadata
2. **Given** a response mentions a proposition, **When** the user hovers over or focuses on that response, **Then** the right panel highlights or scrolls to the related proposition
3. **Given** a user wants to see all propositions, **When** they view the right panel, **Then** they see a list of propositions with current alignment scores (support/oppose/nuanced percentages)
4. **Given** a user selects a specific proposition in the right panel, **When** they click it, **Then** the center panel scrolls to or highlights responses related to that proposition
5. **Given** a conversation has bridging suggestions available, **When** the user views the right panel, **Then** they see a summary of common ground areas and key bridges in a collapsible section

---

### User Story 3 - Composing Responses with Real-Time Feedback (Priority: P2)

A user composes a response while receiving real-time AI feedback on bias, tone, and clarity, without leaving the conversation view.

**Why this priority**: This preserves reasonBridge's unique value proposition (AI-assisted constructive dialogue) within the new chat-style interface. While not strictly necessary for navigation/viewing (P1 features), it's critical for the platform's core mission. Can be tested independently by composing a response and verifying feedback appears.

**Independent Test**: Can be fully tested by clicking "Reply" in the center panel, typing a response, and verifying that preview feedback appears in the right panel (or inline). Delivers value by providing immediate feedback during composition without disrupting the flow.

**Acceptance Scenarios**:

1. **Given** a user clicks "Reply" on a response, **When** the compose area appears, **Then** it expands inline in the conversation thread (not a separate modal or page)
2. **Given** a user is typing a response with 20+ characters, **When** they pause typing, **Then** preview feedback appears in the right panel or inline within 2 seconds
3. **Given** preview feedback identifies a potential bias, **When** the user views the feedback, **Then** they see the specific issue, severity level, and suggested rewording
4. **Given** a user wants detailed feedback before posting, **When** they click "Request Full Feedback", **Then** a comprehensive analysis appears in the right panel without closing the compose area
5. **Given** a user has addressed all feedback issues, **When** the feedback updates, **Then** they see a "Ready to Post" indicator with positive confirmation
6. **Given** a user submits a response, **When** the submission succeeds, **Then** the new response appears immediately in the conversation thread and the compose area clears

---

### User Story 4 - Exploring Common Ground and Bridging Suggestions (Priority: P3)

A user wants to understand areas of consensus and potential bridges between opposing viewpoints without leaving the conversation context.

**Why this priority**: This is an advanced analytical feature that enhances understanding but isn't required for basic participation. Users can read, compose, and engage without ever accessing common ground analysis. Can be tested independently by verifying the right panel displays common ground when available.

**Independent Test**: Can be fully tested by selecting a topic with sufficient responses for analysis, then verifying the right panel shows common ground zones, misunderstandings, and disagreements. Delivers value by surfacing consensus areas that might otherwise be buried in long threads.

**Acceptance Scenarios**:

1. **Given** a topic has common ground analysis available, **When** a user views the right panel, **Then** they see an overall consensus score with a visual indicator (progress bar or gauge)
2. **Given** a user wants to see agreement zones, **When** they expand the "Common Ground" section in the right panel, **Then** they see a list of propositions with high agreement percentages
3. **Given** a user clicks on a specific common ground area, **When** they interact with it, **Then** the center panel highlights or filters responses related to that area of agreement
4. **Given** a conversation has identified misunderstandings, **When** the user views the "Misunderstandings" section, **Then** they see conflicting term definitions with explanations
5. **Given** bridging suggestions exist between opposing viewpoints, **When** the user views the "Bridges" section, **Then** they see suggested language that connects different positions, with confidence scores
6. **Given** a user wants detailed analysis, **When** they click "View Full Analysis" in the right panel, **Then** an expanded view or modal shows comprehensive common ground breakdown with reasoning

---

### User Story 5 - Responsive Experience on Tablet and Mobile (Priority: P3)

A user on a tablet or mobile device accesses discussions with an adapted layout that preserves core functionality while fitting smaller screens.

**Why this priority**: Mobile access is important for reach, but most constructive dialogue (long-form reading and composition) happens on desktop. The three-panel design inherently targets desktop-first. Mobile can be a simplified experience initially. Can be tested independently by resizing browser or using device emulation.

**Independent Test**: Can be fully tested by accessing the page on a tablet (768px width) or mobile device (375px width) and verifying that panels collapse/stack appropriately while maintaining core functions (read, compose, navigate). Delivers value by ensuring the platform is accessible beyond desktop.

**Acceptance Scenarios**:

1. **Given** a user accesses the page on a tablet (768-1024px width), **When** the page loads, **Then** the left panel collapses into a hamburger menu or narrow icon bar, and the center + right panels share the screen
2. **Given** a user accesses the page on mobile (< 768px width), **When** the page loads, **Then** panels stack vertically (topic selector at top, conversation in middle, metadata accordion at bottom)
3. **Given** a mobile user is reading a conversation, **When** they tap a response, **Then** contextual metadata for that response expands inline or in a bottom sheet
4. **Given** a mobile user wants to compose a response, **When** they tap "Reply", **Then** the compose area takes over the viewport with a "Back to Conversation" button
5. **Given** a tablet user wants to see the topic list, **When** they tap the hamburger menu icon, **Then** the left panel slides in as an overlay, and tapping outside it or pressing "X" closes it

---

### Edge Cases

**Panel Management**:
- What happens when a user has a very small desktop viewport (< 1280px) but not tablet-sized? The right panel should collapse or convert to a toggle/drawer to prioritize conversation space.
- What happens when a topic has no propositions or metadata yet? The right panel should show an empty state with helpful text (e.g., "No propositions yet - create one by responding below").
- What happens when the left panel topic list has hundreds of topics? Implement virtual scrolling or pagination to prevent performance degradation.

**Real-Time Updates**:
- What happens when another user posts a response while the current user is reading? A subtle notification appears at the top of the conversation ("3 new responses - Click to load") rather than auto-scrolling and disrupting reading position.
- What happens when common ground analysis updates while a user is viewing it? The right panel shows a "Updated - Refresh to see changes" indicator rather than jarring content replacement.

**Composition Conflicts**:
- What happens when a user is composing a response and navigates to a different topic? Show a confirmation dialog ("You have an unsaved response - Discard or Save as Draft?") before switching topics.
- What happens when preview feedback is loading but the user immediately posts? Disable the "Post" button until initial feedback completes, or show a warning ("Feedback still loading - Post anyway?").

**Accessibility**:
- What happens when a keyboard-only user navigates the interface? All panels and interactions must be fully keyboard accessible with visible focus indicators and logical tab order (left → center → right).
- What happens when a screen reader user accesses the page? Use ARIA landmarks (navigation for left panel, main for center, complementary for right) and announce panel changes via live regions.

**Data Errors**:
- What happens when the API fails to load topic data? Show an error state in the center panel with a "Retry" button, but keep the left panel functional for navigating to other topics.
- What happens when bridging suggestions fail to load? The right panel section shows an error message ("Unable to load bridging suggestions") without breaking other sections (propositions, common ground).

## Requirements _(mandatory)_

### Functional Requirements

**Layout & Structure**:
- **FR-001**: System MUST display a three-panel horizontal layout on desktop viewports (≥1280px): left navigation panel (280-320px), center conversation panel (fluid), right metadata panel (320-400px)
- **FR-002**: System MUST allow independent scrolling for each panel (scrolling center panel does not affect left/right panels)
- **FR-003**: System MUST support responsive breakpoints: desktop (≥1280px - 3 panels), tablet (768-1279px - collapsible left, center+right), mobile (<768px - stacked vertical)
- **FR-004**: System MUST persist panel width preferences per user session (if user resizes a panel, it remembers the size until they close the browser)

**Left Panel - Topic Navigation**:
- **FR-005**: System MUST display a list of topics with title, participant count, response count, and last activity timestamp
- **FR-006**: System MUST indicate unread topics or new activity with visual badges or highlight styles
- **FR-007**: Users MUST be able to search/filter topics by keyword in real-time without server round-trips for the initial filter
- **FR-008**: System MUST support topic sorting options (most recent activity, most participants, alphabetical, user-created)
- **FR-009**: Users MUST be able to select a topic and load its conversation in the center panel without a full page refresh

**Center Panel - Conversation**:
- **FR-010**: System MUST display responses in chronological order (earliest at top, newest at bottom) with clear visual separation between responses
- **FR-011**: Each response MUST show author name, avatar (or initials), timestamp, and content with proper text formatting
- **FR-012**: System MUST display response metadata inline (opinion/factual claim badges, cited sources count) without expanding by default
- **FR-013**: Users MUST be able to expand cited sources inline to view URLs and validation status
- **FR-014**: System MUST provide a "Reply" button/link on each response that expands an inline compose area threaded to that response
- **FR-015**: System MUST show a top-level compose area at the bottom of the conversation for new responses
- **FR-016**: System MUST automatically scroll to the bottom when a user submits a new response
- **FR-017**: System MUST display a "New responses available" notification when other users post while the current user is viewing, with a click-to-load action

**Right Panel - Metadata & Analysis**:
- **FR-018**: System MUST display multiple collapsible sections: Propositions, Common Ground, Bridging Suggestions, Topic Info
- **FR-019**: System MUST show proposition list with alignment summary (% support/oppose/nuanced) and allow users to click to filter/highlight related responses in the center panel
- **FR-020**: System MUST display common ground analysis when available, including overall consensus score, agreement zones, misunderstandings, and disagreements
- **FR-021**: System MUST show bridging suggestions with source/target positions, bridging language, and confidence scores
- **FR-022**: System MUST display topic metadata (description, tags, status, diversity score) in a dedicated section
- **FR-023**: System MUST show "No data available" empty states for sections without content (e.g., no common ground analysis yet)

**Composition & Feedback Integration**:
- **FR-024**: System MUST show preview feedback in the right panel when a user is composing a response (after 20+ characters typed)
- **FR-025**: System MUST update preview feedback within 2 seconds of the user pausing typing
- **FR-026**: Preview feedback MUST display identified issues (bias, tone, fallacies, clarity) with severity indicators
- **FR-027**: Users MUST be able to request full on-demand feedback via a button in the compose area
- **FR-028**: System MUST display a "Ready to Post" indicator when preview feedback shows no blocking issues
- **FR-029**: System MUST validate cited source URLs before allowing submission
- **FR-030**: System MUST clear the compose area and show the new response immediately upon successful submission

**Interaction & Navigation**:
- **FR-031**: Users MUST be able to resize panel widths by dragging dividers between panels (desktop only)
- **FR-032**: System MUST provide keyboard navigation shortcuts (arrow keys for topic selection, Ctrl+F for search focus, Esc to close compose areas)
- **FR-033**: System MUST show loading skeletons or spinners during data fetching to indicate progress
- **FR-034**: System MUST support deep linking (URL changes when a topic is selected, allowing bookmarks and direct links)

**Mobile & Responsive**:
- **FR-035**: On tablet viewports (768-1279px), system MUST collapse the left panel into a hamburger menu or slide-out drawer
- **FR-036**: On mobile viewports (<768px), system MUST stack panels vertically: topic selector dropdown/accordion at top, conversation in middle, metadata in collapsible sections below
- **FR-037**: On mobile, system MUST expand the compose area to full viewport when activated, with a "Back to Conversation" action
- **FR-038**: System MUST support touch gestures for mobile (swipe to open/close left panel, pull-to-refresh for new responses)

**Accessibility**:
- **FR-039**: System MUST use semantic HTML and ARIA landmarks (navigation, main, complementary) for panel structure
- **FR-040**: System MUST support keyboard-only navigation with visible focus indicators and logical tab order
- **FR-041**: System MUST announce dynamic content changes (new responses, feedback updates) to screen readers via ARIA live regions
- **FR-042**: System MUST maintain sufficient color contrast (WCAG AA minimum) for text and interactive elements

**Performance**:
- **FR-043**: System MUST implement virtual scrolling or pagination for topic lists exceeding 100 items to prevent performance degradation
- **FR-044**: System MUST implement virtual scrolling for conversation threads exceeding 200 responses
- **FR-045**: System MUST debounce search input and preview feedback requests to avoid excessive API calls
- **FR-046**: System MUST cache topic metadata and common ground analysis for recently viewed topics (in-memory session cache)

### Key Entities _(data model unchanged)_

- **Topic**: Represents a discussion topic (title, description, status, participant/response counts, tags, diversity score, timestamps)
- **Response**: Represents a single response/message in a conversation (content, author, parent response ID for threading, cited sources, metadata flags, propositions, status, timestamps)
- **Proposition**: A key claim or statement extracted from responses (text, alignment data, related response IDs)
- **PreviewFeedback**: Real-time AI feedback during composition (feedback items array, primary issue, ready-to-post flag, summary, analysis time)
- **CommonGroundAnalysis**: Aggregated analysis of a topic conversation (consensus score, agreement zones, misunderstandings, disagreements, participant count, last updated timestamp)
- **BridgingSuggestion**: AI-generated bridge between opposing viewpoints (source position, target position, bridging language, common ground explanation, reasoning, confidence score)
- **CitedSource**: A reference URL provided by a user (URL, validation status, fetch metadata)

## Success Criteria _(mandatory)_

### Measurable Outcomes

**User Efficiency**:
- **SC-001**: Users can navigate between topics and view conversation content within 1 second of clicking a topic (excluding network latency for initial data fetch)
- **SC-002**: Users can access metadata (propositions, common ground) without scrolling or leaving the conversation view (verified via usability testing - 90% of users find metadata within 5 seconds)

**Engagement & Usability**:
- **SC-003**: 80% of users successfully use the three-panel layout without training or tooltips (measured via first-time user testing)
- **SC-004**: Average time to compose and submit a response decreases by 20% compared to the current vertical layout (measured via analytics tracking)
- **SC-005**: Users viewing preview feedback during composition show 30% reduction in bias-flagged posted responses (measured via before/after comparison)

**Technical Performance**:
- **SC-006**: Panel resizing and topic switching interactions complete within 100ms (measured via performance profiling)
- **SC-007**: Page load time for the discussion interface remains under 3 seconds on standard broadband (measured via Lighthouse performance score)
- **SC-008**: Virtual scrolling handles 500+ responses in a conversation thread without frame drops or jank (60fps maintained during scrolling)

**Accessibility**:
- **SC-009**: Interface achieves WCAG 2.1 AA compliance (verified via automated and manual accessibility audits)
- **SC-010**: Keyboard-only users can navigate all core functions (select topic, read responses, compose reply, view metadata) without a mouse (verified via keyboard-only user testing)

**Responsive Design**:
- **SC-011**: Mobile users (viewport <768px) can successfully read conversations, compose responses, and view basic metadata (verified via mobile device testing)
- **SC-012**: Tablet users can access all desktop features with adapted layout (collapsible left panel, shared center+right panels) without functional loss

**Feature Adoption**:
- **SC-013**: 60% of users who view a conversation also interact with the right panel metadata (measured via click-through analytics on propositions, common ground, or bridging suggestions)
- **SC-014**: Users posting responses with preview feedback enabled show 50% higher "Ready to Post" compliance before submission (measured via feedback API logs)

## Assumptions

1. **Desktop-First Design**: The primary user base engages in long-form discussions on desktop devices (≥1280px viewports). Mobile/tablet support is important but secondary.
2. **Existing API Compatibility**: Backend APIs for topics, responses, propositions, common ground, bridging suggestions, and preview feedback remain unchanged or require only minor adjustments for pagination/filtering.
3. **Real-Time Infrastructure**: WebSocket infrastructure for live updates (new responses, common ground updates) already exists and can be extended for the new layout.
4. **Browser Support**: Target modern browsers (Chrome/Edge/Firefox/Safari last 2 versions) with ES6+ and CSS Grid support. No IE11 support required.
5. **Session-Based Preferences**: Panel width and collapsed/expanded states are session-only (not persisted to user profiles). Users reset preferences on browser close.
6. **Virtual Scrolling Library**: Use an existing library (react-window, react-virtualized) for efficient rendering of long lists rather than building custom virtualization.
7. **AI Feedback Latency**: Preview feedback API responds within 1-2 seconds under normal load. UI must handle graceful degradation if latency exceeds 5 seconds.
8. **Incremental Rollout**: New design can be released behind a feature flag initially, allowing A/B testing or opt-in beta before full rollout.
9. **Content Moderation**: Existing moderation tools and status indicators (hidden/removed responses) integrate into the new layout without additional features.
10. **Backward Compatibility**: Old URLs and bookmarks to specific topics/discussions continue to work after the redesign (routing structure may change internally but redirects are provided).

## Dependencies

**External Dependencies**:
- No new external services required (uses existing AI feedback, common ground, and bridging suggestion APIs)

**Internal Dependencies**:
- React 18 with hooks and concurrent rendering for smooth UI updates
- Existing TypeScript types for Topic, Response, Proposition, CommonGroundAnalysis, BridgingSuggestion, PreviewFeedback
- WebSocket hooks (useCommonGroundUpdates) extended for real-time response notifications
- API client hooks (useTopic, useResponses, useCommonGroundAnalysis, usePreviewFeedback) remain functional with potential pagination enhancements
- Tailwind CSS for responsive layout and panel styling
- React Router for URL-based topic navigation and deep linking

**Potential Blockers**:
- Common ground analysis type mismatch (noted in current codebase comments) must be resolved before integrating into right panel
- API pagination support needed if topic lists or response threads exceed virtual scrolling thresholds
- WebSocket scaling for real-time notifications if user concurrency increases significantly

## Out of Scope

**Explicitly Excluded from this Feature**:
1. **Threaded Replies (Phase 5)**: Nested response threading is a separate future feature. This redesign maintains chronological flat response order.
2. **Voting/Reactions**: Vote buttons and reaction emojis are not part of this layout redesign (separate feature).
3. **Moderation UI Enhancements**: Moderation controls remain as-is; no new moderation workflows or bulk actions.
4. **Notification System Changes**: Real-time notifications for new responses are in-page only (no email, push, or notification center integration).
5. **Topic Creation/Editing**: This redesign focuses on viewing/discussing existing topics. Topic creation forms and admin editing are unchanged.
6. **User Profile Integration**: Author avatars and names link to profiles, but no profile panel or user-specific analysis in the right panel.
7. **Advanced Filtering**: No multi-criteria filtering (by author, date range, proposition) beyond basic keyword search in the left panel.
8. **Offline Support**: No service worker or offline mode. Requires active internet connection.
9. **Collaboration Features**: No real-time co-editing, presence indicators (who's online), or typing indicators.
10. **Customization Settings**: No user preferences for panel order, color themes, font sizes, or layout density (future enhancement).

## Open Questions

None - all potential ambiguities have been addressed with informed assumptions documented above.
