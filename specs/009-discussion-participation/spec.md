# Feature Specification: Discussion Participation

**Feature Branch**: `009-discussion-participation`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "Enable users to create and participate in discussions - posting responses, replying to others, viewing threaded conversations, and editing their contributions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a New Discussion (Priority: P1)

A verified user wants to initiate a discussion on a topic they're passionate about. They select a topic from their interests, provide a title and initial perspective, optionally cite sources, and publish the discussion. Other users can then discover and join the conversation.

**Why this priority**: This is the foundation of the platform - without the ability to start discussions, there's no content for users to engage with. This creates the initial value and attracts other participants.

**Independent Test**: Can be fully tested by having a user navigate to a topic, click "Start Discussion", fill in the form with title and initial response, and verify the discussion appears in the topic's discussion list.

**Acceptance Scenarios**:

1. **Given** an authenticated user viewing a topic page, **When** they click "Start Discussion", **Then** they see a form to enter a discussion title and their opening perspective
2. **Given** a user entering a discussion title, **When** they attempt to submit without content, **Then** they see validation errors prompting them to provide their initial perspective
3. **Given** a user completing the discussion form, **When** they click "Publish Discussion", **Then** the discussion is created and they are redirected to view it
4. **Given** a newly created discussion, **When** other users browse the topic, **Then** they see the discussion listed with the creator's name, title, and timestamp
5. **Given** a user creating a discussion with source citations, **When** they publish, **Then** the cited sources are displayed with the initial response

---

### User Story 2 - Post Responses to Discussions (Priority: P1)

A user discovers an interesting discussion and wants to contribute their perspective. They read existing responses, compose their own viewpoint with optional citations, and post it. Their response becomes part of the threaded conversation, and they can see how others engage with it.

**Why this priority**: This is the core interaction - enabling multi-perspective dialogue. Without response posting, discussions are monologues. This priority equals Story 1 because both are essential for the minimum viable discussion platform.

**Independent Test**: Can be fully tested by having a user view an existing discussion, click "Add Response", write their perspective, and verify their response appears in the thread with proper threading.

**Acceptance Scenarios**:

1. **Given** a user viewing a discussion, **When** they click "Add Response", **Then** they see a text editor to compose their contribution
2. **Given** a user composing a response, **When** they write and click "Post Response", **Then** their response appears at the bottom of the thread with their profile information
3. **Given** a user posting a response with citations, **When** they submit, **Then** the cited sources are displayed alongside their response
4. **Given** a response being posted, **When** it's successfully saved, **Then** the user receives confirmation and can immediately see their contribution
5. **Given** a user viewing responses, **When** they see their own response, **Then** it's visually distinguished and shows edit/delete options

---

### User Story 3 - Reply to Specific Responses (Priority: P2)

A user wants to respond directly to another user's specific point rather than adding a general comment. They click "Reply" on a response, write their counter-perspective or supporting argument, and post it. The reply is threaded under the original response, making the conversation structure clear.

**Why this priority**: Threading creates clarity in complex discussions and allows focused dialogue between participants. While essential for quality discussions, the platform can function with top-level responses only initially.

**Independent Test**: Can be fully tested by having a user click "Reply" on an existing response, compose a reply, and verify it appears nested under the original with visual indentation.

**Acceptance Scenarios**:

1. **Given** a user viewing a response, **When** they click "Reply" beneath it, **Then** they see a reply editor focused on that specific response
2. **Given** a user composing a reply, **When** they submit it, **Then** it appears nested under the parent response with visual threading indicators
3. **Given** a deeply nested thread (3+ levels), **When** a user adds a reply, **Then** the threading maintains readability with appropriate indentation limits
4. **Given** a user posting a reply, **When** the parent response author has notifications enabled, **Then** they receive a notification about the reply
5. **Given** a threaded conversation, **When** users view it, **Then** they can collapse/expand threads to navigate complex discussions

---

### User Story 4 - Edit Own Contributions (Priority: P3)

A user realizes they made a typo or wants to refine their argument after posting. They click "Edit" on their response, make changes, and save. The edited response shows an "edited" indicator with timestamp, maintaining transparency while allowing improvement.

**Why this priority**: Allows users to refine their thinking and correct mistakes, improving discussion quality. However, read-only discussions are viable initially, making this a lower priority than creation and response.

**Independent Test**: Can be fully tested by having a user edit their own response, save changes, and verify the updated content appears with an edit indicator and history.

**Acceptance Scenarios**:

1. **Given** a user viewing their own response, **When** they click "Edit", **Then** they see their response content in an editable form
2. **Given** a user editing their response, **When** they save changes, **Then** the updated content appears with an "(edited)" indicator
3. **Given** an edited response, **When** users view it, **Then** they can see the edit timestamp
4. **Given** a response that has been replied to, **When** the author edits it significantly, **Then** a note indicates the response was modified after replies were posted
5. **Given** a user editing multiple times, **When** they view edit history, **Then** they see previous versions with timestamps (optional transparency feature)

---

### User Story 5 - Delete Own Contributions (Priority: P3)

A user wants to remove a response they regret posting or that's no longer relevant. They click "Delete" on their response, confirm the action, and the response is removed. If the response has replies, it's replaced with "[deleted]" placeholder to maintain thread integrity.

**Why this priority**: Gives users control over their content and supports the "assume good intent" philosophy by allowing mistake correction. Less critical than creation/editing for initial MVP.

**Independent Test**: Can be fully tested by having a user delete their response (with and without replies) and verifying appropriate removal/placeholder behavior.

**Acceptance Scenarios**:

1. **Given** a user viewing their own response without replies, **When** they click "Delete" and confirm, **Then** the response is completely removed from the thread
2. **Given** a user deleting a response with child replies, **When** they confirm deletion, **Then** the response content is replaced with "[deleted by author]" while maintaining the thread structure
3. **Given** a user attempting to delete, **When** they click "Delete", **Then** they see a confirmation dialog explaining the action is permanent
4. **Given** a deleted response, **When** other users view the thread, **Then** they see the placeholder but replies remain visible and threaded
5. **Given** a discussion started by a user, **When** they attempt to delete it, **Then** they're warned that deleting the root discussion affects all participants

---

### User Story 6 - View Discussion Activity and Metrics (Priority: P4)

A user browsing discussions wants to gauge which conversations are active and engaging. They see metrics like response count, participant count, last activity timestamp, and engagement indicators. This helps them choose where to invest their time and attention.

**Why this priority**: Improves discovery and helps users find active, high-quality discussions. Essential for scaling but not needed for basic participation functionality.

**Independent Test**: Can be fully tested by viewing a topic's discussion list and verifying accurate metrics (response counts, participant counts, timestamps) are displayed for each discussion.

**Acceptance Scenarios**:

1. **Given** a user viewing a discussion list, **When** they browse, **Then** each discussion shows response count, participant count, and last activity time
2. **Given** an active discussion with recent responses, **When** users view the list, **Then** it's visually highlighted or sorted by activity
3. **Given** a user viewing discussion metrics, **When** they click on participant count, **Then** they see the list of users who have contributed
4. **Given** discussions with varying engagement levels, **When** users browse, **Then** they can sort by activity, response count, or recency
5. **Given** a stale discussion (no activity for 30+ days), **When** users view it, **Then** it's marked as "inactive" but remains accessible

---

### Edge Cases

- **What happens when a user tries to respond to a deleted discussion?** The discussion is locked with a message indicating it's no longer available for responses
- **How does the system handle extremely long responses (10,000+ words)?** Response length is limited to 5,000 words with a character counter; users can split into multiple responses if needed
- **What happens when two users try to edit the same response simultaneously?** The system uses optimistic locking; the second save attempt fails with a warning to refresh and try again
- **How does threading work beyond 5 levels deep?** Threading visually flattens after level 5 but maintains logical parent relationships; users can click to expand full thread paths
- **What happens when a user deletes their account but has active discussions?** Discussions remain with author shown as "[deleted user]" to preserve community value
- **How are citations validated?** Citations are stored as URLs with optional description; broken links are periodically checked and flagged but not blocked at posting time
- **What happens when a discussion receives no responses for extended periods?** Discussions without activity for 90 days are marked as "archived" but remain searchable and can be revived with new responses
- **How does the system handle rapid response posting (potential spam)?** Rate limiting restricts users to 10 responses per minute; repeated rapid posting triggers review

## Requirements *(mandatory)*

### Functional Requirements

**Discussion Creation**

- **FR-001**: System MUST allow verified users to create new discussions within topics they've selected during onboarding
- **FR-002**: System MUST require a discussion title (minimum 10 characters, maximum 200 characters) and initial response content (minimum 50 characters, maximum 5,000 words)
- **FR-003**: System MUST allow users to optionally attach citations (URLs with descriptions) to their initial discussion post
- **FR-004**: System MUST associate each discussion with exactly one topic and track the creating user
- **FR-005**: System MUST generate a unique, shareable URL for each discussion upon creation

**Response Posting**

- **FR-006**: System MUST allow any authenticated user to post responses to discussions in their selected topics
- **FR-007**: System MUST support threaded responses where users can reply to specific responses (not just top-level responses)
- **FR-008**: System MUST limit response content to 5,000 words and provide real-time character/word count feedback
- **FR-009**: System MUST allow users to attach citations (URLs with optional descriptions) to responses
- **FR-010**: System MUST preserve response order chronologically within each thread level
- **FR-011**: System MUST validate that parent responses exist before allowing threaded replies

**Content Management**

- **FR-012**: System MUST allow users to edit their own responses within 24 hours of posting
- **FR-013**: System MUST mark edited responses with an "edited" indicator and timestamp
- **FR-014**: System MUST allow users to delete their own responses at any time
- **FR-015**: System MUST replace deleted responses that have child replies with a "[deleted by author]" placeholder to maintain thread integrity
- **FR-016**: System MUST completely remove deleted responses that have no child replies
- **FR-017**: System MUST prevent editing of responses that have been cited in common ground analysis or fact-check reports

**Discussion Navigation**

- **FR-018**: System MUST display discussions in a list view showing title, creator, response count, participant count, and last activity timestamp
- **FR-019**: System MUST allow users to sort discussions by recency, activity, or response count
- **FR-020**: System MUST support threaded response visualization with indentation for up to 5 nesting levels
- **FR-021**: System MUST allow users to collapse and expand threaded conversations
- **FR-022**: System MUST provide pagination for discussions with more than 50 responses

**Permissions and Access Control**

- **FR-023**: System MUST restrict discussion creation to users with verification level BASIC or higher
- **FR-024**: System MUST allow response posting by all authenticated users regardless of verification level
- **FR-025**: System MUST restrict edit/delete operations to the original response author only
- **FR-026**: System MUST prevent deleted or suspended users from creating discussions or posting responses

**Data Integrity**

- **FR-027**: System MUST track creation timestamp, last modified timestamp, and edit history for all responses
- **FR-028**: System MUST validate citation URLs are properly formed before accepting them
- **FR-029**: System MUST maintain referential integrity when discussions or responses are deleted
- **FR-030**: System MUST prevent orphaned responses by cascading deletes appropriately

**Rate Limiting and Abuse Prevention**

- **FR-031**: System MUST rate-limit response posting to maximum 10 responses per user per minute
- **FR-032**: System MUST rate-limit discussion creation to maximum 5 discussions per user per day
- **FR-033**: System MUST flag users who exceed rate limits for potential review
- **FR-034**: System MUST prevent duplicate response submission within 10 seconds

### Key Entities

- **Discussion**: Represents a conversation thread within a topic; attributes include title, topic reference, creator, creation timestamp, status (active/archived/deleted), response count, participant count, last activity timestamp
- **Response**: Represents a user contribution within a discussion; attributes include content, author, discussion reference, parent response reference (null for top-level), creation timestamp, last edited timestamp, edit count, citation list, status (active/edited/deleted)
- **Citation**: Represents a source reference attached to a response; attributes include URL, description, response reference, added timestamp
- **ParticipantActivity**: Tracks which users have contributed to which discussions; attributes include user reference, discussion reference, first contribution timestamp, last contribution timestamp, response count

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new discussion and publish their initial perspective in under 90 seconds from clicking "Start Discussion"
- **SC-002**: Users can post a response to an existing discussion in under 45 seconds from clicking "Add Response"
- **SC-003**: Response submission succeeds 99.5% of the time on first attempt (excluding validation failures)
- **SC-004**: 90% of users successfully post their first response without requiring support or assistance
- **SC-005**: Threaded conversations with up to 50 responses load and render within 2 seconds
- **SC-006**: Users can navigate through a 200-response discussion and find specific responses using threading/collapse features without frustration
- **SC-007**: Edit operations complete within 1 second of clicking "Save"
- **SC-008**: Discussion lists with 100+ discussions remain responsive with pagination/sorting completing within 1 second
- **SC-009**: 95% of users understand threading structure without requiring help documentation
- **SC-010**: Citation attachment succeeds for valid URLs 99% of the time
- **SC-011**: System maintains sub-500ms response time for posting operations under load of 100 concurrent users
- **SC-012**: Zero data loss incidents where posted responses fail to save or become corrupted

## Assumptions

- Users have already completed onboarding (Feature 003) and selected topics of interest
- Authentication and authorization infrastructure is in place
- Topic data exists in the database with basic metadata
- Text editor component is available (rich text or markdown support)
- Notification system infrastructure exists for alerting users of replies
- Trust score system is functional for potential future integration with response visibility
- Database supports transactional operations for maintaining data consistency
- Frontend framework supports real-time UI updates for response posting
- Citation URL validation uses standard URL parsing libraries
- Rate limiting infrastructure is available or can be implemented via middleware
- Users access the platform via modern web browsers with JavaScript enabled
- Discussions are primarily text-based; media attachments are out of scope for this feature
- Moderation tools for flagging inappropriate content will be a separate feature
- Common ground analysis and AI feedback synthesis are separate features that will consume discussion data
