# User Ranking & Tiered Access System Design

**Issue**: #781
**Date**: 2026-02-22
**Status**: Approved

## Overview

A gamification and ranking system that incentivizes constructive discourse while maintaining inclusivity. The system combines global platform trust with domain-specific expertise, allowing users to build credibility both broadly and within specific topic areas.

## Goals

1. **Incentivize Responsible Discussion**: Reward quality contributions and constructive behavior
2. **Tiered Access Controls**: Enable topic creators to set minimum requirements for participation
3. **Domain Expertise Recognition**: Distinguish expertise across different subject areas
4. **Credential Verification**: Allow users to prove domain qualifications
5. **Anti-Exclusion Design**: Transparent progression, multiple paths, appeals mechanisms

## Architecture Decision

**Approach: Scheduled Batch Recalculation**

Rankings are cached in database tables and recalculated via daily cron job (3 AM UTC). This approach:

- Provides fast reads (cached tier/score)
- Enables easy progress tracking (next tier threshold)
- Supports efficient leaderboards
- Follows industry patterns (Stack Overflow, Reddit)

Immediate recalculation triggers:

- Verification level change
- Account status change
- Credential verification

## Data Model

### New Tables

#### UserRank

Cached global ranking data per user.

| Field             | Type         | Description                                    |
| ----------------- | ------------ | ---------------------------------------------- |
| userId            | FK → User    | Unique per user                                |
| tierLevel         | Int (1-5)    | NEWCOMER, CONTRIBUTOR, TRUSTED, LEADER, EXPERT |
| compositeScore    | Decimal(4,3) | 0.000 - 1.000                                  |
| engagementScore   | Decimal(4,3) | Response count weighted by quality             |
| qualityScore      | Decimal(4,3) | AI feedback acceptance rate                    |
| tenureBonus       | Decimal(4,3) | Account age factor                             |
| badges            | JSON         | Array of earned badge IDs                      |
| lastCalculated    | DateTime     | Last recalculation timestamp                   |
| nextTierThreshold | Decimal(4,3) | Score needed for promotion                     |

#### TopicExpertise

Per-category expertise scores.

| Field           | Type               | Description                             |
| --------------- | ------------------ | --------------------------------------- |
| userId          | FK → User          |                                         |
| categoryId      | FK → TopicCategory |                                         |
| expertiseScore  | Decimal(4,3)       | 0.000 - 1.000                           |
| expertiseLevel  | Enum               | NOVICE, FAMILIAR, KNOWLEDGEABLE, EXPERT |
| responseCount   | Int                | Responses in this category              |
| avgQualityScore | Decimal(4,3)       | AI feedback avg in category             |
| credentialBoost | Decimal(4,3)       | Sum of verified credential boosts       |
| lastActive      | DateTime           | Last activity in category               |

#### DomainCredential

User-submitted credentials with verification.

| Field           | Type               | Description                                        |
| --------------- | ------------------ | -------------------------------------------------- |
| userId          | FK → User          |                                                    |
| categoryId      | FK → TopicCategory |                                                    |
| type            | Enum               | ACADEMIC, PROFESSIONAL, PUBLICATION, CERTIFICATION |
| title           | String             | "PhD in Clinical Psychology"                       |
| institution     | String             | "Stanford University"                              |
| documentUrl     | String?            | Uploaded proof                                     |
| verificationUrl | String?            | External verification link                         |
| status          | Enum               | PENDING, VERIFIED, REJECTED                        |
| reviewedBy      | FK → User?         | Admin who reviewed                                 |
| reviewNotes     | Text?              | Admin notes                                        |
| verifiedAt      | DateTime?          |                                                    |
| expiresAt       | DateTime?          | For time-limited certs                             |
| boostValue      | Decimal(3,2)       | Expertise score boost when verified                |

#### TierAppeal

Appeals for tier decisions.

| Field          | Type                | Description                    |
| -------------- | ------------------- | ------------------------------ |
| userId         | FK → User           |                                |
| appealType     | Enum                | GLOBAL_TIER, DOMAIN_EXPERTISE  |
| categoryId     | FK → TopicCategory? | For domain appeals             |
| requestedLevel | Int                 | Requested tier/expertise level |
| reason         | Text                | User's justification           |
| status         | Enum                | PENDING, APPROVED, DENIED      |
| reviewedBy     | FK → User?          |                                |
| reviewNotes    | Text?               |                                |
| createdAt      | DateTime            |                                |
| resolvedAt     | DateTime?           |                                |

#### ProvisionalAccess

Temporary access to tier-restricted topics.

| Field     | Type       | Description              |
| --------- | ---------- | ------------------------ |
| userId    | FK → User  |                          |
| topicId   | FK → Topic |                          |
| grantedBy | FK → User  | Topic creator or mentor  |
| reason    | String?    | Why access was granted   |
| expiresAt | DateTime   | Default 30 days          |
| status    | Enum       | ACTIVE, EXPIRED, REVOKED |

### Modified Tables

#### Topic

```diff
+ minimumTierLevel        Int?      // null = open to all
+ minimumExpertiseLevel   Int?      // null = no expertise required
+ requiredCategoryId      FK?       // which category expertise is required
+ allowProvisionalAccess  Boolean   // default true
```

#### User

```diff
+ canMentor    Boolean   // default false, granted at TRUSTED+
```

## Global Tier System

### Tier Definitions

| Tier        | Level | Score Range | Unlocks                  |
| ----------- | ----- | ----------- | ------------------------ |
| Newcomer    | 1     | 0.00 - 0.19 | Basic participation      |
| Contributor | 2     | 0.20 - 0.39 | Topic creation           |
| Trusted     | 3     | 0.40 - 0.59 | Mentoring capability     |
| Leader      | 4     | 0.60 - 0.79 | Moderation assistance    |
| Expert      | 5     | 0.80 - 1.00 | Full platform privileges |

### Composite Score Formula

```
compositeScore =
    (trustAverage × 0.40) +
    (verificationWeight × 0.20) +
    (engagementScore × 0.20) +
    (qualityScore × 0.15) +
    (tenureBonus × 0.05)
```

#### Component Calculations

| Component          | Formula                                            |
| ------------------ | -------------------------------------------------- |
| trustAverage       | (ability + benevolence + integrity) / 3            |
| verificationWeight | BASIC: 0.2, ENHANCED: 0.6, VERIFIED_HUMAN: 1.0     |
| engagementScore    | min(1.0, responseCount / 100) × avgResponseQuality |
| qualityScore       | feedbackAcceptanceRate × (1 - flaggedResponseRate) |
| tenureBonus        | min(1.0, accountAgeDays / 365)                     |

### Rank Decay

- Inactive users (no responses in 30 days): -0.01/month to compositeScore
- Minimum score: 0.00 (cannot go negative)
- Activity resets decay timer

## Domain Expertise System

### Expertise Levels

| Level         | Score Range | Meaning                          |
| ------------- | ----------- | -------------------------------- |
| Novice        | 0.00 - 0.24 | New to this domain               |
| Familiar      | 0.25 - 0.49 | Some knowledge/engagement        |
| Knowledgeable | 0.50 - 0.74 | Consistent quality contributions |
| Expert        | 0.75 - 1.00 | Recognized domain authority      |

### Expertise Score Formula

```
expertiseScore =
    (categoryEngagement × 0.40) +
    (categoryQuality × 0.30) +
    (credentialBoost × 0.20) +
    (categoryTenure × 0.10)
```

| Component          | Formula                                           |
| ------------------ | ------------------------------------------------- |
| categoryEngagement | min(1.0, categoryResponseCount / 50)              |
| categoryQuality    | avgQualityScore in category                       |
| credentialBoost    | sum of verified credential boosts (capped at 1.0) |
| categoryTenure     | min(1.0, daysSinceFirstCategoryResponse / 180)    |

## Credentials System

### Credential Types

| Type                      | Examples                    | Boost Value            |
| ------------------------- | --------------------------- | ---------------------- |
| Academic - Doctorate      | PhD, MD, JD                 | +0.30                  |
| Academic - Master's       | MA, MS, MBA                 | +0.20                  |
| Academic - Bachelor's     | BA, BS                      | +0.10                  |
| Professional License      | Medical, Legal, Engineering | +0.25                  |
| Industry Certification    | AWS, PMP, CPA               | +0.15                  |
| Peer-reviewed Publication | Journal article, book       | +0.10 each (max +0.30) |

### Verification Workflow

1. User submits credential with proof (document upload or verification URL)
2. System attempts auto-validation:
   - DOI lookup for publications
   - LinkedIn API for employment (if connected)
   - Certificate verification services
3. Unverified credentials enter PENDING queue
4. Admin reviews documentation and approves/rejects
5. On approval: credential boost applied, expertise recalculated
6. Credentials displayed on user profile with "Verified" badge

### Credential Expiration

- Time-limited certifications (AWS, PMP) require renewal
- System sends reminder 30 days before expiration
- Expired credentials: boost removed, status changed to EXPIRED

## Topic Access Control

### Access Check Logic

```typescript
function canParticipate(user: User, topic: Topic): boolean {
  // Check global tier
  if (topic.minimumTierLevel && user.rank.tierLevel < topic.minimumTierLevel) {
    return hasProvisionalAccess(user, topic);
  }

  // Check domain expertise
  if (topic.minimumExpertiseLevel && topic.requiredCategoryId) {
    const expertise = getUserExpertise(user, topic.requiredCategoryId);
    if (expertise.expertiseLevel < topic.minimumExpertiseLevel) {
      return hasProvisionalAccess(user, topic);
    }
  }

  return true;
}
```

### Access Modes

| Mode                 | Behavior                          |
| -------------------- | --------------------------------- |
| Open (default)       | All users can participate         |
| Tier-restricted      | Requires minimum global tier      |
| Expertise-restricted | Requires minimum domain expertise |
| Combined             | Requires both tier AND expertise  |

### Provisional Access

- Lower-tier users see "Request Access" button
- Topic creator receives notification
- Creator can approve (grants 30-day access) or deny
- TRUSTED+ users can sponsor access (mentor system)
- Provisional users marked with indicator in topic

## Anti-Exclusion Safeguards

### Multiple Progression Paths

| Path         | Strategy                           |
| ------------ | ---------------------------------- |
| Quality      | High AI feedback scores, few flags |
| Engagement   | Consistent participation over time |
| Verification | Complete identity verification     |
| Credentials  | Submit verified qualifications     |
| Tenure       | Account age rewards patience       |

### Appeals Process

1. User submits appeal (1 per 30 days limit)
2. Selects appeal type: Global Tier or Domain Expertise
3. Provides justification
4. Appeal enters admin queue
5. Admin reviews history, patterns, contributions
6. Resolution: Approve (manual tier bump) or Deny (with explanation)
7. User notified via email and in-app

### Diversity Monitoring (Admin Dashboard)

| Metric                     | Alert Threshold  | Action                          |
| -------------------------- | ---------------- | ------------------------------- |
| % stuck at Tier 1 >90 days | >30%             | Review progression requirements |
| Tier distribution skew     | >60% in Tier 1-2 | Adjust thresholds               |
| Appeal approval rate       | <20% or >80%     | Calibrate criteria              |
| Avg time to Tier 2         | >60 days         | Lower entry barriers            |
| Credential rejection rate  | >50%             | Review verification process     |

### Anti-Gaming Measures

| Measure                    | Implementation                                     |
| -------------------------- | -------------------------------------------------- |
| Response rate limit        | Max 20 responses/day                               |
| Quality weighting          | 1 high-quality = 10 low-quality responses          |
| Flag penalties             | Flagged responses reduce qualityScore              |
| Suspicious jump detection  | >1 tier jump in 7 days triggers review             |
| Credential fraud detection | Document hash comparison, institution verification |

## API Endpoints

### User Ranking

| Method | Endpoint                           | Description                      |
| ------ | ---------------------------------- | -------------------------------- |
| GET    | `/users/:id/ranking`               | Get user's global tier and score |
| GET    | `/users/me/ranking/breakdown`      | Detailed score breakdown         |
| GET    | `/users/:id/expertise`             | Get all domain expertise         |
| GET    | `/users/:id/expertise/:categoryId` | Get expertise in category        |
| GET    | `/users/leaderboard`               | Top 50 by composite score        |
| GET    | `/users/leaderboard/:categoryId`   | Top experts in category          |

### Credentials

| Method | Endpoint                        | Description           |
| ------ | ------------------------------- | --------------------- |
| POST   | `/credentials`                  | Submit new credential |
| GET    | `/credentials/me`               | List my credentials   |
| DELETE | `/credentials/:id`              | Remove credential     |
| GET    | `/admin/credentials/pending`    | Pending verifications |
| POST   | `/admin/credentials/:id/verify` | Approve credential    |
| POST   | `/admin/credentials/:id/reject` | Reject credential     |

### Topic Access

| Method | Endpoint                                      | Description                |
| ------ | --------------------------------------------- | -------------------------- |
| POST   | `/topics/:id/request-access`                  | Request provisional access |
| GET    | `/topics/:id/access-requests`                 | List pending requests      |
| POST   | `/topics/:id/access-requests/:userId/approve` | Approve access             |
| POST   | `/topics/:id/access-requests/:userId/deny`    | Deny access                |

### Appeals

| Method | Endpoint                     | Description         |
| ------ | ---------------------------- | ------------------- |
| POST   | `/appeals`                   | Submit tier appeal  |
| GET    | `/appeals/me`                | My appeal status    |
| GET    | `/admin/appeals`             | All pending appeals |
| POST   | `/admin/appeals/:id/resolve` | Resolve appeal      |

### Admin

| Method | Endpoint                     | Description          |
| ------ | ---------------------------- | -------------------- |
| GET    | `/admin/ranking/analytics`   | Dashboard metrics    |
| POST   | `/admin/ranking/recalculate` | Trigger full recalc  |
| POST   | `/admin/users/:id/set-tier`  | Manual tier override |

## Frontend Components

### User-Facing

| Component             | Location              | Purpose                            |
| --------------------- | --------------------- | ---------------------------------- |
| TierBadge             | Avatars, posts        | Display global tier (icon + color) |
| ExpertiseBadge        | Topic responses       | Show domain expertise level        |
| CredentialBadge       | Profile, posts        | "PhD Psychology (Verified)"        |
| TierProgressCard      | Dashboard             | Progress to next tier              |
| ExpertiseProgressCard | Dashboard             | Progress in each domain            |
| RankingDashboard      | /settings/ranking     | Full breakdown, badges, history    |
| CredentialManager     | /settings/credentials | Submit/manage credentials          |

### Topic Creator

| Component                    | Location       | Purpose                |
| ---------------------------- | -------------- | ---------------------- |
| TierRestrictionSelector      | Topic form     | Set minimum tier       |
| ExpertiseRestrictionSelector | Topic form     | Set minimum expertise  |
| AccessRequestsList           | Topic settings | Manage access requests |

### Participant

| Component          | Location          | Purpose                            |
| ------------------ | ----------------- | ---------------------------------- |
| TierGateBanner     | Restricted topics | Explain restriction, offer request |
| RequestAccessModal | Topics            | Submit access request              |

### Admin

| Component             | Location        | Purpose                 |
| --------------------- | --------------- | ----------------------- |
| RankingAnalytics      | Admin dashboard | Metrics, alerts, trends |
| CredentialReviewQueue | Admin dashboard | Verify credentials      |
| AppealReviewQueue     | Admin dashboard | Handle appeals          |
| UserTierEditor        | User admin      | Manual tier adjustment  |

## Implementation Phases

### Phase 1: Foundation

- Database schema (UserRank, TopicExpertise, migrations)
- RankingCalculator service
- Daily cron job infrastructure
- Basic API endpoints

### Phase 2: Global Tiers

- Tier calculation and assignment
- TierBadge component
- TierProgressCard component
- Tier-based topic restrictions

### Phase 3: Domain Expertise

- TopicExpertise tracking
- ExpertiseBadge component
- Per-category leaderboards
- Expertise-based topic restrictions

### Phase 4: Credentials

- DomainCredential model
- Credential submission flow
- Admin verification queue
- Credential badges

### Phase 5: Access Control

- ProvisionalAccess system
- Request/approve workflow
- Mentor sponsorship
- TierGateBanner component

### Phase 6: Anti-Exclusion

- Appeals system
- Diversity monitoring dashboard
- Anti-gaming measures
- Alert system

### Phase 7: Polish

- RankingDashboard (full page)
- Gamification (badge collection, achievements)
- Notification system integration
- Mobile optimization

## Success Metrics

| Metric                     | Target                                  |
| -------------------------- | --------------------------------------- |
| User progression rate      | >50% reach Tier 2 within 30 days        |
| Tier distribution          | Bell curve (most in Tier 2-3)           |
| Credential submission rate | >10% of active users                    |
| Appeal volume              | <5% of users per month                  |
| Restricted topic usage     | >20% of topics use tier/expertise gates |
