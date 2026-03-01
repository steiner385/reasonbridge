# Twitter/X UI Patterns

## Overview

**Primary Use Case:** Public discourse and real-time conversation
**Target Audience:** General public, influencers, journalists, brands
**Platform Strengths:** Engagement metrics, threading, algorithmic discovery, brevity

---

## Key UI Patterns

### 1. Engagement Metrics

Public, visible engagement drives the platform:

**Metrics Displayed:**
- Replies count
- Reposts (retweets) count
- Quote tweets count
- Likes count
- Views count
- Bookmarks (private, but count shown to author)

**Algorithmic Weight (Public from Jan 2026 xAI release):**
| Action | Weight |
|--------|--------|
| Retweet | 20x |
| Reply | 13.5x |
| Profile Click | 12x |
| Link Click | 11x |
| Bookmark | 10x |
| Like | 1x |
| Quote Tweet | ~25x (for original) |

**Score: 5/5** - Transparent engagement system

### 2. Threading

Native thread support with unique behaviors:

**Thread Mechanics:**
- Reply to own tweet to extend thread
- Thread indicator (1/10, 2/10...) optional
- Adding to thread bumps original tweet's algorithm score
- Threads get 3x more engagement than single tweets
- Optimal length: 4-8 tweets

**Visual Design:**
- Connecting line between thread tweets
- "Show this thread" collapse/expand
- Thread reader mode

**Score: 4/5** - Good threading, could be more discoverable

### 3. Quote Tweet

Adding commentary to shared content:

**Implementation:**
- Original tweet embedded with visual border
- Author's commentary appears above
- Engagement counts for both original and quote
- Media in quote tweets gets 2-3x more engagement

**Score: 4/5** - Unique pattern, encourages discourse

### 4. Tweet Composition

Constrained but powerful:

**Features:**
- 280 character limit (Premium: 4000)
- Photo/video attachment (up to 4 images)
- GIF picker
- Poll creation
- Schedule tweets
- Location tagging
- @mentions with autocomplete
- Hashtag suggestions

**Recent Updates:**
- External links now penalized by algorithm
- Strategy: Put links in replies, not main tweet

**Score: 3/5** - Intentionally limited for brevity

### 5. Feed Algorithm

"For You" vs "Following" tabs:

**For You (Algorithmic):**
- Content from followed accounts
- Recommended content
- Trending topics
- Engagement-optimized

**Following (Chronological):**
- Only followed accounts
- Reverse chronological
- No recommendations

**Score: 4/5** - Dual-feed satisfies different needs

### 6. In-App Browser (2026)

New testing feature:
- Keeps engagement buttons visible when viewing links
- Original post remains accessible
- Reduces link click bounce rate

**Score: 3/5** - Good UX improvement, still testing

---

## Interaction Patterns

### Navigation
- Home feed (main)
- Explore (search/trending)
- Notifications
- Messages (DMs)
- Bookmarks
- Profile

### Actions on Tweets
| Icon | Action | Notes |
|------|--------|-------|
| 💬 | Reply | Opens composer |
| 🔁 | Repost | Instant, or quote |
| ❤️ | Like | Instant, animated |
| 📊 | View stats | Author only |
| 🔖 | Bookmark | Private save |
| ↗️ | Share | Copy link, send via DM |

### Mobile Patterns
- Pull down to refresh
- Swipe between tabs
- Double-tap to like
- Long-press for preview

---

## Real-time Features

| Feature | Implementation |
|---------|---------------|
| New tweets | "X new posts" pill, click to load |
| Engagement | Real-time count updates |
| Notifications | Badge + push notifications |
| Typing | Not implemented (not expected) |
| Presence | Not implemented |

**Score: 3/5** - Real-time for metrics, not conversation

---

## Design System

### Colors
- Background: White (light), #000000 (dark)
- Primary: #1DA1F2 → #1D9BF0 (blue)
- Text: #0F1419 (light), #E7E9EA (dark)
- Secondary: #536471
- Success: #00BA7C
- Warning: #FFD400
- Error: #F4212E

### Typography
- Font: -apple-system, Segoe UI, sans-serif
- Tweet text: 15px
- Display name: 15px bold
- Handle: 15px, muted

### Character Constraints
- Tweet: 280 (4000 Premium)
- Display name: 50
- Bio: 160
- Location: 30

---

## Lessons for reasonBridge

### Patterns to Adopt
1. **Visible engagement metrics** - Show response counts, not just existence
2. **Quote with commentary** - Allow users to respond with context
3. **Dual feed modes** - Algorithmic "For You" + chronological option
4. **Media in threads** - Encourage visual elements for engagement
5. **Bookmark/save** - Private save for later

### Patterns to Avoid
1. **Algorithm opacity** - X's weights are public, but not all platforms should be
2. **Character limits** - Discussions need longer-form content
3. **Link suppression** - Penalizing links hurts discourse quality

### Unique Opportunity
reasonBridge could show "quality metrics" alongside engagement - clarity score, evidence count, bias indicators - providing a richer view of post value than just likes/replies.

---

## Sources

- [How the Twitter/X Algorithm Works in 2026](https://opentweet.io/blog/how-twitter-x-algorithm-works-2026)
- [How to Quote Tweet on X in 2026: Complete Guide](https://www.tweetarchivist.com/how-to-quote-tweet-guide)
- [2026 X (Twitter) updates and news](https://socialbee.com/blog/twitter-updates/)
- [15 Best Twitter Thread Examples That Went Viral in 2026](https://aifreeforever.com/blog/15-best-twitter-thread-examples-that-went-viral)
