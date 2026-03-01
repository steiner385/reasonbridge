# Slack UI Patterns

## Overview

**Primary Use Case:** Workplace collaboration and team communication
**Target Audience:** Business teams, enterprises, remote workers
**Platform Strengths:** Threading, powerful search, rich formatting, app integrations

---

## Key UI Patterns

### 1. Threading Model

Slack's threading is a defining feature that keeps channels clean:

**Implementation Details:**
- Click "Reply in thread" on any message
- Thread opens in right panel (or replaces main view on mobile)
- Thread preview shows reply count in main channel
- "Also send to channel" checkbox for important replies
- Thread notifications separate from channel notifications

**Score: 5/5** - Industry-leading threading model

### 2. Split View (Feb 2026)

Highly requested feature now available:
- Pin any thread, channel, canvas, or content in side panel
- Continue navigating in main panel
- Right-click → "Open in split view"
- Persistent secondary view

**Score: 5/5** - Excellent multi-tasking support

### 3. Search & Quick Switcher

**Quick Switcher (Cmd+K):**
- Search channels, DMs, files, people
- Recent items shown first
- Fuzzy matching
- Filter by type

**Advanced Search:**
- Natural language queries
- Filter by date, person, channel
- Search within threads
- Save searches

**AI-Powered Search (Business+ plans):**
- Natural language questions
- Searches across channels, files, DMs, canvases
- Permission-aware (only sees what you can)

**Score: 5/5** - Best-in-class search

### 4. Block Kit (Rich Formatting)

Slack's UI framework for structured messages:

**Block Types:**
- Text blocks (with formatting)
- Image blocks
- Dividers
- Section blocks (text + accessory)
- Action blocks (buttons, selects)
- Context blocks (metadata)
- Input blocks (form fields)

**Formatting Options:**
- Bold, italic, strikethrough
- Code inline and blocks
- Links with previews
- Lists (bulleted, numbered)
- Quotes
- Emoji

**Score: 5/5** - Most powerful message formatting

### 5. Message Composer

Rich input beyond text:
- Formatting toolbar (or markdown)
- File attachments (drag & drop)
- Code snippets with syntax highlighting
- Mentions (@user, @here, @channel)
- Emoji picker
- Slash commands (/giphy, /poll, etc.)
- Scheduled messages

**Score: 5/5** - Comprehensive composition

### 6. App Integrations

Seamless third-party integration:
- Slack App Directory
- Bot messages with rich formatting
- Interactive buttons in messages
- Workflow automation
- OAuth for external services

**Score: 5/5** - Best-in-class ecosystem

---

## Interaction Patterns

### Navigation (Redesigned 2024)
- Home view (customizable)
- DMs view
- Activity view (mentions, reactions)
- Later view (saved items)
- Channels list (sidebar)

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Cmd+K | Quick switcher |
| Cmd+Shift+T | Open threads |
| Cmd+F | Search |
| Cmd+U | Upload file |
| Cmd+/ | Keyboard shortcuts |

### Mobile Patterns
- Swipe right to go back
- Long-press for message actions
- Bottom tab navigation
- Floating compose button

---

## Real-time Features

| Feature | Implementation |
|---------|---------------|
| New messages | Live append with "unread" divider |
| Typing indicators | "[Name] is typing..." in channel |
| Presence | Green dot = active, hollow = away |
| Reactions | Instant, animated on add |
| Read receipts | Not available (intentional) |

**Score: 4/5** - Good real-time, no read receipts

---

## Design System

### Colors
- Sidebar: Customizable per workspace
- Messages: White/off-white background
- Primary action: #4A154B (Slack purple)
- Links: #0B4C8C
- Success: #007A5A
- Warning: #ECB22E
- Error: #E01E5A

### Typography
- Font: Lato, system fonts fallback
- Message text: 15px
- Compact mode: 14px

### Spacing
- Message padding: 8px 20px
- Avatar size: 36px (or 24px compact)
- Thread indent: 16px

---

## Lessons for reasonBridge

### Patterns to Adopt
1. **Split view** - Side-by-side content for comparison/reference
2. **Thread model** - "Reply in thread" with channel preview
3. **Search** - Natural language, filter by type/date/person
4. **Block Kit approach** - Structured, semantic message blocks
5. **@mentions with autocomplete** - Critical for discussion platforms

### Patterns to Avoid
1. **Workspace complexity** - Multiple workspaces can fragment attention
2. **Notification overload** - Too many channels = notification fatigue

### Unique Opportunity
reasonBridge could integrate AI feedback into the composer like Slack's AI rewrite features, but focused on argument quality and bias detection.

---

## Sources

- [What's New in Slack: February 2026 Update](https://vantagepoint.io/blog/sf/whats-new-in-slack-february-2026-update)
- [Slack UI/UX: Design Deep Dive & Future Trends](https://createbytes.com/insights/is-ui-ux-for-slack-application-on-point-review)
- [A redesigned Slack, built for focus](https://slack.com/blog/productivity/a-redesigned-slack-built-for-focus)
- [Leveraging Slack Block Kit for Rich Message Formatting](https://reintech.io/blog/leveraging-slack-block-kit-rich-message-formatting)
- [The Gradual Design System: How We Built Slack Kit](https://slack.engineering/the-gradual-design-system-how-we-built-slack-kit/)
