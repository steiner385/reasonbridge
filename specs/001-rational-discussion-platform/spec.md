# Feature Specification: uniteDiscord - Rational Discussion Platform

**Feature Branch**: `001-rational-discussion-platform`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "Build a web-based public discord application called 'uniteDiscord' - a platform for rational discussion across diverse perspectives with core tenets around truth, fact-checking, respect, anti-bot/propaganda measures, finding common ground, and forward problem-solving."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join and Participate in a Discussion Topic (Priority: P1)

A user discovers uniteDiscord and wants to engage in a conversation about a topic they care about. They create an account, browse available discussion topics, and join a conversation where they can share their perspective while seeing others' viewpoints organized to highlight areas of agreement and disagreement.

**Why this priority**: This is the core value proposition - without the ability to join and participate in discussions, the platform has no purpose. This story establishes the fundamental user flow.

**Independent Test**: Can be fully tested by having a new user create an account, find a topic of interest, post a response, and see their contribution integrated into the discussion structure.

**Acceptance Scenarios**:

1. **Given** a visitor on the homepage, **When** they click "Join uniteDiscord", **Then** they can create an account with email or social login and are guided to select topics of interest
2. **Given** an authenticated user, **When** they browse topics, **Then** they see discussions organized by category with clear indicators of activity level and participant diversity
3. **Given** a user viewing a discussion, **When** they submit a response, **Then** their contribution is added to the conversation and they can see how it relates to existing viewpoints
4. **Given** a user reading responses, **When** they view the discussion thread, **Then** areas of agreement and disagreement between participants are visually distinguished

---

### User Story 2 - Receive Constructive Feedback on Communication (Priority: P2)

A user posts a response that contains logical fallacies, inflammatory language, or unverified claims. The system provides gentle, educational feedback to help them improve their contribution rather than simply rejecting or penalizing them.

**Why this priority**: This implements the core differentiator of assuming good intent and correcting counterproductive behaviors rather than punishing users. Without this, the platform is just another comment section.

**Independent Test**: Can be fully tested by having a user submit a response with a detectable issue (ad hominem, unsourced claim) and verifying they receive specific, actionable feedback.

**Acceptance Scenarios**:

1. **Given** a user writing a response, **When** they use language patterns associated with personal attacks, **Then** they receive a non-blocking suggestion to rephrase before posting
2. **Given** a user making a factual claim, **When** they submit without citation, **Then** they are prompted to add a source or mark the claim as personal opinion
3. **Given** a user whose response contains a logical fallacy, **When** they post, **Then** they see an educational tooltip explaining the fallacy type with resources to learn more
4. **Given** a user who receives feedback, **When** they revise their response, **Then** the system acknowledges the improvement and the response is posted

---

### User Story 3 - View Common Ground Analysis (Priority: P3)

A user wants to understand where different groups actually agree versus where they have genuine disagreements versus where they're simply misunderstanding each other. They can view an analysis that synthesizes multiple perspectives on a topic.

**Why this priority**: This distinguishes the platform by providing meta-level insight that helps users see past surface-level conflict to understand the underlying structure of a debate.

**Independent Test**: Can be fully tested by viewing a discussion with 10+ participants and verifying the system generates an accurate summary of agreement zones, genuine disagreements, and identified misunderstandings.

**Acceptance Scenarios**:

1. **Given** a discussion with multiple participants, **When** a user clicks "View Common Ground", **Then** they see a visual summary showing percentage agreement on core propositions
2. **Given** identified misunderstandings in a thread, **When** viewing the analysis, **Then** the system highlights where participants are using the same terms with different definitions
3. **Given** genuine disagreements, **When** viewing the analysis, **Then** the system shows the underlying values or assumptions that differ between viewpoints
4. **Given** a common ground analysis, **When** participants update their positions, **Then** the analysis reflects changes in real-time

---

### User Story 4 - Verify Human Authenticity (Priority: P4)

A user wants assurance that they're engaging with real humans rather than bots or coordinated propaganda accounts. They can see trust indicators on other users and the platform actively prevents automated manipulation.

**Why this priority**: Critical for platform integrity but builds on existing discussion functionality. Anti-bot measures are a hygiene factor rather than a core feature users explicitly seek.

**Independent Test**: Can be fully tested by attempting to create multiple accounts rapidly, posting repetitive content, or exhibiting bot-like patterns, and verifying detection and intervention.

**Acceptance Scenarios**:

1. **Given** a new account attempting rapid creation, **When** suspicious patterns are detected, **Then** additional verification is required before the account can participate
2. **Given** an authenticated user, **When** they view another user's profile, **Then** they see a trust score based on verification level and interaction history
3. **Given** coordinated posting patterns across accounts, **When** detected by the system, **Then** affected content is flagged for review and users are notified
4. **Given** a user who completes additional verification (phone, government ID), **When** they participate, **Then** their contributions display a "Verified Human" badge

---

### User Story 5 - Facilitate Productive Debate Moderation (Priority: P5)

A discussion becomes heated or goes off-topic. Community moderators and automated tools work together to guide the conversation back toward productive dialogue without heavy-handed censorship.

**Why this priority**: Moderation is essential for scale but relies on core discussion and feedback features being in place first.

**Independent Test**: Can be fully tested by simulating an escalating discussion and verifying that automated interventions and moderator tools successfully de-escalate without removing content unnecessarily.

**Acceptance Scenarios**:

1. **Given** a discussion where tone is escalating, **When** detected, **Then** participants receive a cooling-off prompt suggesting a brief pause
2. **Given** a thread going off-topic, **When** detected, **Then** the system suggests creating a spin-off discussion for the tangent
3. **Given** a moderator reviewing flagged content, **When** they take action, **Then** they choose from graduated interventions (educate, hide, remove) with transparent reasoning
4. **Given** any moderation action, **When** applied, **Then** affected users receive an explanation and can appeal through a clear process

---

### User Story 6 - Create and Manage Discussion Topics (Priority: P6)

A user wants to start a new conversation on a topic not yet covered. They can create a well-structured discussion that invites diverse perspectives and sets clear ground rules for productive engagement.

**Why this priority**: While important, topic creation is a secondary action - most users will join existing discussions first. Building a library of topics can happen organically once the core experience works.

**Independent Test**: Can be fully tested by having a user create a new topic with a clear proposition, invite initial participants, and verify the discussion structure encourages balanced participation.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they click "Start Discussion", **Then** they are guided through framing a clear proposition or question
2. **Given** a user creating a topic, **When** they define the scope, **Then** they can set parameters like required evidence standards and expected perspectives to include
3. **Given** a new topic, **When** created, **Then** it enters a seeding phase where the creator can invite initial participants to establish diverse viewpoints
4. **Given** sufficient diverse participation, **When** the seeding threshold is met, **Then** the topic becomes publicly visible and open to all users

---

### Edge Cases

- What happens when a user posts content in a language different from the discussion's primary language?
  - System attempts translation and displays both versions; user is asked to confirm accuracy
- How does the system handle when two users have blocked each other but are in the same discussion?
  - Both see anonymized versions of each other's contributions; neither can directly reply to the other
- What happens when fact-checking sources conflict?
  - System displays all sources with credibility ratings; highlights the conflict as an area of uncertainty
- How does the system handle appeals when a user believes feedback was incorrect?
  - Users can flag feedback as unhelpful; patterns inform system improvement; egregious errors escalate to human review
- What happens when a discussion reaches very high participant counts?
  - System clusters similar viewpoints into representative threads; users can drill into clusters for full content

## Requirements *(mandatory)*

### Functional Requirements

**Account & Identity**
- **FR-001**: System MUST allow users to create accounts using email/password or OAuth providers (Google, Apple)
- **FR-002**: System MUST verify email addresses before allowing participation in discussions
- **FR-003**: System MUST offer optional enhanced verification (phone number, government ID) for "Verified Human" status
- **FR-004**: System MUST allow users to participate with pseudonymous display names while maintaining verified identity internally

**Discussion Participation**
- **FR-005**: System MUST allow users to browse public discussions by tag, by AI-identified cluster, by theme, and by activity level
- **FR-006**: System MUST allow users to post text responses to existing discussions
- **FR-007**: System MUST allow users to cite sources by providing URLs which the system extracts and displays
- **FR-008**: System MUST organize discussions using proposition-based structure where responses are grouped by distinct claims rather than as replies to people
- **FR-008a**: System MUST use AI to identify distinct propositions from user responses and allow users to create new propositions manually
- **FR-008b**: System MUST allow users to indicate alignment (support/oppose/nuanced) on each proposition within a discussion
- **FR-008c**: System MUST display consensus meters showing alignment distribution for each proposition
- **FR-009**: System MUST provide multiple view modes: Proposition View (default), Contributor View, and Common Ground View

**Communication Guidance**
- **FR-010**: System MUST analyze user submissions for cognitive biases and logical fallacies using Kahneman's dual-process framework, providing interventions designed to prompt System 2 (deliberate) thinking
- **FR-011**: System MUST detect System 1 (automatic) response patterns such as inflammatory or ad hominem language and prompt users to engage reflective thinking before posting
- **FR-012**: System MUST prompt users to provide sources when making factual claims
- **FR-012a**: System MUST use AI to identify checkable factual claims in user submissions and automatically retrieve relevant fact-checks from established databases (e.g., Snopes, PolitiFact, academic sources)
- **FR-012b**: System MUST present retrieved fact-checking information as "Related Context" without rendering truth verdicts, empowering users to evaluate claims themselves
- **FR-013**: System MUST allow users to mark statements as opinion versus claimed fact
- **FR-014**: System MUST provide feedback as suggestions, not blocks - users can override with acknowledgment
- **FR-014a**: System MUST design interventions following the Fogg Behavior Model: reduce friction for constructive communication (Ability), deliver feedback at the moment of composition (Trigger), and preserve user autonomy to maintain intrinsic motivation (Motivation)
- **FR-014b**: System MUST clearly label all AI-generated feedback with "AI Assistant" attribution and display the reasoning behind each suggestion to maintain transparency and trust
- **FR-014c**: System MUST only display AI-generated feedback when confidence exceeds 80%; low-confidence analyses MUST be logged silently for model improvement without user display
- **FR-014d**: System MUST provide positive affirmations for quality contributions (well-sourced claims, bridging language, acknowledging valid opposing points) at least as often as corrective suggestions

**Common Ground Analysis**
- **FR-015**: System MUST generate summaries showing areas of agreement across participants
- **FR-016**: System MUST identify and highlight potential misunderstandings (definitional differences, talking past each other)
- **FR-017**: System MUST identify genuine disagreements using Moral Foundations Theory, surfacing which foundations (care, fairness, loyalty, authority, sanctity, liberty) underlie each position and where value priorities differ
- **FR-017a**: System MUST offer "translation" suggestions that reframe arguments in terms of moral foundations the other side prioritizes
- **FR-018**: System MUST update analysis as discussion progresses

**Anti-Bot & Integrity**
- **FR-019**: System MUST implement rate limiting on account creation and posting
- **FR-020**: System MUST detect and flag coordinated inauthentic behavior patterns
- **FR-021**: System MUST display trust indicators on user profiles using Mayer's ABI Model with three visible dimensions: Ability (quality of contributions, accuracy of claims), Benevolence (helpfulness ratings, constructive engagement), and Integrity (behavioral consistency, account age, verification status)
- **FR-022**: System MUST require CAPTCHA or equivalent challenge for suspicious activities

**Moderation**
- **FR-023**: System MUST provide graduated intervention tools (educate, warn, hide, remove)
- **FR-024**: System MUST log all moderation actions with reasoning for transparency
- **FR-025**: System MUST provide appeals process for moderation decisions
- **FR-026**: System MUST detect escalating tone and offer cooling-off interventions based on Gross's Process Model, focusing on cognitive reappraisal prompts (e.g., "How might they have meant this differently?") rather than simple time-outs
- **FR-026a**: System MUST provide reappraisal scaffolds that help users reinterpret triggering content before responding (attention deployment and cognitive change stages)
- **FR-026b**: System MUST enforce human-in-the-loop approval for all consequential moderation actions (hide, warn, remove, trust score changes); AI may act autonomously only for non-punitive interventions (suggestions, educational prompts, cooling-off prompts)

**Topic Management**
- **FR-027**: System MUST allow users to create new discussion topics with guided framing
- **FR-028**: System MUST enforce minimum diversity of initial viewpoints before making topics public
- **FR-029**: System MUST allow topic creators to set evidence standards and scope parameters
- **FR-030**: System MUST cluster high-volume discussions into representative viewpoint threads
- **FR-031**: System MUST support multi-tag taxonomy where topics have 2-5 tags; AI suggests additional tags based on content analysis
- **FR-032**: System MUST identify and surface cross-cutting themes that span multiple topics (e.g., "trust in institutions" appearing across healthcare, elections, and media discussions)
- **FR-033**: System MUST provide multiple discovery paths: browse by tag, by AI-identified cluster, by cross-cutting theme, and via "related discussions" recommendations
- **FR-034**: System MUST support explicit topic-to-topic relationships with typed links (builds-on, responds-to, contradicts, related, shares-proposition)
- **FR-035**: System MUST use AI to suggest topic relationships based on semantic similarity, shared propositions, and participant overlap
- **FR-036**: System MUST allow users to propose new topic links and confirm/reject AI-suggested links; confirmed links are weighted higher in navigation

**User Perspective & Personalization**
- **FR-037**: System MUST infer user moral foundation profiles from argument patterns without requiring self-declaration; profiles remain internal and unlabeled
- **FR-038**: System MUST build position fingerprints from user proposition alignments to enable diversity detection for topic seeding (FR-028)
- **FR-039**: System MUST calculate perspective diversity scores for discussions based on participant position fingerprints
- **FR-040**: System MUST allow users to view their own moral foundation profile with educational framing; MUST NOT display political/ideological labels
- **FR-041**: System MUST use topic affinities to recommend relevant discussions while also surfacing "perspective-expanding" topics where user might encounter different viewpoints
- **FR-042**: System MUST allow users to follow individual contributors; MUST NOT support formal groups or private group discussions
- **FR-043**: System MUST provide a "Following" feed showing recent activity from followed contributors
- **FR-044**: System MUST recommend contributors with different perspectives to follow, not just similar ones, to prevent echo chambers

### Non-Functional Requirements

**Observability & Testing**
- **NFR-001**: System MUST emit structured event logs with correlation IDs for all significant actions including AI feedback generation, moderation actions, user authentication events, and discussion participation
- **NFR-002**: System MUST log AI decision metadata (confidence scores, model version, input features) to support test assertions and model quality monitoring
- **NFR-003**: System MUST support log levels (DEBUG, INFO, WARN, ERROR) configurable per environment to enable verbose logging in test environments

**Performance**
- **NFR-004**: User-facing API endpoints MUST respond within 200ms at the 95th percentile under normal load
- **NFR-005**: Real-time AI feedback (bias detection, tone analysis) MUST complete within 500ms per existing AI Architecture specification
- **NFR-006**: System MUST support 10,000 concurrent users without degradation per SC-014

**Accessibility**
- **NFR-007**: All user interfaces MUST conform to WCAG 2.2 Level AA success criteria
- **NFR-008**: System MUST support keyboard-only navigation for all interactive features
- **NFR-009**: System MUST provide appropriate ARIA labels and roles for dynamic content updates (AI feedback, real-time analysis)

**Reliability & Availability**
- **NFR-010**: System MUST maintain 99.9% availability (maximum 8.76 hours unplanned downtime per year)
- **NFR-011**: System MUST gracefully degrade when external dependencies (OAuth providers, fact-check APIs) are unavailable
- **NFR-012**: System MUST persist user draft responses locally to prevent data loss during unexpected disconnections

**Error Handling**
- **NFR-013**: All API error responses MUST include a machine-readable error code and a human-friendly message
- **NFR-014**: Error codes MUST follow a consistent taxonomy (e.g., AUTH_001, VALIDATION_002, RATE_LIMIT_001) to enable precise test assertions
- **NFR-015**: User-facing error messages MUST be actionable, explaining what went wrong and how to resolve it

### Key Entities

- **User**: A registered participant; attributes include display name, verification level, trust score (ABI dimensions), topic interests, participation history, moral foundation profile (internal), position fingerprint (internal), topic affinities, followed contributors, followers
- **Discussion Topic**: A framed proposition or question for debate; attributes include title, description, evidence standards, tags (2-5), status (seeding/active/archived), linked topics, cross-cutting themes
- **Tag**: A descriptive label for topic classification; attributes include name, usage count, AI-suggested synonyms, parent theme (if applicable)
- **Topic Link**: A typed relationship between two topics; attributes include source topic, target topic, relationship type (builds-on/responds-to/contradicts/related/shares-proposition), link source (AI-suggested or user-proposed), confirmation status, proposer
- **Proposition**: A distinct claim or position within a discussion; attributes include statement text, source (AI-identified or user-created), alignment counts (support/oppose/nuanced), evidence pool, sub-propositions (if applicable), consensus score
- **Response**: A user's contribution to a discussion; attributes include content, target proposition(s), alignment stance, cited sources, associated feedback, timestamp
- **Feedback**: System-generated guidance on a response; attributes include type (fallacy, inflammatory, unsourced), suggestion text, educational resources, user acknowledgment status
- **Common Ground Analysis**: A synthesized view of a discussion; attributes include agreement zones, misunderstandings, genuine disagreements, confidence scores
- **Moderation Action**: An intervention in a discussion; attributes include type, reasoning, affected content, appealed status, outcome

## Success Criteria *(mandatory)*

### Measurable Outcomes

**User Engagement**
- **SC-001**: 60% of registered users participate in at least one discussion within 7 days of signup
- **SC-002**: Average session duration is 15+ minutes for users engaged in discussions
- **SC-003**: 40% of users return to the platform within 7 days of their first visit

**Discussion Quality**
- **SC-004**: 70% of discussions reach the "common ground identified" milestone within 50 responses
- **SC-005**: User-reported "productive conversation" ratings average 4+ out of 5 stars
- **SC-006**: 50% of users who receive communication feedback revise their response before posting

**Communication Improvement**
- **SC-007**: Repeat use of flagged communication patterns (fallacies, ad hominem) decreases 30% per user over time
- **SC-008**: 80% of users rate communication feedback as "helpful" or "very helpful"

**Platform Integrity**
- **SC-009**: Less than 1% of active accounts are identified as bots or coordinated manipulation
- **SC-010**: 90% of user reports of suspected bot activity are resolved within 24 hours

**Moderation Effectiveness**
- **SC-011**: 95% of moderation actions are upheld on appeal
- **SC-012**: Time from content flag to resolution averages under 4 hours
- **SC-013**: User satisfaction with moderation fairness averages 4+ out of 5 stars

**Scale**
- **SC-014**: Platform supports 10,000 concurrent users without degradation in experience
- **SC-015**: New discussion topics reach minimum participation threshold within 48 hours on average

## Theoretical Foundations

The platform's capabilities are grounded in the following peer-reviewed psychological and behavioral science research:

| Domain | Framework | Application |
|--------|-----------|-------------|
| Cognitive Bias Detection | Kahneman's Dual-Process Theory (System 1/System 2) | Detect automatic thinking patterns and prompt deliberate reflection |
| Behavior Change | Fogg Behavior Model (B=MAT) | Design interventions that increase ability and provide well-timed triggers |
| Conflict Resolution | Moral Foundations Theory (Haidt) | Surface value-level disagreements and translate arguments across moral worldviews |
| Emotional Regulation | Gross's Process Model | Intervene at cognitive reappraisal stage before emotional escalation |
| Trust & Credibility | Mayer's ABI Model | Build trust indicators around Ability, Benevolence, and Integrity dimensions |

## AI Architecture

The platform leverages a hybrid AI architecture to balance real-time responsiveness with analytical depth:

| Layer | Model Type | Use Cases | Latency Target |
|-------|------------|-----------|----------------|
| Real-time (Local) | Lightweight models (distilled/fine-tuned) | Bias detection, tone analysis, fallacy flagging, claim identification during composition | <500ms |
| Synthesis (Cloud LLM) | Large language models via API | Common ground analysis, moral foundation mapping, argument translation, viewpoint clustering | <5s |
| Fact-Check Retrieval | API integration + LLM | Identify checkable claims, query fact-check databases, present as "Related Context" | <3s |

**AI Transparency Policy**: All AI-generated feedback and analysis MUST be explicitly labeled as "AI Assistant" with reasoning visible. Users should always know when they are receiving AI-generated guidance versus human moderation.

**Human-in-the-Loop Policy**: AI moderation follows a risk-tiered autonomy model:

| Action Type | AI Authority | Human Role |
|-------------|--------------|------------|
| Suggestions, educational prompts, reappraisal scaffolds | Autonomous | None required |
| Cooling-off prompts, spin-off suggestions | Autonomous | None required |
| Content flagging for review | Autonomous | Reviews queue |
| Hide content, issue warnings | Recommends only | Approval required |
| Remove content, account restrictions | Recommends only | Approval required |
| Trust score adjustments | Recommends only | Approval required |

**AI Confidence Policy**: AI feedback is subject to confidence thresholds to ensure quality:
- Minimum 80% confidence required to display feedback to users
- Low-confidence analyses (<80%) are logged silently for model improvement
- Confidence scores are stored for all AI outputs to enable continuous quality monitoring

## UX Design Principles

**Progressive Disclosure Strategy**: The platform uses sophisticated psychological frameworks internally but presents them accessibly:

| Internal Framework | User-Facing Language | "Learn More" Reveals |
|--------------------|---------------------|----------------------|
| System 1/System 2 (Kahneman) | "Take a moment to reflect" | Link to explanation of fast vs. slow thinking |
| Moral Foundations Theory | "Different values at play" | Interactive guide to six moral foundations |
| Gross's Process Model | "How else might you read this?" | Brief on cognitive reappraisal techniques |
| Mayer's ABI Model | Trust score with 3 bars | Tooltip explaining Ability, Benevolence, Integrity |

**Guiding Principle**: Entry experience uses everyday language; depth is available but never forced.

**Value-First Onboarding**: New visitors experience the platform's unique value before any signup friction:

1. **Landing page** showcases real examples of discussions where common ground was found between opposing viewpoints
2. **Interactive demo** lets visitors explore a sample discussion to see agreement/disagreement visualization and AI-assisted insights
3. **Social proof** highlights metrics like "87% of participants found unexpected common ground"
4. **Signup only when motivated** - clear value demonstrated before asking for email/account creation
5. **Post-signup onboarding** is minimal: select 2-3 topics of interest, then immediately join a real discussion

**AI Voice & Tone**: All AI-generated feedback uses a "curious peer" voice:

| Instead of (Lecturing) | Use (Curious Peer) |
|------------------------|-------------------|
| "This is an ad hominem fallacy" | "I noticed this focuses on the person rather than their argument—have you considered addressing their point directly?" |
| "You need to add a source" | "Others found it helpful to include a source here. Want to add one, or mark this as your opinion?" |
| "This may escalate the conversation" | "Have you considered how this might land? Sometimes a different framing opens more doors." |

**Tone Principles**: Collaborative, not authoritative. Questioning, not correcting. Offers options, not directives.

**Positive Reinforcement**: The platform recognizes quality contributions with subtle affirmations (not gamification):

| Trigger | Affirmation Example |
|---------|-------------------|
| Well-sourced claim | "Well-sourced point—this helps everyone evaluate the argument." |
| Bridging language | "This helped connect two perspectives." |
| Acknowledging other's valid points | "Recognizing common ground moves conversations forward." |
| Revised after feedback | "Thanks for taking a moment to refine this." |

**Balance Principle**: Positive feedback should occur at least as often as corrective suggestions to maintain an encouraging atmosphere.

**Brand Positioning**: Outcome-focused differentiation without intellectual gatekeeping:

| Avoid | Instead Use |
|-------|-------------|
| "The thinking person's platform" | "See what happens when people actually listen" |
| "Evidence-based discourse" | "200 people. Opposing views. 73% agreement found." |
| "Rational debate platform" | "Conversations that go somewhere" |
| Academic/sophisticated visual design | Clean, warm, inviting design with depth revealed progressively |

**Positioning Principle**: Let results demonstrate value. Show, don't claim. Attract through curiosity about outcomes, not intellectual self-selection.

## Content Organization

**Multi-Tag Taxonomy**: Topics use a flexible tagging system rather than rigid categories:

| Component | Description |
|-----------|-------------|
| **Tags** | Topics have 2-5 descriptive tags (e.g., "healthcare", "economics", "US policy", "access") |
| **Tag Sources** | Creator assigns initial tags; AI suggests additional tags; community can propose tags |
| **AI Clustering** | System identifies topic clusters based on tag overlap and semantic similarity |
| **Cross-Cutting Themes** | AI surfaces themes that span multiple topics (e.g., "trust in institutions" across healthcare, elections, media) |
| **Discovery Paths** | Users browse by tag, by cluster, by theme, or via AI-recommended "related discussions" |

**Benefits**: Topics can belong to multiple domains; unexpected connections become visible; avoids forcing complex issues into single categories.

**Proposition-Based Discussion Structure**: Responses are organized around distinct claims rather than as replies to people:

| Element | Description |
|---------|-------------|
| **Proposition** | A distinct claim or position within a discussion (AI-identified or user-created) |
| **Alignment** | Users indicate support, opposition, or nuanced stance on each proposition |
| **Evidence Pool** | Sources and arguments grouped by which proposition they support/oppose |
| **Consensus Meter** | Visual indicator showing distribution of alignments on each proposition |
| **Sub-propositions** | Complex propositions can be broken into component claims for finer-grained analysis |

**View Modes**:
- **Proposition View** (default): See all propositions with alignment distributions; drill into any for full responses
- **Contributor View**: See a specific user's positions across all propositions
- **Common Ground View**: Propositions sorted by consensus level; high-agreement items highlighted

**Cross-Topic Relationships**: Topics form a connected web through hybrid AI + user linking:

| Relationship Type | Description | Example |
|-------------------|-------------|---------|
| **Builds-on** | New discussion extends or deepens a prior discussion | "Healthcare costs" builds-on "Insurance reform" |
| **Responds-to** | Discussion created in response to conclusions of another | "Counter-arguments to X" responds-to "Case for X" |
| **Contradicts** | Discussions with fundamentally opposing premises | Competing frameworks for same issue |
| **Related** | Thematically connected but no directional relationship | Parallel discussions in different contexts |
| **Shares-proposition** | Discussions that reference the same underlying claim | Same core question in different domains |

**Link Sources**: AI suggests relationships based on semantic similarity, shared propositions, and user overlap; users can propose new links or confirm/reject AI suggestions; confirmed links weighted higher in navigation.

**User Perspective Modeling**: The platform infers user viewpoints without explicit identity labels:

| Component | Description |
|-----------|-------------|
| **Moral Foundation Profile** | Inferred weighting across six foundations based on argument patterns (not visible to user by default) |
| **Position Fingerprint** | Aggregate of user's proposition alignments across topics; used for diversity detection |
| **Topic Affinity** | Tags and themes user engages with most; drives personalized recommendations |
| **Perspective Diversity Score** | For discussions: measures range of position fingerprints among participants |

**Privacy Principles**:
- Users never see labels like "liberal" or "conservative" on themselves or others
- Moral foundation profiles are internal; users can view their own profile with educational framing ("Your arguments tend to emphasize fairness and care")
- Position data used for diversity seeding (FR-028) and recommendation, not for public display or sorting

**Social Structure**: Individual-based following without formal groups:

| Feature | Description |
|---------|-------------|
| **Follow Contributors** | Users can follow individuals whose contributions they value |
| **No Formal Groups** | Platform does not support named groups or private group discussions |
| **Following Feed** | Optional view showing recent activity from followed contributors |
| **Follow Recommendations** | AI suggests contributors with different perspectives ("You might find their viewpoint interesting") |

**Anti-Echo-Chamber Design**:
- No group identity to rally around; relationships are individual-to-individual
- Follow recommendations actively surface different perspectives, not just similar ones
- No private spaces where insular discussions can form
- All substantive discussions happen in public topic spaces

## Assumptions

- Users are willing to engage with constructive feedback rather than viewing it as censorship
- The platform will initially focus on English-language discussions; internationalization is a future consideration
- OAuth providers (Google, Apple) will remain available and stable for authentication
- Government ID verification will be handled by a third-party service; specific vendor selection is an implementation detail
- Mobile-responsive web experience is sufficient for initial launch; native apps are a future consideration
- Initial topic categories will be curated by the platform team; user-generated categories come later

## Clarifications

### Session 2026-01-17

- Q: Which psychological framework should guide cognitive bias detection and intervention? → A: Kahneman's System 1/System 2 dual-process theory - prompt users to shift from automatic to deliberate thinking when bias patterns are detected
- Q: Which behavior change model should guide intervention design and delivery? → A: Fogg Behavior Model (B=MAT) - design interventions that increase ability (make good communication easy) and provide well-timed triggers
- Q: Which conflict resolution framework should guide common ground analysis? → A: Moral Foundations Theory (Haidt) - identify which moral foundations underlie each position to surface value-level disagreements and translate arguments across moral worldviews
- Q: Which emotional regulation research should guide de-escalation interventions? → A: Gross's Process Model of Emotion Regulation - intervene at cognitive reappraisal stage to help users reinterpret situations before emotional responses escalate
- Q: Which trust research should guide credibility indicator design? → A: Mayer's ABI Model - build trust scores around demonstrated Ability (quality contributions), Benevolence (helpful behavior), and Integrity (consistency over time)
- Q: What AI processing architecture should power the platform's analysis features? → A: Hybrid - lightweight local models for real-time feedback during composition + cloud LLMs for complex synthesis tasks (common ground analysis, argument translation)
- Q: How visible should AI involvement be to users? → A: Explicit AI labeling - all AI-generated feedback clearly marked as "AI Assistant" with reasoning visible to build trust and support educational mission
- Q: When should human moderators be required versus AI acting autonomously? → A: Risk-tiered - AI autonomous for suggestions/educational prompts; human approval required for consequential actions (hide, warn, remove, trust score impacts)
- Q: How should AI assist with fact-checking claims? → A: AI-assisted research - AI identifies checkable claims, retrieves fact-checks from established databases, presents findings as "related context" without rendering verdicts; platform empowers users rather than becoming arbiter of truth
- Q: How should AI behave when confidence in its analysis is low? → A: Confidence threshold - only show feedback above 80% confidence; log low-confidence cases silently for model improvement; graceful degradation prevents overwhelming users with uncertain suggestions
- Q: How should sophisticated psychological frameworks be presented to users? → A: Progressive disclosure - use plain language by default; reveal underlying research only when users dig deeper or ask "why"; keeps entry experience simple while rewarding curious users
- Q: How should new users be onboarded? → A: Value-first demo - show compelling examples of successful discussions and common ground discovered before signup; demonstrate platform value before requiring investment; then minimal onboarding
- Q: What tone should AI feedback use? → A: Curious peer - collaborative and questioning ("I noticed..." / "Have you considered..." / "Others found it helpful to..."); feels like helpful coaching rather than lecturing
- Q: How should positive contributions be recognized? → A: Subtle affirmations - occasional positive feedback ("This helped move the conversation forward" / "Well-sourced point"); no points or badges; balances corrective feedback with genuine appreciation
- Q: How should the platform differentiate from casual forums without being intimidating? → A: Outcome-focused - lead with real examples ("See how 200 people with opposing views found 73% agreement"); let results signal depth without claiming intellectual superiority
- Q: How should topics be categorized and organized? → A: Multi-tag taxonomy - topics have multiple tags; AI clusters related topics and surfaces cross-cutting themes; enables discovery of unexpected connections across traditionally siloed debates
- Q: How should viewpoints be organized within discussions? → A: Proposition-based - responses grouped by distinct positions/claims; users align with or counter specific propositions; shifts focus from "who said what" to "what positions exist"; directly enables common ground analysis
- Q: How should relationships between topics be handled? → A: Hybrid linking - AI suggests relationships + users can propose/confirm links with relationship types (builds-on, responds-to, contradicts, related); combines scalability with human insight
- Q: How should user perspectives be represented? → A: Inferred positions - system tracks moral foundation patterns and proposition alignments without explicit identity labels; enables diversity detection without creating tribal identities
- Q: Should users be able to form or belong to groups? → A: Follow individuals only - no formal groups to prevent tribal dynamics and echo chambers; users can follow individual contributors to track perspectives they value (aligned or productively challenging)
- Q: How should the platform log system events and AI decisions for testing and debugging? → A: Structured event logging with correlation IDs for all significant actions (AI feedback, moderation, user actions)
- Q: What should be the target response time for user-facing API endpoints? → A: 200ms p95 - responsive while allowing moderate processing
- Q: Which accessibility standard should the platform conform to? → A: WCAG 2.2 AA - newest standard with focus appearance and dragging alternatives
- Q: What availability target should the platform aim for? → A: 99.9% (8.76 hours/year downtime) - standard SaaS availability
- Q: How should user-facing errors be communicated? → A: Structured error codes with user-friendly messages - testable codes + readable messages

## Out of Scope (Initial Release)

- Native mobile applications (iOS/Android)
- Real-time video or audio discussions
- Direct messaging between users
- Integration with external social media platforms
- Monetization features (subscriptions, advertising)
- Multi-language support and real-time translation
- AI-generated argument synthesis or debate summaries beyond common ground analysis
