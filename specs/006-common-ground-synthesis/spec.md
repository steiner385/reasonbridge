# Feature Specification: Common Ground Synthesis

**Feature Branch**: `006-common-ground-synthesis`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "AI-powered common ground analysis using Moral Foundations Theory, identify agreement zones, misunderstandings, genuine disagreements, argument translation across moral foundations, real-time analysis updates as discussion progresses, viewpoint clustering for high-volume discussions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Agreement Zones in Discussion (Priority: P1)

A user reading a multi-participant discussion wants to understand where participants actually agree despite surface-level conflict. They access a "Common Ground" analysis that identifies propositions with high consensus, showing percentage agreement and highlighting areas where participants from different perspectives find shared understanding.

**Why this priority**: This is the platform's core differentiator - revealing common ground that participants might not recognize on their own. Without this, the platform is just another discussion forum.

**Independent Test**: Can be fully tested by viewing a discussion with 10+ participants, accessing common ground analysis, and verifying agreement zones are accurately identified with consensus percentages.

**Acceptance Scenarios**:

1. **Given** a discussion with multiple participants, **When** a user clicks "View Common Ground," **Then** they see propositions sorted by consensus level with percentage agreement displayed
2. **Given** common ground analysis is shown, **When** viewing high-consensus propositions, **Then** the system highlights which participant groups agree despite typically opposing viewpoints
3. **Given** agreement zones are displayed, **When** a user clicks a proposition, **Then** they see supporting responses from diverse participants
4. **Given** a discussion evolves, **When** new responses are added, **Then** common ground analysis updates within 30 seconds to reflect new agreements

---

### User Story 2 - Identify Misunderstandings vs. Genuine Disagreements (Priority: P2)

A user sees apparent conflict in a discussion and wants to understand whether participants genuinely disagree or are simply misunderstanding each other. The analysis distinguishes between definitional differences (talking past each other) and value-level disagreements (fundamental differences in priorities).

**Why this priority**: Separating misunderstandings from genuine disagreements helps users focus discussion productively. Resolving misunderstandings is easier than bridging value differences, so identifying which is which is critical for progress.

**Independent Test**: Can be fully tested by reviewing analysis for a discussion with both types of conflict, verifying misunderstandings are correctly identified with definitional explanations, and checking genuine disagreements highlight underlying value differences.

**Acceptance Scenarios**:

1. **Given** a discussion with apparent conflict, **When** viewing analysis, **Then** the system categorizes conflicts as "Misunderstandings" or "Genuine Disagreements"
2. **Given** a misunderstanding is identified, **When** displayed, **Then** the system shows which terms are being used differently and provides clarifying definitions
3. **Given** a genuine disagreement is identified, **When** displayed, **Then** the system shows which moral foundations or values differ between positions
4. **Given** participants clarify terms, **When** analysis refreshes, **Then** resolved misunderstandings move from conflict to agreement zones

---

### User Story 3 - Translate Arguments Across Moral Foundations (Priority: P3)

A user sees an argument framed in terms of one moral foundation (e.g., fairness) but primarily values a different foundation (e.g., liberty). The system offers "translation" suggestions that reframe the argument in terms the user's moral foundation profile prioritizes, helping them understand perspectives that typically don't resonate.

**Why this priority**: Argument translation breaks through motivated reasoning by presenting ideas in frameworks that align with the reader's values. This is powerful but depends on accurate moral foundation profiling and common ground identification.

**Independent Test**: Can be fully tested by viewing an argument, requesting translation to a different moral foundation, and verifying the reframed argument preserves the original point while using different value language.

**Acceptance Scenarios**:

1. **Given** a user viewing an argument, **When** they see a "View from different perspective" option, **Then** they can select which moral foundation to translate into
2. **Given** a user selects a translation, **When** displayed, **Then** the reframed argument uses language and reasoning aligned with the selected foundation
3. **Given** a translated argument, **When** shown, **Then** the system indicates this is a reframing and links to the original argument for comparison
4. **Given** multiple translations exist, **When** viewing, **Then** the user can toggle between original and different foundation framings

---

### User Story 4 - Explore Moral Foundation Analysis (Priority: P4)

A user wants to understand the underlying values driving different positions in a discussion. They access moral foundation analysis showing which of the six foundations (care, fairness, loyalty, authority, sanctity, liberty) each major position emphasizes, helping them see why participants prioritize different aspects of the issue.

**Why this priority**: Moral foundation visibility helps users understand why people disagree at a fundamental level. This provides insight but is more educational than immediately actionable.

**Independent Test**: Can be fully tested by reviewing foundation analysis for a discussion, seeing which foundations different positions emphasize, and verifying the analysis accurately reflects the value language in responses.

**Acceptance Scenarios**:

1. **Given** a discussion with value-based disagreements, **When** viewing foundation analysis, **Then** each major position shows which foundations it emphasizes (ranked by prominence)
2. **Given** foundation analysis is displayed, **When** viewing, **Then** the system provides examples of language from responses that indicate each foundation
3. **Given** a user sees foundation differences, **When** they click a foundation, **Then** they see an explanation of what that foundation values and how it applies to this discussion
4. **Given** multiple positions share a foundation, **When** displayed, **Then** the system highlights this as potential common ground despite other differences

---

### User Story 5 - Navigate Viewpoint Clusters in Large Discussions (Priority: P5)

A user encounters a high-volume discussion (50+ participants) and feels overwhelmed. The system clusters participants into viewpoint groups based on their positions, allowing the user to explore representative responses from each cluster rather than reading every individual contribution.

**Why this priority**: Viewpoint clustering makes large discussions navigable and prevents information overload. This is essential for scale but less critical for smaller discussions.

**Independent Test**: Can be fully tested by viewing a high-volume discussion, seeing viewpoint clusters with representative responses, exploring each cluster, and verifying participants are grouped by position similarity.

**Acceptance Scenarios**:

1. **Given** a discussion with 50+ participants, **When** viewing, **Then** the system automatically clusters participants into 4-7 distinct viewpoint groups
2. **Given** viewpoint clusters are shown, **When** displayed, **Then** each cluster has a descriptive label and shows 2-3 representative responses
3. **Given** a user selects a cluster, **When** they drill in, **Then** they see all participants and responses in that cluster
4. **Given** clusters are displayed, **When** viewing, **Then** the system shows consensus and disagreement between clusters, not just within them

---

### Edge Cases

- What happens when a discussion has near-unanimous agreement (95%+ consensus)?
  - System highlights the consensus and notes low conflict; suggests exploring edge cases or minority viewpoints
- How does the system handle when participants change their positions mid-discussion?
  - Tracks position evolution over time; common ground analysis reflects current state; history shows position changes
- What happens when moral foundation analysis is inconclusive (no clear pattern)?
  - System notes insufficient data for foundation analysis; suggests participants articulate their values more explicitly
- How does the system handle sarcasm or rhetorical questions in analysis?
  - Confidence thresholds filter uncertain interpretations; users can flag misinterpretations; system learns from feedback
- What happens when viewpoint clusters overlap significantly?
  - System merges highly similar clusters; notes nuanced differences between near-identical positions
- How does the system handle when argument translation produces misleading reframings?
  - Users can flag poor translations; human review improves translation models; original always accessible alongside translation

## Requirements *(mandatory)*

### Functional Requirements

**Agreement Zone Identification**
- **FR-001**: System MUST analyze discussion propositions to calculate consensus levels (percentage agreement across participants)
- **FR-002**: System MUST identify propositions with 60%+ agreement as "agreement zones"
- **FR-003**: System MUST display agreement zones sorted by consensus level (highest first)
- **FR-004**: System MUST show which participant groups (defined by typical opposition) agree on each proposition
- **FR-005**: System MUST update common ground analysis within 30 seconds of new responses being posted
- **FR-006**: System MUST provide confidence scores for agreement zone identification

**Misunderstanding vs. Disagreement Analysis**
- **FR-007**: System MUST analyze conflicts to distinguish misunderstandings (definitional differences) from genuine disagreements (value conflicts)
- **FR-008**: System MUST identify terms being used with different meanings across participants
- **FR-009**: System MUST provide clarifying definitions for misunderstood terms
- **FR-010**: System MUST use Moral Foundations Theory to identify value-level disagreements
- **FR-011**: System MUST track when misunderstandings are resolved through clarification and update analysis accordingly
- **FR-012**: System MUST categorize each identified conflict as "Misunderstanding" or "Genuine Disagreement" with confidence score

**Argument Translation**
- **FR-013**: System MUST offer argument translation across all six moral foundations (care, fairness, loyalty, authority, sanctity, liberty)
- **FR-014**: System MUST generate translated arguments that preserve original meaning while using different foundation language
- **FR-015**: System MUST label translated arguments clearly as reframings and link to originals
- **FR-016**: System MUST allow users to toggle between original and translated versions
- **FR-017**: System MUST track translation quality through user feedback and improve over time
- **FR-018**: System MUST only display translations with 75%+ confidence in accuracy

**Moral Foundation Analysis**
- **FR-019**: System MUST analyze responses to identify which of the six moral foundations each position emphasizes
- **FR-020**: System MUST rank foundations by prominence for each major position in a discussion
- **FR-021**: System MUST provide evidence from response text showing foundation usage
- **FR-022**: System MUST offer plain-language explanations of each foundation and its application to the discussion
- **FR-023**: System MUST highlight when different positions share foundation emphasis as potential common ground
- **FR-024**: System MUST maintain user moral foundation profiles (from platform spec FR-037) for translation targeting

**Viewpoint Clustering**
- **FR-025**: System MUST automatically cluster participants in discussions with 50+ participants into 4-7 viewpoint groups
- **FR-026**: System MUST generate descriptive labels for each viewpoint cluster
- **FR-027**: System MUST select 2-3 representative responses for each cluster
- **FR-028**: System MUST allow users to drill into clusters to see all participants and responses
- **FR-029**: System MUST show consensus and disagreement between clusters, not just within
- **FR-030**: System MUST merge clusters with 85%+ similarity to avoid redundant groupings

**Real-Time Updates**
- **FR-031**: System MUST refresh common ground analysis within 30 seconds of new responses
- **FR-032**: System MUST update viewpoint clusters when new participants join or positions shift
- **FR-033**: System MUST track position evolution over time for individual participants
- **FR-034**: System MUST notify users when significant common ground emerges in discussions they're following

**User Interaction & Feedback**
- **FR-035**: System MUST allow users to flag inaccurate analysis (misidentified agreements, poor translations)
- **FR-036**: System MUST incorporate user feedback to improve analysis accuracy
- **FR-037**: System MUST display analysis confidence scores to help users evaluate reliability
- **FR-038**: System MUST provide educational resources explaining how analysis works (Moral Foundations Theory basics)

### Non-Functional Requirements

**Performance**
- **NFR-001**: Common ground analysis MUST complete within 5 seconds for discussions with up to 100 responses
- **NFR-002**: Real-time analysis updates MUST process within 30 seconds of new content
- **NFR-003**: Viewpoint clustering MUST complete within 10 seconds for discussions with up to 500 participants
- **NFR-004**: Argument translation MUST generate within 3 seconds per translation

**Accuracy**
- **NFR-005**: Agreement zone identification MUST achieve 85%+ accuracy (validated by human review)
- **NFR-006**: Misunderstanding vs. disagreement categorization MUST achieve 80%+ accuracy
- **NFR-007**: Moral foundation analysis MUST achieve 75%+ accuracy in identifying emphasized foundations
- **NFR-008**: Viewpoint clustering MUST achieve 80%+ coherence (participants in cluster actually share positions)

**Scalability**
- **NFR-009**: System MUST handle common ground analysis for discussions with 1000+ responses
- **NFR-010**: System MUST support 100 concurrent analysis requests without degradation
- **NFR-011**: Moral foundation profiling MUST scale to 100,000+ users

**Reliability**
- **NFR-012**: Analysis MUST gracefully degrade when confidence is low (show partial results with warnings)
- **NFR-013**: System MUST maintain 99% uptime for common ground analysis features
- **NFR-014**: Failed analysis MUST not block discussion viewing or participation

**User Experience**
- **NFR-015**: Common ground visualization MUST be comprehensible without requiring theoretical knowledge
- **NFR-016**: Analysis interfaces MUST work on mobile devices without horizontal scrolling
- **NFR-017**: Progressive disclosure MUST keep entry experience simple while allowing deep-dive for curious users

### Key Entities

- **Common Ground Analysis**: Synthesized view of discussion; attributes include discussion reference, agreement zones (array of propositions with consensus %), identified misunderstandings, genuine disagreements, generation timestamp, confidence score
- **Agreement Zone**: High-consensus proposition; attributes include proposition reference, consensus percentage, agreeing participant groups, supporting responses, identification confidence
- **Conflict**: Identified disagreement or misunderstanding; attributes include type (misunderstanding or genuine disagreement), involved participants, proposition references, definitional differences (if misunderstanding), foundation differences (if genuine disagreement), confidence score
- **Argument Translation**: Reframed argument; attributes include original response reference, target foundation, translated text, preservation score (how well meaning is preserved), user feedback ratings, confidence score
- **Moral Foundation Profile**: User's value pattern; attributes include user reference, foundation weights (care, fairness, loyalty, authority, sanctity, liberty), evidence responses, last updated timestamp, confidence score
- **Viewpoint Cluster**: Group of similar positions; attributes include discussion reference, cluster label, member participants, representative responses, cluster coherence score, consensus level within cluster, between-cluster relationships
- **Position Evolution**: Participant's stance change; attributes include participant reference, discussion reference, propositions affected, previous position, new position, timestamp, reason for change (if stated)

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Agreement Zone Identification**
- **SC-001**: 85%+ of identified agreement zones are validated as accurate by human review
- **SC-002**: Users report discovering unexpected common ground 60%+ of the time when viewing analysis
- **SC-003**: Discussions using common ground analysis reach resolution 40% faster than those without

**Misunderstanding Resolution**
- **SC-004**: 70%+ of identified misunderstandings are resolved when clarifications are surfaced
- **SC-005**: Users rate misunderstanding identification as accurate 80%+ of the time
- **SC-006**: Discussions where misunderstandings are clarified have 30% higher participant satisfaction

**Argument Translation Quality**
- **SC-007**: 75%+ of users rate argument translations as preserving original meaning
- **SC-008**: Users exposed to translated arguments report understanding opposing viewpoints 50% better
- **SC-009**: Argument translation leads to bridging responses (acknowledging other side's points) 20% more often

**Moral Foundation Analysis**
- **SC-010**: Foundation analysis accurately identifies emphasized values 75%+ of the time
- **SC-011**: Users report foundation analysis helps them understand value differences 70%+ of the time
- **SC-012**: Discussions with foundation analysis visible have 25% less ad hominem attacks (people attack positions, not values)

**Viewpoint Clustering**
- **SC-013**: Clustered discussions reduce reading time by 40% for users while maintaining comprehension
- **SC-014**: 80%+ of participants agree their viewpoint cluster accurately represents their position
- **SC-015**: Between-cluster consensus identification reveals shared ground 50%+ of the time

**Real-Time Updates**
- **SC-016**: Analysis updates complete within 30 seconds for 95% of new responses
- **SC-017**: Users receive notifications of emerging common ground within 1 minute of consensus forming
- **SC-018**: Real-time updates maintain analysis accuracy within 5% of batch recalculation

**User Trust & Engagement**
- **SC-019**: 85%+ of users rate common ground analysis as valuable for understanding discussions
- **SC-020**: Users who engage with analysis participate more constructively (25% fewer flagged responses)
- **SC-021**: Analysis confidence scores correlate with user trust ratings 80%+ of the time

## Assumptions

- Moral Foundations Theory is sufficiently comprehensive to capture most value-based disagreements
- Discussions have sufficient response content (10+ responses) for meaningful analysis
- Participants express their positions clearly enough for AI to identify agreements and disagreements
- Users are open to seeing their arguments reframed in different value languages
- English-language analysis is initial focus; multi-language support is future enhancement
- Moral foundation profiles can be inferred from participation patterns without explicit user self-reporting
- Users understand percentages and consensus metrics without extensive explanation
- AI-generated analysis can achieve human-level accuracy with sufficient training data and feedback loops

## Out of Scope (Initial Release)

- Automated mediation or conflict resolution suggestions
- Prediction of future common ground based on discussion trajectory
- Integration with external debate or argumentation frameworks
- User-editable or correctable analysis (feedback only, not direct editing)
- Comparative analysis across multiple related discussions
- Historical trend analysis of common ground over time
- Gamification of consensus-building
- Blockchain-based consensus verification
- Export of analysis results to academic research formats
- Real-time collaborative analysis where users co-create the synthesis
- Integration with external personality or values assessment tools
