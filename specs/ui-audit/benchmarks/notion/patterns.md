# Notion UI Patterns

## Overview

**Primary Use Case:** Knowledge management and collaborative workspaces
**Target Audience:** Teams, startups, personal productivity enthusiasts
**Platform Strengths:** Rich text editing, inline comments, block-based editing, collaboration

---

## Key UI Patterns

### 1. Block-Based Editing

Notion's signature paradigm:

**Core Concept:**
- Every element is a "block"
- Blocks can be rearranged via drag-and-drop
- Blocks can be transformed (text → heading, list → table)
- Slash command (`/`) to insert any block type

**Block Types:**
| Category | Examples |
|----------|----------|
| Basic | Text, H1-H3, Lists, Toggle, Quote |
| Media | Image, Video, File, Bookmark |
| Database | Table, Board, Calendar, Gallery |
| Embeds | Code, Math, Figma, Miro |
| Advanced | TOC, Synced block, Template |

**Score: 5/5** - Most flexible content editing

### 2. Slash Commands

Universal insertion mechanism:

**Activation:** Type `/` anywhere
**Functionality:**
- Search through all block types
- Recently used shown first
- Keyboard navigable
- Inline preview

**Common Commands:**
- `/h1` - Heading 1
- `/bullet` - Bulleted list
- `/code` - Code block
- `/image` - Image upload
- `/table` - Database table

**Score: 5/5** - Efficient, learnable

### 3. Inline Comments

Discussion within content:

**Features:**
- Highlight text → Add comment
- Cmd/Ctrl + Shift + M shortcut
- @mention to notify
- Thread-style replies
- Resolve comments
- Comment history

**Score: 5/5** - Best document collaboration

### 4. Real-time Collaboration

Multiplayer editing:

**Features:**
- Live cursors showing teammate positions
- Name labels on cursors
- Instant sync across devices
- No version conflicts
- Page-level permissions

**Score: 5/5** - Best-in-class collaboration

### 5. AI Integration (Notion 3.2, 2026)

AI throughout the workspace:

**Features:**
- Spacebar activation on empty line
- Ask AI anything about page content
- Summarize, translate, explain
- Generate content from prompts
- Autofill database properties
- Q&A across entire workspace

**Score: 5/5** - Seamless AI integration

### 6. Page Hierarchy

Nested organization:

**Structure:**
- Workspaces → Pages → Sub-pages (infinite nesting)
- Sidebar shows page tree
- Breadcrumbs for navigation
- `[[` to link to pages
- Backlinks shown at bottom

**Score: 5/5** - Flexible organization

---

## Notion-like Editor Frameworks

### Tiptap

**Description:** Headless editor framework for building Notion-like experiences

**Features:**
- Block-based editing
- Slash commands
- Inline comments
- Real-time collaboration
- AI content transformation
- Extensive plugin system

**Use Case:** Building custom editors with Notion-like UX

### BlockNote

**Description:** Open-source React block editor

**Features:**
- Block-based editing out of box
- Slash menu included
- Real-time via Yjs
- Comments support
- Customizable blocks
- MIT licensed (mostly)

**Use Case:** Quick Notion-like editor integration

### Yoopta Editor

**Description:** Full-featured block editor

**Features:**
- Yjs CRDT for collaboration
- Remote cursors
- Awareness/presence
- WebSocket provider

---

## Interaction Patterns

### Navigation
- Sidebar (workspace/page tree)
- Quick Find (Cmd+P)
- Recent pages
- Favorites
- Breadcrumbs

### Text Commands
| Input | Result |
|-------|--------|
| `**text**` | Bold |
| `*text*` | Italic |
| `` `code` `` | Inline code |
| `[[page` | Page link |
| `@person` | Mention |
| `/` | Slash menu |

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Cmd+P | Quick Find |
| Cmd+Shift+M | Comment |
| Cmd+E | Inline code |
| Cmd+K | Link |
| Cmd+/ | Toggle block menu |

---

## Real-time Features

| Feature | Implementation |
|---------|---------------|
| Cursor presence | Live cursor with name label |
| Text sync | Instant, character-level |
| Comment notifications | Real-time |
| Page changes | Live reload |
| Typing | Implied via cursor movement |

**Score: 5/5** - Excellent multiplayer

---

## Design System

### Colors
- Primary: #000000 (text)
- Accent: Various (customizable)
- Background: #FFFFFF (light), #191919 (dark)
- Sidebar: #FBFBFA (light), #202020 (dark)
- Hover: #EFEFEF (light), #2F2F2F (dark)

### Typography
- Font: Inter, system fallback
- Body: 16px
- Headings: 30px (H1), 24px (H2), 20px (H3)
- Code: monospace

### Spacing
- Block padding: 3px 2px
- Page margin: 96px (desktop), 24px (mobile)
- Line height: 1.5

---

## Lessons for reasonBridge

### Patterns to Adopt
1. **Slash commands** - Quick insertion of formatted content
2. **Inline comments** - Discussion on specific text
3. **Block-based editing** - Flexible, reorderable content
4. **Live cursors** - See where collaborators are working
5. **Page linking** - `[[` to create connections

### Patterns to Avoid
1. **Complexity** - Notion's database views can overwhelm
2. **Performance** - Large pages can lag
3. **Mobile editing** - Block manipulation awkward on mobile

### Unique Opportunity
reasonBridge could use inline comments for AI-powered "evidence check" - highlight a claim, AI provides analysis as a comment thread.

---

## Technical Considerations

### Editor Library Options

| Library | Pros | Cons |
|---------|------|------|
| **Tiptap** | Mature, extensible, commercial support | Requires significant customization |
| **BlockNote** | Easy setup, good defaults | Less flexible than Tiptap |
| **ProseMirror** | Foundation of Tiptap, powerful | Steep learning curve |
| **Slate** | React-native, flexible | Deprecated in favor of Tiptap |

### Collaboration Stack

| Component | Options |
|-----------|---------|
| CRDT | Yjs, Automerge |
| Transport | WebSocket, WebRTC |
| Presence | Yjs Awareness |
| Persistence | Y-IndexedDB, Y-Postgres |

---

## Sources

- [Notion-like | Tiptap UI Components](https://tiptap.dev/docs/ui-components/templates/notion-like-editor)
- [Top Notion-Style WYSIWYG Editors for React](https://www.wisp.blog/blog/top-notion-style-wysiwyg-editors-for-react)
- [BlockNote - Javascript Block-Based React rich text editor](https://www.blocknotejs.org/)
- [Liveblocks BlockNote Integration](https://liveblocks.io/blog/add-notion-style-collaborative-text-editing-to-your-app-with-liveblocks-blocknote)
- [Notion AI Review 2026](https://max-productive.ai/ai-tools/notion-ai/)
