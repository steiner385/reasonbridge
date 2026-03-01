# Composition Experience Audit Report

## Category Weight: 15%

---

## Current State

### Score: 2.5/5 (Functional)

The composition experience is functional but limited to plain text. Missing rich text, @mentions, and modern formatting options that users expect from contemporary discussion platforms.

---

## Feature Assessment

### Text Input Responsiveness ✅

**Score: 4/5**

**Implemented:**
- Auto-grow textarea
- Responsive to viewport changes
- No noticeable input lag

**Evidence:**
```typescript
// frontend/src/components/responses/LightweightReplyComposer/ReplyTextarea.tsx
// Auto-expanding textarea with resize handling
```

### Formatting Options ❌

**Score: 1/5**

**Implemented:**
- None - plain text only
- Newlines preserved with `whitespace-pre-wrap`

**Missing:**
- Bold, italic, strikethrough
- Bulleted/numbered lists
- Code blocks (inline and fenced)
- Block quotes
- Headings
- Links with preview

**Gap:** No markdown parser, no WYSIWYG toolbar, no formatting shortcuts

### @Mentions ❌

**Score: 0/5**

**Not Implemented:**
- No `@username` detection
- No autocomplete dropdown
- No mention highlighting
- No mention notifications

**Impact:** Critical for discussion platforms - users cannot direct responses to specific participants

### Link Preview Generation ❌

**Score: 0/5**

**Not Implemented:**
- URLs displayed as plain clickable links
- No OpenGraph preview cards
- No thumbnail extraction

**Impact:** Medium - reduces context when sharing external content

### Draft Persistence ✅

**Score: 4/5**

**Implemented:**
- `useDraftAutoSave.ts` hook for auto-saving
- Local storage persistence
- Recovery on page reload

**Evidence:**
```typescript
// frontend/src/hooks/useDraftAutoSave.ts
const useDraftAutoSave = (key: string, interval: number) => { ... }
```

**Gap:** No cross-device draft sync

### Mobile Keyboard Handling ✅

**Score: 3/5**

**Implemented:**
- Auto-focus on expand
- Viewport adjustment for keyboard
- Safe area insets

**Missing:**
- Keyboard shortcuts overlay
- Haptic feedback on actions
- Voice input integration

### AI Feedback Integration ✅ (Unique)

**Score: 5/5**

**Implemented:**
- Real-time preview feedback
- Clarity score indicator
- Bias detection warnings
- Fallacy identification
- Tone analysis
- Evidence quality feedback

**Evidence:**
```typescript
// frontend/src/components/responses/ResponseComposer.tsx
// AI feedback integration with hybrid regex + ML approach
```

**Competitive Advantage:** No other benchmarked platform offers real-time AI composition feedback

---

## Benchmark Comparison

| Platform | Input | Formatting | @Mentions | Link Preview | Drafts | Overall |
|----------|-------|------------|-----------|--------------|--------|---------|
| Slack | 5 | 5 | 5 | 4 | 4 | 4.6 |
| Discord | 5 | 4 | 5 | 4 | 3 | 4.2 |
| Notion | 5 | 5 | 5 | 4 | 5 | 4.8 |
| GitHub | 4 | 5 | 4 | 3 | 3 | 3.8 |
| **reasonBridge** | 4 | 1 | 0 | 0 | 4 | **2.5** |

Note: AI feedback (5/5) is a unique differentiator not included in benchmark comparison.

---

## Gaps Identified

### 1. @Mentions with Autocomplete
- **Impact:** High (5/5)
- **Effort:** Medium (3/5)
- **Description:** Essential for directed conversation
- **Benchmark:** All platforms support this

### 2. Rich Text/Markdown Editor
- **Impact:** High (5/5)
- **Effort:** High (4/5)
- **Description:** Formatting improves readability
- **Options:** Tiptap, BlockNote, ProseMirror

### 3. Link Previews
- **Impact:** Medium (3/5)
- **Effort:** Medium (3/5)
- **Description:** Show OpenGraph cards for URLs
- **Benchmark:** All platforms except GitHub

### 4. Emoji Picker
- **Impact:** Medium (3/5)
- **Effort:** Low (2/5)
- **Description:** Quick emoji insertion
- **Benchmark:** Discord, Slack have rich pickers

---

## Recommendations

### Quick Wins (Low Effort, High Impact)
1. **Emoji picker button** - Use existing emoji picker library
2. **Markdown preview toggle** - Show rendered markdown

### Major Projects (High Effort, High Impact)
1. **@Mentions system** - Autocomplete + notification integration
   - `/@user` detection regex
   - Dropdown with user search
   - Backend notification on mention

2. **Rich text editor** - Integrate Tiptap or BlockNote
   - Block-based editing
   - Slash commands
   - Formatting toolbar

### Phased Approach

**Phase 1: Markdown Support (2 weeks)**
- Add markdown parser (remark/marked)
- Preview toggle in composer
- Shortcuts (Ctrl+B, Ctrl+I)

**Phase 2: @Mentions (2 weeks)**
- User autocomplete dropdown
- Mention highlighting in display
- Notification integration

**Phase 3: Rich Editor (4-6 weeks)**
- Migrate to Tiptap/BlockNote
- Slash commands
- Link previews
- File attachments

---

## Technical Considerations

### Editor Library Options

| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Tiptap** | Mature, extensible, good docs | Requires customization | Best for long-term |
| **BlockNote** | Easy setup, Notion-like | Less flexible | Best for quick start |
| **ProseMirror** | Most powerful | Steep learning curve | Only if needed |

### Mention Implementation

```typescript
// Proposed mention detection pattern
const MENTION_REGEX = /@(\w+)/g;

// Autocomplete trigger
const handleInput = (text: string) => {
  const match = text.match(/@(\w*)$/);
  if (match) {
    setShowUserDropdown(true);
    setMentionQuery(match[1]);
  }
};
```

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Rich text usage | 0% | 40% | Analytics |
| Mention usage | 0% | 25% | Analytics |
| Draft recovery rate | Unknown | 95% | Analytics |
| Composition time | TBD | Reduced 20% | User testing |

---

## Related Files

- `frontend/src/components/responses/ResponseComposer.tsx`
- `frontend/src/components/responses/LightweightReplyComposer/`
- `frontend/src/hooks/useDraftAutoSave.ts`
- `frontend/src/components/feedback/` (AI feedback)
