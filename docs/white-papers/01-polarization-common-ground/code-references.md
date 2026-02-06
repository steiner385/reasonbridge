# Code References: Polarization Measurement and Common Ground Synthesis

This document provides detailed code citations for the implementations described in the white paper.

All code is licensed under Apache License 2.0 (SPDX-License-Identifier: Apache-2.0).

---

## 1. Gini Impurity-Based Polarization Measurement

**File:** `services/discussion-service/src/services/divergence-point.service.ts`

**Lines 191-203:** Polarization calculation using Gini impurity formula

```typescript
/**
 * Calculate polarization score
 *
 * Polarization is highest when viewpoints are evenly split (50/50)
 * and lowest when there's a large majority on one side
 *
 * @param supportPercentage - Support percentage (0-1)
 * @param opposePercentage - Oppose percentage (0-1)
 * @returns Polarization score (0-1)
 */
private calculatePolarization(supportPercentage: number, opposePercentage: number): number {
  // Use Gini impurity-like formula: 1 - sum(p_i^2)
  // This peaks at 0.5 when distribution is even
  const purity = supportPercentage ** 2 + opposePercentage ** 2;
  const impurity = 1 - purity;

  // Normalize to 0-1 range where 0.5 (even split) = 1.0 (max polarization)
  // Maximum impurity is 0.5 (when split is 50/50)
  const maxImpurity = 0.5;
  const normalizedPolarization = impurity / maxImpurity;

  return Math.round(normalizedPolarization * 100) / 100;
}
```

**Key insight:** Adapts Gini impurity from decision tree learning to viewpoint polarization. Unlike Shannon entropy which maximizes with uniform distribution across all categories, Gini impurity directly measures classification error rate, mapping intuitively to "disagreement likelihood."

---

## 2. Agreement Zone Identification

**File:** `services/ai-service/src/common-ground/common-ground.synthesizer.ts`

**Lines 146-182:** Identifying propositions with ≥70% consensus

```typescript
/**
 * Identify propositions with high agreement
 */
private identifyAgreementZones(propositions: PropositionWithAlignments[]): AgreementZone[] {
  const agreementZones: AgreementZone[] = [];

  for (const prop of propositions) {
    const totalAlignments = prop.supportCount + prop.opposeCount + prop.nuancedCount;

    // Skip propositions without sufficient participation
    if (totalAlignments < 3) {
      continue;
    }

    const agreementPercentage = this.calculateAgreementPercentage(
      prop.supportCount,
      prop.opposeCount,
      prop.nuancedCount,
    );

    // Check if this meets the agreement threshold
    if (agreementPercentage !== null && agreementPercentage >= this.AGREEMENT_THRESHOLD * 100) {
      // Extract supporting evidence from nuanced explanations
      const supportingEvidence = prop.alignments
        .filter((a) => (a.stance === 'SUPPORT' || a.stance === 'NUANCED') && a.nuanceExplanation)
        .map((a) => a.nuanceExplanation!)
        .slice(0, 3); // Take top 3 evidence points

      agreementZones.push({
        proposition: prop.statement,
        agreementPercentage,
        supportingEvidence,
        participantCount: prop.supportCount,
      });
    }
  }

  // Sort by agreement percentage (highest first)
  return agreementZones.sort((a, b) => b.agreementPercentage - a.agreementPercentage);
}
```

**Configuration:**

- `AGREEMENT_THRESHOLD = 0.70` (70% consensus required)
- Minimum 3 alignments per proposition to prevent spurious classifications

---

## 3. Misunderstanding Detection

**File:** `services/ai-service/src/common-ground/common-ground.synthesizer.ts`

**Lines 187-217:** Detecting semantic ambiguity via nuanced response patterns

```typescript
/**
 * Identify potential misunderstandings based on nuanced responses
 */
private identifyMisunderstandings(propositions: PropositionWithAlignments[]): Misunderstanding[] {
  const misunderstandings: Misunderstanding[] = [];

  for (const prop of propositions) {
    const totalAlignments = prop.supportCount + prop.opposeCount + prop.nuancedCount;

    // Skip propositions without sufficient participation
    if (totalAlignments < 3) {
      continue;
    }

    const nuancedPercentage = prop.nuancedCount / totalAlignments;

    // High nuanced count suggests participants see the issue differently
    if (nuancedPercentage >= this.NUANCE_THRESHOLD) {
      // Group nuanced explanations into interpretations
      const interpretations = this.groupInterpretations(prop.alignments);

      // Only include if we found distinct interpretations
      if (interpretations.length >= 2) {
        misunderstandings.push({
          topic: prop.statement,
          interpretations,
          clarification: `This proposition has ${prop.nuancedCount} nuanced responses, suggesting participants may interpret key terms differently. AI-powered semantic analysis will provide specific clarification.`,
        });
      }
    }
  }

  return misunderstandings;
}
```

**Configuration:**

- `NUANCE_THRESHOLD = 0.30` (30% nuanced responses triggers misunderstanding flag)
- Requires ≥2 distinct interpretation groups

**Lines 222-268:** Pattern-based interpretation grouping

```typescript
/**
 * Group alignments into distinct interpretations
 */
private groupInterpretations(
  alignments: PropositionWithAlignments['alignments'],
): Misunderstanding['interpretations'] {
  const nuancedAlignments = alignments.filter(
    (a) => a.stance === 'NUANCED' && a.nuanceExplanation,
  );

  // For pattern-based implementation, group by stance
  // AI enhancement will use semantic clustering
  const supportNuanced = nuancedAlignments.filter((a) =>
    a.nuanceExplanation?.toLowerCase().includes('support'),
  );
  const opposeNuanced = nuancedAlignments.filter((a) =>
    a.nuanceExplanation?.toLowerCase().includes('oppose'),
  );
  const contextNuanced = nuancedAlignments.filter(
    (a) =>
      a.nuanceExplanation &&
      !a.nuanceExplanation.toLowerCase().includes('support') &&
      !a.nuanceExplanation.toLowerCase().includes('oppose'),
  );

  const interpretations: Misunderstanding['interpretations'] = [];

  if (supportNuanced.length > 0) {
    interpretations.push({
      interpretation: 'Support with conditions or caveats',
      participantCount: supportNuanced.length,
    });
  }

  if (opposeNuanced.length > 0) {
    interpretations.push({
      interpretation: 'Opposition with exceptions',
      participantCount: opposeNuanced.length,
    });
  }

  if (contextNuanced.length > 0) {
    interpretations.push({
      interpretation: 'Context-dependent position',
      participantCount: contextNuanced.length,
    });
  }

  return interpretations;
}
```

**Note:** Current implementation uses simple pattern matching (searching for "support"/"oppose" keywords). Future enhancement will use AI-powered semantic embeddings for more sophisticated clustering.

---

## 4. Genuine Disagreement Classification

**File:** `services/ai-service/src/common-ground/common-ground.synthesizer.ts`

**Lines 273-334:** Identifying value-based conflicts (vs. misunderstandings)

```typescript
/**
 * Identify genuine disagreements (not based on misunderstanding)
 */
private identifyGenuineDisagreements(
  propositions: PropositionWithAlignments[],
): GenuineDisagreement[] {
  const genuineDisagreements: GenuineDisagreement[] = [];

  for (const prop of propositions) {
    const totalAlignments = prop.supportCount + prop.opposeCount + prop.nuancedCount;

    // Skip propositions without sufficient participation
    if (totalAlignments < 3) {
      continue;
    }

    const supportPercentage = prop.supportCount / totalAlignments;
    const opposePercentage = prop.opposeCount / totalAlignments;
    const nuancedPercentage = prop.nuancedCount / totalAlignments;

    // Genuine disagreement: significant support AND opposition, low nuance
    const hasSignificantSupport = supportPercentage >= 0.25;
    const hasSignificantOpposition = opposePercentage >= 0.25;
    const lowNuance = nuancedPercentage < this.NUANCE_THRESHOLD;

    if (hasSignificantSupport && hasSignificantOpposition && lowNuance) {
      const viewpoints: GenuineDisagreement['viewpoints'] = [];

      // Support viewpoint
      const supportReasons = prop.alignments
        .filter((a) => a.stance === 'SUPPORT' && a.nuanceExplanation)
        .map((a) => a.nuanceExplanation!)
        .slice(0, 2);

      if (supportReasons.length > 0 || prop.supportCount > 0) {
        viewpoints.push({
          position: 'Support',
          participantCount: prop.supportCount,
          reasoning: supportReasons.length > 0 ? supportReasons : ['Supports this proposition'],
        });
      }

      // Opposition viewpoint
      const opposeReasons = prop.alignments
        .filter((a) => a.stance === 'OPPOSE' && a.nuanceExplanation)
        .map((a) => a.nuanceExplanation!)
        .slice(0, 2);

      if (opposeReasons.length > 0 || prop.opposeCount > 0) {
        viewpoints.push({
          position: 'Oppose',
          participantCount: prop.opposeCount,
          reasoning: opposeReasons.length > 0 ? opposeReasons : ['Opposes this proposition'],
        });
      }

      genuineDisagreements.push({
        proposition: prop.statement,
        viewpoints,
        underlyingValues: [
          'Underlying values will be identified through AI-powered moral foundations analysis',
        ],
      });
    }
  }

  return genuineDisagreements;
}
```

**Criteria for genuine disagreement (all must be true):**

- `supportPercentage >= 0.25` (at least 25% support)
- `opposePercentage >= 0.25` (at least 25% oppose)
- `nuancedPercentage < 0.30` (less than 30% nuance)

**Key insight:** Low nuance indicates participants understand the proposition similarly but hold opposing values/priorities. This contrasts with misunderstandings where high nuance signals interpretive divergence.

---

## 5. Consensus Scoring Normalization

**File:** `services/discussion-service/src/alignments/alignment-aggregation.service.ts`

**Lines 59-80:** Asymmetric support/oppose scoring normalized to [0, 1] range

```typescript
/**
 * Calculate consensus score based on alignment distribution
 * Returns a decimal between 0.00 and 1.00 representing agreement level
 *
 * Formula:
 * - If no alignments: null (no consensus data)
 * - Otherwise: (support_count - oppose_count) / total_alignments
 *   Normalized to 0.00-1.00 range: ((score + 1) / 2)
 *
 * Examples:
 * - All support (10-0-0): score = 10/10 = 1.0, normalized = 1.00
 * - All oppose (0-10-0): score = -10/10 = -1.0, normalized = 0.00
 * - Balanced (5-5-0): score = 0/10 = 0.0, normalized = 0.50
 * - Mixed with nuanced (6-2-2): score = 4/10 = 0.4, normalized = 0.70
 */
private calculateConsensusScore(
  supportCount: number,
  opposeCount: number,
  nuancedCount: number,
): number | null {
  const totalAlignments = supportCount + opposeCount + nuancedCount;

  // No alignments = no consensus score
  if (totalAlignments === 0) {
    return null;
  }

  // Calculate raw score: (support - oppose) / total
  // This gives a value between -1 and 1
  const rawScore = (supportCount - opposeCount) / totalAlignments;

  // Normalize to 0.00-1.00 range
  const normalizedScore = (rawScore + 1) / 2;

  // Round to 2 decimal places (Prisma will convert to Decimal when storing)
  return Math.round(normalizedScore * 100) / 100;
}
```

**Mathematical properties:**

- **Raw score range:** [-1, 1]
  - +1 = unanimous support
  - -1 = unanimous opposition
  - 0 = balanced split
- **Normalized score range:** [0, 1]
  - 1.00 = full consensus (support)
  - 0.00 = full consensus (oppose)
  - 0.50 = no consensus (balanced)

**Advantage:** Enables cross-context comparison. A consensus score of 0.75 means the same thing whether comparing "climate policy" vs. "healthcare" topics.

---

## 6. Versioning and Caching Strategy

**File:** `services/ai-service/src/common-ground/common-ground.synthesizer.ts`

**Cache key generation pattern:**

```typescript
const cacheKey = `common_ground_${topicId}_${totalAlignments}`;
```

**Why alignment count as version:**

- Common ground evolves as participants add alignments
- Each new alignment potentially changes classification
- Cache invalidates automatically when count increments
- Enables temporal analysis by comparing versions

**Cache TTL:** 1 hour (Redis configuration)

**Cache invalidation trigger:** New alignment creation in discussion-service

---

## 7. Database Schema

**File:** `packages/db-models/prisma/schema.prisma`

**Relevant models:**

```prisma
model Proposition {
  id              String   @id @default(cuid())
  statement       String
  topicId         String
  supportCount    Int      @default(0)
  opposeCount     Int      @default(0)
  nuancedCount    Int      @default(0)
  consensusScore  Decimal? @db.Decimal(3, 2) // 0.00-1.00 range
  // ... other fields
}

model Alignment {
  id                 String   @id @default(cuid())
  userId             String
  propositionId      String
  stance             AlignmentStance // SUPPORT | OPPOSE | NUANCED
  nuanceExplanation  String?
  // ... other fields
}

enum AlignmentStance {
  SUPPORT
  OPPOSE
  NUANCED
}
```

**Key design decisions:**

- `consensusScore` stored as `Decimal(3,2)` - 3 digits total, 2 after decimal (e.g., 0.75)
- Aggregate counts denormalized for performance (updated via `alignment-aggregation.service.ts`)
- `nuanceExplanation` optional - only populated if user provides justification

---

## 8. Configuration Constants

**File:** `services/ai-service/src/common-ground/common-ground.synthesizer.ts`

```typescript
class CommonGroundSynthesizer {
  // Agreement threshold: 70% support required for agreement zone
  private readonly AGREEMENT_THRESHOLD = 0.7;

  // Nuance threshold: 30% nuanced responses triggers misunderstanding flag
  private readonly NUANCE_THRESHOLD = 0.3;

  // Minimum participation: 3 alignments required per proposition
  private readonly MIN_PARTICIPATION = 3;
}
```

**Rationale for thresholds:**

- **70% agreement:** High enough to indicate genuine consensus, low enough to be achievable
- **30% nuance:** Balances sensitivity (catching ambiguity) vs. specificity (avoiding false positives)
- **3 alignment minimum:** Prevents spurious classifications from low-n samples

**Future work:** Empirically optimize thresholds via A/B testing and longitudinal analysis.

---

## 9. API Endpoints

**Endpoint:** `GET /api/topics/:topicId/common-ground`

**Handler:** `services/api-gateway/src/routes/common-ground.controller.ts`

**Response schema:**

```typescript
interface CommonGroundSynthesis {
  topicId: string;
  generatedAt: Date;
  alignmentCount: number; // Version number
  agreementZones: AgreementZone[];
  misunderstandings: Misunderstanding[];
  genuineDisagreements: GenuineDisagreement[];
}

interface AgreementZone {
  proposition: string;
  agreementPercentage: number;
  supportingEvidence: string[];
  participantCount: number;
}

interface Misunderstanding {
  topic: string;
  interpretations: {
    interpretation: string;
    participantCount: number;
  }[];
  clarification: string;
}

interface GenuineDisagreement {
  proposition: string;
  viewpoints: {
    position: string;
    participantCount: number;
    reasoning: string[];
  }[];
  underlyingValues: string[];
}
```

---

## 10. Testing

**Unit tests:** `services/ai-service/src/common-ground/common-ground.synthesizer.spec.ts`

**Test cases:**

- Agreement zone identification with varying support percentages
- Misunderstanding detection with varying nuance percentages
- Genuine disagreement classification with balanced opposition
- Edge cases: 0 alignments, 1-2 alignments, all nuanced

**Integration tests:** `services/ai-service/test/integration/common-ground.integration.spec.ts`

**Test cases:**

- End-to-end common ground synthesis via API endpoint
- Cache hit/miss behavior
- Version increment on new alignments

---

## Repository Structure

```
reasonbridge/
├── services/
│   ├── discussion-service/
│   │   └── src/
│   │       ├── services/
│   │       │   └── divergence-point.service.ts       # Polarization measurement
│   │       └── alignments/
│   │           └── alignment-aggregation.service.ts  # Consensus scoring
│   └── ai-service/
│       └── src/
│           └── common-ground/
│               └── common-ground.synthesizer.ts      # Tri-modal taxonomy
├── packages/
│   └── db-models/
│       └── prisma/
│           └── schema.prisma                         # Database models
└── docs/
    └── white-papers/
        └── 01-polarization-common-ground/
            ├── paper.md                              # This white paper
            └── code-references.md                    # This document
```

---

## License

All code referenced in this document is licensed under the Apache License 2.0.

**SPDX-License-Identifier:** Apache-2.0

**Copyright:** 2025 Tony Stein

Full license text: https://www.apache.org/licenses/LICENSE-2.0
