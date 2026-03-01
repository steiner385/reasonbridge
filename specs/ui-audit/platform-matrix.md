# Platform Feature Matrix

## Scoring Scale

| Score | Label |
|-------|-------|
| 0 | Not implemented |
| 1 | Minimal |
| 2 | Functional |
| 3 | Good |
| 4 | Excellent |
| 5 | Best-in-class |

---

## Legend

| Platform | Abbreviation |
|----------|--------------|
| Discord | DIS |
| Slack | SLK |
| Twitter/X | TWX |
| Reddit | RED |
| LinkedIn | LIN |
| WhatsApp/Telegram | WHA |
| Notion | NOT |
| GitHub Discussions | GIT |
| **reasonBridge** | **RB** |

---

## Conversation UX (18%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Thread visualization | 4 | 5 | 3 | 5 | 3 | 2 | 4 | 3 | **4** | -0.5 |
| Message grouping | 5 | 4 | 2 | 3 | 2 | 4 | 3 | 2 | **4** | -0.1 |
| Deep threading (>3 levels) | 3 | 4 | 2 | 5 | 2 | 1 | 3 | 2 | **3** | -0.3 |
| Collapse/expand threads | 3 | 5 | 3 | 5 | 2 | 1 | 4 | 3 | **4** | -0.3 |
| Unread markers | 5 | 4 | 3 | 2 | 3 | 5 | 3 | 2 | **2** | **-1.5** |
| New message divider | 5 | 5 | 2 | 2 | 2 | 4 | 3 | 1 | **0** | **-3.0** |
| Auto-scroll behavior | 5 | 4 | 4 | 3 | 3 | 5 | 3 | 2 | **3** | -0.6 |
| Keyboard navigation (J/K) | 3 | 4 | 3 | 4 | 2 | 0 | 4 | 3 | **0** | **-2.9** |
| Quote/reply preview | 5 | 5 | 4 | 3 | 3 | 5 | 4 | 4 | **0** | **-4.1** |
| Message timestamps | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 4 | **4** | 0.0 |

**Category Average:** Benchmark 3.5 | reasonBridge 2.4 | **Gap: -1.1**

---

## Composition Experience (15%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Text input responsiveness | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 4 | **4** | -0.5 |
| Bold/italic formatting | 4 | 5 | 0 | 4 | 0 | 4 | 5 | 5 | **0** | **-3.4** |
| Code blocks | 4 | 5 | 0 | 4 | 0 | 2 | 5 | 5 | **0** | **-3.1** |
| Lists (bullet/numbered) | 3 | 4 | 0 | 4 | 3 | 2 | 5 | 5 | **0** | **-3.3** |
| @mentions autocomplete | 5 | 5 | 5 | 3 | 4 | 4 | 4 | 4 | **0** | **-4.3** |
| Link preview generation | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **0** | **-3.9** |
| Emoji picker | 5 | 5 | 4 | 4 | 3 | 5 | 4 | 4 | **0** | **-4.3** |
| File/image upload | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | **0** | **-4.8** |
| Draft auto-save | 3 | 4 | 4 | 3 | 3 | 5 | 5 | 3 | **4** | +0.3 |
| Slash commands | 4 | 5 | 0 | 0 | 0 | 2 | 5 | 0 | **0** | **-2.0** |
| **AI feedback (unique)** | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | **5** | **+5.0** |

**Category Average:** Benchmark 3.0 | reasonBridge 1.2 | **Gap: -1.8** (excluding AI feedback)

---

## Information Architecture (12%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Topic/channel organization | 4 | 5 | 3 | 5 | 3 | 3 | 5 | 4 | **4** | -0.1 |
| Search full-text | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | **2** | **-2.1** |
| Search filters | 4 | 5 | 4 | 4 | 3 | 3 | 4 | 4 | **3** | -0.9 |
| Saved searches | 3 | 4 | 3 | 3 | 2 | 1 | 3 | 2 | **0** | **-2.6** |
| Sort options | 3 | 4 | 3 | 5 | 3 | 2 | 4 | 4 | **4** | +0.5 |
| Breadcrumb navigation | 3 | 4 | 2 | 3 | 3 | 2 | 5 | 4 | **4** | +0.8 |
| URL deep links | 4 | 4 | 5 | 5 | 4 | 2 | 4 | 5 | **3** | -1.1 |
| Quick switcher (Cmd+K) | 5 | 5 | 3 | 3 | 3 | 2 | 5 | 4 | **0** | **-3.8** |

**Category Average:** Benchmark 3.7 | reasonBridge 2.5 | **Gap: -1.2**

---

## Real-time Features (12%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| New message notifications | 5 | 5 | 4 | 3 | 3 | 5 | 4 | 3 | **4** | -0.1 |
| Typing indicators | 5 | 5 | 0 | 0 | 3 | 5 | 4 | 0 | **0** | **-2.8** |
| Online presence | 5 | 4 | 0 | 0 | 4 | 5 | 4 | 0 | **0** | **-2.8** |
| Connection status UI | 5 | 4 | 3 | 2 | 3 | 5 | 4 | 2 | **3** | -0.5 |
| Auto-reconnect | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 3 | **4** | -0.3 |
| Optimistic updates | 5 | 5 | 4 | 3 | 3 | 5 | 5 | 3 | **2** | **-2.1** |
| Read receipts | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | **0** | -0.6 |
| Live cursor/presence | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | **0** | -0.6 |

**Category Average:** Benchmark 3.0 | reasonBridge 1.6 | **Gap: -1.4**

---

## Accessibility (10%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Screen reader support | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 5 | **4** | +0.1 |
| Keyboard navigation | 4 | 4 | 3 | 3 | 3 | 2 | 4 | 5 | **4** | +0.5 |
| Color contrast (AA) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | **4** | -0.1 |
| Focus indicators | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 5 | **4** | +0.1 |
| ARIA labels | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 5 | **4** | +0.1 |
| Reduced motion | 3 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | **2** | -1.4 |
| Skip to content | 3 | 4 | 3 | 3 | 3 | 2 | 4 | 5 | **0** | **-3.4** |

**Category Average:** Benchmark 3.7 | reasonBridge 3.1 | **Gap: -0.6**

---

## Mobile Experience (10%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Touch targets (44px+) | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 4 | **5** | +0.9 |
| Swipe gestures | 4 | 3 | 4 | 3 | 3 | 5 | 3 | 2 | **2** | -1.4 |
| Pull to refresh | 4 | 4 | 4 | 4 | 4 | 5 | 3 | 3 | **0** | **-3.9** |
| Long-press actions | 4 | 3 | 4 | 4 | 3 | 5 | 4 | 3 | **0** | **-3.8** |
| Thumb zone design | 4 | 4 | 4 | 3 | 4 | 5 | 4 | 3 | **4** | +0.1 |
| Safe area handling | 5 | 4 | 4 | 4 | 4 | 5 | 4 | 3 | **5** | +0.9 |
| Offline support | 3 | 3 | 3 | 2 | 2 | 5 | 4 | 2 | **1** | **-2.1** |

**Category Average:** Benchmark 3.7 | reasonBridge 2.4 | **Gap: -1.3**

---

## Engagement Mechanics (10%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Emoji reactions | 5 | 4 | 3 | 0 | 4 | 4 | 3 | 4 | **0** | **-3.4** |
| Upvote/downvote | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 3 | **3** | +2.0 |
| Bookmarks/saves | 0 | 4 | 4 | 4 | 3 | 4 | 4 | 0 | **0** | **-2.9** |
| Share functionality | 3 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | **2** | -1.8 |
| Pin/highlight | 4 | 4 | 4 | 5 | 0 | 4 | 4 | 4 | **0** | **-3.6** |
| Mention notifications | 5 | 5 | 5 | 4 | 4 | 4 | 4 | 4 | **0** | **-4.4** |
| Awards/badges | 4 | 0 | 0 | 5 | 3 | 0 | 0 | 0 | **0** | -1.5 |
| **AI analysis (unique)** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **5** | **+5.0** |

**Category Average:** Benchmark 2.8 | reasonBridge 1.3 | **Gap: -1.5** (excluding AI)

---

## Performance (8%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Initial load (LCP) | 3 | 3 | 3 | 4 | 3 | 4 | 4 | 4 | **4** | +0.5 |
| Scroll performance | 5 | 4 | 4 | 4 | 4 | 5 | 4 | 3 | **5** | +0.9 |
| Bundle size | 3 | 3 | 3 | 4 | 3 | 4 | 4 | 4 | **4** | +0.5 |
| Memory efficiency | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 3 | **3** | -0.3 |
| Network efficiency | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **4** | 0.0 |
| Virtual scrolling | 5 | 4 | 3 | 4 | 3 | 3 | 4 | 2 | **5** | +1.4 |

**Category Average:** Benchmark 3.7 | reasonBridge 4.2 | **Gap: +0.5**

---

## Personalization (3%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Dark mode | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4** | 0.0 |
| Theme customization | 4 | 5 | 3 | 3 | 2 | 4 | 4 | 4 | **2** | -1.5 |
| Notification prefs | 5 | 5 | 4 | 4 | 4 | 5 | 4 | 4 | **2** | **-2.4** |
| Content density | 4 | 4 | 3 | 3 | 2 | 2 | 4 | 3 | **1** | **-2.1** |
| Keyboard shortcuts | 4 | 5 | 3 | 3 | 2 | 0 | 4 | 4 | **2** | -1.1 |

**Category Average:** Benchmark 3.5 | reasonBridge 2.2 | **Gap: -1.3**

---

## Onboarding (2%)

| Feature | DIS | SLK | TWX | RED | LIN | WHA | NOT | GIT | **RB** | Gap |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|--------|-----|
| Welcome flow | 4 | 5 | 3 | 3 | 4 | 4 | 5 | 3 | **2** | -1.8 |
| Guided tours | 4 | 4 | 2 | 2 | 3 | 3 | 5 | 3 | **4** | +0.8 |
| Feature spotlights | 4 | 4 | 3 | 2 | 3 | 3 | 4 | 2 | **2** | -1.1 |
| Empty states | 4 | 4 | 3 | 3 | 3 | 4 | 5 | 4 | **4** | +0.3 |
| Help/docs access | 3 | 5 | 3 | 3 | 3 | 3 | 4 | 5 | **3** | -0.5 |

**Category Average:** Benchmark 3.5 | reasonBridge 3.0 | **Gap: -0.5**

---

## Summary: Overall Weighted Scores

| Category | Weight | Benchmark Avg | reasonBridge | Weighted Gap |
|----------|--------|---------------|--------------|--------------|
| Conversation UX | 18% | 3.5 | 2.4 | -0.20 |
| Composition | 15% | 3.0 | 1.2* | -0.27 |
| Info Architecture | 12% | 3.7 | 2.5 | -0.14 |
| Real-time | 12% | 3.0 | 1.6 | -0.17 |
| Accessibility | 10% | 3.7 | 3.1 | -0.06 |
| Mobile | 10% | 3.7 | 2.4 | -0.13 |
| Engagement | 10% | 2.8 | 1.3* | -0.15 |
| Performance | 8% | 3.7 | 4.2 | +0.04 |
| Personalization | 3% | 3.5 | 2.2 | -0.04 |
| Onboarding | 2% | 3.5 | 3.0 | -0.01 |
| **TOTAL** | **100%** | **3.4** | **2.3** | **-1.13** |

*Note: reasonBridge scores exclude AI-unique features which add significant competitive advantage.

---

## reasonBridge Unique Advantages

| Feature | Score | Competitive Position |
|---------|-------|---------------------|
| AI composition feedback | 5/5 | **Only platform with this** |
| Bias detection | 5/5 | **Only platform with this** |
| Common ground detection | 5/5 | **Only platform with this** |
| Bridging suggestions | 5/5 | **Only platform with this** |
| Proposition linking | 4/5 | **Only platform with this** |
| Evidence quality feedback | 4/5 | **Only platform with this** |

---

## Key Takeaways

### Largest Gaps (Features Missing)
1. **@mentions** (-4.3) - Critical for discussions
2. **File/image upload** (-4.8) - Expected feature
3. **Emoji reactions** (-3.4) - Engagement driver
4. **Link previews** (-3.9) - Context for shared content
5. **Typing indicators** (-2.8) - Real-time feel

### Areas of Strength
1. **Virtual scrolling** (+1.4) - Best-in-class performance
2. **AI features** (+5.0) - Unique competitive advantage
3. **Touch targets** (+0.9) - WCAG compliant
4. **Safe areas** (+0.9) - Good mobile foundation
5. **Threading** (-0.3) - Close to benchmark

### Priority Improvements
1. @mentions with autocomplete (High impact, medium effort)
2. Emoji reactions (High impact, medium effort)
3. Bookmarks (High impact, low effort)
4. Typing indicators (High impact, low effort)
5. Rich text/markdown (High impact, high effort)
