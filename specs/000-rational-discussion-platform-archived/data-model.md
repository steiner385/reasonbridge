# Data Model: reasonBridge - Rational Discussion Platform

**Feature**: 001-rational-discussion-platform | **Date**: 2026-01-17
**Source**: [spec.md](./spec.md) Key Entities section

## Overview

This document defines the data model for the reasonBridge platform, extracted from the feature specification. The model supports a microservices architecture with clear ownership boundaries.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  USER SERVICE                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐                                                               │
│  │     User     │◄──────────────────────────────────────────────┐               │
│  └──────┬───────┘                                               │               │
│         │                                                       │               │
│         │ 1:N                                                   │               │
│         ▼                                                       │               │
│  ┌──────────────────┐     ┌──────────────────┐                 │               │
│  │VerificationRecord│     │   UserFollow     │─────────────────┘               │
│  └──────────────────┘     │ (follower_id,    │                                 │
│                           │  followed_id)    │                                 │
│                           └──────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DISCUSSION SERVICE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ M:N  ┌──────────┐                                            │
│  │DiscussionTopic│◄───►│   Tag    │                                            │
│  └──────┬───────┘      └──────────┘                                            │
│         │                                                                       │
│         │ 1:N          ┌──────────────┐                                        │
│         │              │  TopicLink   │                                        │
│         │              │(source,target│                                        │
│         │              │  type)       │                                        │
│         │              └──────────────┘                                        │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────┐ 1:N  ┌──────────────┐                                        │
│  │ Proposition  │◄────►│  Response    │                                        │
│  └──────┬───────┘      └──────┬───────┘                                        │
│         │                     │                                                 │
│         │              ┌──────┴───────┐                                        │
│         │              │  Alignment   │                                        │
│         │              │(user,prop,   │                                        │
│         │              │ stance)      │                                        │
│         │              └──────────────┘                                        │
│         │                                                                       │
│         │ 1:N                                                                   │
│         ▼                                                                       │
│  ┌──────────────────┐                                                          │
│  │CommonGroundAnalysis│                                                        │
│  └──────────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 AI SERVICE                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐                                                               │
│  │   Feedback   │────► linked to Response                                       │
│  └──────────────┘                                                               │
│                                                                                 │
│  ┌──────────────────┐                                                          │
│  │  FactCheckResult │────► linked to Response claims                           │
│  └──────────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                             MODERATION SERVICE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐ 1:1  ┌──────────────┐                                    │
│  │ModerationAction  │◄────►│    Appeal    │                                    │
│  └──────────────────┘      └──────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Entities

### 1. User

**Owner**: user-service
**Source**: FR-001 through FR-004, FR-021, FR-037 through FR-044

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | string | unique, not null | Login email (from Cognito) |
| display_name | string | not null, 3-50 chars | Public pseudonym |
| cognito_sub | string | unique, not null | Cognito user pool subject ID |
| verification_level | enum | not null, default 'basic' | basic \| enhanced \| verified_human |
| trust_score_ability | decimal(3,2) | 0.00-1.00, default 0.50 | Mayer ABI: quality of contributions |
| trust_score_benevolence | decimal(3,2) | 0.00-1.00, default 0.50 | Mayer ABI: helpfulness |
| trust_score_integrity | decimal(3,2) | 0.00-1.00, default 0.50 | Mayer ABI: consistency |
| moral_foundation_profile | jsonb | nullable | Internal: 6-foundation weights (care, fairness, loyalty, authority, sanctity, liberty) |
| position_fingerprint | jsonb | nullable | Internal: aggregate proposition alignments |
| topic_affinities | jsonb | nullable | Tag/theme engagement weights |
| status | enum | not null, default 'active' | active \| suspended \| banned |
| created_at | timestamp | not null | Account creation time |
| updated_at | timestamp | not null | Last profile update |

**Indexes**:
- `idx_user_cognito_sub` on cognito_sub (unique)
- `idx_user_email` on email (unique)
- `idx_user_display_name` on display_name

**Validation Rules**:
- Display name must be unique (case-insensitive)
- Email must be valid format and verified before participation (FR-002)
- Trust scores are system-managed, not user-editable

**State Transitions**:
```
active ──[moderation action]──► suspended
suspended ──[appeal approved]──► active
suspended ──[escalation]──► banned
banned ──[admin override]──► active
```

---

### 2. VerificationRecord

**Owner**: user-service
**Source**: FR-003, FR-021

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, not null | Owner of verification |
| type | enum | not null | email \| phone \| government_id |
| status | enum | not null | pending \| verified \| rejected \| expired |
| verified_at | timestamp | nullable | When verification completed |
| expires_at | timestamp | nullable | For time-limited verifications |
| provider_reference | string | nullable | Third-party verification ID |
| created_at | timestamp | not null | Record creation |

**Indexes**:
- `idx_verification_user_type` on (user_id, type)
- `idx_verification_status` on status

---

### 3. UserFollow

**Owner**: user-service
**Source**: FR-042, FR-043, FR-044

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| follower_id | UUID | FK → User, not null | User who is following |
| followed_id | UUID | FK → User, not null | User being followed |
| created_at | timestamp | not null | When follow was created |

**Indexes**:
- `idx_follow_follower` on follower_id
- `idx_follow_followed` on followed_id
- `idx_follow_unique` on (follower_id, followed_id) UNIQUE

**Constraints**:
- follower_id != followed_id (cannot follow self)

---

### 4. Discussion Topic

**Owner**: discussion-service
**Source**: FR-005, FR-027 through FR-036

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| title | string | not null, 10-200 chars | Topic headline |
| description | text | not null | Full topic framing |
| creator_id | UUID | FK → User, not null | Topic creator (via API) |
| status | enum | not null, default 'seeding' | seeding \| active \| archived |
| evidence_standards | enum | not null, default 'standard' | minimal \| standard \| rigorous |
| minimum_diversity_score | decimal(3,2) | default 0.30 | Required diversity for activation |
| current_diversity_score | decimal(3,2) | nullable | Current participant diversity |
| participant_count | integer | default 0 | Cached count |
| response_count | integer | default 0 | Cached count |
| cross_cutting_themes | string[] | nullable | AI-identified themes |
| created_at | timestamp | not null | Topic creation |
| activated_at | timestamp | nullable | When status became 'active' |
| archived_at | timestamp | nullable | When status became 'archived' |

**Indexes**:
- `idx_topic_status` on status
- `idx_topic_creator` on creator_id
- `idx_topic_created` on created_at DESC
- GIN index on cross_cutting_themes

**Validation Rules**:
- Minimum 2 tags, maximum 5 tags (FR-031)
- Cannot transition to 'active' until minimum_diversity_score met (FR-028)

**State Transitions**:
```
seeding ──[diversity threshold met]──► active
active ──[inactivity 90 days OR manual]──► archived
archived ──[admin reopen]──► active
```

---

### 5. Tag

**Owner**: discussion-service
**Source**: FR-031, FR-032, FR-033

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string | unique, not null, 2-50 chars | Tag display name |
| slug | string | unique, not null | URL-safe identifier |
| usage_count | integer | default 0 | Number of topics using tag |
| ai_synonyms | string[] | nullable | AI-suggested alternative names |
| parent_theme_id | UUID | FK → Tag, nullable | For hierarchical themes |
| created_at | timestamp | not null | Tag creation |

**Indexes**:
- `idx_tag_name` on name (unique, case-insensitive)
- `idx_tag_slug` on slug (unique)
- `idx_tag_usage` on usage_count DESC

---

### 6. TopicTag (Junction)

**Owner**: discussion-service

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| topic_id | UUID | FK → Topic, PK | Topic reference |
| tag_id | UUID | FK → Tag, PK | Tag reference |
| source | enum | not null | creator \| ai_suggested \| community |
| created_at | timestamp | not null | When tag was added |

**Indexes**:
- Primary key on (topic_id, tag_id)
- `idx_topictag_tag` on tag_id

---

### 7. TopicLink

**Owner**: discussion-service
**Source**: FR-034, FR-035, FR-036

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| source_topic_id | UUID | FK → Topic, not null | Origin topic |
| target_topic_id | UUID | FK → Topic, not null | Destination topic |
| relationship_type | enum | not null | builds_on \| responds_to \| contradicts \| related \| shares_proposition |
| link_source | enum | not null | ai_suggested \| user_proposed |
| proposer_id | UUID | FK → User, nullable | User who proposed (if user_proposed) |
| confirmation_status | enum | not null, default 'pending' | pending \| confirmed \| rejected |
| confirmed_by_count | integer | default 0 | Users who confirmed |
| rejected_by_count | integer | default 0 | Users who rejected |
| created_at | timestamp | not null | Link creation |

**Indexes**:
- `idx_topiclink_source` on source_topic_id
- `idx_topiclink_target` on target_topic_id
- `idx_topiclink_type` on relationship_type
- `idx_topiclink_status` on confirmation_status

**Constraints**:
- source_topic_id != target_topic_id
- Unique constraint on (source_topic_id, target_topic_id, relationship_type)

---

### 8. Proposition

**Owner**: discussion-service
**Source**: FR-008, FR-008a, FR-008b, FR-008c

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| topic_id | UUID | FK → Topic, not null | Parent discussion |
| statement | text | not null, 10-1000 chars | The claim/position text |
| source | enum | not null | ai_identified \| user_created |
| creator_id | UUID | FK → User, nullable | User who created (if user_created) |
| parent_proposition_id | UUID | FK → Proposition, nullable | For sub-propositions |
| support_count | integer | default 0 | Cached alignment count |
| oppose_count | integer | default 0 | Cached alignment count |
| nuanced_count | integer | default 0 | Cached alignment count |
| consensus_score | decimal(3,2) | nullable | Calculated agreement level |
| evidence_pool | jsonb | nullable | Aggregated sources |
| status | enum | not null, default 'active' | active \| merged \| archived |
| created_at | timestamp | not null | Proposition creation |

**Indexes**:
- `idx_proposition_topic` on topic_id
- `idx_proposition_parent` on parent_proposition_id
- `idx_proposition_consensus` on (topic_id, consensus_score DESC)

**Validation Rules**:
- If source = 'user_created', creator_id must not be null
- Statement must be substantively different from existing propositions in topic

---

### 9. Response

**Owner**: discussion-service
**Source**: FR-006, FR-007, FR-008

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| topic_id | UUID | FK → Topic, not null | Parent discussion |
| author_id | UUID | FK → User, not null | Response author (via API) |
| content | text | not null, 10-10000 chars | Response text |
| cited_sources | jsonb | nullable | Array of {url, title, extracted_at} |
| contains_opinion | boolean | default false | User marked as opinion |
| contains_factual_claims | boolean | default false | AI detected claims |
| status | enum | not null, default 'visible' | visible \| hidden \| removed |
| revision_count | integer | default 0 | Times edited after feedback |
| created_at | timestamp | not null | Response creation |
| updated_at | timestamp | not null | Last edit |

**Indexes**:
- `idx_response_topic` on topic_id
- `idx_response_author` on author_id
- `idx_response_created` on (topic_id, created_at DESC)
- `idx_response_status` on status

---

### 10. ResponseProposition (Junction)

**Owner**: discussion-service

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| response_id | UUID | FK → Response, PK | Response reference |
| proposition_id | UUID | FK → Proposition, PK | Proposition reference |
| relevance_score | decimal(3,2) | nullable | AI-determined relevance |

---

### 11. Alignment

**Owner**: discussion-service
**Source**: FR-008b

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, not null | User who aligned (via API) |
| proposition_id | UUID | FK → Proposition, not null | Target proposition |
| stance | enum | not null | support \| oppose \| nuanced |
| nuance_explanation | text | nullable | Required if stance = 'nuanced' |
| created_at | timestamp | not null | Alignment creation |
| updated_at | timestamp | not null | Last change |

**Indexes**:
- `idx_alignment_user_prop` on (user_id, proposition_id) UNIQUE
- `idx_alignment_proposition` on proposition_id

**Constraints**:
- One alignment per user per proposition (upsert pattern)
- If stance = 'nuanced', nuance_explanation required

---

### 12. Feedback

**Owner**: ai-service
**Source**: FR-010 through FR-014d

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| response_id | UUID | FK → Response, not null | Target response |
| type | enum | not null | fallacy \| inflammatory \| unsourced \| bias \| affirmation |
| subtype | string | nullable | Specific fallacy name, bias type, etc. |
| suggestion_text | text | not null | User-facing feedback |
| reasoning | text | not null | AI explanation for transparency |
| confidence_score | decimal(3,2) | not null | 0.00-1.00, must be >= 0.80 to display |
| educational_resources | jsonb | nullable | Array of {title, url} |
| user_acknowledged | boolean | default false | User saw and acknowledged |
| user_revised | boolean | default false | User edited response after |
| user_helpful_rating | enum | nullable | helpful \| not_helpful \| null |
| displayed_to_user | boolean | not null | False if below confidence threshold |
| created_at | timestamp | not null | Feedback generation |

**Indexes**:
- `idx_feedback_response` on response_id
- `idx_feedback_type` on type
- `idx_feedback_displayed` on (displayed_to_user, created_at)

**Validation Rules**:
- displayed_to_user = true only if confidence_score >= 0.80 (FR-014c)
- type = 'affirmation' for positive feedback (FR-014d)

---

### 13. FactCheckResult

**Owner**: fact-check-service
**Source**: FR-012a, FR-012b

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| response_id | UUID | FK → Response, not null | Source response |
| claim_text | text | not null | Extracted claim |
| claim_start_offset | integer | not null | Position in response |
| claim_end_offset | integer | not null | Position in response |
| sources | jsonb | not null | Array of {provider, url, title, rating, retrieved_at} |
| has_conflicting_sources | boolean | default false | Sources disagree |
| displayed_as | string | default 'Related Context' | UI label (never "verdict") |
| created_at | timestamp | not null | Check performed |
| expires_at | timestamp | not null | Cache expiration (24h) |

**Indexes**:
- `idx_factcheck_response` on response_id
- `idx_factcheck_expires` on expires_at

---

### 14. Common Ground Analysis

**Owner**: ai-service (generated), discussion-service (stored)
**Source**: FR-015 through FR-018

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| topic_id | UUID | FK → Topic, not null | Analyzed topic |
| version | integer | not null | Incremented on each regeneration |
| agreement_zones | jsonb | not null | Array of {description, confidence, proposition_ids, participant_percentage} |
| misunderstandings | jsonb | not null | Array of {description, term, definitions[], affected_propositions[]} |
| genuine_disagreements | jsonb | not null | Array of {description, underlying_values[], moral_foundations[], proposition_ids} |
| overall_consensus_score | decimal(3,2) | nullable | 0.00-1.00 |
| participant_count_at_generation | integer | not null | Snapshot for context |
| response_count_at_generation | integer | not null | Snapshot for context |
| model_version | string | not null | Bedrock model used |
| created_at | timestamp | not null | Analysis generation |

**Indexes**:
- `idx_commonground_topic` on topic_id
- `idx_commonground_latest` on (topic_id, version DESC)

**Validation Rules**:
- New analysis generated when response_count increases by 10+ or 6+ hours elapsed (FR-018)
- Keep last 5 versions per topic for historical comparison

---

### 15. Moderation Action

**Owner**: moderation-service
**Source**: FR-023 through FR-026b

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| target_type | enum | not null | response \| user \| topic |
| target_id | UUID | not null | ID of target entity |
| action_type | enum | not null | educate \| warn \| hide \| remove \| suspend \| ban |
| severity | enum | not null | non_punitive \| consequential |
| reasoning | text | not null | Transparent explanation |
| ai_recommended | boolean | default false | AI suggested this action |
| ai_confidence | decimal(3,2) | nullable | AI confidence if recommended |
| approved_by_id | UUID | FK → User, nullable | Human moderator who approved |
| approved_at | timestamp | nullable | When human approved |
| status | enum | not null, default 'pending' | pending \| active \| appealed \| reversed |
| created_at | timestamp | not null | Action creation |
| executed_at | timestamp | nullable | When action took effect |

**Indexes**:
- `idx_modaction_target` on (target_type, target_id)
- `idx_modaction_status` on status
- `idx_modaction_severity` on severity
- `idx_modaction_pending_approval` on (severity, status) WHERE status = 'pending' AND severity = 'consequential'

**Validation Rules**:
- If severity = 'consequential', approved_by_id required before execution (FR-026b)
- If severity = 'non_punitive', can execute immediately (autonomous)

**State Transitions**:
```
pending ──[approval]──► active
pending ──[rejection]──► reversed
active ──[user appeals]──► appealed
appealed ──[appeal upheld]──► reversed
appealed ──[appeal denied]──► active
```

---

### 16. Appeal

**Owner**: moderation-service
**Source**: FR-025

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| moderation_action_id | UUID | FK → ModerationAction, not null | Action being appealed |
| appellant_id | UUID | FK → User, not null | User filing appeal (via API) |
| reason | text | not null | Appeal justification |
| status | enum | not null, default 'pending' | pending \| under_review \| upheld \| denied |
| reviewer_id | UUID | FK → User, nullable | Moderator who reviewed |
| decision_reasoning | text | nullable | Explanation of decision |
| created_at | timestamp | not null | Appeal filed |
| resolved_at | timestamp | nullable | Decision made |

**Indexes**:
- `idx_appeal_action` on moderation_action_id
- `idx_appeal_status` on status
- `idx_appeal_pending` on created_at WHERE status = 'pending'

**Constraints**:
- One appeal per moderation action per user

---

## Service Ownership Summary

| Service | Entities Owned |
|---------|----------------|
| user-service | User, VerificationRecord, UserFollow |
| discussion-service | DiscussionTopic, Tag, TopicTag, TopicLink, Proposition, Response, ResponseProposition, Alignment, CommonGroundAnalysis (storage) |
| ai-service | Feedback, CommonGroundAnalysis (generation) |
| fact-check-service | FactCheckResult |
| moderation-service | ModerationAction, Appeal |

---

## Cross-Service References

Services reference entities from other services by ID only, never by direct database join.

| Referencing Service | Referenced Entity | Resolution |
|---------------------|-------------------|------------|
| discussion-service | User | API call to user-service for display_name, verification_level, trust_scores |
| ai-service | Response | Event-driven: receives response.created event |
| moderation-service | User, Response, Topic | API calls for display; owns action records |
| recommendation-service | User, Topic, Tag | Read replicas / cached data |

---

## JSONB Schema Definitions

### moral_foundation_profile
```json
{
  "care": 0.75,
  "fairness": 0.82,
  "loyalty": 0.45,
  "authority": 0.38,
  "sanctity": 0.22,
  "liberty": 0.68
}
```

### position_fingerprint
```json
{
  "topic_positions": [
    {"topic_id": "uuid", "propositions": [{"id": "uuid", "stance": "support"}]}
  ],
  "computed_at": "2026-01-17T12:00:00Z"
}
```

### cited_sources
```json
[
  {"url": "https://example.com/article", "title": "Article Title", "extracted_at": "2026-01-17T12:00:00Z"}
]
```

### agreement_zones
```json
[
  {
    "description": "Both sides agree that the current system needs reform",
    "confidence": 0.92,
    "proposition_ids": ["uuid1", "uuid2"],
    "participant_percentage": 0.87
  }
]
```

### misunderstandings
```json
[
  {
    "description": "Participants using 'freedom' with different meanings",
    "term": "freedom",
    "definitions": [
      {"definition": "freedom from government interference", "user_ids": ["uuid1"]},
      {"definition": "freedom from economic hardship", "user_ids": ["uuid2"]}
    ],
    "affected_propositions": ["uuid3", "uuid4"]
  }
]
```

### genuine_disagreements
```json
[
  {
    "description": "Fundamental disagreement on role of government",
    "underlying_values": ["individual liberty", "collective welfare"],
    "moral_foundations": ["liberty", "care"],
    "proposition_ids": ["uuid1", "uuid2"]
  }
]
```

---

## Migration Strategy

1. **Phase 1**: User and authentication entities (user-service)
2. **Phase 2**: Core discussion entities (discussion-service)
3. **Phase 3**: AI feedback and analysis entities (ai-service, fact-check-service)
4. **Phase 4**: Moderation entities (moderation-service)

Each phase can be deployed independently due to microservice isolation.

---

## Testing Considerations

### Database Test Strategy

**Test Database Isolation**:
```typescript
// Per-test isolation pattern
beforeEach(async () => {
  await prisma.$transaction([
    prisma.feedback.deleteMany(),
    prisma.alignment.deleteMany(),
    prisma.response.deleteMany(),
    prisma.proposition.deleteMany(),
    prisma.discussionTopic.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});
```

**Test Fixtures per Entity**:

| Entity | Fixture File | Key Scenarios |
|--------|--------------|---------------|
| User | `users.fixture.ts` | verified, basic, suspended, high-trust, low-trust |
| DiscussionTopic | `topics.fixture.ts` | seeding, active, archived, high-diversity, low-diversity |
| Proposition | `propositions.fixture.ts` | high-consensus, contested, sub-proposition |
| Response | `responses.fixture.ts` | with-sources, opinion-marked, with-claims, flagged |
| Feedback | `feedback.fixture.ts` | fallacy, inflammatory, affirmation, low-confidence |
| ModerationAction | `moderation.fixture.ts` | pending, approved, appealed, reversed |

### Entity Validation Tests

Each entity requires validation tests for:

1. **Required Fields**: Test creation fails without required fields
2. **Field Constraints**: Test length limits, enum values, format validation
3. **Relationship Integrity**: Test foreign key constraints
4. **State Transitions**: Test valid and invalid state changes
5. **Computed Fields**: Test derived values update correctly

**Example Pattern**:
```typescript
describe('User Entity', () => {
  describe('creation', () => {
    it('should create user with valid data', async () => {
      const user = await createUser({ email: 'test@example.com', displayName: 'Test User' });
      expect(user.id).toBeDefined();
      expect(user.verificationLevel).toBe('basic');
    });

    it('should reject duplicate email', async () => {
      await createUser({ email: 'test@example.com' });
      await expect(createUser({ email: 'test@example.com' }))
        .rejects.toThrow(/unique constraint/i);
    });

    it('should reject display name shorter than 3 chars', async () => {
      await expect(createUser({ displayName: 'AB' }))
        .rejects.toThrow(/validation/i);
    });
  });

  describe('trust score updates', () => {
    it('should update ability score within bounds', async () => {
      const user = await createUser();
      const updated = await updateTrustScore(user.id, { ability: 0.85 });
      expect(updated.trustScoreAbility).toBe(0.85);
    });

    it('should reject trust score above 1.0', async () => {
      const user = await createUser();
      await expect(updateTrustScore(user.id, { ability: 1.5 }))
        .rejects.toThrow(/out of range/i);
    });
  });
});
```

### State Machine Tests

Entities with state require explicit transition tests:

```typescript
describe('DiscussionTopic State Transitions', () => {
  it('seeding → active when diversity threshold met', async () => {
    const topic = await createTopic({ status: 'seeding', minimumDiversityScore: 0.3 });
    await addDiverseParticipants(topic.id, 5); // Raises diversity above threshold

    const updated = await attemptActivation(topic.id);
    expect(updated.status).toBe('active');
    expect(updated.activatedAt).toBeDefined();
  });

  it('seeding → active rejected when diversity below threshold', async () => {
    const topic = await createTopic({ status: 'seeding', minimumDiversityScore: 0.5 });
    await addSimilarParticipants(topic.id, 5); // Low diversity

    await expect(attemptActivation(topic.id))
      .rejects.toThrow(/DISCUSSION_003/); // Error code for diversity not met
  });

  it('active → archived after 90 days inactivity', async () => {
    const topic = await createTopic({ status: 'active' });
    await simulateTimePassage(91, 'days');

    await runArchivalJob();
    const updated = await getTopic(topic.id);
    expect(updated.status).toBe('archived');
  });
});
```

### JSONB Schema Validation

All JSONB fields require schema validation tests:

```typescript
describe('JSONB Field Validation', () => {
  describe('moral_foundation_profile', () => {
    it('should accept valid 6-foundation profile', async () => {
      const profile = { care: 0.8, fairness: 0.7, loyalty: 0.5, authority: 0.4, sanctity: 0.3, liberty: 0.6 };
      const user = await updateProfile(userId, { moralFoundationProfile: profile });
      expect(user.moralFoundationProfile).toEqual(profile);
    });

    it('should reject missing foundation', async () => {
      const profile = { care: 0.8, fairness: 0.7 }; // Missing 4 foundations
      await expect(updateProfile(userId, { moralFoundationProfile: profile }))
        .rejects.toThrow(/validation/i);
    });

    it('should reject foundation value out of range', async () => {
      const profile = { care: 1.5, fairness: 0.7, loyalty: 0.5, authority: 0.4, sanctity: 0.3, liberty: 0.6 };
      await expect(updateProfile(userId, { moralFoundationProfile: profile }))
        .rejects.toThrow(/out of range/i);
    });
  });
});
```

### Cross-Service Reference Tests

Integration tests for service boundaries:

```typescript
describe('Cross-Service References', () => {
  it('discussion-service should resolve user display names via API', async () => {
    const user = await userService.create({ displayName: 'Test User' });
    const response = await discussionService.createResponse({
      topicId,
      authorId: user.id,
      content: 'Test response',
    });

    const enriched = await discussionService.getResponseWithAuthor(response.id);
    expect(enriched.author.displayName).toBe('Test User');
  });

  it('should handle user-service unavailable gracefully', async () => {
    mockUserServiceUnavailable();

    const responses = await discussionService.getTopicResponses(topicId);
    expect(responses[0].author).toEqual({ id: authorId, displayName: 'Unknown User' });
  });
});
```

### Performance Test Assertions

Database query performance validation:

```typescript
describe('Query Performance', () => {
  beforeAll(async () => {
    // Seed large dataset for realistic performance testing
    await seedLargeDataset({ users: 10000, topics: 500, responsesPerTopic: 100 });
  });

  it('GET /discussions should complete within 100ms', async () => {
    const start = performance.now();
    await request(app).get('/discussions?limit=20');
    expect(performance.now() - start).toBeLessThan(100);
  });

  it('common ground analysis query should complete within 500ms', async () => {
    const start = performance.now();
    await discussionService.getCommonGroundAnalysis(largeTopicId);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('should use index for topic listing', async () => {
    const explain = await prisma.$queryRaw`
      EXPLAIN ANALYZE SELECT * FROM discussion_topic WHERE status = 'active' ORDER BY created_at DESC LIMIT 20
    `;
    expect(explain[0]['QUERY PLAN']).toContain('Index Scan');
  });
});
```
