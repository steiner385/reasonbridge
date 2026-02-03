# Feature Specification: Consolidate Landing Page

**Feature Branch**: `015-consolidate-landing-page`
**Created**: 2026-02-02
**Status**: Draft
**Input**: User description: "Consolidate multiple landing/home page versions into one unified page with all features, navigation, and mission-driven content based on non-profit research mission statement"

## Clarifications

### Session 2026-02-02

- Q: How should App.tsx global wrapper be handled? → A: Landing page opts out of App.tsx wrapper; other pages keep shared layout (Option B)
- Q: What should authenticated users see at root URL? → A: Simple redirect to /topics page with welcome banner (Option B)

---

## Problem Statement

The application currently has THREE conflicting home/landing page implementations:

1. **App.tsx** - Contains a global header/footer wrapper that conflicts with page-level navigation
2. **HomePage.tsx** (at `/`) - A minimal placeholder with just two buttons and welcome text
3. **LandingPage.tsx** (at `/demo/discussion`) - A full-featured marketing page hidden at a demo URL

This fragmentation causes:
- Inconsistent user experience depending on entry point
- The best content (interactive demo, features, CTAs) is hidden at `/demo/discussion`
- Brand design from `docs/plans/2026-01-25-reasonbridge-brand-design.md` is not applied
- No clear mission statement or research-driven content

## User Scenarios & Testing _(mandatory)_

### User Story 1 - First-Time Visitor Discovers Platform Value (Priority: P1)

A first-time visitor arrives at the root URL (`/`) and immediately understands what ReasonBridge is, why it matters, and how to get started.

**Why this priority**: First impressions determine user engagement. The landing page is the primary conversion point for new users.

**Independent Test**: Can be fully tested by navigating to `/` and verifying all key sections render correctly with proper content and navigation.

**Acceptance Scenarios**:

1. **Given** a visitor loads the root URL, **When** the page renders, **Then** they see:
   - A clear headline explaining the platform's purpose
   - The ReasonBridge logo (overlapping circles representing common ground)
   - Navigation with Login/Sign Up options
   - A hero section with primary call-to-action

2. **Given** a visitor is on the landing page, **When** they scroll down, **Then** they see:
   - Value proposition cards highlighting key features (AI insights, diverse perspectives, proven results)
   - An interactive demo section showing real discussions
   - Social proof metrics (users, discussions, common ground found)
   - Mission statement aligned with non-profit research goals

3. **Given** a visitor is on the landing page, **When** they click "Sign Up Free" or "Get Started", **Then** they are navigated to the signup page

---

### User Story 2 - Visitor Explores Interactive Demo (Priority: P2)

A curious visitor wants to see how the platform works before committing to signup.

**Why this priority**: The interactive demo is a key differentiator that builds trust and demonstrates value without requiring registration.

**Independent Test**: Can be tested by scrolling to the demo section and interacting with discussion cards and navigation.

**Acceptance Scenarios**:

1. **Given** a visitor is on the landing page, **When** they click "See How It Works", **Then** the page smoothly scrolls to the interactive demo section

2. **Given** a visitor views the demo section, **When** demo discussions load, **Then** they see:
   - Multiple discussion topics displayed as cards
   - Participant counts per discussion
   - Common ground scores/percentages
   - Navigation to browse between discussions

3. **Given** a visitor is viewing a demo discussion, **When** they click "Join Discussion" or similar CTA, **Then** a modal appears prompting signup/login

---

### User Story 3 - Authenticated User Returns Home (Priority: P2)

A logged-in user visiting the root URL should be redirected to their topics, not shown the marketing page.

**Why this priority**: Returning users need quick access to their discussions and topics, not marketing content they've already seen.

**Independent Test**: Can be tested by logging in and navigating to `/` to verify redirect to `/topics` with welcome banner.

**Acceptance Scenarios**:

1. **Given** a logged-in user visits the root URL, **When** the page loads, **Then** they are redirected to `/topics` with a welcome banner displayed

2. **Given** a logged-in user is on the topics page after redirect, **When** they view the page, **Then** they see standard topics list with navigation to other sections (Profile, etc.)

---

### User Story 4 - Visitor Understands Non-Profit Mission (Priority: P3)

A visitor interested in the organization's mission can find information about ReasonBridge's research-driven, non-profit focus.

**Why this priority**: Mission alignment builds trust and distinguishes ReasonBridge from commercial platforms.

**Independent Test**: Can be tested by verifying mission content appears on the landing page and links to an About page.

**Acceptance Scenarios**:

1. **Given** a visitor is on the landing page, **When** they view the content, **Then** they see messaging about:
   - ReasonBridge's mission to foster rational discourse
   - Research-based approach to finding common ground
   - Non-profit or public benefit orientation

2. **Given** a visitor wants more detail, **When** they click "About" or similar link, **Then** they navigate to a page with expanded mission information

---

### Edge Cases

- What happens when the interactive demo fails to load discussions? → Display graceful fallback with static content
- What happens when JavaScript is disabled? → Show noscript fallback with core information and signup link
- What happens on mobile devices? → Responsive layout adapts to screen size
- What happens when a logged-in user explicitly navigates to `/landing`? → Show marketing page regardless of auth status
- What happens with slow network connections? → Skeleton loaders appear while content loads

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST serve a single unified landing page at the root URL (`/`)
- **FR-002**: Landing page MUST display the ReasonBridge logo (overlapping circles icon)
- **FR-003**: Landing page MUST include a header with navigation (Logo, Login, Sign Up buttons)
- **FR-004**: Landing page MUST include a hero section with:
  - Primary headline communicating platform value
  - Secondary tagline
  - Primary CTA button (Sign Up / Get Started)
  - Secondary CTA button (See Demo)
- **FR-005**: Landing page MUST include a value propositions section with at least 3 feature highlights:
  - AI-Guided Insight
  - Diverse Perspectives
  - Proven Results (with social proof)
- **FR-006**: Landing page MUST include an interactive demo section showing real discussions
- **FR-007**: Landing page MUST include a final CTA section encouraging signup
- **FR-008**: Landing page MUST include a footer with copyright and basic links
- **FR-009**: System MUST apply brand colors from design document (Teal #2A9D8F, Soft Blue #6B9AC4, Light Sky #A8DADC)
- **FR-010**: System MUST use Nunito font family as specified in brand guidelines
- **FR-011**: System MUST support dark mode for all landing page sections
- **FR-012**: System MUST provide responsive layout for mobile, tablet, and desktop
- **FR-013**: Landing page MUST opt out of App.tsx global wrapper (other pages retain shared layout)
- **FR-014**: System MUST retire/remove the duplicate HomePage.tsx placeholder
- **FR-015**: System MUST redirect authenticated users from `/` to `/topics` with a welcome banner (visitors see landing page)
- **FR-016**: Landing page MUST be accessible (WCAG AA compliant)
- **FR-017**: System MUST include no-JavaScript fallback for core information

### Key Entities

- **LandingPage**: The unified marketing/entry page for unauthenticated visitors
- **InteractiveDemo**: Embedded component showing real discussion examples
- **DemoMetrics**: Component displaying social proof statistics
- **WelcomeBanner**: Dismissible banner shown to authenticated users after redirect to /topics

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Landing page at `/` loads completely within 3 seconds on standard broadband
- **SC-002**: All interactive elements (buttons, demo navigation) respond to user input within 100ms
- **SC-003**: Landing page achieves Lighthouse accessibility score of 90+
- **SC-004**: Landing page achieves Lighthouse performance score of 80+
- **SC-005**: 100% of brand colors are correctly applied (Teal primary, Soft Blue secondary, Light Sky accent)
- **SC-006**: All text is readable in both light and dark mode
- **SC-007**: Landing page is fully functional on viewports from 320px to 2560px wide
- **SC-008**: Interactive demo successfully loads and displays at least 3 discussion examples
- **SC-009**: All CTAs (Sign Up, Login, See Demo) navigate to correct destinations
- **SC-010**: No duplicate or conflicting header/footer elements appear on the page

## Assumptions

1. The existing `LandingPage.tsx` component will serve as the foundation and be enhanced
2. The `InteractiveDemo` component is functional and will be retained
3. Brand assets (logo SVGs) exist at `frontend/public/assets/logos/`
4. The existing routing structure can be modified without breaking other pages
5. The existing TopicsPage component will display the welcome banner for redirected authenticated users
6. Mission/research content can be inferred from brand documents; detailed copy will be drafted during implementation

## Out of Scope

- Creating entirely new demo discussions (existing demo data is sufficient)
- Building a dedicated dashboard page for authenticated users (redirect to /topics with banner instead)
- Email collection or newsletter signup functionality
- Multi-language/internationalization support
- Video content or animations beyond basic transitions
- SEO meta tags optimization (separate feature)
