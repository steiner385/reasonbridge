# Feature Specification: Topic Management

**Feature Branch**: `016-topic-management`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Create the specification for topic creation, management, and overall lifecycle"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a New Discussion Topic (Priority: P1)

A verified user wants to start a conversation about a topic not yet covered on the platform. They navigate to the topics page, click "Create Topic," provide a clear title and description, add relevant tags, and publish the topic for community participation.

**Why this priority**: This is the core capability for expanding platform content. Without user-generated topics, the platform relies solely on admin-seeded content, limiting organic growth and community engagement.

**Independent Test**: Can be fully tested by having a verified user create a new topic with a title, description, and tags, then verifying the topic appears in the public topic list and is accessible to other users.

**Acceptance Scenarios**:

1. **Given** a verified user on the topics page, **When** they click "Create New Topic", **Then** they see a form with fields for title, description, tags, and optional settings
2. **Given** a user entering a topic title, **When** they submit without a description, **Then** they see a validation error requiring at least 50 characters of context
3. **Given** a user completing the topic form with valid data, **When** they click "Publish Topic", **Then** the topic is created with status "Active" and appears in the public topic list
4. **Given** a newly created topic, **When** other users browse topics, **Then** they see the topic with creator name, title, description preview, participant count (0), and response count (0)
5. **Given** a user creating a topic, **When** they add 3-5 tags, **Then** the tags are associated with the topic and enable filtering/discovery

---

### User Story 2 - Manage Topic Status and Visibility (Priority: P2)

A topic creator or moderator needs to manage a topic's lifecycle as discussions evolve. They can archive topics that have reached natural conclusions, lock topics to prevent new responses while preserving content, or reopen archived topics if discussions revive.

**Why this priority**: Topics need lifecycle management to keep the platform organized and relevant. Without status management, old or resolved topics clutter search results and dilute active discussions.

**Independent Test**: Can be fully tested by creating a topic, archiving it to verify it no longer appears in default listings, locking it to prevent new responses, and reopening it to resume activity.

**Acceptance Scenarios**:

1. **Given** a topic creator viewing their own topic, **When** they select "Archive Topic", **Then** the topic status changes to "Archived" and it no longer appears in default topic listings (but remains accessible via direct link or "Show Archived" filter)
2. **Given** a moderator viewing any active topic, **When** they select "Lock Topic", **Then** the topic status changes to "Locked", existing content remains visible, but new discussions cannot be created within it
3. **Given** an archived topic, **When** a user with permissions selects "Reopen Topic", **Then** the status changes back to "Active" and the topic reappears in default listings
4. **Given** a locked topic, **When** a regular user attempts to create a discussion, **Then** they see a message indicating the topic is locked and cannot accept new discussions
5. **Given** a moderator viewing a topic, **When** they change the status, **Then** all participants receive a notification explaining the status change and reason

---

### User Story 3 - Edit and Update Topic Details (Priority: P3)

A topic creator realizes their initial title or description is unclear or outdated. They can edit the topic details to improve clarity, add context, or correct mistakes, with changes tracked for transparency.

**Why this priority**: Topics evolve as discussions progress. Allowing iterative refinement improves content quality and searchability, though it's less critical than creation and basic lifecycle management.

**Independent Test**: Can be fully tested by creating a topic, editing its title and description, and verifying the changes appear to all users with an edit history indicator.

**Acceptance Scenarios**:

1. **Given** a topic creator viewing their topic, **When** they click "Edit Topic", **Then** they see a form pre-populated with current title, description, and tags
2. **Given** a user editing a topic title, **When** they submit changes, **Then** the new title appears immediately with an "(edited)" indicator and edit timestamp
3. **Given** a topic with edit history, **When** any user clicks the edit indicator, **Then** they see a history of changes (who changed what and when)
4. **Given** a moderator viewing any topic, **When** they edit the topic, **Then** the same edit capabilities apply with the change attributed to the moderator
5. **Given** a user editing tags, **When** they add or remove tags, **Then** the topic's discoverability updates immediately to reflect new categorization

---

### User Story 4 - Discover and Filter Topics (Priority: P1)

A user wants to find topics relevant to their interests. They can browse all topics, filter by status (active/archived), sort by activity or creation date, search by keywords, and filter by tags to discover conversations they want to join.

**Why this priority**: Discovery is essential for platform usability. Without effective filtering and search, users cannot find relevant topics, reducing engagement and participation.

**Independent Test**: Can be fully tested by creating topics with various tags and statuses, then verifying filters correctly show/hide topics based on status, search terms, and tag selections.

**Acceptance Scenarios**:

1. **Given** a user on the topics page, **When** they select the "Active" filter, **Then** they see only topics with status "Active"
2. **Given** a user viewing the topic list, **When** they enter a search term, **Then** results filter to show topics where title or description contains the search term
3. **Given** topics with various tags, **When** a user selects a tag filter (e.g., "#Climate"), **Then** only topics tagged with "#Climate" appear
4. **Given** multiple topics, **When** a user selects "Sort by Most Active", **Then** topics appear ordered by most recent response activity
5. **Given** a user with no topics matching their filters, **When** they apply filter combinations, **Then** they see a helpful "No topics found" message with suggestions to adjust filters

---

### User Story 5 - Track Topic Participation and Analytics (Priority: P4)

A topic creator wants to understand engagement with their topic. They can view analytics showing participant count, response volume over time, common ground convergence, and demographic diversity of perspectives.

**Why this priority**: Analytics help creators and moderators understand topic health, but the core value is in the discussions themselves. This is an enhancement that adds insight without being essential for basic functionality.

**Independent Test**: Can be fully tested by creating a topic, having multiple users participate, and verifying the analytics dashboard shows accurate counts, trends, and diversity metrics.

**Acceptance Scenarios**:

1. **Given** a topic with multiple discussions, **When** the creator views topic details, **Then** they see total participants, total discussions, total responses, and responses per day over the past 30 days
2. **Given** a topic with diverse participants, **When** viewing analytics, **Then** the system displays perspective diversity (e.g., "23% progressive, 31% conservative, 46% moderate viewpoints")
3. **Given** a topic with common ground analysis available, **When** viewing analytics, **Then** the creator sees convergence metrics showing percentage agreement on key propositions over time
4. **Given** a topic creator, **When** they view engagement trends, **Then** they can identify peak activity periods and engagement drop-off points
5. **Given** analytics data, **When** a creator wants to share insights, **Then** they can export a summary report showing key metrics and participation trends

---

### User Story 6 - Merge or Link Related Topics (Priority: P5)

Two similar topics exist with fragmented discussions. A moderator can merge duplicate topics into one consolidated topic or create bidirectional links between related topics to help users discover connected conversations.

**Why this priority**: Topic consolidation improves content organization but requires mature platform usage patterns to justify complexity. This is a nice-to-have for established communities rather than a launch requirement.

**Independent Test**: Can be fully tested by creating two similar topics, merging them, and verifying all discussions from both topics appear under the merged topic with preserved attribution and timestamps.

**Acceptance Scenarios**:

1. **Given** a moderator viewing two similar topics, **When** they select "Merge Topics", **Then** they designate one as primary and the other as secondary
2. **Given** topics selected for merging, **When** the moderator confirms the merge, **Then** all discussions from the secondary topic move to the primary topic, and the secondary topic redirects to the primary
3. **Given** two related but distinct topics, **When** a moderator creates a topic link, **Then** both topics display a "Related Topic" section showing the linked topic
4. **Given** a merged topic, **When** a user accesses the old secondary topic URL, **Then** they automatically redirect to the primary topic with a notice explaining the merge
5. **Given** a merge operation, **When** completed, **Then** all original participants receive a notification about the consolidation with a link to the merged topic

---

### Edge Cases

- **What happens when a user tries to create a duplicate topic?**
  The system suggests existing similar topics based on title/description text similarity (using embeddings) and asks "Did you mean to join one of these instead?" before allowing creation.

- **How does the system handle topics with no activity for extended periods?**
  Topics with zero responses after 90 days automatically receive a "Low Activity" indicator. After 180 days with no responses, the system suggests archiving to the creator but does not auto-archive.

- **What happens when a topic creator's account is deleted?**
  The topic ownership transfers to "Community" (anonymous ownership), and moderators gain creator-level permissions for that topic.

- **How does the system handle topic titles with profanity or offensive content?**
  The content moderation system flags offensive titles for moderator review before the topic goes live. Topics with extreme violations are auto-rejected with specific feedback to the creator.

- **What happens when a user tries to edit a topic that has accumulated significant discussion?**
  Major edits (title changes, substantial description rewrites) on topics with 50+ responses trigger a moderator review queue to prevent bait-and-switch tactics.

- **How does the system handle tag spam (users adding excessive or irrelevant tags)?**
  Topics are limited to 5 tags maximum. Moderators can flag tags as irrelevant, and users with patterns of tag misuse receive warnings.

- **What happens when two moderators try to merge the same topics simultaneously?**
  The system uses optimistic locking to prevent concurrent merges. The second moderator receives a conflict notice and must refresh to see the completed merge.

## Requirements _(mandatory)_

### Functional Requirements

**Topic Creation**

- **FR-001**: System MUST allow verified users to create new topics with a title (10-200 characters), description (50-5000 characters), and 1-5 tags
- **FR-002**: System MUST validate topic titles for uniqueness within a similarity threshold (80% text match) and suggest existing similar topics before allowing creation
- **FR-003**: System MUST automatically assign status "Active" to newly created topics and record the creator's user ID and creation timestamp
- **FR-004**: System MUST allow users to mark topics as public (default) or private (invitation-only) during creation
- **FR-005**: System MUST generate a unique, human-readable URL slug for each topic based on the title (e.g., "/topics/should-ai-be-regulated")

**Topic Lifecycle Management**

- **FR-006**: System MUST support topic statuses: Active (default, accepts new discussions), Archived (read-only, hidden from default listings), Locked (read-only, visible in default listings), and Deleted (soft-deleted, admin-only visibility)
- **FR-007**: System MUST allow topic creators to archive or lock their own topics at any time
- **FR-008**: System MUST allow moderators to change any topic's status (Active, Archived, Locked) with a required reason field
- **FR-009**: System MUST allow moderators to soft-delete topics, removing them from all public listings while preserving data for audit purposes
- **FR-010**: System MUST allow reopening of archived or locked topics by creators or moderators

**Topic Editing**

- **FR-011**: System MUST allow topic creators to edit title, description, and tags at any time with changes taking effect immediately
- **FR-012**: System MUST track all edits with timestamps, user IDs, and change summaries in an immutable edit history
- **FR-013**: System MUST display an "(edited)" indicator on modified topics with a link to view edit history
- **FR-014**: System MUST flag significant edits (title changes or >50% description rewrites) on topics with 50+ responses for moderator review
- **FR-015**: System MUST allow moderators to revert topic edits if flagged as abusive (e.g., bait-and-switch)

**Topic Discovery and Search**

- **FR-016**: System MUST provide filtering by status (Active, Archived, Locked) with Active as the default view
- **FR-017**: System MUST provide full-text search across topic titles and descriptions with results ranked by relevance and activity
- **FR-018**: System MUST provide tag-based filtering supporting multiple tag selections (OR logic)
- **FR-019**: System MUST provide sorting options: Most Recent (creation date), Most Active (recent response activity), Most Discussions (total discussion count)
- **FR-020**: System MUST paginate topic listings with 20 topics per page

**Topic Analytics**

- **FR-021**: System MUST track and display for each topic: total participants, total discussions, total responses, creation date, last activity date
- **FR-022**: System MUST calculate and display participant diversity metrics based on user moral foundation profiles when available
- **FR-023**: System MUST generate 30-day activity trend data showing responses per day for topics with 10+ responses
- **FR-024**: System MUST provide exportable analytics summaries in PDF format for topic creators

**Topic Merging and Linking**

- **FR-025**: System MUST allow moderators to merge two topics by designating primary and secondary topics, moving all discussions from secondary to primary
- **FR-026**: System MUST create permanent redirects from secondary topic URLs to primary topic URLs after merging
- **FR-027**: System MUST notify all participants of both topics when a merge occurs
- **FR-028**: System MUST allow moderators to create bidirectional links between related topics, displaying linked topics in a "Related Topics" section
- **FR-029**: System MUST preserve all discussion attribution, timestamps, and metadata when merging topics

**Permissions and Authorization**

- **FR-030**: System MUST restrict topic creation to users with verification level BASIC or higher
- **FR-031**: System MUST allow topic creators to edit only their own topics unless they have moderator permissions
- **FR-032**: System MUST allow moderators to edit, change status, or merge any topic
- **FR-033**: System MUST log all topic modifications (edits, status changes, merges) with user attribution for audit purposes

### Key Entities _(include if feature involves data)_

- **Topic**: The central entity representing a discussion subject with title, description, status, tags, creator, creation timestamp, last activity timestamp, participant count, discussion count, response count, and URL slug
- **TopicEdit**: Historical record of changes to a topic including edit timestamp, editor user ID, changed fields (title/description/tags), previous values, and new values
- **TopicTag**: Association between topics and tags for categorization and filtering; many-to-many relationship with topics
- **TopicLink**: Bidirectional relationship between related topics created by moderators to improve discoverability
- **TopicMerge**: Record of merge operations including merge timestamp, moderator user ID, primary topic ID, secondary topic ID, and reason for merge

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a new topic and see it published in under 2 minutes from clicking "Create Topic" to seeing it live
- **SC-002**: Search and filtering return results in under 1 second for catalogs of up to 10,000 topics
- **SC-003**: 90% of users successfully create their first topic without validation errors or support assistance
- **SC-004**: Topic discovery via search and filters has 80% user satisfaction rating (users find relevant topics within 3 searches)
- **SC-005**: Edit history tracking records 100% of topic modifications with complete attribution and timestamps
- **SC-006**: Topic status changes (archive/lock/reopen) reflect in topic listings within 5 seconds for all users
- **SC-007**: Topic analytics dashboards load in under 2 seconds and display accurate participation metrics
- **SC-008**: Duplicate topic detection suggests existing similar topics with 85% accuracy based on title and description text similarity

## Assumptions _(optional)_

- **Users**: Only verified users (BASIC verification level or higher) can create topics; all users can view active topics
- **Moderation Model**: Moderators are trusted users with elevated permissions; no explicit approval workflow for topic creation (relying on post-creation moderation)
- **Tag System**: Tags are free-form text (not predefined taxonomy) with a limit of 5 tags per topic to prevent spam
- **Data Retention**: Soft-deleted topics are retained indefinitely for audit purposes but only visible to administrators
- **Scalability**: Initial design targets 10,000 active topics; pagination and indexing assumptions based on this scale
- **Edit Transparency**: All edits are fully visible in history to maintain trust and prevent abuse; no "silent" edits exist
- **Discovery Algorithm**: Search relevance ranking combines text matching with activity metrics (recent activity boosts ranking)

## Dependencies _(optional)_

- **User Verification System**: Topic creation requires users to have completed verification (FR-030 depends on existing verification levels)
- **Tagging Infrastructure**: Tag entity and tag management endpoints must exist or be created alongside topic management
- **Content Moderation System**: Automated and manual moderation capabilities required for flagging offensive titles and monitoring significant edits
- **Notification System**: Status changes and merges trigger notifications to participants (requires notification delivery infrastructure)
- **Search Infrastructure**: Full-text search across title/description requires database full-text indexing or external search service (e.g., Elasticsearch)
- **Analytics Pipeline**: Participation metrics and trend calculations may require background job processing for performance
