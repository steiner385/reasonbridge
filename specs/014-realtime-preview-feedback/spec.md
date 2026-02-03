# Feature Specification: Real-Time Preview Feedback

**Feature Branch**: `014-realtime-preview-feedback`
**Created**: 2026-02-02
**Status**: Draft
**Input**: User description: "Real-time preview feedback for draft content - Provide AI-generated feedback to users as they compose responses, before posting. This helps users reflect on tone, language, content quality, and research quality ahead of time, supporting the core principle of keeping conversations productive."

## Clarifications

### Session 2026-02-02

- Q: Does the preview feedback endpoint require authentication? → A: Yes, require authentication - only logged-in users can request preview feedback
- Q: Where does feedback appear in the UI? → A: Inline panel below compose area - feedback appears directly beneath the text input
- Q: What rate limiting applies to the preview feedback endpoint? → A: Conservative - 10 requests per minute per user

## Overview

ReasonBridge's core mission is to help users keep conversations productive. This feature provides AI-generated feedback to users **while they compose** their responses, before posting. By showing potential issues (inflammatory language, logical fallacies, unsourced claims, bias) in real-time, users can reflect on and improve their contributions before they enter the discussion.

This represents a philosophical shift from "feedback after the fact" to "coaching during composition" - empowering users to self-correct and learn constructive communication habits.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Feedback While Composing (Priority: P1)

As a discussion participant composing a response, I want to see AI feedback about my draft content before I post it, so I can improve my message and contribute more constructively to the conversation.

**Why this priority**: This is the core value proposition - without real-time feedback during composition, the feature provides no value.

**Independent Test**: Can be tested by opening a discussion, typing draft content in the compose area, and observing feedback appearing without posting the message.

**UI Behavior**: Feedback appears in an inline panel directly below the compose text area, keeping the user's focus on their content while providing immediate visibility of suggestions.

**Acceptance Scenarios**:

1. **Given** a user is composing a response in a discussion, **When** they have typed at least 20 characters, **Then** the system displays AI feedback in an inline panel below the compose area without requiring submission
2. **Given** a user is viewing feedback on draft content, **When** they modify their draft, **Then** the feedback updates to reflect the changes
3. **Given** a user's draft contains no detected issues, **When** feedback is displayed, **Then** they see an affirmation that their response is constructive

---

### User Story 2 - Understand Specific Issues (Priority: P1)

As a discussion participant receiving feedback on my draft, I want to see all detected issues (not just the most critical), so I can understand the full picture and address multiple concerns before posting.

**Why this priority**: Showing only one issue at a time would require multiple edit-check cycles, slowing the user down and providing incomplete guidance.

**Independent Test**: Can be tested by composing content with multiple issues (e.g., inflammatory language AND an unsourced claim) and verifying all issues appear in the feedback.

**Acceptance Scenarios**:

1. **Given** a user's draft contains multiple types of issues (e.g., inflammatory language and a logical fallacy), **When** feedback is displayed, **Then** all detected issues are shown, sorted by severity
2. **Given** a user sees multiple feedback items, **When** viewing each item, **Then** they can see the specific issue type, a suggestion for improvement, and reasoning explaining why this was flagged
3. **Given** a user's draft triggers feedback, **When** viewing the feedback, **Then** they see a summary message indicating overall readiness to post

---

### User Story 3 - Ready-to-Post Indicator (Priority: P2)

As a discussion participant, I want to know when my draft is ready to post (no critical issues), so I can post with confidence that my contribution will be constructive.

**Why this priority**: Important for user confidence but depends on core feedback functionality being in place.

**Independent Test**: Can be tested by composing content with and without critical issues and verifying the ready-to-post indicator reflects the content state.

**Acceptance Scenarios**:

1. **Given** a user's draft has no critical issues (fallacies or inflammatory language above threshold), **When** feedback is displayed, **Then** a "ready to post" indicator is shown
2. **Given** a user's draft contains a critical issue (high-confidence fallacy or inflammatory language), **When** feedback is displayed, **Then** the indicator suggests revision before posting
3. **Given** a user sees "ready to post", **When** they post the response, **Then** the submission proceeds normally

---

### User Story 4 - Adjust Feedback Sensitivity (Priority: P3)

As a discussion participant, I want to adjust how sensitive the feedback system is, so I can see more or fewer suggestions based on my preference.

**Why this priority**: Enhances user experience but not required for core functionality.

**Independent Test**: Can be tested by changing sensitivity level and observing different amounts of feedback for the same content.

**Acceptance Scenarios**:

1. **Given** a user has set feedback sensitivity to "Low", **When** composing content, **Then** they see feedback for items with confidence score 0.5 or higher (more suggestions)
2. **Given** a user has set feedback sensitivity to "Medium" (default), **When** composing content, **Then** they see feedback for items with confidence score 0.7 or higher
3. **Given** a user has set feedback sensitivity to "High", **When** composing content, **Then** they see feedback only for items with confidence score 0.85 or higher (fewer, higher-confidence suggestions)

---

### Edge Cases

- **Minimum content length**: Content under 20 characters does not trigger analysis; no feedback is displayed until threshold is met
- **Service unavailability**: If feedback service is unavailable, the compose experience continues normally without feedback; user can still post
- **Non-English content**: Current analyzers are English-focused; non-English content may receive reduced feedback accuracy
- **Rapid typing (debounce)**: Analysis requests are debounced to avoid excessive processing; feedback updates after typing pauses
- **Draft cleared**: When user clears their draft, feedback is also cleared
- **Network latency**: If analysis takes longer than expected, feedback appears when ready; compose remains functional
- **Rate limit exceeded**: If user exceeds 10 requests/minute, subsequent requests return gracefully without feedback; compose remains functional; user can still post

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST analyze draft content without requiring the content to be stored in the database
- **FR-002**: System MUST return ALL detected feedback items, not just the highest-confidence single item
- **FR-003**: System MUST provide a "ready to post" indicator based on absence of critical issues
- **FR-004**: System MUST provide a summary message describing overall feedback status
- **FR-005**: System MUST support three sensitivity levels (Low, Medium, High) with configurable confidence thresholds
- **FR-006**: System MUST return feedback within performance target for real-time feel (see Success Criteria)
- **FR-007**: System MUST analyze content for tone/inflammatory language detection
- **FR-008**: System MUST analyze content for logical fallacy detection
- **FR-009**: System MUST analyze content for clarity issues
- **FR-010**: System MUST include analysis time in response for performance monitoring
- **FR-011**: System MUST accept optional discussion/topic context for context-aware analysis
- **FR-012**: System MUST continue to function (allow posting) even if feedback service is unavailable
- **FR-013**: System MUST require minimum content length (20 characters) for meaningful analysis
- **FR-014**: Each feedback item MUST include: type, suggestion text, reasoning, and confidence score
- **FR-015**: System MUST require user authentication to access preview feedback (no anonymous access)
- **FR-016**: System MUST enforce rate limiting of 10 requests per minute per authenticated user

### Feedback Types

The preview feedback system analyzes content for the following issue types:

| Type         | Description                                  | Example Trigger                                     |
| ------------ | -------------------------------------------- | --------------------------------------------------- |
| FALLACY      | Logical reasoning errors                     | "Everyone knows this is true" (appeal to popularity) |
| INFLAMMATORY | Personal attacks or hostile language         | "Anyone who disagrees is an idiot"                  |
| UNSOURCED    | Statistical or factual claims without support | "Studies show 90% of people agree"                  |
| BIAS         | One-sided framing or perspective             | Dismissing opposing viewpoints without consideration |
| AFFIRMATION  | Positive feedback when no issues detected    | Well-reasoned, constructive content                 |

### Key Entities

- **PreviewFeedbackRequest**: Represents a request to analyze draft content
  - Content to analyze (string, min 20 chars)
  - Optional discussion/topic context (for semantic caching)
  - Optional sensitivity level preference

- **PreviewFeedbackResult**: Represents the complete feedback response
  - Collection of all detected feedback items
  - Primary/highest-priority feedback item (if any issues exist)
  - Ready-to-post indicator (boolean)
  - Summary message for user
  - Analysis time in milliseconds

- **FeedbackItem**: Represents a single detected issue or affirmation
  - Type (FALLACY, INFLAMMATORY, UNSOURCED, BIAS, AFFIRMATION)
  - Optional subtype (e.g., "strawman", "ad_hominem", "statistical_claim")
  - Suggestion text (actionable advice)
  - Reasoning (explanation for the user)
  - Confidence score (0.0 to 1.0)
  - Optional educational resources

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users receive feedback within 500 milliseconds of content analysis request for responsive real-time feel
- **SC-002**: 95% of analysis requests complete successfully without error
- **SC-003**: Users who receive "revision suggested" feedback and subsequently edit their content show improved content quality (reduced critical issues) in 70% of cases
- **SC-004**: Feedback correctly identifies inflammatory language with at least 85% precision
- **SC-005**: Feedback correctly identifies logical fallacies with at least 75% precision
- **SC-006**: The compose experience remains fully functional (users can type and post) even when feedback service is unavailable
- **SC-007**: Users report that feedback helps them improve their responses (satisfaction survey: 4+ out of 5 rating)

## Assumptions

1. **Language**: Content analysis is primarily optimized for English; other languages may have reduced accuracy
2. **Debouncing**: Frontend will implement debouncing (300-500ms) to avoid excessive API calls during rapid typing
3. **Graceful Degradation**: If any analyzer component fails, the system returns partial results rather than failing entirely
4. **No Storage**: Preview feedback is ephemeral and not persisted to the database (unlike post-submission feedback)
5. **Semantic Caching**: Optional topic/discussion context enables semantic caching for improved performance on similar content

## Out of Scope

- Feedback on images or media attachments
- Real-time collaboration (multiple users composing simultaneously)
- Feedback in languages other than English
- Storing or tracking preview feedback for analytics (only post-submission feedback is stored)
- Integration with external fact-checking APIs for source verification
