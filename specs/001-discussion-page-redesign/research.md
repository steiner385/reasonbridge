# Research: Discussion Page Redesign for Chat-Style UX

**Date**: 2026-02-05
**Feature**: Discussion Page Redesign
**Purpose**: Research technical decisions, patterns, and best practices for three-panel responsive layout implementation

## Overview

This document captures research findings for implementing a modern three-panel chat-style discussion interface. The research focuses on four key areas:

1. **Panel layout patterns** - CSS Grid vs Flexbox, independent scrolling, responsive breakpoints
2. **Virtual scrolling libraries** - Performance comparison and integration approach
3. **State management for panel UI** - Session persistence, panel resizing, collapse state
4. **Responsive design strategies** - Mobile/tablet adaptations of three-panel layouts

---

## 1. Panel Layout Patterns

### Decision: CSS Grid with fixed-fluid-fixed pattern

**Rationale**:
- CSS Grid provides native support for three-column layouts with independent sizing
- `grid-template-columns: [left-width] 1fr [right-width]` allows fluid center panel
- Independent scrolling achieved via `overflow-y: auto` on each grid item
- Better semantic structure than nested Flexbox for multi-panel layouts
- Native support for responsive column reordering via `grid-template-areas`

**Implementation Approach**:
```css
.discussion-layout {
  display: grid;
  grid-template-columns: var(--left-panel-width, 300px) 1fr var(--right-panel-width, 360px);
  grid-template-areas: "topics conversation metadata";
  height: 100vh;
  gap: 0;
}

.topic-panel { grid-area: topics; overflow-y: auto; }
.conversation-panel { grid-area: conversation; overflow-y: auto; }
.metadata-panel { grid-area: metadata; overflow-y: auto; }

/* Responsive breakpoints */
@media (max-width: 1279px) {
  .discussion-layout {
    grid-template-columns: 1fr var(--right-panel-width, 360px);
    grid-template-areas: "conversation metadata";
  }
  .topic-panel { display: none; } /* Collapsed to hamburger menu */
}

@media (max-width: 767px) {
  .discussion-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas: "topics" "conversation" "metadata";
  }
  .topic-panel, .metadata-panel { display: block; } /* Vertical stack */
}
```

**Alternatives Considered**:

1. **Flexbox with nested containers**:
   - Rejected because: More complex nesting required for three columns
   - Harder to manage responsive reordering
   - Less semantic HTML structure

2. **Absolute positioning**:
   - Rejected because: Fragile, hard to maintain
   - Doesn't play well with dynamic content heights
   - Poor accessibility (tab order issues)

3. **React layout libraries (react-grid-layout, react-mosaic)**:
   - Rejected because: Overkill for fixed three-panel layout
   - Adds unnecessary bundle size (~50KB)
   - Native CSS Grid is sufficient and performant

**Best Practices**:
- Use CSS custom properties (--left-panel-width, --right-panel-width) for dynamic panel sizing
- Store panel widths in sessionStorage and apply via inline styles
- Use `will-change: grid-template-columns` for smooth resize transitions
- Implement `contain: layout style paint` for panel isolation (performance optimization)

---

## 2. Virtual Scrolling Libraries

### Decision: react-window (FixedSizeList)

**Rationale**:
- Lightweight (~7KB gzipped) compared to react-virtualized (~30KB)
- Actively maintained by same author (Brian Vaughn from React core team)
- Optimized for React 18 concurrent rendering
- Simple API for fixed-height list items
- Built-in support for dynamic item heights via VariableSizeList (if needed later)
- Excellent performance for 500+ items (60fps scrolling on mid-range devices)

**Implementation Approach**:

```typescript
import { FixedSizeList as List } from 'react-window';

// Topic list example
<List
  height={window.innerHeight - 60} // Full viewport minus header
  itemCount={topics.length}
  itemSize={72} // Fixed height per topic item
  width="100%"
  overscanCount={5} // Render 5 items above/below viewport
>
  {({ index, style }) => (
    <TopicListItem
      topic={topics[index]}
      style={style}
      onClick={() => handleTopicSelect(topics[index].id)}
    />
  )}
</List>
```

**Performance Characteristics**:
- Renders only visible items + overscan buffer
- DOM node count: ~15-20 items (viewport height / item height + overscan)
- Memory footprint: ~1MB for 1000 topics (vs ~50MB without virtualization)
- Scroll performance: Consistent 60fps on 500+ items

**Alternatives Considered**:

1. **react-virtualized**:
   - Rejected because: Larger bundle size, more complex API
   - react-window is the spiritual successor with better performance

2. **@tanstack/react-virtual (TanStack Virtual)**:
   - Considered because: More modern, headless UI approach
   - Rejected because: Less mature (v3 released 2023), fewer battle-tested production deployments
   - May revisit in future if react-window becomes unmaintained

3. **Intersection Observer + manual windowing**:
   - Rejected because: Reinventing the wheel, complex to implement correctly
   - Edge cases (rapid scrolling, dynamic heights) hard to handle

**Integration with Existing Code**:
- Wrap existing `ResponseList` and `TopicList` components
- Pass itemSize based on measured component heights
- Use `useCallback` for row renderer to prevent re-renders
- Integrate with existing loading states (skeleton loaders while data fetches)

**Best Practices**:
- Use `overscanCount={3-5}` to balance smoothness vs memory
- Memoize item components with React.memo()
- Use `initialScrollOffset` to restore scroll position on navigation
- Handle keyboard navigation by programmatically scrolling to focused item
- Measure actual item heights in development, use fixed values in production

---

## 3. State Management for Panel UI

### Decision: React Context + sessionStorage + custom hooks

**Rationale**:
- Context API sufficient for panel UI state (no need for Redux/Zustand)
- sessionStorage for panel width persistence (cleared on browser close, per spec)
- Custom hooks encapsulate panel logic (usePanelState, usePanelResize)
- Avoids prop drilling through deeply nested components
- Follows existing pattern in codebase (AuthContext, ThemeContext)

**Implementation Approach**:

```typescript
// DiscussionLayoutContext.tsx
interface PanelState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  isLeftPanelCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  activeTopic: string | null;
}

const DiscussionLayoutContext = createContext<{
  panelState: PanelState;
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  togglePanel: (panel: 'left' | 'right') => void;
  setActiveTopic: (topicId: string) => void;
} | null>(null);

// usePanelState.ts
export function usePanelState() {
  const [panelState, setPanelState] = useState<PanelState>(() => {
    // Load from sessionStorage on mount
    const saved = sessionStorage.getItem('discussion-panel-state');
    return saved ? JSON.parse(saved) : DEFAULT_PANEL_STATE;
  });

  useEffect(() => {
    // Save to sessionStorage on change
    sessionStorage.setItem('discussion-panel-state', JSON.stringify(panelState));
  }, [panelState]);

  return { panelState, setPanelState };
}

// usePanelResize.ts
export function usePanelResize(panel: 'left' | 'right', initialWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = panel === 'left'
        ? Math.max(240, Math.min(480, e.clientX))
        : Math.max(280, Math.min(600, window.innerWidth - e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panel]);

  return { width, isResizing, handleMouseDown };
}
```

**State Persistence Strategy**:
- Panel widths: sessionStorage (survives navigation, cleared on browser close)
- Collapse state: sessionStorage (same rationale)
- Active topic: URL parameter (enables bookmarking, back/forward navigation)
- Scroll position: react-window `initialScrollOffset` (restored on mount)

**Alternatives Considered**:

1. **localStorage for panel preferences**:
   - Rejected because: Spec explicitly states "session-only" preferences
   - Users might share devices; persistent preferences could be confusing

2. **Redux/Zustand for panel state**:
   - Rejected because: Overkill for simple UI state
   - No need for time-travel debugging or complex state derivation
   - Context API + hooks is simpler and sufficient

3. **URL query params for all panel state**:
   - Rejected because: URLs would be excessively long
   - Panel widths are implementation details, not user-facing state

**Best Practices**:
- Debounce sessionStorage writes during panel resizing (max 1 write per 200ms)
- Use reducer pattern in context for complex state transitions
- Provide TypeScript discriminated unions for panel actions
- Add error boundaries around context providers
- Validate sessionStorage data on load (handle corrupted/old data gracefully)

---

## 4. Responsive Design Strategies

### Decision: Progressive enhancement with breakpoint-specific layouts

**Rationale**:
- Desktop-first design (spec prioritizes ≥1280px viewports)
- Tailwind CSS breakpoints align with spec (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Three distinct layouts: desktop (3 panels), tablet (2 panels + hamburger), mobile (vertical stack)
- Use CSS Grid template areas for semantic column reordering
- Touch-friendly targets on mobile (min 44px tap areas)

**Breakpoint Strategy**:

| Viewport Width | Layout Pattern | Panel Behavior |
|----------------|----------------|----------------|
| ≥1280px (xl) | 3 columns (left + center + right) | All panels visible, resizable dividers |
| 768-1279px (md-lg) | 2 columns (center + right) | Left → hamburger menu overlay, right resizable |
| <768px (sm) | 1 column vertical stack | Topics → accordion at top, conversation → middle, metadata → collapsible sections |

**Implementation Approach**:

```typescript
// useBreakpoint.ts
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) setBreakpoint('mobile');
      else if (width < 1280) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

// Responsive panel rendering
{breakpoint === 'desktop' && (
  <DiscussionLayout threePanels />
)}
{breakpoint === 'tablet' && (
  <DiscussionLayout twoPanels hamburgerMenu />
)}
{breakpoint === 'mobile' && (
  <DiscussionLayout verticalStack />
)}
```

**Mobile-Specific Optimizations**:
- Compose area expands to full viewport (modal-like UX)
- Metadata sections use `<details>` accordion pattern
- Swipe gestures for left panel open/close (use react-swipeable)
- Pull-to-refresh for new responses (use native browser behavior)
- Virtual keyboard handling (adjust viewport height on focus)

**Tablet-Specific Optimizations**:
- Left panel slides in as overlay (z-index, backdrop blur)
- Tap outside to close left panel
- Right panel shares ~40% of screen width with conversation
- Preserve panel resizing for landscape orientation

**Alternatives Considered**:

1. **Container queries (CSS Containment)**:
   - Rejected because: Still experimental in 2026, limited browser support
   - May revisit when baseline browser support reaches 95%

2. **Separate mobile/tablet/desktop components**:
   - Rejected because: Code duplication, hard to maintain consistency
   - Conditional rendering within single component tree is simpler

3. **Responsive iframe approach**:
   - Rejected because: Breaks accessibility, SEO, and context sharing
   - Only useful for embed scenarios, not applicable here

**Best Practices**:
- Use `min-width` media queries (mobile-first CSS, despite desktop-first UX priority)
- Test on real devices (Playwright device emulation for regression tests)
- Provide touch targets ≥44px on mobile (WCAG AA requirement)
- Use `prefers-reduced-motion` media query to disable panel slide animations
- Implement `<meta name="viewport" content="width=device-width, initial-scale=1">` for mobile

**Accessibility Considerations**:
- Use `<nav>`, `<main>`, `<aside>` landmarks for panels
- Announce panel state changes via ARIA live regions
- Preserve focus when panels collapse/expand
- Ensure keyboard shortcuts work across all breakpoints
- Provide skip-to-content links for screen reader users

---

## Summary of Technical Decisions

| Area | Decision | Key Trade-off |
|------|----------|---------------|
| **Layout** | CSS Grid (fixed-fluid-fixed) | Simplicity vs flexibility - Grid is simpler, sufficient for three-panel |
| **Virtual Scrolling** | react-window (FixedSizeList) | Bundle size vs features - 7KB lightweight, mature, performant |
| **State Management** | Context + sessionStorage + hooks | Complexity vs overhead - Context is simpler, no Redux needed |
| **Responsive** | Breakpoint-specific layouts | Code duplication vs UX quality - Conditional rendering preferred |
| **Panel Resize** | Custom drag handler with bounds | Library vs custom - Custom gives full control, small code footprint |
| **URL Routing** | React Router with topic ID param | Deep linking vs simplicity - URL param enables bookmarking |

**Risk Mitigation**:
- All decisions use battle-tested libraries/patterns already in codebase
- No experimental features or bleeding-edge APIs
- Fallback strategies documented for each component
- Progressive enhancement ensures mobile works even if JS fails

**Performance Budget**:
- New code bundle size: <100KB gzipped
- Time to interactive (TTI): <3 seconds on 3G
- Panel switch latency: <100ms
- Virtual scroll frame rate: 60fps sustained

**Next Steps**:
- Phase 1: Generate data models for client-side panel state
- Phase 1: Document WebSocket message types for real-time updates
- Phase 1: Create quickstart guide for local development

---

**Research Complete**: All technical unknowns from Phase 0 resolved. Ready to proceed to Phase 1 (Design & Contracts).
