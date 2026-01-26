# ReasonBridge Branding & Naming Conversation

**Session ID:** dd642880-81c9-4cae-aa32-ff340332e5d2
**Date:** January 25-26, 2026
**Time Range:** ~01:35 - 03:01 UTC

**Note:** This is a reconstructed summary of the branding conversation based on the deliverables created during the session. The original debug logs contain low-level system information rather than conversation transcripts.

---

## Session Overview

This conversation covered:

1. **App name selection** from ~60 candidates
2. **Domain verification** for .org availability
3. **Logo concept design** (overlapping circles)
4. **Complete brand identity** (colors, typography, design principles)

**Deliverables Created:**

- `docs/naming-candidates.md` (Created: 2026-01-26 01:38:58 UTC)
- `docs/plans/2026-01-25-reasonbridge-brand-design.md` (Created: 2026-01-26 03:00:56 UTC)

---

## Phase 1: Naming Exploration (01:35 - 02:35 UTC)

### User Request

The user asked for help selecting an app name for the rational discussion platform (previously "ReasonBridge"). Requirements:

- Approachable/friendly tone
- Works well as an app name
- .org domain available
- Not too serious or academic
- Captures the mission of finding common ground

### Naming Brainstorm

**Top Tier Candidates (Short, Memorable, App-Friendly):**

| Domain                  | Why it works                                                |
| ----------------------- | ----------------------------------------------------------- |
| **anotherangle.org**    | Fresh perspective, non-judgmental. "Check out AnotherAngle" |
| **findcommon.org**      | Short, action-oriented. Finding common ground.              |
| **seethepoint.org**     | Everyday idiom. "I SeeThePoint"                             |
| **reasonbridge.org**    | ⭐ Connects through reason. Clean, intellectual.            |
| **understandfirst.org** | Clear mission - understand before debating.                 |
| **razio.org**           | Short, punchy. Latin feel (ratio = reason).                 |

**Strong Contenders:**

- freshangle.org - Light, approachable. New perspective.
- shiftangle.org - Shifting perspectives.
- viewshift.org - Changing how you see things.
- thoughtsync.org - Syncing perspectives. Modern feel.
- heartheother.org - Empathetic - hear the other side.
- seeingboth.org - Seeing both perspectives.
- findingground.org - Journey of finding common ground.
- seekcommon.org - Seeking what we share.
- meetmidway.org - Meeting in the middle.

**Also Available:** (20+ additional options listed)

### Domain Verification

All candidates verified as available via RDAP on 2026-01-25.

### How They Sound as App Names

| Scenario     | Example                                            |
| ------------ | -------------------------------------------------- |
| Recommending | "Try **AnotherAngle** - it's for real discussions" |
| Sharing      | "I posted my take on **FindCommon**"               |
| Describing   | "**SeeThePoint** helps you understand other views" |
| Inviting     | "Let's hash this out on **ReasonBridge**"          |

### Top 5 Recommendations

1. **anotherangle.org** - Short, memorable, captures the mission perfectly
2. **findcommon.org** - Action-oriented, clear purpose
3. **seethepoint.org** - Everyday language, approachable
4. **reasonbridge.org** - Intellectual but accessible
5. **understandfirst.org** - Mission statement as a name

### Selection Decision

**WINNER: ReasonBridge (reasonbridge.org)**

**Rationale:**

- **Intellectual but accessible** - Avoids sounding too academic or too casual
- **Memorable** - Easy to spell, pronounce, remember
- **Metaphor works** - "Bridging" different viewpoints through reason
- **App name test** - "Let's discuss this on ReasonBridge" sounds natural
- **.org positioning** - Signals nonprofit/mission-driven purpose
- **Distinct** - Not generic, stands out in the space

---

## Phase 2: Brand Design (02:35 - 03:01 UTC)

### User Request

With the name selected, create a complete brand identity including logo concept, color palette, typography, and design principles.

### Logo Concept

**Design: Two Overlapping Circles**

```
     ●●●●●●●         ●●●●●●●
   ●●      ●●●●●●●●●●      ●●
  ●●     ●●●░░░░░░░●●●     ●●
  ●●    ●●░░░░░░░░░░░●●    ●●
  ●●     ●●●░░░░░░░●●●     ●●
   ●●      ●●●●●●●●●      ●●
     ●●●●●●●         ●●●●●●●

   [Left]   [Overlap]   [Right]
    Teal    Light Blue  Soft Blue
```

**Symbolism:**

- **Two circles** = Two perspectives/viewpoints in a discussion
- **Overlap** = Common ground, shared understanding, the goal
- **Highlighted intersection** = What we're searching for in every conversation

**Usage:**

- **Full logo:** Symbol + "ReasonBridge" wordmark
- **App icon:** Symbol only (overlapping circles)
- **Favicon:** Simplified overlap symbol

---

### Color Palette

#### Primary Colors

| Role      | Name      | Hex       | Usage                               |
| --------- | --------- | --------- | ----------------------------------- |
| Primary   | Teal      | `#2A9D8F` | Left circle, primary buttons, links |
| Secondary | Soft Blue | `#6B9AC4` | Right circle, secondary elements    |
| Accent    | Light Sky | `#A8DADC` | Overlap, highlights, success states |

**Color Psychology:**

- **Teal (#2A9D8F)** - Calm, trustworthy, intelligent
- **Soft Blue (#6B9AC4)** - Peaceful, communicative, approachable
- **Light Sky (#A8DADC)** - Harmony, balance, resolution

#### Supporting Colors

| Role           | Name       | Hex       | Usage                    |
| -------------- | ---------- | --------- | ------------------------ |
| Background     | Warm White | `#FAFBFC` | Page backgrounds         |
| Surface        | Cloud      | `#F1F5F9` | Cards, elevated surfaces |
| Text Primary   | Charcoal   | `#2D3748` | Headings, body text      |
| Text Secondary | Slate      | `#64748B` | Captions, metadata       |
| Border         | Mist       | `#E2E8F0` | Dividers, input borders  |

#### Semantic Colors

| Role    | Hex       | Usage                                 |
| ------- | --------- | ------------------------------------- |
| Success | `#10B981` | Positive actions, common ground found |
| Warning | `#F59E0B` | Caution, bias detected                |
| Error   | `#EF4444` | Errors, violations                    |
| Info    | `#3B82F6` | Informational messages                |

---

### Typography

#### Font Stack

```css
/* Headings */
font-family: 'Nunito', 'Poppins', system-ui, sans-serif;

/* Body */
font-family: 'Nunito', 'Inter', system-ui, sans-serif;

/* Monospace (code, data) */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

**Why Nunito:**

- Rounded, friendly letterforms
- Excellent readability
- Professional but warm
- Good weight variety (400-700)

**Why Inter (fallback):**

- Clean, modern sans-serif
- Designed for screens
- Excellent accessibility

#### Type Scale

| Element | Size            | Weight         | Line Height |
| ------- | --------------- | -------------- | ----------- |
| H1      | 2.25rem (36px)  | Bold (700)     | 1.2         |
| H2      | 1.875rem (30px) | SemiBold (600) | 1.25        |
| H3      | 1.5rem (24px)   | SemiBold (600) | 1.3         |
| H4      | 1.25rem (20px)  | Medium (500)   | 1.4         |
| Body    | 1rem (16px)     | Regular (400)  | 1.6         |
| Small   | 0.875rem (14px) | Regular (400)  | 1.5         |
| Caption | 0.75rem (12px)  | Regular (400)  | 1.4         |

---

### Design Principles

1. **Warm but trustworthy** - Friendly without being childish or unprofessional
2. **Clarity over cleverness** - Communication should be crystal clear, avoid jargon
3. **Balanced** - Visual design reflects the mission of finding middle ground
4. **Accessible** - WCAG AA minimum, AAA where possible (contrast, focus states)
5. **Consistent** - Same patterns repeated throughout, build user familiarity

**Tone:** Optimistic but serious about the mission. Like a thoughtful friend who helps you see another perspective.

---

### App Icon Specifications

#### Shape & Colors

- **Two overlapping circles** (Venn diagram style)
- **Left circle:** Teal (#2A9D8F)
- **Right circle:** Soft Blue (#6B9AC4)
- **Overlap:** Light Sky (#A8DADC)
- **Background:** Transparent or white

#### Sizes Needed

- 1024x1024 (App Store, high-res master)
- 512x512 (Android, Play Store)
- 192x192 (PWA manifest)
- 180x180 (Apple Touch Icon)
- 32x32, 16x16 (Favicon, browser tabs)

#### Safe Area

- Keep symbol centered with **10% padding** on all sides
- Ensures visibility even when rounded by OS

#### Technical Notes

- Export as SVG (scalable), PNG (raster fallback)
- Ensure sufficient contrast against white and dark backgrounds
- Test at small sizes (16x16) to ensure recognizability

---

### Brand Personality

**If ReasonBridge were a person:**

- **Age:** Late 20s / early 30s - mature but not old-fashioned
- **Personality:** Thoughtful, patient, curious, optimistic
- **Voice:** Warm, encouraging, clear, never condescending
- **Style:** Clean, organized, approachable, modern but timeless

**What ReasonBridge is NOT:**

- ❌ Academic/stuffy - No ivory tower language
- ❌ Childish - Not playful or gamified unnecessarily
- ❌ Aggressive - Never confrontational or debate-focused
- ❌ Corporate - Not cold, impersonal, or overly formal

---

## Future Considerations

### Dark Mode (TBD)

- Invert color scheme approach?
- Keep teal/blue but adjust luminance
- Ensure overlap remains visible
- Test color contrast ratios

### Animation Guidelines (TBD)

- Overlap "finding common ground" animation
- Smooth, purposeful transitions (not distracting)
- Consider loading states, success states

### Illustration Style (TBD)

- If needed: simple, geometric, friendly
- Match the circular motif
- Use brand colors

### Marketing Materials (TBD)

- Social media templates
- Presentation deck template
- Email signature
- Business card (if needed)

---

## Implementation Status

### ✅ Completed

- [x] Name selected: **ReasonBridge**
- [x] Domain verified: **reasonbridge.org** (available as of 2026-01-25)
- [x] Logo concept designed
- [x] Color palette defined
- [x] Typography selected
- [x] Design principles established
- [x] Brand documentation created

### 🔄 Next Steps

1. **Purchase domain:** reasonbridge.org
2. **Create logo assets:** SVG, PNG exports at all required sizes
3. **Update codebase:** Replace "ReasonBridge" references (99 occurrences)
4. **Implement brand:** Apply colors and fonts to UI
5. **Create app icons:** Generate all required sizes
6. **Update documentation:** README, CLAUDE.md with new branding

### 📋 Backlog

- [ ] Dark mode color palette
- [ ] Animation/transition guidelines
- [ ] Social media graphics
- [ ] Marketing website design
- [ ] Email templates

---

## Key Takeaways

### Why This Brand Works

1. **Name is memorable and meaningful** - "ReasonBridge" immediately communicates the mission
2. **Visual metaphor is clear** - Overlapping circles = finding common ground
3. **Colors are warm and professional** - Teal/blue palette feels trustworthy but friendly
4. **Typography is accessible** - Rounded fonts (Nunito) balance approachability with clarity
5. **Scales well** - Logo works at all sizes from favicon to billboard

### Design Philosophy

The brand was designed to occupy a sweet spot:

- **Not too serious** (like academic journals) → Warm colors, rounded typography
- **Not too casual** (like social media) → Thoughtful design, clear structure
- **Trustworthy yet approachable** → Professional without being corporate

### Competitive Positioning

Compared to existing platforms:

- **vs. Reddit/Twitter:** More thoughtful, less reactionary
- **vs. Kialo/DebateGraph:** Less academic, more accessible
- **vs. Discourse/forums:** Better visual design, clearer mission

---

## References

**Created Files:**

- `/docs/naming-candidates.md` - Full list of name options explored
- `/docs/plans/2026-01-25-reasonbridge-brand-design.md` - Complete brand specification

**External Resources:**

- RDAP domain lookup: https://rdap.org/
- WCAG color contrast: https://webaim.org/resources/contrastchecker/
- Google Fonts (Nunito, Inter): https://fonts.google.com/

---

_This document is a living record. Update as the brand evolves through user feedback and implementation learnings._
