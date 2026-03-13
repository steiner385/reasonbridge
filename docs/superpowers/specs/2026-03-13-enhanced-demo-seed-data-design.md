# Enhanced Demo Seed Data Design

**Date**: 2026-03-13
**Status**: Approved
**Author**: Claude (via brainstorming session)

## Overview

This document specifies the design for comprehensive demo seed data that represents a mature, active community. The seed data will enable realistic development, testing, and demonstration of the reasonBridge platform.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scale | Large (200 users, 300 topics, ~10K responses) | Representative production load |
| Activity distribution | Power law (10% users = 60% content) | Matches real community dynamics |
| Time span | 6 months | Established community feel |
| Content generation | AI-generated at seed time | Natural, varied content |
| Topic coverage | 15 categories (5 new) | Broader demonstration capability |
| Rankings | Fully calculated from activity | Authentic, verifiable metrics |

---

## Section 1: Data Architecture Overview

### Scale Targets

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 200 | 20 power users, 60 regular, 120 casual |
| Topics | 300 | 20 per category across 15 categories |
| Discussions | 600 | ~2 per topic average |
| Responses | 10,000 | Concentrated in active topics |
| Propositions | 2,000 | ~3-4 per active discussion |
| Votes | 30,000 | On responses and propositions |
| Alignments | 5,000 | Moral foundation annotations |
| Reactions | 15,000 | Emoji reactions |
| Bookmarks | 3,000 | User saved items |
| Connections | 1,500 | User-to-user relationships |

### Entity Relationships

```
User (200)
  ├── creates → Topics (300)
  ├── starts → Discussions (600)
  ├── posts → Responses (10,000)
  │     ├── receives → Votes (30,000)
  │     ├── receives → Reactions (15,000)
  │     └── contains → Propositions (2,000)
  │           └── has → Alignments (5,000)
  ├── has → TopicExpertise (per category)
  ├── has → Connections (1,500)
  └── has → Bookmarks (3,000)
```

### Generation Order (Dependency Chain)

1. **Users** (no dependencies)
2. **Categories** (static, pre-defined)
3. **Topics** (depends on: users, categories)
4. **Discussions** (depends on: users, topics)
5. **Responses** (depends on: users, discussions)
6. **Propositions** (depends on: responses)
7. **Votes** (depends on: users, responses, propositions)
8. **Alignments** (depends on: users, propositions)
9. **Reactions** (depends on: users, responses)
10. **Bookmarks** (depends on: users, topics, discussions)
11. **Connections** (depends on: users)
12. **Rankings/Trust Scores** (calculated from all above)

---

## Section 2: User Persona Generation

### Activity Tiers (Power Law Distribution)

| Tier | Count | Activity Level | Content Share |
|------|-------|----------------|---------------|
| Power Users | 20 (10%) | 50-200 responses each | ~60% of content |
| Regular Users | 60 (30%) | 10-50 responses each | ~30% of content |
| Casual Users | 120 (60%) | 1-10 responses each | ~10% of content |

### Persona Attributes

Each user profile includes:

```typescript
interface UserPersona {
  // Identity
  displayName: string;      // AI-generated realistic name
  bio: string;              // 1-2 sentence background
  avatarSeed: string;       // For deterministic avatar generation

  // Behavioral traits (for content generation)
  writingStyle: 'formal' | 'conversational' | 'academic' | 'passionate';
  argumentationStyle: 'evidence-based' | 'principle-driven' | 'pragmatic';
  topicInterests: string[]; // 2-4 category preferences

  // Activity parameters
  activityTier: 'power' | 'regular' | 'casual';
  registrationOffset: number; // Days before "now" (0-180)
  activityPattern: 'consistent' | 'burst' | 'declining' | 'growing';
}
```

### Diversity Requirements

- **Geographic diversity**: Names reflecting multiple cultural backgrounds
- **Viewpoint diversity**: Varied political/philosophical leanings
- **Expertise diversity**: Different professional backgrounds
- **Age simulation**: Activity patterns suggesting different life stages

### Generation Approach

1. Generate 200 persona templates using Claude API with diversity constraints
2. Store personas in `corpus/users.json` for deterministic re-seeding
3. Each persona includes behavioral traits that guide content generation
4. Registration dates spread across 6 months with realistic signup patterns

---

## Section 3: Topic & Category Generation

### Category Structure (15 Categories)

**Existing (10):**
1. Technology & Innovation
2. Environment & Climate
3. Healthcare & Medicine
4. Education & Learning
5. Economics & Business
6. Politics & Governance
7. Science & Research
8. Ethics & Society
9. Law & Justice
10. Media & Communication

**New (5):**
11. Arts & Culture
12. International Relations
13. Philosophy & Logic
14. Personal Finance
15. Sports & Recreation

### Topics Per Category

Each category contains 20 topics:
- 5 **Evergreen** topics (timeless debates)
- 10 **Current** topics (recent developments)
- 5 **Emerging** topics (forward-looking questions)

### Topic Generation Template

```typescript
interface TopicSpec {
  title: string;           // Concise, debatable framing
  description: string;     // 2-3 paragraph context
  category: string;
  topicType: 'evergreen' | 'current' | 'emerging';
  controversyLevel: 1-5;   // Affects response diversity
  technicalDepth: 1-5;     // Affects expertise requirements
  suggestedTags: string[]; // 3-5 relevant tags
}
```

### Content Quality Standards

- Titles framed as debatable questions or positions
- Descriptions provide neutral context without bias
- Each topic supports multiple legitimate viewpoints
- Technical topics include appropriate terminology
- Tags enable cross-category discovery

---

## Section 4: Conversation Generation

### Discussion Distribution

Per topic (300 topics total → 600 discussions):
- **High-engagement topics** (60): 3-4 discussions each
- **Medium-engagement topics** (120): 2 discussions each
- **Low-engagement topics** (120): 1 discussion each

### Response Threading Model

```
Discussion
├── Root Response (thesis/opening statement)
│   ├── Agreement Response
│   │   └── Elaboration
│   ├── Disagreement Response
│   │   ├── Counter-argument
│   │   └── Evidence Challenge
│   └── Question Response
│       └── Clarification
├── Alternative Perspective Response
│   └── Support with Evidence
└── Synthesis Response (later in timeline)
```

### Response Generation Parameters

```typescript
interface ResponseGenContext {
  discussion: Discussion;
  parentResponse?: Response;     // For threading
  authorPersona: UserPersona;    // Writing style, viewpoint
  responseType: 'thesis' | 'agreement' | 'disagreement' | 'question' | 'synthesis' | 'evidence';
  timestamp: Date;               // For temporal consistency
  targetLength: 'short' | 'medium' | 'long';  // 50/150/300 words
}
```

### Temporal Distribution

Responses spread across 6 months with:
- Initial burst after topic creation (first 48 hours)
- Gradual decay with occasional revival spikes
- Recent activity within last 2 weeks for "active" feel

### Content Quality Rules

1. Responses reference parent context appropriately
2. Evidence-based responses cite plausible sources
3. Disagreements remain respectful and substantive
4. No strawmanning or ad hominem patterns
5. Synthesis responses appear later in thread timeline

---

## Section 5: Propositions, Alignments & AI Features

### Proposition Extraction

**Distribution**: ~2,000 propositions across 600 discussions
- Substantive responses (>100 words) → 1-2 propositions each
- Shorter responses → 0-1 propositions

**Proposition Types**:
```typescript
type PropositionType =
  | 'claim'           // Factual assertion
  | 'value'           // Normative statement
  | 'policy'          // Action recommendation
  | 'definition'      // Conceptual framing
  | 'causal'          // Cause-effect relationship
```

### Moral Foundation Alignments

**Distribution**: ~5,000 alignments (2-3 per proposition average)

**Foundation Mapping**:
| Foundation | Description | Example Signal |
|------------|-------------|----------------|
| Care/Harm | Concern for suffering | "vulnerable populations" |
| Fairness/Cheating | Justice, rights | "equal treatment" |
| Loyalty/Betrayal | Group cohesion | "our community" |
| Authority/Subversion | Tradition, order | "established process" |
| Sanctity/Degradation | Purity, disgust | "corrupting influence" |
| Liberty/Oppression | Freedom, autonomy | "personal choice" |

**Alignment Scores**: 0.0-1.0 indicating strength of foundation presence

### AI-Generated Features

**Pre-computed at Seed Time**:

1. **Bias Detection Scores**
   - Per-response analysis
   - Types: confirmation, selection, framing, anchoring
   - Score: 0.0-1.0 severity

2. **Common Ground Summaries**
   - Per-discussion analysis
   - Identifies shared premises across disagreeing parties
   - 2-3 bullet points of convergence

3. **Argument Quality Metrics**
   - Evidence strength: 1-5
   - Logical coherence: 1-5
   - Source diversity: count of distinct sources

### Generation Approach

Propositions and alignments extracted during response generation:
```
Generate Response → Extract Propositions → Analyze Alignments → Score Biases
```

All AI features cached in corpus for instant re-seeding.

---

## Section 6: Ranking Calculation

### Trust Score Components

**Formula**: `TrustScore = (Ability × 0.4) + (Benevolence × 0.3) + (Integrity × 0.3)`

#### Ability Score (0-100)
```typescript
ability = weightedSum([
  { metric: 'upvoteRatio', weight: 0.3 },        // Upvotes / total votes
  { metric: 'propositionAcceptance', weight: 0.25 }, // Propositions marked valid
  { metric: 'responseDepth', weight: 0.2 },      // Avg threading depth
  { metric: 'evidenceUsage', weight: 0.15 },     // % responses with citations
  { metric: 'topicDiversity', weight: 0.1 },     // Categories participated in
]);
```

#### Benevolence Score (0-100)
```typescript
benevolence = weightedSum([
  { metric: 'helpfulReactions', weight: 0.35 },  // Helpful/insightful reactions received
  { metric: 'questionResponses', weight: 0.25 }, // Answers to others' questions
  { metric: 'synthesisContributions', weight: 0.25 }, // Bridge-building responses
  { metric: 'reportAccuracy', weight: 0.15 },    // Valid moderation reports
]);
```

#### Integrity Score (0-100)
```typescript
integrity = weightedSum([
  { metric: 'consistencyScore', weight: 0.3 },   // Position consistency over time
  { metric: 'sourceQuality', weight: 0.25 },     // Cited source credibility
  { metric: 'admittedErrors', weight: 0.2 },     // Self-corrections
  { metric: 'moderationRecord', weight: 0.25 }, // Absence of violations
]);
```

### User Rank Tiers

| Rank | Trust Range | Count Target | Requirements |
|------|-------------|--------------|--------------|
| EXPERT | 85-100 | 10 users | Top performers |
| ESTABLISHED | 70-84 | 30 users | Consistent contributors |
| MEMBER | 50-69 | 60 users | Regular participants |
| NEWCOMER | 0-49 | 100 users | Recent/casual users |

### Topic Expertise Levels

Per-category expertise based on category-specific activity:

| Level | Requirements |
|-------|--------------|
| EXPERT | 50+ responses, 80%+ positive reception |
| PROFICIENT | 20-49 responses, 70%+ positive |
| FAMILIAR | 5-19 responses in category |
| NOVICE | <5 responses in category |

### Badge Derivation

Badges calculated from activity thresholds:

| Badge | Criteria |
|-------|----------|
| First Post | 1+ response |
| Contributor | 10+ responses |
| Prolific | 50+ responses |
| Bridge Builder | 10+ synthesis responses |
| Evidence Champion | 20+ evidence-backed responses |
| Category Expert | EXPERT level in any category |

### Calculation Order

1. Aggregate raw activity metrics per user
2. Calculate component scores (Ability, Benevolence, Integrity)
3. Compute trust scores
4. Assign rank tiers based on trust thresholds
5. Calculate topic expertise per category
6. Derive badges from activity thresholds
7. Update user records with all computed values

---

## Section 7: Technical Implementation

### File Structure

```
packages/db-models/prisma/seed/
├── index.ts                    # Main orchestrator
├── generators/
│   ├── user-generator.ts       # Persona generation
│   ├── topic-generator.ts      # Topic/discussion generation
│   ├── response-generator.ts   # Threaded response generation
│   ├── engagement-generator.ts # Votes, reactions, bookmarks
│   └── ai-client.ts            # Claude API wrapper
├── calculators/
│   ├── trust-score-calculator.ts
│   ├── ranking-calculator.ts
│   ├── expertise-calculator.ts
│   └── badge-calculator.ts
├── corpus/                     # Generated content cache
│   ├── users.json
│   ├── topics.json
│   ├── discussions.json
│   ├── responses.json
│   └── manifest.json           # Version, generation date
└── config/
    ├── categories.ts           # Category definitions
    ├── badges.ts               # Badge criteria
    └── distribution.ts         # Power law parameters
```

### Seeding Modes

```bash
# Full generation (requires ANTHROPIC_API_KEY)
pnpm seed:demo --generate

# Use cached corpus (instant, no API calls)
pnpm seed:demo

# Partial regeneration
pnpm seed:demo --regenerate=responses
```

### Performance Targets

| Metric | Target |
|--------|--------|
| Full generation time | <30 minutes |
| Cached seed time | <60 seconds |
| Database operations | Batched (100 per transaction) |
| Memory usage | <500MB peak |

### ID Generation Strategy

Deterministic UUIDs for demo data:
```typescript
function generateDemoId(type: string, index: number): string {
  return uuidv5(`demo:${type}:${index}`, DEMO_NAMESPACE);
}
// Example: generateDemoId('user', 42) → always same UUID
```

Benefits:
- Re-seeding produces identical IDs
- E2E tests can reference known IDs
- Foreign key relationships preserved

### Error Handling

- AI generation failures: Retry 3x with exponential backoff
- Partial failures: Save checkpoint, resume from last success
- Validation: Schema checks before database insert
- Rollback: Transaction per entity type for clean recovery

### Environment Variables

```bash
# Required for generation mode
ANTHROPIC_API_KEY=sk-ant-...

# Optional configuration
DEMO_SEED_SCALE=large          # small|medium|large
DEMO_SEED_SKIP_AI=false        # Use cached AI responses
DEMO_SEED_VERBOSE=true         # Detailed logging
```

---

## Success Criteria

1. **Scale**: 200 users, 300 topics, ~10,000 responses seeded successfully
2. **Realism**: Activity distribution follows power law pattern
3. **Performance**: Cached re-seeding completes in <60 seconds
4. **Integrity**: All foreign key relationships valid
5. **Calculations**: Rankings, trust scores, badges derived from actual activity
6. **Reproducibility**: Same corpus produces identical database state

---

## Next Steps

1. Create implementation plan via writing-plans skill
2. Implement generators in dependency order
3. Build calculators for rankings and badges
4. Create corpus caching mechanism
5. Update E2E tests to use seeded demo data
6. Document usage in CLAUDE.md
