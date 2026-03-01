# Reddit UI Patterns

## Overview

**Primary Use Case:** Community discussions and content sharing
**Target Audience:** Interest-based communities, general public
**Platform Strengths:** Deep threading, voting system, community moderation, awards

---

## Key UI Patterns

### 1. Deep Threading (Infinite Nesting)

Reddit's signature feature:

**Implementation:**
- Comments can reply to any other comment
- Infinite nesting depth (with lazy loading for deep threads)
- Indentation indicates depth level
- Collapse/expand individual threads
- "Continue this thread →" for deep chains

**Technical Details:**
- Materialized path for efficient tree traversal
- Lazy loading for threads > 10 levels deep
- Sort options: Best, Top, New, Controversial, Q&A

**Score: 5/5** - Best deep threading in any platform

### 2. Voting System

Up/downvote with score fuzzing:

**Implementation:**
- Upvote (+1), Downvote (-1), or neutral
- Net score displayed (with fuzzing to prevent manipulation)
- Score affects visibility/ranking
- Negative scores can collapse comments
- User karma accumulated from votes received

**Vote Display:**
| Mode | Display |
|------|---------|
| Standard | Net score (e.g., "1.2k") |
| Hidden | "Score hidden" (first 1-2 hours) |
| Controversial | †️ dagger indicator |

**Score: 5/5** - Most effective quality signal

### 3. Awards System

Premium recognition for quality content:

**Award Tiers:**
| Award | Cost | Benefit |
|-------|------|---------|
| Silver | 100 coins | Badge only |
| Gold | 500 coins | Week of Premium |
| Platinum | 1800 coins | Month of Premium |
| Custom | Varies | Community-specific |

**Display:**
- Award icons displayed on post/comment
- Hover shows award details
- "X awards" summary for multiple

**Score: 4/5** - Gamification that encourages quality

### 4. Subreddit Organization

Community-based information architecture:

**Structure:**
- Each subreddit = independent community
- Custom rules, CSS, moderators
- Post flairs for categorization
- User flairs for identity
- Sidebar with community info

**Discovery:**
- r/all (global feed)
- r/popular (excluding NSFW)
- Search by subreddit name
- Related subreddits recommendations

**Score: 5/5** - Best community organization

### 5. Post Types

Multiple content formats:

| Type | Features |
|------|----------|
| Text | Markdown, long-form |
| Link | URL with auto-preview |
| Image | Gallery, direct upload |
| Video | Native player, GIF |
| Poll | Time-limited voting |
| Live | Real-time discussion |

**Score: 4/5** - Good variety of post types

### 6. Mod Tools

Community governance:

**Features:**
- Post/comment removal
- User bans (temp/permanent)
- Post locking
- AutoModerator (rule-based)
- Mod queue for flagged content
- Modmail for user appeals

**Score: 5/5** - Most mature moderation system

---

## Interaction Patterns

### Navigation
- Home feed (subscribed subreddits)
- Popular (trending across Reddit)
- r/all (everything)
- Search
- Chat (DMs/group)
- Notifications

### Comment Actions
| Icon | Action |
|------|--------|
| ⬆️ | Upvote |
| ⬇️ | Downvote |
| 💬 | Reply |
| 🔖 | Save |
| 🎁 | Award |
| ↗️ | Share |
| ••• | More (report, hide, etc.) |

### Mobile Patterns
- Card-based feed
- Swipe left to collapse thread
- Pull to refresh
- Floating action button

---

## Real-time Features

| Feature | Implementation |
|---------|---------------|
| New comments | Manual refresh or "X new comments" |
| Votes | Near real-time on popular posts |
| Live threads | Streaming updates |
| Notifications | Push for replies, mentions |
| Typing | Not implemented |

**Score: 3/5** - Moderate real-time, focus on async

---

## Design System

### Colors
- Upvote: #FF4500 (orangered)
- Downvote: #7193FF (periwinkle)
- Background: #DAE0E6 (light), #030303 (dark)
- Card: #FFFFFF (light), #1A1A1B (dark)
- Link: #0079D3
- Text: #1C1C1C (light), #D7DADC (dark)

### Typography
- Font: Noto Sans, system fonts
- Title: 18px semibold
- Body: 14px
- Metadata: 12px, muted

### Threading Visual
- Collapse lines (vertical) indicate nesting
- Line colors can vary (some subreddits)
- 24px indent per level

---

## Lessons for reasonBridge

### Patterns to Adopt
1. **Deep threading** - Allow nested replies for nuanced discussion
2. **Voting with fuzzing** - Prevent gaming while showing sentiment
3. **Collapse/expand** - Essential for managing long threads
4. **Post flairs** - Categorize content within topics
5. **Sort options** - Best, New, Controversial for different needs

### Patterns to Avoid
1. **Downvote abuse** - Can suppress minority viewpoints
2. **Karma obsession** - Gamification can encourage pandering
3. **Moderation overhead** - Heavy mod burden at scale

### Unique Opportunity
reasonBridge's common ground detection could replace "Controversial" sort with "Bridging" - surfacing comments that find agreement across typically opposing viewpoints.

---

## Sources

- [Design Reddit | Gaurav Aryal](https://www.gauravaryal.com/system-design/design-reddit/)
- [Reddit Design System | Figma](https://www.figma.com/community/file/1357423094737880333/reddit-design-system)
- [Streamlining Reddit UI Components | Medium](https://medium.com/@sehyunjeon/streamlining-reddit-ui-components-the-reddit-design-system-a90189fd9c38)
- [Design Reddit | GeeksforGeeks](https://www.geeksforgeeks.org/system-design/design-reddit-system-design/)
