# GitHub Discussions UI Patterns

## Overview

**Primary Use Case:** Technical discourse and community Q&A
**Target Audience:** Developers, open source maintainers, technical communities
**Platform Strengths:** Markdown support, code integration, category organization, issue linking

---

## Key UI Patterns

### 1. Category Organization

Structured discussion types:

**Built-in Categories:**
| Category | Format | Use Case |
|----------|--------|----------|
| Announcements | Announcement | Maintainer broadcasts |
| General | Open-ended | Anything goes |
| Ideas | Open-ended | Feature suggestions |
| Polls | Poll | Community voting |
| Q&A | Question/Answer | Technical help |
| Show and Tell | Open-ended | Project showcases |

**Custom Categories:**
- Admins can create additional
- Each has icon, description, format
- Can restrict who can create

**Score: 4/5** - Good organization, limited customization

### 2. Q&A Format

Stack Overflow-like functionality:

**Features:**
- Mark answer as "Accepted"
- Accepted answer pinned to top
- Upvote helpful answers
- Convert discussion → issue

**Score: 4/5** - Good for technical Q&A

### 3. Discussion Forms (YAML Templates)

Structured input collection:

**Syntax:**
```yaml
body:
  - type: markdown
    attributes:
      value: "Thanks for opening a discussion!"
  - type: input
    id: version
    attributes:
      label: "Version"
      description: "What version are you using?"
    validations:
      required: true
  - type: textarea
    id: details
    attributes:
      label: "Details"
```

**Features:**
- Required fields
- Dropdown selections
- Checkboxes
- Markdown rendering on submit

**Score: 4/5** - Powerful templating

### 4. GitHub Flavored Markdown (GFM)

Enhanced markdown for technical content:

**Unique Features:**
| Syntax | Result |
|--------|--------|
| ` ```js ` | Syntax-highlighted code |
| `- [ ]` | Task list |
| `\| \| \|` | Tables |
| `#123` | Issue/PR autolink |
| `@user` | User mention |
| `:emoji:` | Emoji |
| `> [!NOTE]` | Callout blocks |

**Score: 5/5** - Best markdown for technical content

### 5. Code Integration

Seamless repository connection:

**Features:**
- Link to specific code lines
- Embed code snippets
- Reference commits, branches
- Issue/PR cross-linking
- Automatic backlinks

**Score: 5/5** - Unmatched code context

### 6. Poll Discussions

Community voting:

**Features:**
- Multiple choice options
- Vote count display
- Change vote allowed
- Results visible after voting

**Score: 3/5** - Basic but functional

---

## Interaction Patterns

### Navigation
- Discussions tab (in repository)
- Categories list (sidebar)
- Search (with filters)
- Sort (Top, Latest, Oldest, Unanswered)

### Discussion Actions
| Action | Description |
|--------|-------------|
| Comment | Add to thread |
| React | Emoji reaction |
| Quote Reply | Reply with quote |
| Mark Answer | Q&A only, accepted solution |
| Convert to Issue | Create linked issue |
| Pin | Sticky at top |
| Lock | Prevent new comments |

### Markdown Toolbar
- Bold, Italic, Quote
- Code (inline and block)
- Link, Image
- Lists (ordered, unordered, task)
- Mentions (@)
- Reference (#)
- Slash commands

---

## Real-time Features

| Feature | Implementation |
|---------|---------------|
| New comments | Manual refresh |
| Reactions | Near real-time |
| Edits | Manual refresh |
| Notifications | Badge + email |
| Typing | Not implemented |

**Score: 2/5** - Limited real-time

---

## Design System

### Colors
- Primary: #0969DA (blue)
- Background: #FFFFFF (light), #0D1117 (dark)
- Border: #D0D7DE (light), #30363D (dark)
- Success: #1A7F37
- Danger: #CF222E
- Accent: #8250DF (purple)

### Typography
- Font: -apple-system, Segoe UI, sans-serif
- Body: 14px
- Code: SFMono-Regular, Consolas, monospace
- Headings: 16-32px

### Layout
- Max content width: ~1012px
- Sidebar: ~296px
- Padding: 16px (mobile), 24px (desktop)

---

## Markdown Best Practices (2026)

### Structure
- Headings form usable outline
- Nested lists with proper indentation
- Tables formatted for mobile readability

### Code Blocks
```markdown
```typescript
// Always specify language for syntax highlighting
function example(): void {
  console.log('Highlighted correctly');
}
```
```

### Callouts
```markdown
> [!NOTE]
> Useful information

> [!WARNING]
> Be careful

> [!TIP]
> Helpful advice
```

### Actionable Content
- Callouts should be actionable, not vague
- Bad: "Be careful"
- Good: "Run `./bin/migrate --dry-run` first"

---

## Lessons for reasonBridge

### Patterns to Adopt
1. **Category organization** - Structured discussion types
2. **Q&A format** - Accept answers for resolved questions
3. **GFM markdown** - Code blocks, tables, task lists
4. **Discussion templates** - Structured input forms
5. **Issue linking** - Connect discussions to actionable items

### Patterns to Avoid
1. **Limited threading** - Only single-level replies
2. **Manual refresh** - No live updates
3. **Developer-only focus** - Markdown intimidates non-technical users

### Unique Opportunity
reasonBridge could auto-detect "questions" in discussions and suggest Q&A format, then use AI to identify which responses best answer the question.

---

## Integration with Discourse

Discourse (separate platform) offers deeper features:

**Features:**
- Category customization
- Tag system
- Accepted answers
- Trust levels (reputation)
- GitHub integration (mirror issues/PRs)

**Consideration:** If reasonBridge needs more than GitHub Discussions, Discourse patterns are worth studying.

---

## Sources

- [GitHub Discussions documentation](https://docs.github.com/en/discussions)
- [Syntax for discussion category forms](https://docs.github.com/en/discussions/managing-discussions-for-your-community/syntax-for-discussion-category-forms)
- [Basic writing and formatting syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)
- [Markdown Cheat Sheet for GitHub (GFM) in 2026](https://thelinuxcode.com/markdown-cheat-sheet-for-github-gfm-in-2026-the-patterns-i-actually-use/)
