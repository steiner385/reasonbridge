# Feature Specification: User Onboarding

**Feature Branch**: `003-user-onboarding`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Value-first landing page demo before signup, account creation with email/password and OAuth (Google, Apple), email verification flow, topic interest selection (select 2-3 topics), minimal post-signup onboarding, first discussion participation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Experience Platform Value Before Signup (Priority: P1)

A visitor lands on uniteDiscord for the first time and wants to understand what makes it different before investing time in creating an account. They explore an interactive demo showing real examples of productive cross-perspective discussions, see common ground discoveries in action, and understand the platform's unique value proposition through concrete results rather than marketing claims.

**Why this priority**: This is the critical first impression that determines whether visitors convert to users. Without demonstrating unique value upfront, the platform becomes just another "create account first" wall that drives away curious visitors. Value-first onboarding is a core differentiator per the platform's design principles.

**Independent Test**: Can be fully tested by having a new visitor access the homepage, interact with demo discussions without authentication, see visualizations of common ground analysis, and reach the signup call-to-action having experienced the platform's unique capabilities.

**Acceptance Scenarios**:

1. **Given** a visitor on the homepage, **When** they view the page, **Then** they see real discussion examples showing opposing viewpoints finding common ground with concrete metrics
2. **Given** a visitor exploring the demo, **When** they click into a sample discussion, **Then** they can browse propositions, see alignment distributions, and view common ground analysis without creating an account
3. **Given** a visitor interacting with the demo, **When** they try to post or participate, **Then** they receive a prompt to create an account with context about why signup is valuable
4. **Given** a visitor on the landing page, **When** they scroll, **Then** they see social proof metrics like "87% of participants found unexpected common ground" and testimonials from real users

---

### User Story 2 - Create Account with Minimal Friction (Priority: P2)

A visitor who has experienced the platform's value wants to join and participate. They create an account using their preferred authentication method (email/password or social login), verify their email address, and are ready to engage in discussions without unnecessary barriers.

**Why this priority**: Once visitors are motivated by the demo, conversion depends on removing friction from account creation. This story enables the fundamental requirement of authenticated participation while respecting user preferences for authentication methods.

**Independent Test**: Can be fully tested by completing account creation via each supported method (email/password, Google OAuth, Apple OAuth), receiving and confirming email verification, and reaching an authenticated state ready for onboarding.

**Acceptance Scenarios**:

1. **Given** a visitor clicks "Join uniteDiscord", **When** they see signup options, **Then** they can choose email/password or OAuth providers (Google, Apple)
2. **Given** a visitor selects email/password signup, **When** they submit valid credentials, **Then** they receive a verification email within 60 seconds
3. **Given** a visitor selects OAuth signup (Google or Apple), **When** they complete the OAuth flow, **Then** their account is created and email is marked as verified if provided by OAuth
4. **Given** a new user receives a verification email, **When** they click the verification link, **Then** they are redirected to the platform with email confirmed and can proceed to onboarding
5. **Given** a user attempts to participate before verifying email, **When** they try to post, **Then** they see a clear prompt to verify email with option to resend verification

---

### User Story 3 - Select Initial Topic Interests (Priority: P3)

A newly registered user needs to personalize their experience by indicating which topics interest them. They browse available discussion topics, select 2-3 areas they care about, and the platform uses these interests to recommend relevant discussions and provide a tailored starting point.

**Why this priority**: Interest selection enables personalized discovery and helps users find their first meaningful discussion quickly. This is critical for engagement but depends on account creation being complete first.

**Independent Test**: Can be fully tested by presenting a new authenticated user with topic options, allowing them to select 2-3 topics, and verifying their selections are saved and used to customize their initial feed.

**Acceptance Scenarios**:

1. **Given** a user completes account verification, **When** they proceed to onboarding, **Then** they see a topic selection interface with 10-20 curated topic categories
2. **Given** a user viewing topic options, **When** they select topics, **Then** they must choose a minimum of 2 and maximum of 3 topics before continuing
3. **Given** a user has selected 2-3 topics, **When** they confirm their selections, **Then** their interests are saved and they proceed to their personalized feed
4. **Given** a user selects topics, **When** they view their feed, **Then** discussions related to selected topics are prioritized in their view

---

### User Story 4 - Complete Minimal Post-Signup Orientation (Priority: P4)

A new user who has selected their interests needs a brief orientation to understand how to participate effectively. They receive lightweight guidance on the platform's unique features (proposition-based discussions, AI feedback, common ground analysis) without being overwhelmed, and can skip or dismiss this orientation at any time.

**Why this priority**: Orientation helps users understand unique platform features but should be minimal and non-blocking. Users who experienced the demo already understand core concepts, so this is quick reinforcement rather than comprehensive education.

**Independent Test**: Can be fully tested by completing onboarding as a new user, seeing orientation prompts, and verifying users can skip to direct participation while still having access to help resources.

**Acceptance Scenarios**:

1. **Given** a user completes topic selection, **When** they enter the platform, **Then** they see a brief (3-step) orientation overlay explaining key features
2. **Given** a user viewing orientation, **When** they see each step, **Then** they can advance, skip to end, or dismiss entirely
3. **Given** a user completes or skips orientation, **When** they access the platform, **Then** they can always access help/tutorial content from a persistent menu
4. **Given** a user views orientation, **When** shown, **Then** they see: (1) how proposition-based discussions work, (2) what AI feedback provides, (3) how to find common ground

---

### User Story 5 - Participate in First Discussion (Priority: P5)

A new user is ready to engage and wants to join their first discussion. They find a relevant topic from their personalized feed, read existing perspectives, and post their first response while receiving gentle AI guidance that helps them contribute constructively.

**Why this priority**: First participation is the ultimate activation goal - converting new users into engaged participants. This depends on all previous onboarding steps being complete but represents the critical moment where users become truly active.

**Independent Test**: Can be fully tested by guiding a new user to select a discussion from their feed, compose a response, receive any applicable AI feedback, and successfully post their first contribution.

**Acceptance Scenarios**:

1. **Given** a user completes onboarding, **When** they view their feed, **Then** they see discussions tagged with their selected interests prominently displayed
2. **Given** a user selects a discussion, **When** they read it, **Then** they see a clear "Add Your Perspective" call-to-action
3. **Given** a user composes their first response, **When** they type, **Then** they may receive gentle AI suggestions if issues are detected (inflammatory language, unsourced claims)
4. **Given** a user receives first-time AI feedback, **When** shown, **Then** it includes extra context explaining this is a helpful feature, not criticism
5. **Given** a user posts their first response, **When** published, **Then** they receive confirmation and encouragement to continue engaging

---

### Edge Cases

- What happens when a user's OAuth provider email differs from their separately registered email?
  - System treats them as separate accounts; user can later link accounts in profile settings
- How does the system handle when verification emails are not received?
  - User can request resend with rate limiting (max 3 per hour); alternate email option provided
- What happens when a user closes the browser mid-onboarding?
  - Progress is saved; user resumes from last completed step on return; can skip steps they've already seen
- How does the system handle when selected topics have very low activity?
  - System warns user and suggests adding at least one high-activity topic; allows override
- What happens when a user wants to change their initial topic selections?
  - Topics are editable anytime from profile settings; feed updates immediately to reflect new interests
- How does the system handle users who skip onboarding entirely?
  - Default to most active discussions across all topics; no personalization until topics selected; persistent prompt in UI to complete interest selection

## Requirements *(mandatory)*

### Functional Requirements

**Landing Page & Demo Experience**
- **FR-001**: System MUST display a landing page accessible without authentication showing real discussion examples with measurable outcomes (e.g., "87% found common ground")
- **FR-002**: System MUST provide an interactive demo allowing unauthenticated visitors to explore sample discussions including propositions, alignments, and common ground analysis
- **FR-003**: System MUST present demo content from actual platform discussions (anonymized if needed) rather than fabricated examples
- **FR-004**: System MUST prompt visitors to create an account only when they attempt participation actions (post, vote, follow)
- **FR-005**: System MUST track which demo discussions visitors view to enable personalized onboarding recommendations post-signup

**Account Creation**
- **FR-006**: System MUST offer email/password account creation with password strength requirements (minimum 8 characters, mix of character types)
- **FR-007**: System MUST offer OAuth account creation via Google and Apple Sign-In
- **FR-008**: System MUST prevent duplicate accounts using the same email address across all authentication methods
- **FR-009**: System MUST create user accounts in an unverified state until email confirmation is completed
- **FR-010**: System MUST send verification email within 60 seconds of account creation for email/password signups
- **FR-011**: System MUST mark OAuth-created accounts as verified if the OAuth provider confirms email ownership

**Email Verification**
- **FR-012**: System MUST generate unique, time-limited verification links (valid for 24 hours)
- **FR-013**: System MUST allow users to request resend of verification email with rate limiting (maximum 3 requests per hour)
- **FR-014**: System MUST prevent unverified users from posting responses or creating discussions
- **FR-015**: System MUST allow unverified users to browse discussions and view content
- **FR-016**: System MUST automatically verify email and redirect to onboarding when verification link is clicked

**Topic Interest Selection**
- **FR-017**: System MUST present new users with 10-20 curated topic categories immediately after email verification
- **FR-018**: System MUST require users to select a minimum of 2 and maximum of 3 topics during initial onboarding
- **FR-019**: System MUST save topic selections to user profile and use them for feed personalization
- **FR-020**: System MUST allow users to modify their topic interests at any time from profile settings
- **FR-021**: System MUST display activity indicators (participant count, recent activity) for each topic option to inform selection
- **FR-022**: System MUST warn users if all selected topics have low activity and suggest high-activity alternatives

**Post-Signup Orientation**
- **FR-023**: System MUST provide a brief 3-step orientation overlay for new users explaining: (1) proposition-based discussions, (2) AI feedback, (3) common ground analysis
- **FR-024**: System MUST allow users to skip individual orientation steps or dismiss orientation entirely
- **FR-025**: System MUST make orientation/tutorial content accessible from persistent help menu for all users
- **FR-026**: System MUST not block access to platform functionality during orientation (non-modal prompts only)

**First Discussion Participation**
- **FR-027**: System MUST personalize initial feed based on selected topic interests, prioritizing active discussions in chosen topics
- **FR-028**: System MUST highlight "Add Your Perspective" entry points for new users to encourage first participation
- **FR-029**: System MUST provide enhanced context for first-time AI feedback, explaining it as a helpful feature
- **FR-030**: System MUST celebrate first post with encouragement message and suggestion to explore more discussions
- **FR-031**: System MUST track onboarding completion stages (account created, email verified, topics selected, orientation completed, first post made)

**Onboarding Progress & Recovery**
- **FR-032**: System MUST save onboarding progress and allow users to resume from last completed step
- **FR-033**: System MUST provide "complete onboarding" prompts for users who abandon the flow
- **FR-034**: System MUST allow users to access platform with partial onboarding (e.g., skip topic selection) with reduced personalization

### Non-Functional Requirements

**Performance**
- **NFR-001**: Landing page MUST load within 1.5 seconds on standard broadband connections
- **NFR-002**: Demo interactions MUST feel responsive with <200ms response time for UI updates
- **NFR-003**: Verification emails MUST be sent within 60 seconds of request with 99% reliability

**Security**
- **NFR-004**: Password storage MUST use industry-standard hashing (bcrypt or Argon2)
- **NFR-005**: Verification links MUST be cryptographically secure and single-use
- **NFR-006**: OAuth integration MUST follow provider security best practices and use official SDKs
- **NFR-007**: System MUST implement rate limiting on account creation (max 5 accounts per IP per hour) to prevent abuse

**Accessibility**
- **NFR-008**: Landing page and onboarding flows MUST conform to WCAG 2.2 Level AA
- **NFR-009**: Orientation overlays MUST be keyboard navigable and screen reader friendly
- **NFR-010**: Form validation errors MUST be clearly communicated via ARIA live regions

**User Experience**
- **NFR-011**: Onboarding flow MUST be completable on mobile devices without degradation
- **NFR-012**: Demo experience MUST work without JavaScript for core content viewing (progressive enhancement)
- **NFR-013**: Entire onboarding flow from signup to first post MUST be achievable in under 5 minutes

### Key Entities

- **Visitor Session**: A pre-authentication browsing session; attributes include session ID, viewed demo discussions, interaction timestamps, referral source
- **User Account**: A registered participant; attributes include email, authentication method (email/password or OAuth provider), verification status, creation timestamp, last login
- **Verification Token**: A time-limited email verification credential; attributes include token value, associated user, creation time, expiration time (24 hours), used status
- **Topic Interest**: User's selected discussion categories; attributes include user reference, topic reference (2-3 topics), selection timestamp, priority ranking
- **Onboarding Progress**: Tracking of new user journey; attributes include user reference, stages completed (email verified, topics selected, orientation viewed, first post made), current step, last activity timestamp
- **Topic Category**: Available discussion areas; attributes include name, description, discussion count, active participant count, recent activity indicator, suggested for new users flag

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Landing Page Effectiveness**
- **SC-001**: 40% of visitors who view the demo for 2+ minutes create an account within that session
- **SC-002**: Average time spent on demo content is 3+ minutes for visitors who convert to signup
- **SC-003**: 80% of new signups report the demo as "very influential" or "influential" in their decision to join (post-signup survey)

**Account Creation & Verification**
- **SC-004**: 90% of users successfully create accounts on first attempt without errors
- **SC-005**: 70% of email/password signups verify their email within 24 hours
- **SC-006**: OAuth signup accounts have 95%+ automatic email verification rate
- **SC-007**: Account creation flow is completable in under 2 minutes from signup click to verified state

**Onboarding Completion**
- **SC-008**: 75% of verified users complete topic selection
- **SC-009**: 60% of users complete the full orientation (view all 3 steps)
- **SC-010**: 50% of new users make their first post within 7 days of account creation
- **SC-011**: Users who complete full onboarding have 2x higher 30-day retention than those who skip steps

**Time to Value**
- **SC-012**: Median time from landing page arrival to first post is under 10 minutes for motivated users
- **SC-013**: 90% of users who select topics see at least 5 relevant discussions in their personalized feed
- **SC-014**: New users who receive first-post AI feedback have 80% acceptance rate (revise or acknowledge vs. ignore)

**User Satisfaction**
- **SC-015**: 85% of new users rate onboarding experience as 4+ out of 5 stars
- **SC-016**: Less than 5% of users report confusion about how to participate (post-onboarding survey)

## Assumptions

- OAuth providers (Google, Apple) will remain available and maintain stable authentication APIs
- Email delivery infrastructure can reliably send verification emails within 60 seconds
- Users have access to their email inbox during signup to complete verification
- Initial topic categories will be manually curated; AI-suggested topics are a future enhancement
- Demo discussions shown to visitors will be refreshed periodically by platform team
- Users understand basic web interaction patterns (forms, buttons, links)
- Mobile responsive design is sufficient; native app onboarding flows are out of scope

## Out of Scope (Initial Release)

- Social media account linking beyond Google and Apple OAuth
- Phone number verification as alternative to email
- Passwordless authentication (magic links, WebAuthn)
- Progressive profiling (collecting user information over time vs. upfront)
- Gamification of onboarding (points, badges, progress bars)
- Personalized welcome videos or messages
- Referral program integration during signup
- A/B testing framework for onboarding optimization
- Multi-step form analytics and abandonment tracking
- Integration with email marketing platforms
- Customizable notification preferences during onboarding
