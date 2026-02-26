# Child-Friendly Mode with Regional Compliance Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable safe participation for minor users while maintaining compliance with COPPA, GDPR Article 8, AADC, and Australia's Online Safety Act.

**Architecture:** Extend existing user-service, moderation-service, and notification-service with child safety features. No new microservices. Phased rollout: compliance first, then content safety, then UX, then privacy enhancements.

**Tech Stack:** NestJS services, Prisma ORM, React frontend with context-based UI switching, AWS SES for emails, existing Bedrock/Perspective API for content analysis.

---

## 1. Architecture Overview

### Service Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
└─────────────────────────────────────────────────────────────────┘
        │              │                │              │
        ▼              ▼                ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ user-service │ │ moderation-  │ │ discussion-  │ │ notification-│
│              │ │ service      │ │ service      │ │ service      │
│ • Age verify │ │ • Child queue│ │ • Mature     │ │ • Parent     │
│ • Parental   │ │ • Manual     │ │   content    │ │   alerts     │
│   consent    │ │   review     │ │   filter     │ │ • Safety     │
│ • Compliance │ │ • Grooming   │ │ • Child-safe │ │   reports    │
│   engine     │ │   detection  │ │   topics     │ │ • Digest     │
│ • Parent     │ │ • Panic      │ │              │ │   emails     │
│   dashboard  │ │   reports    │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Design Decisions

1. **No new microservices** — Extend existing services to minimize operational complexity
2. **Compliance logic in user-service** — Already has age/consent code; add regional rules engine
3. **Child moderation in moderation-service** — Leverage existing queue patterns
4. **Event-driven parent notifications** — Use existing notification-service + SQS patterns

### Existing Infrastructure to Leverage

The codebase already has:

- `birthDate`, `isMinor`, `regionalConsentAge`, `parentEmail`, `parentConsentStatus` fields on User
- `ComplianceService`, `AgeVerificationService`, `ParentalConsentService` services
- `ConsentRequiredRoute` frontend guard
- `isMatureContent` flag on topics with age-based filtering

---

## 2. Phase 1: Core Compliance

### 2.1 Regional Compliance Engine Enhancements

Enhance `ComplianceService` with full regional rules:

```typescript
interface RegionalComplianceRules {
  consentAge: number;
  allowsDirectMessaging: boolean;
  allowsProfileVisibility: boolean;
  requiresManualModeration: boolean;
  dataRetentionDays: number;
  privacyPolicyUrl: string;
  regulationName: 'COPPA' | 'GDPR' | 'AADC' | 'OSA';
}
```

Regional rules:

- **US (COPPA):** consentAge=13, no DMs, no profile visibility to adults
- **UK (AADC):** consentAge=13, manual moderation required, high privacy defaults
- **EU (GDPR):** consentAge=16 (with member state overrides: Belgium=13, Spain=14, etc.)
- **AU (OSA):** consentAge=13, enhanced duty of care

### 2.2 Audit Logging

New `ComplianceAuditLog` model:

```prisma
model ComplianceAuditLog {
  id          String   @id @default(uuid())
  userId      String
  action      String   // AGE_VERIFIED, CONSENT_REQUESTED, CONSENT_VERIFIED, CONSENT_WITHDRAWN, DATA_DELETION_REQUESTED
  metadata    Json     // { region, consentAge, ipAddress, userAgent }
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([action, timestamp])
}
```

### 2.3 Age Re-verification

- Add `lastAgeVerifiedAt` field to User
- Background job checks users where `lastAgeVerifiedAt` > 365 days
- On next login, show age confirmation modal
- Detects age-spoofing over time

### 2.4 Parental Consent Completion

Gaps to fill:

- Parent consent page needs age-appropriate privacy policy display
- Consent withdrawal must trigger 48-hour data deletion
- Weekly activity digest email not implemented

---

## 3. Phase 2: Content Safety

### 3.1 Child Content Review Queue

New `ChildContentReviewQueue` model:

```prisma
model ChildContentReviewQueue {
  id              String            @id @default(uuid())
  responseId      String            @unique
  topicId         String
  authorId        String
  content         String
  status          ChildReviewStatus @default(PENDING)
  priority        ReviewPriority    @default(NORMAL)
  aiFlags         Json?
  reviewedById    String?
  reviewedAt      DateTime?
  decision        String?
  rejectionReason String?
  createdAt       DateTime          @default(now())

  @@index([status, priority, createdAt])
  @@index([topicId])
}

enum ChildReviewStatus {
  PENDING
  IN_REVIEW
  APPROVED
  REJECTED
  ESCALATED
}

enum ReviewPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 3.2 Automatic Queue Routing

In discussion-service, when a response is created:

1. Check if `topic.isMatureContent = false` (child-accessible)
2. Check if any child users are participants in the topic
3. If either true → route to `ChildContentReviewQueue`
4. Response status = `PENDING_REVIEW` (not visible until approved)
5. Notify moderators via existing queue patterns

### 3.3 Grooming Pattern Detection

New `GroomingDetectorService` in ai-service:

```typescript
interface GroomingAnalysisResult {
  riskScore: number; // 0-1
  flaggedPatterns: string[]; // PERSONAL_INFO_REQUEST, MEETING_ATTEMPT, ISOLATION_TACTIC
  confidence: number;
  recommendation: 'ALLOW' | 'REVIEW' | 'BLOCK';
}
```

Detection patterns:

- Personal info requests: "what's your phone number", "where do you live"
- Meeting attempts: "let's meet up", "can we talk privately"
- Age-inappropriate content: sexual references, violence
- Isolation tactics: "don't tell your parents", "this is our secret"

### 3.4 Moderator SLA & Escalation

- Target: 95% of child queue items reviewed within 1 hour (8am-10pm local)
- Items pending > 2 hours → auto-escalate to URGENT priority
- Items pending > 4 hours → notify admin via Slack/email
- URGENT items (grooming flags, panic reports) → immediate notification

---

## 4. Phase 3: UX Layer

### 4.1 Child-Friendly UI Mode

New `ChildSafetyContext`:

```typescript
interface ChildSafetyState {
  isChildMode: boolean;
  uiTheme: 'standard' | 'child-friendly';
  restrictedFeatures: string[]; // DM, USER_SEARCH, PROFILE_EDIT, SOCIAL_LINKS
  showPanicButton: boolean;
}
```

UI modifications when `isChildMode: true`:

| Element          | Standard      | Child-Friendly                         |
| ---------------- | ------------- | -------------------------------------- |
| Font size        | 14px base     | 16px base                              |
| Colors           | Brand palette | Softer, high-contrast                  |
| Navigation       | Full menu     | Simplified (Topics, My Activity, Help) |
| User search      | Visible       | Hidden                                 |
| Trending topics  | Visible       | Hidden                                 |
| Profile editing  | Full          | Avatar only                            |
| Shield indicator | None          | Floating "Safe Space" badge            |

### 4.2 Panic Button

Floating `PanicButton` component (bottom-right, z-50) for minor accounts:

1. Click opens modal with emoji severity scale:
   - 😊 Minor → 😐 Odd → 😟 Worried → 🚨 Urgent
2. Optional text field for details
3. Auto-captures: current URL, timestamp, user ID
4. Creates `SafetyReport` record
5. URGENT severity → immediate moderator notification

### 4.3 Parental Dashboard

Route: `/parent/dashboard/:token` (token-authenticated, no login required)

Features:

- Activity timeline (topics joined, responses posted)
- Usage statistics (time active, responses this week)
- Settings: email preferences, usage limits, topic restrictions
- Consent withdrawal button (triggers data deletion)

API endpoints:

- `GET /parent/dashboard/:token` - Dashboard data
- `PUT /parent/settings/:token` - Update preferences
- `POST /parent/withdraw/:token` - Withdraw consent

---

## 5. Phase 4: Privacy & Reporting

### 5.1 Cookie-less Sessions for Minors

When `user.isMinor`:

- Use session-only tokens (not persisted to localStorage)
- Disable Google Analytics
- Disable Sentry (or anonymize completely)
- No social media embeds or tracking pixels
- Session expires on browser close

### 5.2 Data Deletion Workflow

New `DataDeletionRequest` model:

```prisma
model DataDeletionRequest {
  id           String         @id @default(uuid())
  userId       String         @unique
  requestedBy  String         // PARENT, USER, SYSTEM
  requestedAt  DateTime       @default(now())
  scheduledFor DateTime       // requestedAt + 48 hours
  completedAt  DateTime?
  status       DeletionStatus @default(PENDING)
  deletionLog  Json?

  @@index([status, scheduledFor])
}

enum DeletionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

Deletion scope (48-hour SLA):

1. User record → anonymize (keep ID for referential integrity)
2. Responses → delete content, keep tombstone
3. Topics created → transfer ownership or delete if empty
4. ParentalConsent → delete
5. ComplianceAuditLog → retain (legal requirement)
6. SafetyReports → retain (legal requirement)

### 5.3 CSAM Reporting

Mandatory reporting to NCMEC CyberTipline (US) within 24 hours.

New `CsamReport` model for tracking:

- Detection source (AI, moderator, panic report)
- Evidence preservation (content snapshot, metadata)
- Submission status and case number
- Audit trail for legal compliance

Flow: Detection → Auto-preserve evidence → Admin notified → Manual NCMEC submission

### 5.4 Weekly Parent Digest

Scheduled email (Sundays 9am parent's local time):

- Topics participated in with response counts
- Time active (approximate)
- Safety status (concerns flagged or not)
- Links to dashboard and settings

---

## 6. Database Schema Summary

### New Models

1. **ComplianceAuditLog** - Regulatory audit trail
2. **ChildContentReviewQueue** - Manual moderation queue for child content
3. **SafetyReport** - Panic button reports
4. **DataDeletionRequest** - GDPR/COPPA deletion tracking
5. **CsamReport** - Mandatory reporting records

### User Model Additions

```prisma
model User {
  // Existing child safety fields (already present)
  birthDate            DateTime?
  isMinor              Boolean   @default(false)
  declaredCountry      String?
  regionalConsentAge   Int?
  parentEmail          String?
  parentConsentStatus  ParentConsentStatus @default(NOT_REQUIRED)

  // New fields
  lastAgeVerifiedAt    DateTime?
}
```

---

## 7. Error Handling

### Age Verification

| Scenario                         | Handling                             |
| -------------------------------- | ------------------------------------ |
| Future birthdate                 | Reject with "Invalid date"           |
| Age 100+                         | Flag for manual review               |
| Exactly consent age today        | Treat as adult (>=)                  |
| Country change post-registration | Re-evaluate, may trigger new consent |
| Leap year birthday               | Use Feb 28 in non-leap years         |

### Parental Consent

| Scenario          | Handling                            |
| ----------------- | ----------------------------------- |
| Email bounces     | Mark FAILED, notify user            |
| Token expires     | Allow resend with new token         |
| Token reused      | Show "Already verified"             |
| Consent withdrawn | Block posting with friendly message |

### Content Moderation

| Scenario                           | Handling                        |
| ---------------------------------- | ------------------------------- |
| Review pending >24h                | Auto-reject with explanation    |
| Topic marked mature after approval | Grandfather existing responses  |
| Minor turns 18                     | No change to historical content |

### Failure Modes

| Failure                   | Degradation                        |
| ------------------------- | ---------------------------------- |
| GeoIP down                | Fall back to user-declared country |
| AI moderation unavailable | Route all to manual queue          |
| Email service down        | Queue with retry backoff           |
| NCMEC API unavailable     | Alert admin for manual submission  |

---

## 8. Testing Strategy

### Unit Tests

- `ComplianceService.getRegionalRules()` - All country codes
- `ComplianceService.calculateAge()` - Edge cases
- `GroomingDetectorService` - Pattern matching
- `DataDeletionService` - Deletion scope

### Integration Tests

- Age verification → consent flow
- Content queue routing and approval
- Panic report → moderator notification
- Consent withdrawal → data deletion

### E2E Tests

```
frontend/e2e/child-safety/
├── minor-registration.spec.ts
├── parental-consent-flow.spec.ts
├── child-ui-mode.spec.ts
├── panic-button.spec.ts
├── parental-dashboard.spec.ts
├── content-filtering.spec.ts
└── moderation-queue.spec.ts
```

### Security Tests

- Age spoofing attempts
- Consent token reuse
- Feature bypass via direct API
- Data exfiltration attempts

### Compliance Audit Tests

- COPPA: blocks <13 without consent, 48h deletion
- GDPR: correct consent ages, right to erasure
- AADC: high privacy defaults, no nudge techniques

---

## 9. Implementation Phases

| Phase       | Scope               | Tasks |
| ----------- | ------------------- | ----- |
| **Phase 1** | Core Compliance     | ~15   |
| **Phase 2** | Content Safety      | ~12   |
| **Phase 3** | UX Layer            | ~14   |
| **Phase 4** | Privacy & Reporting | ~10   |

**Total estimated tasks:** ~51

Each phase can be shipped independently, with Phase 1-2 providing compliance value before UX polish in Phase 3-4.

---

## 10. References

- YouTube Kids (content filtering, parental controls)
- Discord (age gates, parental consent email flow)
- Roblox (chat filtering, reporting tools)
- Common Sense Media age ratings
- NCMEC Guidelines for Online Service Providers
- COPPA Rule (16 CFR Part 312)
- GDPR Article 8
- UK Age Appropriate Design Code
- Australia Online Safety Act 2021
