# Topic Management User Guide

**Feature 016: Comprehensive Topic Management**

This guide covers all aspects of managing discussion topics on ReasonBridge, from creation to discovery, editing, analytics, and moderation.

---

## Table of Contents

1. [Creating a New Topic](#creating-a-new-topic)
2. [Discovering Topics](#discovering-topics)
3. [Managing Topic Status](#managing-topic-status)
4. [Editing Topics](#editing-topics)
5. [Viewing Analytics](#viewing-analytics)
6. [Merging Topics (Moderators)](#merging-topics-moderators)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Creating a New Topic

### Requirements

- **Authentication**: You must be logged in
- **Rate Limit**: Maximum 5 new topics per day
- **Content Requirements**:
  - Title: 10-200 characters
  - Description: 50-5000 characters
  - Tags: 1-5 tags

### Steps

1. **Navigate to Topics Page**
   - Click "Topics" in the main navigation

2. **Click "Create Topic" Button**
   - Located in the top-right corner of the topics page

3. **Fill in Topic Details**
   - **Title**: Provide a clear, descriptive title
   - **Description**: Add detailed context (minimum 50 characters)
   - **Tags**: Add 1-5 relevant tags
     - Type a tag and press Enter
     - Tags help others discover your topic

4. **Review Duplicate Warnings**
   - If similar topics exist, you'll see a warning
   - Consider joining an existing discussion instead

5. **Submit**
   - Click "Create Topic"
   - Your topic starts in "SEEDING" status
   - Activate it when ready to open for responses

### Topic Status Lifecycle

```
SEEDING → ACTIVE → ARCHIVED/LOCKED
          ↑___________|
         (Reopen)
```

- **SEEDING**: Initial status, visible only to creator and moderators
- **ACTIVE**: Open for responses and participation
- **ARCHIVED**: Closed to new responses, read-only
- **LOCKED**: Fully immutable, moderator-only action

---

## Discovering Topics

### Search and Filter Options

#### Text Search

- Use the search bar to find topics by keywords
- Searches title, description, and tags
- Results return in <1 second for 10,000+ topics

#### Status Filters

- **SEEDING**: Topics still being prepared
- **ACTIVE**: Open discussions
- **ARCHIVED**: Closed discussions
- **LOCKED**: Immutable topics

#### Visibility Filters

- **PUBLIC**: Visible to everyone
- **PRIVATE**: Invite-only
- **UNLISTED**: Accessible via link only

#### Tag Filters

- Click any tag to filter by that topic
- Multiple tags use AND logic (all must match)

#### Sort Options

- **Most Recent**: Newest topics first
- **Last Activity**: Recently active discussions
- **Most Responses**: Popular topics

### Tips for Effective Discovery

1. **Start with Broad Search** → refine with filters
2. **Use Status Filters** to find active discussions
3. **Follow Tags** for topics of interest
4. **Check "Most Responses"** for vibrant discussions

---

## Managing Topic Status

### Available Actions (Topic Creators)

#### Activate Topic (SEEDING → ACTIVE)

- Opens your topic for public participation
- Cannot revert to SEEDING once activated
- **When to use**: When you're ready for responses

#### Archive Topic (ACTIVE → ARCHIVED)

- Closes topic to new responses
- All content remains accessible
- **When to use**: Discussion has concluded or gone off-topic

#### Reopen Topic (ARCHIVED → ACTIVE)

- Restores an archived topic to active status
- Allows new responses again
- **When to use**: New developments warrant continued discussion

### Moderator-Only Actions

#### Lock Topic (ACTIVE/ARCHIVED → LOCKED)

- Prevents all modifications
- Use for policy violations or concluded matters
- **When to use**: Content moderation or permanent closure

#### Unlock Topic (LOCKED → ACTIVE)

- Restores locked topic to active status
- **When to use**: Lock was temporary or resolved

### Status Change Workflow

1. **Click the Status Action Button** (e.g., "Archive Topic")
2. **Review Confirmation Modal**
   - Shows current status → new status
   - Explains consequences
3. **Click "Confirm"**
4. **Wait 5 seconds** for propagation
5. **Verify** status badge updates

---

## Editing Topics

### When You Can Edit

- **Your Own Topics**: Anytime (with edit reason if >24 hours old)
- **Moderator**: Can edit any topic
- **Cannot Edit**: Locked topics (unless you're a moderator)

### Edit Process

1. **Click "Edit Topic" Button**
   - Located on the topic detail page

2. **Modify Fields**
   - Title, description, or tags
   - All fields are optional (update only what needs changing)

3. **Provide Edit Reason** (if topic is >24 hours old)
   - Minimum 10 characters
   - Explains why changes are needed
   - Appears in edit history for transparency

4. **Flag for Review** (optional)
   - Check box if making significant changes
   - Moderators will review flagged edits

5. **Preview Changes**
   - Red = removed content
   - Green = added content
   - Review before confirming

6. **Confirm & Save**
   - Changes take effect immediately
   - Edit recorded in history (immutable audit trail)

### Edit History

- **View History**: Click "View Edit History" on topic page
- **Expand Changes**: Click "Show Changes" to see diffs
- **Editor Information**: Each edit shows who made it and when
- **Edit Reasons**: Understand why changes were made

### Edit Guidelines

✅ **Do**:

- Fix typos and formatting errors
- Add clarifying information
- Update tags for better discoverability
- Provide clear edit reasons for old topics

❌ **Don't**:

- Change the meaning of responses already given
- Remove context that responses depend on
- Edit just to bump topic visibility
- Make controversial changes without flagging for review

---

## Viewing Analytics

### Access Analytics

1. Navigate to a topic
2. Scroll to "Topic Analytics" section
3. Select time range (7/30/90 days)

### Metrics Explained

#### Summary Cards

- **Total Views**: Number of times topic was viewed
- **Total Responses**: All responses and replies
- **Total Participants**: Unique users who responded
- **Engagement Score**: 0-100 weighted score
  - 40% views, 30% responses, 30% participants
  - Higher = more engaged community

#### Charts

- **Views Over Time**: Daily view counts
- **Responses Over Time**: Daily response activity
- **Participants Over Time**: New and returning participants
- **Engagement Score**: Trend analysis

#### Trends

- **Growth Percentages**: Compare first half vs second half of period
- **Trend Indicators**:
  - 📈 Increasing: Engagement growing
  - ➡️ Stable: Consistent engagement
  - 📉 Decreasing: Engagement declining

### Using Analytics

**For Creators**:

- Identify peak activity times to post responses
- See if topic is gaining or losing momentum
- Understand your audience size

**For Moderators**:

- Spot trending topics
- Identify stale discussions for archiving
- Track community health

---

## Merging Topics (Moderators)

### When to Merge Topics

✅ **Merge When**:

- Topics are exact duplicates
- Topics cover substantially the same subject
- Consolidation would improve discussion quality
- Multiple fragmentary discussions on one theme

❌ **Don't Merge When**:

- Topics are merely related (link them instead)
- Perspectives differ significantly
- One topic is a subset/subtopic
- Community prefers separate discussions

### Merge Process

1. **Click "Merge Topics" Button**
   - Available in moderator tools menu

2. **Select Source Topics**
   - Check boxes for topics to archive
   - Minimum 1 source topic

3. **Select Target Topic**
   - Dropdown to choose destination
   - Cannot be one of the sources
   - Receives all responses and participants

4. **Provide Merge Reason**
   - Minimum 20 characters
   - Explain why consolidation is beneficial
   - Appears in merge record

5. **Preview Merge Operation**
   - Review source topics (will be archived)
   - Review target topic (receives content)
   - Verify response counts
   - Read "What Will Happen" checklist

6. **Confirm Merge**
   - Click "Confirm Merge" (destructive action)
   - Process takes 5-10 seconds
   - All operations are atomic (all-or-nothing)

### After Merge

- **Source Topics**: Archived with redirect notice
- **Target Topic**: Contains all responses
- **Participants**: Merged (duplicates removed)
- **Analytics**: Combined activity data
- **Rollback Window**: 30 days for manual intervention

### Rollback (Emergency Only)

If a merge was done in error:

1. Contact system administrator within 30 days
2. Provide merge ID and rollback reason
3. Admin can restore original topics
4. After 30 days, rollback is not possible

---

## Best Practices

### Creating Topics

1. **Search First**: Check if topic already exists
2. **Be Specific**: Clear titles help discovery
3. **Provide Context**: Rich descriptions encourage responses
4. **Use Accurate Tags**: Help others find your topic
5. **Start in SEEDING**: Refine before going public

### Managing Status

1. **Activate Deliberately**: Only when ready for responses
2. **Archive Gracefully**: Explain why in final response
3. **Reopen Sparingly**: Only for significant new developments
4. **Lock Rarely**: Use archive instead when possible

### Editing

1. **Edit Early**: Before responses reference your content
2. **Explain Changes**: Clear reasons build trust
3. **Flag Significant Changes**: Let moderators review
4. **Preserve Context**: Don't break existing responses

### Moderating

1. **Merge Conservatively**: When clearly beneficial
2. **Document Reasons**: Help community understand
3. **Lock Sparingly**: Prefer archive for concluded topics
4. **Monitor Analytics**: Identify trends early

---

## Troubleshooting

### "Rate limit exceeded" Error

**Problem**: Attempted to create >5 topics in 24 hours

**Solution**: Wait 24 hours from your first topic creation, or contact support if genuine need

### Cannot Edit Topic

**Possible Causes**:

- Topic is locked (only moderators can edit)
- You're not the creator (only owners/moderators can edit)
- Not authenticated

**Solution**: Check topic status, verify you're logged in as creator

### Duplicate Warning Ignoring Me

**Problem**: Created topic despite duplicate warning

**Note**: Warnings are advisory, not blocking. However, consider:

- Is your topic different enough to warrant separation?
- Would joining existing topic be better?
- Can you reference existing topic instead?

### Merge Button Not Visible

**Problem**: Cannot find merge functionality

**Cause**: Merge is moderator-only

**Solution**: Request moderator privileges if you need this regularly

### Analytics Not Loading

**Possible Causes**:

- Topic is brand new (no data yet)
- Server issue
- Network connectivity

**Solution**:

- For new topics: Wait 24 hours for first data point
- Check browser console for errors
- Refresh page
- Contact support if persistent

---

## Need More Help?

- **Feature Requests**: Submit on GitHub Issues
- **Bug Reports**: Include topic ID and reproduction steps
- **Moderation Questions**: Contact moderation team
- **General Support**: Visit help center

---

**Last Updated**: 2026-02-05
**Feature Version**: 1.0.0
**Documentation Version**: 1.0.0
