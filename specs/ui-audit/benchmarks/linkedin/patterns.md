# LinkedIn UI Patterns

## Overview

**Primary Use Case:** Professional networking and business discourse
**Target Audience:** Professionals, recruiters, businesses, job seekers
**Platform Strengths:** Professional reactions, credential-based authority, long-form content

---

## Key UI Patterns

### 1. Engagement Quality Over Quantity (2026)

LinkedIn's algorithm shift prioritizes substance:

**Depth Score Metrics:**
- Time spent reading content
- Scroll depth
- Multi-reply thread participation
- Substantive comment length
- Industry expert interactions (5-7x weight)

**Penalized Behaviors:**
- "Comment YES if you agree" engagement bait
- Generic comments ("Great post!", "Interesting!")
- External links (60% reach penalty)
- Reaction polling tactics

**Score: 4/5** - Quality-focused, but can frustrate casual users

### 2. Professional Reactions

Expanded beyond simple likes:

| Reaction | Meaning | Use Case |
|----------|---------|----------|
| 👍 Like | General approval | Default reaction |
| 🎉 Celebrate | Congratulations | Achievements, milestones |
| 💡 Insightful | Learned something | Thought leadership |
| ❤️ Love | Strong appreciation | Personal stories |
| 🤔 Curious | Want to know more | Questions, teasers |
| 😢 Support | Empathy | Difficult news |

**Score: 4/5** - Nuanced but underutilized

### 3. Content Formats

**High-Performing Formats:**
| Format | Engagement Rate | Notes |
|--------|-----------------|-------|
| Carousels | 45.85% | PDF upload, multi-page |
| LinkedIn Live | 29.6% | 7x reactions vs standard video |
| Native Video | 15% | Under 30s = 2x completion |
| Text Posts | 4% | Baseline |

**Score: 4/5** - Good variety, carousel discovery is poor

### 4. Threading & Conversations

**Comment Threading:**
- Single-level replies (reply to comment)
- Reply-to-reply threads supported
- Multi-participant discussions valued by algorithm
- 5.2x amplification for back-and-forth threads

**Visibility:**
- Comments from connections shown first
- "Most relevant" sorting default
- Notification on replies to your comments

**Score: 3/5** - Limited depth compared to Reddit

### 5. Groups & Communities (2026 Revival)

LinkedIn Groups making comeback:

**Features:**
- Topic-centered discussions
- Member approval workflows
- Admin moderation tools
- Highlighted discussions
- Group-only posting

**Algorithm Boost:**
- Active group participation = higher profile visibility
- Group content can appear in main feed

**Score: 3/5** - Improving, but still secondary feature

### 6. Article Publishing

Long-form content platform:

**Features:**
- Full rich text editor
- Image embedding
- External link embedding
- Collaborative articles (AI-assisted)
- Newsletter subscription

**Score: 4/5** - Best professional publishing platform

---

## Interaction Patterns

### Navigation
- Home (feed)
- My Network
- Jobs
- Messaging
- Notifications
- Profile

### Post Actions
| Icon | Action |
|------|--------|
| 👍 | React (6 options) |
| 💬 | Comment |
| 🔄 | Repost (with/without thoughts) |
| ✉️ | Send (share via message) |

### Mobile Patterns
- Card-based feed
- Swipe between tabs
- Long-press for reactions
- Pull to refresh

---

## Real-time Features

| Feature | Implementation |
|---------|---------------|
| New posts | Manual refresh |
| Reactions | Near real-time |
| Comments | Manual refresh |
| Messaging | Real-time |
| Typing | Available in messages |
| Presence | "Active now" in messaging |

**Score: 3/5** - Real-time limited to messaging

---

## Design System

### Colors
- Primary: #0A66C2 (LinkedIn blue)
- Background: #F4F2EE (light), #1D2226 (dark)
- Card: #FFFFFF (light), #1D2226 (dark)
- Text: #000000 (light), #FFFFFF (dark)
- Success: #057642
- Link: #0A66C2

### Typography
- Font: -apple-system, system-ui, sans-serif
- Post text: 14px
- Headlines: 16px semibold
- Metadata: 12px, muted

### Professional Aesthetic
- Clean, corporate feel
- Conservative animations
- Photo emphasis on people
- Credential badges prominent

---

## Lessons for reasonBridge

### Patterns to Adopt
1. **Professional reactions** - Nuanced emotions beyond like/dislike
2. **Depth-based algorithm** - Reward substance over quantity
3. **Multi-reply thread value** - Encourage back-and-forth discussion
4. **Credential indicators** - Show expertise/authority
5. **Carousel format** - Multi-page content exploration

### Patterns to Avoid
1. **Algorithm opacity** - Users frustrated by reach unpredictability
2. **Engagement bait penalties** - Can feel punitive
3. **Single-level threading** - Limits complex discussions

### Unique Opportunity
reasonBridge's AI could surface "insightful" comments automatically - identifying substantive contributions and surfacing them prominently, similar to LinkedIn's quality focus but transparent.

---

## Sources

- [LinkedIn Algorithm 2026: Engagement Strategy Guide](https://www.digitalapplied.com/blog/linkedin-algorithm-2026-engagement-strategy-guide)
- [The LinkedIn sweet spot: 5 areas to focus on in 2026](https://www.adobe.com/express/learn/blog/linkedin-saves-shares)
- [LinkedIn Changed in 2026 — Understanding the New Rules](https://www.jobseeker.pro/blog/2026-LinkedIn-Changes)
- [How the LinkedIn Algorithm Works [2026 Guide]](https://meetedgar.com/blog/how-the-linkedin-algorithm-works-2026-guide)
