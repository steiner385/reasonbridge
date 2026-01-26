# Feature Specification: AI-Powered Feedback Synthesis

**Feature Branch**: `002-ai-feedback-synthesis`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "Implement AI-powered feedback generation system using Kahneman's dual-process theory to detect cognitive biases, logical fallacies, and inflammatory language, providing real-time educational interventions during response composition"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Receive Real-Time Bias Detection (Priority: P1)

A user is composing a response to a discussion and unknowingly uses language that attacks the person rather than their argument. As they type, the system analyzes their text and gently suggests they might be making an ad hominem argument, offering a reframing suggestion without blocking their ability to post.

**Why this priority**: This is the core value proposition of the AI feedback system - helping users improve their communication in real-time. Without this, the platform cannot deliver on its promise of elevating discourse quality.

**Independent Test**: Can be fully tested by composing a response containing a detectable logical fallacy (ad hominem, strawman, slippery slope) and verifying that appropriate feedback appears with confidence >80%, educational explanation, and suggestion for improvement.

**Acceptance Scenarios**:

1. **Given** a user composing a response, **When** they type text containing an ad hominem pattern (e.g., "You're just saying that because you're a liberal"), **Then** they see a gentle suggestion: "I noticed this focuses on the person rather than their argument—have you considered addressing their point directly?"
2. **Given** a user composing a response, **When** they type text with a strawman fallacy, **Then** they receive feedback explaining the misrepresentation and linking to educational resources
3. **Given** feedback is displayed, **When** the AI confidence score is below 80%, **Then** no feedback is shown to the user (logged silently for model improvement)
4. **Given** a user receives feedback, **When** they revise their response to address the issue, **Then** they see positive affirmation: "Thanks for taking a moment to refine this"

---

### User Story 2 - Detect System 1 Thinking Patterns (Priority: P2)

A user reads a provocative response and immediately fires off an emotionally charged reply. The system detects System 1 (automatic) thinking patterns—short response time after reading, emotionally loaded language, lack of source citations—and prompts them to engage System 2 (deliberate) thinking before posting.

**Why this priority**: This implements Kahneman's core insight about fast vs. slow thinking. It's what differentiates thoughtful AI feedback from simple keyword filtering.

**Independent Test**: Can be fully tested by simulating a quick emotional response to a triggering post and verifying the system prompts reflection ("Take a moment to reflect before posting") based on temporal and linguistic analysis.

**Acceptance Scenarios**:

1. **Given** a user reads a provocative response, **When** they compose a reply within 30 seconds using emotionally loaded language, **Then** they see a cooling-off prompt: "Take a moment to reflect—have you considered how this might land?"
2. **Given** a user receives a System 2 prompt, **When** they wait 15+ seconds before posting, **Then** the prompt is satisfied and they receive no additional intervention
3. **Given** a user's response shows cognitive reappraisal language (e.g., "I understand your concern, but..."), **When** they post, **Then** they receive positive reinforcement
4. **Given** a user frequently receives System 1 prompts, **When** they start naturally pausing and reframing, **Then** intervention frequency decreases over time (adaptive model)

---

### User Story 3 - Request Source Citations for Claims (Priority: P3)

A user makes a factual claim in their response without providing a source. The AI identifies the claim as checkable (not opinion), highlights it, and prompts them to add a citation or mark it as personal opinion.

**Why this priority**: Source citations improve discussion quality but are less urgent than preventing inflammatory or fallacious arguments. Users can still post without sources if they acknowledge it's opinion.

**Independent Test**: Can be fully tested by composing a response with a factual claim (e.g., "Studies show that 70% of people...") and verifying the system prompts for a source or opinion marker.

**Acceptance Scenarios**:

1. **Given** a user types a factual claim (e.g., "Studies show X"), **When** no URL or citation is included, **Then** the system highlights the claim and suggests: "Others found it helpful to include a source here. Want to add one, or mark this as your opinion?"
2. **Given** a user receives a citation prompt, **When** they add a URL, **Then** the prompt is satisfied and the response can be posted
3. **Given** a user receives a citation prompt, **When** they click "Mark as opinion", **Then** their claim is tagged accordingly and the prompt is satisfied
4. **Given** a user frequently provides sources proactively, **When** they make claims, **Then** citation prompts become less frequent (trust-based adaptation)

---

### User Story 4 - Detect and Moderate Inflammatory Language (Priority: P4)

A user writes a response using inflammatory language that is likely to escalate conflict (insults, generalizations about groups, emotionally charged metaphors). The system detects the tone, explains why it might derail productive conversation, and offers alternative phrasings.

**Why this priority**: Tone moderation prevents destructive spirals but is less critical than bias/fallacy detection because inflammatory language is often subjective. The system must be very confident before intervening.

**Independent Test**: Can be fully tested by composing responses with varying levels of inflammatory language and verifying that only high-confidence cases (>85%) trigger feedback, with specific reframing suggestions.

**Acceptance Scenarios**:

1. **Given** a user types inflammatory language (e.g., "People like you always..."), **When** the AI confidence exceeds 85%, **Then** they see: "Have you considered how this might land? Sometimes a different framing opens more doors"
2. **Given** inflammatory language is detected, **When** confidence is between 80-85%, **Then** the system logs the case but shows no user feedback (borderline)
3. **Given** a user receives tone feedback, **When** they rephrase using neutral language, **Then** they receive affirmation
4. **Given** a discussion has high overall tension, **When** the system detects escalation patterns across participants, **Then** all participants receive a cooling-off prompt

---

### User Story 5 - Provide Positive Reinforcement for Quality (Priority: P5)

A user submits a well-crafted response that includes source citations, acknowledges valid opposing points, and uses bridging language. The system recognizes these positive patterns and provides subtle affirmation to reinforce the behavior.

**Why this priority**: Positive feedback balances corrective interventions and encourages continued quality, but is less urgent than preventing harmful patterns. This creates a positive feedback loop over time.

**Independent Test**: Can be fully tested by composing a high-quality response with citations, balanced language, and acknowledgment of other viewpoints, then verifying the system provides specific positive feedback.

**Acceptance Scenarios**:

1. **Given** a user includes URL citations for factual claims, **When** they post, **Then** they see: "Well-sourced point—this helps everyone evaluate the argument"
2. **Given** a user uses bridging language (e.g., "I see your point about X, and I'd add..."), **When** they post, **Then** they receive: "This helped connect two perspectives"
3. **Given** a user acknowledges a valid opposing point, **When** they post, **Then** they see: "Recognizing common ground moves conversations forward"
4. **Given** a user consistently posts quality responses, **When** they participate, **Then** their trust score (Ability dimension) increases over time

---

### Edge Cases

- What happens when a user's response triggers multiple feedback types simultaneously (e.g., fallacy + inflammatory + unsourced)?
  - System prioritizes by severity: inflammatory > fallacy > unsourced; displays max 2 feedback items to avoid overwhelming
- How does the system handle sarcasm or rhetorical questions that might be misinterpreted as fallacies?
  - Confidence thresholds prevent false positives; users can dismiss feedback with "Not helpful" to train the model
- What happens when the AI misidentifies a valid argument as a fallacy?
  - Users flag feedback as unhelpful; patterns escalate to human review; egregious errors trigger model retraining
- How does the system adapt to domain-specific language (medical, legal, technical discussions)?
  - Topic-specific context is passed to the AI; domain glossaries reduce false positives in specialized discussions
- What happens when users deliberately game the system by adding random sources or superficial reframings?
  - Trust score Integrity dimension tracks pattern gaming; repeated gaming reduces user's trust weight in recommendations

## Requirements _(mandatory)_

### Functional Requirements

**Feedback Generation**
- **FR-001**: System MUST analyze user response text in real-time (as they type) using AI models to detect logical fallacies, cognitive biases, inflammatory language, and unsourced claims
- **FR-002**: System MUST apply confidence thresholds: 80% minimum for displaying feedback to users, 85% for tone/inflammatory feedback due to higher subjectivity
- **FR-003**: System MUST log all AI analyses including confidence scores, detected patterns, and model versions regardless of whether feedback is shown
- **FR-004**: System MUST limit displayed feedback to maximum 2 items per response to prevent overwhelming users; prioritize by severity (inflammatory > fallacy > bias > unsourced)
- **FR-005**: System MUST label all AI-generated feedback with "AI Assistant" attribution and display reasoning ("I noticed [pattern] because [explanation]")

**Kahneman Dual-Process Detection**
- **FR-006**: System MUST detect System 1 (automatic) thinking patterns based on: response composition time <30s after reading, emotionally loaded language, lack of hedging words, absence of citations
- **FR-007**: System MUST detect System 2 (deliberate) thinking patterns based on: presence of qualifiers ("I think", "possibly"), cognitive reappraisal language ("I understand your concern"), source citations, acknowledgment of complexity
- **FR-008**: System MUST prompt System 2 engagement when System 1 patterns are detected: "Take a moment to reflect" or "How else might you read this?"
- **FR-009**: System MUST adapt intervention frequency based on user behavior: reduce prompts for users who consistently demonstrate System 2 thinking

**Logical Fallacy Detection**
- **FR-010**: System MUST detect common logical fallacies including: ad hominem, strawman, slippery slope, false dichotomy, appeal to authority, hasty generalization, post hoc ergo propter hoc
- **FR-011**: System MUST provide fallacy-specific educational explanations with links to learning resources
- **FR-012**: System MUST suggest concrete reframings that address the argument directly rather than the fallacy

**Bias Detection**
- **FR-013**: System MUST detect cognitive biases including: confirmation bias, availability heuristic, anchoring bias, bandwagon effect, sunk cost fallacy
- **FR-014**: System MUST explain why the detected pattern might be a bias and how it could affect argument quality
- **FR-015**: System MUST suggest alternative framings that mitigate the bias

**Claim Identification & Citation Prompts**
- **FR-016**: System MUST identify factual claims (checkable statements) versus opinion statements using linguistic analysis
- **FR-017**: System MUST prompt users to provide citations for factual claims lacking sources
- **FR-018**: System MUST allow users to mark claims as "opinion" to satisfy citation prompts
- **FR-019**: System MUST extract and validate URLs when users provide sources

**Tone & Inflammatory Language**
- **FR-020**: System MUST detect inflammatory patterns including: insults, group generalizations ("people like you"), emotionally charged metaphors, absolute language ("always", "never")
- **FR-021**: System MUST use higher confidence threshold (85%+) for tone feedback due to subjective nature
- **FR-022**: System MUST offer alternative phrasings that preserve the user's point while reducing escalation potential
- **FR-023**: System MUST detect escalating tone across multiple participants in a discussion and offer cooling-off prompts to all active users

**Positive Reinforcement**
- **FR-024**: System MUST detect positive communication patterns: source citations, bridging language, acknowledgment of valid opposing points, cognitive reappraisal, use of qualifiers
- **FR-025**: System MUST provide positive affirmations for quality contributions at least as often as corrective feedback
- **FR-026**: System MUST vary positive affirmation language to feel genuine (not repetitive)
- **FR-027**: System MUST update user trust scores (Ability dimension) when positive patterns are consistently demonstrated

**User Interaction with Feedback**
- **FR-028**: System MUST allow users to dismiss any feedback without blocking their ability to post
- **FR-029**: System MUST provide "Not helpful" feedback option for users to flag incorrect or unhelpful AI suggestions
- **FR-030**: System MUST track "Not helpful" patterns to identify systematic model errors requiring human review
- **FR-031**: System MUST show positive affirmation when users revise responses to address feedback

**Adaptive Learning**
- **FR-032**: System MUST reduce intervention frequency for users who consistently demonstrate high-quality communication (based on revision patterns, trust scores, positive pattern frequency)
- **FR-033**: System MUST pass topic context and domain to AI models to improve domain-specific accuracy
- **FR-034**: System MUST store user interaction patterns (feedback accepted/dismissed, revision frequency) to personalize future interventions

### Non-Functional Requirements

**Performance**
- **NFR-001**: Real-time feedback analysis MUST complete within 500ms of user finishing typing (debounced)
- **NFR-002**: System MUST support 1000 concurrent users analyzing responses without degradation
- **NFR-003**: AI model inference latency MUST average <300ms per analysis

**Reliability**
- **NFR-004**: System MUST gracefully degrade when AI service is unavailable: allow posting without feedback, display "AI feedback temporarily unavailable"
- **NFR-005**: System MUST retry failed AI requests with exponential backoff (max 3 attempts)
- **NFR-006**: System MUST maintain 99.5% uptime for feedback generation service

**Observability**
- **NFR-007**: System MUST log all AI decisions with correlation IDs, confidence scores, detected patterns, model version, user ID, response ID
- **NFR-008**: System MUST emit metrics for: feedback shown/dismissed rates, average confidence scores, model latency, false positive rates (from "Not helpful" flags)
- **NFR-009**: System MUST support A/B testing of feedback phrasing by logging variant IDs with outcomes

**Security & Privacy**
- **NFR-010**: System MUST NOT log user response content in plaintext; use hashed references
- **NFR-011**: System MUST anonymize data used for model training
- **NFR-012**: System MUST respect user privacy preferences for feedback collection opt-out

**Model Quality**
- **NFR-013**: System MUST maintain >90% precision on fallacy detection (low false positive rate)
- **NFR-014**: System MUST maintain >75% recall on inflammatory language detection (catch most cases)
- **NFR-015**: System MUST re-evaluate model quality monthly using held-out test sets

### Key Entities

- **Feedback**: AI-generated guidance on a response; attributes include type (FALLACY, BIAS, INFLAMMATORY, UNSOURCED, AFFIRMATION), confidence score, suggestion text, educational link, detection reasoning, model version, user acknowledgment status, "not helpful" flag
- **FeedbackPattern**: Detected communication pattern; attributes include pattern type, severity, response text span (start/end positions), alternative phrasing suggestions
- **AIAnalysisLog**: Record of all AI analyses; attributes include response ID, analysis timestamp, model version, confidence scores by category, detected patterns, whether feedback was shown, user interaction (dismissed/accepted/revised)
- **UserFeedbackPreference**: User-specific feedback settings; attributes include intervention frequency preference, dismissed pattern types, trust-based adaptation level

## Success Criteria _(mandatory)_

### Measurable Outcomes

**User Engagement with Feedback**
- **SC-001**: 50% of users who receive feedback revise their response before posting
- **SC-002**: 80% of users rate feedback as "helpful" or "very helpful" (not clicking "Not helpful")
- **SC-003**: Users who receive feedback reduce repeat use of flagged patterns by 30% over 30 days

**Communication Quality Improvement**
- **SC-004**: Discussions with active feedback have 40% fewer moderation actions compared to control group
- **SC-005**: User-reported "productive conversation" ratings increase by 20% when feedback is active
- **SC-006**: Responses with source citations increase by 50% after citation prompts are introduced

**System Accuracy**
- **SC-007**: Fallacy detection false positive rate remains below 10% (measured by "Not helpful" flags)
- **SC-008**: Inflammatory language detection recall exceeds 75% (measured by moderator review of missed cases)
- **SC-009**: AI confidence scores correlate >0.85 with actual accuracy on validation set

**Performance**
- **SC-010**: 95th percentile feedback generation latency remains below 500ms
- **SC-011**: System maintains 99.5% uptime for feedback service
- **SC-012**: Feedback service scales to 1000 concurrent users without latency degradation

**User Satisfaction**
- **SC-013**: 70% of users report feeling the AI feedback helps them communicate more effectively
- **SC-014**: Less than 5% of users disable feedback features in settings
- **SC-015**: Positive affirmation frequency matches or exceeds corrective feedback frequency

## AI Model Architecture

The feedback system uses a multi-model architecture optimized for real-time performance:

| Component            | Model Type                        | Latency Target | Purpose                                                                      |
| -------------------- | --------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| **Fallacy Detector** | Fine-tuned classifier (BERT-based) | <200ms         | Detect 10 common logical fallacies with confidence scoring                   |
| **Bias Detector**    | Few-shot LLM (Claude Haiku)       | <300ms         | Identify cognitive biases using Kahneman framework examples                  |
| **Tone Analyzer**    | Sentiment + emotion model         | <150ms         | Detect inflammatory language, emotional charge, escalation patterns          |
| **Claim Identifier** | NER + dependency parsing          | <100ms         | Extract factual claims vs opinion statements                                 |
| **Suggestion Generator** | LLM (Claude Sonnet)           | <400ms         | Generate context-aware rephrasing suggestions and explanations               |

**Architecture Pattern**: Pipeline with parallel execution for independent analyses (fallacy + bias + tone + claims run concurrently), then sequential suggestion generation for flagged items.

**Confidence Calibration**: Models are calibrated using temperature scaling on validation sets to ensure confidence scores reflect actual accuracy.

## Assumptions

- Users prefer gentle suggestions over authoritative corrections (validated through UX research)
- AWS Bedrock Claude models (Haiku for speed, Sonnet for quality) are available and reliable
- Fallacy/bias detection can achieve >80% precision with fine-tuned models (validated in literature)
- Users will tolerate 500ms delay for real-time feedback during composition
- Inflammatory language patterns can be detected with reasonable accuracy across diverse discussion domains
- Users who consistently produce quality responses will appreciate reduced intervention frequency
- Source citation rates can be improved through prompting without creating compliance burden

## Out of Scope (Initial Release)

- Multi-language feedback (English only initially)
- Domain-specific fine-tuning for specialized fields (medical, legal)
- Custom user-defined feedback rules
- Feedback on multimedia content (images, videos)
- Argument strength scoring or logical validity checking beyond fallacy detection
- Automated argument synthesis or rewriting (system suggests, doesn't rewrite)
- Real-time collaborative feedback (multiple users seeing each other's feedback)
