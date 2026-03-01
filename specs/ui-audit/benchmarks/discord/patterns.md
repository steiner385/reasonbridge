# Discord UI Patterns

## Overview

**Primary Use Case:** Real-time community communication and gaming
**Target Audience:** Gamers, communities, content creators, remote teams
**Platform Strengths:** Real-time presence, rich reactions, message grouping, voice integration

---

## Key UI Patterns

### 1. Message Grouping

Discord groups consecutive messages from the same user within a time window (typically 5 minutes), displaying only the first message with a full header (avatar, username, timestamp).

**Implementation Details:**
- First message: full header with avatar, username, timestamp
- Subsequent messages: minimal, only content (indented under avatar)
- Hover reveals timestamp for each message
- Time gap > 5 min breaks grouping

**Score: 5/5** - Best-in-class message density without sacrificing readability

### 2. Presence Indicators

Real-time user status displayed via colored dot overlay on avatars:

| Status | Color | Meaning |
|--------|-------|---------|
| Online | Green | Active |
| Idle | Yellow/Amber | Away for 5+ min |
| Do Not Disturb | Red | Notifications suppressed |
| Invisible | Gray | Appear offline |
| Offline | Gray (hollow) | Not connected |

**Score: 5/5** - Industry-leading presence system

### 3. Reaction System

Rich emoji reactions with:
- Quick access to recent/frequent emojis
- Custom server emojis
- Reaction count badges
- Click to add same reaction
- Hover to see who reacted

**Implementation Details:**
- Reactions appear below message
- Multiple users can add same reaction (count increments)
- Animated emoji support
- Super reactions (larger, animated, premium feature)

**Score: 5/5** - Most comprehensive reaction system

### 4. Threading

Threads branch off from specific messages:
- "Create Thread" action on any message
- Thread preview in main channel
- Dedicated thread view
- Thread auto-archive after inactivity (1h, 24h, 3d, 1w options)

**Score: 4/5** - Good threading, though less discoverable than Slack

### 5. Voice/Video Integration

Centralized voice/video controls (March 2025 redesign):
- Red mute glow indicator
- Green camera active indicator
- Movable overlay widgets
- Voice activity indicators

**Score: 5/5** - Seamless voice/video UX

### 6. Accessibility (Feb 2026 Updates)

Recent accessibility improvements:
- Screen reader roles for "Add Reaction" button
- Screen reader roles for "See Thread" button
- Replied Message preview with appropriate roles
- Emoji messages no longer read as multiple elements
- Fixed padding on typing indicators

**Score: 4/5** - Good and improving accessibility

---

## Interaction Patterns

### Navigation
- Server list (left sidebar)
- Channel list (second column)
- Message view (main area)
- Member list (right sidebar, collapsible)

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+K | Quick switcher |
| Ctrl+/ | Show all shortcuts |
| Up Arrow | Edit last message |
| + | Add reaction |

### Mobile Patterns
- Swipe navigation between channels
- Long-press for context menus
- Bottom sheet for actions
- Floating action button for compose

---

## Real-time Features

| Feature | Implementation |
|---------|---------------|
| New messages | Live append, auto-scroll if at bottom |
| Typing indicators | "[Name] is typing..." with animated dots |
| Presence updates | Real-time status changes |
| Reactions | Instant update, no refresh |
| Read state | Unread badge on channels, "New Messages" divider |

**Score: 5/5** - Best-in-class real-time UX

---

## Design System

### Colors (Dark Mode Default)
- Background: #313338 (primary), #2B2D31 (secondary)
- Text: #F2F3F5 (primary), #B5BAC1 (secondary)
- Accent: #5865F2 (blurple)
- Positive: #57F287
- Warning: #FEE75C
- Negative: #ED4245

### Typography
- Font: gg sans (custom), Whitney fallback
- Message text: 16px
- Timestamps: 12px, muted

### Spacing
- Message padding: 16px
- Avatar size: 40px
- Grouped message indent: 56px (40 + 16 margin)

---

## Lessons for reasonBridge

### Patterns to Adopt
1. **Message grouping** - Group consecutive messages from same user
2. **Rich reactions** - Emoji reactions with counts and quick picker
3. **Typing indicators** - Show who is composing
4. **Presence system** - Online/offline/idle status
5. **Unread markers** - Clear "New Messages" divider

### Patterns to Avoid
1. **Server complexity** - Discord's server/channel hierarchy is overkill for discussions
2. **Feature density** - Too many hidden features behind gestures

### Unique Opportunity
reasonBridge's AI features (bias detection, common ground) could be surfaced as real-time indicators similar to Discord's presence system - showing "AI analyzing..." or summary badges.

---

## Sources

- [Discord Patch Notes: February 4, 2026](https://discord.com/blog/discord-patch-notes-february-4-2026)
- [Discord's March 2025 UI Overhaul](https://medium.com/@negi28.sumit/discords-march-2025-ui-overhaul-loved-or-hated-fff69f5eaebe)
- [Activity Design Patterns - Discord Documentation](https://discord.com/developers/docs/activities/design-patterns)
- [Discord UI Kit | Figma](https://www.figma.com/community/file/1087464748597886212/discord-ui-kit)
