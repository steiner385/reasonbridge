# Data Model: User Onboarding

**Feature**: 003-user-onboarding
**Date**: 2026-01-25
**Purpose**: Define entities, relationships, and validation rules for user onboarding feature

---

## Entity Definitions

### User

Represents a registered participant in the platform.

**Attributes**:
- `id`: UUID, primary key, auto-generated
- `email`: string, unique, required, indexed
- `authMethod`: enum ['EMAIL_PASSWORD', 'GOOGLE_OAUTH', 'APPLE_OAUTH'], required
- `cognitoUserSub`: string, unique, required (Cognito User Pool subject identifier)
- `emailVerified`: boolean, default false
- `passwordHash`: string, nullable (null for OAuth users)
- `displayName`: string, nullable (can be set later)
- `createdAt`: timestamp, auto-generated
- `lastLoginAt`: timestamp, nullable
- `accountStatus`: enum ['ACTIVE', 'SUSPENDED', 'DELETED'], default 'ACTIVE'

**Relationships**:
- Has one `OnboardingProgress`
- Has many `TopicInterest`
- Has one `VisitorSession` (pre-signup tracking)

**Validation Rules**:
- Email MUST match RFC 5322 format
- If authMethod is EMAIL_PASSWORD, passwordHash MUST NOT be null
- If authMethod is GOOGLE_OAUTH or APPLE_OAUTH, passwordHash MUST be null
- Email MUST be lowercase

**Indexes**:
- Unique index on `email`
- Unique index on `cognitoUserSub`
- Index on `emailVerified` (for filtering unverified users)
- Index on `createdAt` (for analytics)

**State Transitions**:
```
ACTIVE → SUSPENDED (admin action)
SUSPENDED → ACTIVE (appeal approved)
ACTIVE → DELETED (user deletion request)
```

---

### VerificationToken

Time-limited token for email verification.

**Attributes**:
- `id`: UUID, primary key, auto-generated
- `userId`: UUID, foreign key → User.id, required
- `token`: string, unique, required (6-digit code from Cognito)
- `createdAt`: timestamp, auto-generated
- `expiresAt`: timestamp, required (createdAt + 24 hours)
- `used`: boolean, default false
- `usedAt`: timestamp, nullable

**Relationships**:
- Belongs to `User`

**Validation Rules**:
- Token MUST be exactly 6 digits
- expiresAt MUST be exactly 24 hours after createdAt
- Once used = true, usedAt MUST be set

**Indexes**:
- Unique index on `token`
- Index on `userId` (for lookup by user)
- Index on `expiresAt` (for cleanup of expired tokens)

**Lifecycle**:
- Created on user signup (Cognito generates code)
- Expires after 24 hours
- Marked as used after successful verification
- Deleted after 7 days (cleanup job)

---

### OnboardingProgress

Tracks user's journey through onboarding steps.

**Attributes**:
- `id`: UUID, primary key, auto-generated
- `userId`: UUID, foreign key → User.id, unique, required
- `emailVerified`: boolean, default false
- `topicsSelected`: boolean, default false
- `orientationViewed`: boolean, default false
- `firstPostMade`: boolean, default false
- `currentStep`: enum ['VERIFICATION', 'TOPICS', 'ORIENTATION', 'COMPLETE'], required
- `lastUpdatedAt`: timestamp, auto-generated, updated on every change
- `completedAt`: timestamp, nullable (set when currentStep = 'COMPLETE')

**Relationships**:
- Belongs to `User` (one-to-one)

**Validation Rules**:
- If emailVerified = true, currentStep MUST be at least 'TOPICS'
- If topicsSelected = true, currentStep MUST be at least 'ORIENTATION' or 'COMPLETE'
- If firstPostMade = true, currentStep MUST be 'COMPLETE'
- completedAt MUST be null if currentStep != 'COMPLETE'

**Indexes**:
- Unique index on `userId`
- Index on `currentStep` (for analytics)
- Index on `completedAt` (for filtering completed vs. incomplete)

**State Transitions**:
```
VERIFICATION → TOPICS (email verified)
TOPICS → ORIENTATION (2-3 topics selected)
ORIENTATION → COMPLETE (viewed or skipped, first post made)
TOPICS → COMPLETE (skipped orientation, made first post)
```

---

### TopicInterest

User's selected discussion topics for feed personalization.

**Attributes**:
- `id`: UUID, primary key, auto-generated
- `userId`: UUID, foreign key → User.id, required
- `topicId`: UUID, foreign key → Topic.id, required
- `priority`: integer, range 1-3, required (1 = highest priority)
- `selectedAt`: timestamp, auto-generated

**Relationships**:
- Belongs to `User`
- Belongs to `Topic` (from main platform schema)

**Validation Rules**:
- User MUST have minimum 2 and maximum 3 TopicInterest records
- Priority values MUST be unique per user (no duplicate priorities)
- Priority MUST be between 1 and 3

**Indexes**:
- Composite index on (`userId`, `priority`) (for ordered retrieval)
- Index on `topicId` (for topic analytics)

**Business Rules**:
- On initial selection: priority assigned based on selection order (1st = 1, 2nd = 2, 3rd = 3)
- User can reorder priorities in settings
- Deleting a topic interest requires replacing it (to maintain 2-3 minimum)

---

### Topic

Available discussion categories (existing entity extended for onboarding).

**Attributes** (onboarding-relevant):
- `id`: UUID, primary key
- `name`: string, unique, required
- `description`: string, required
- `activeDiscussionCount`: integer, computed field (count of discussions in last 7 days)
- `participantCount`: integer, computed field (unique participants in last 30 days)
- `activityLevel`: enum ['HIGH', 'MEDIUM', 'LOW'], computed from counts
- `suggestedForNewUsers`: boolean, default false (flag for high-quality topics)

**Validation Rules**:
- activityLevel thresholds:
  - HIGH: activeDiscussionCount >= 20 OR participantCount >= 100
  - MEDIUM: activeDiscussionCount >= 5 OR participantCount >= 20
  - LOW: activeDiscussionCount < 5 AND participantCount < 20

**Indexes**:
- Index on `activityLevel` (for filtering)
- Index on `suggestedForNewUsers` (for onboarding display)

---

### VisitorSession

Pre-authentication session tracking for demo interactions.

**Attributes**:
- `id`: UUID, primary key, auto-generated
- `sessionId`: string, unique, required (generated client-side)
- `viewedDemoDiscussionIds`: array of UUIDs, default []
- `interactionTimestamps`: array of timestamps, default []
- `referralSource`: string, nullable (utm_source or referrer)
- `convertedToUserId`: UUID, foreign key → User.id, nullable
- `createdAt`: timestamp, auto-generated
- `lastActivityAt`: timestamp, updated on each interaction

**Relationships**:
- Optionally converts to `User` (one-to-one after signup)

**Validation Rules**:
- sessionId MUST be unique
- If convertedToUserId is set, record is considered inactive

**Indexes**:
- Unique index on `sessionId`
- Index on `convertedToUserId` (for post-conversion analytics)
- Index on `lastActivityAt` (for cleanup of stale sessions)

**Lifecycle**:
- Created on first landing page visit
- Updated on each demo interaction
- Linked to User on signup
- Deleted after 30 days of inactivity (cleanup job)

**Privacy Note**:
- No PII stored (sessionId is random, not cookie-based)
- IP address NOT stored
- Used only for UX personalization, not tracking

---

## Relationships Diagram

```
User (1) ──────── (1) OnboardingProgress
  │
  ├─── (0..3) TopicInterest ───── (1) Topic
  │
  └─── (0..1) VisitorSession
```

---

## Prisma Schema

```prisma
model User {
  id                String              @id @default(uuid())
  email             String              @unique
  authMethod        AuthMethod
  cognitoUserSub    String              @unique
  emailVerified     Boolean             @default(false)
  passwordHash      String?
  displayName       String?
  createdAt         DateTime            @default(now())
  lastLoginAt       DateTime?
  accountStatus     AccountStatus       @default(ACTIVE)

  onboardingProgress OnboardingProgress?
  topicInterests     TopicInterest[]
  visitorSession     VisitorSession?

  @@index([emailVerified])
  @@index([createdAt])
}

enum AuthMethod {
  EMAIL_PASSWORD
  GOOGLE_OAUTH
  APPLE_OAUTH
}

enum AccountStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

model VerificationToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  createdAt DateTime @default(now())
  expiresAt DateTime
  used      Boolean  @default(false)
  usedAt    DateTime?

  @@index([userId])
  @@index([expiresAt])
}

model OnboardingProgress {
  id                String            @id @default(uuid())
  userId            String            @unique
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  emailVerified     Boolean           @default(false)
  topicsSelected    Boolean           @default(false)
  orientationViewed Boolean           @default(false)
  firstPostMade     Boolean           @default(false)
  currentStep       OnboardingStep
  lastUpdatedAt     DateTime          @updatedAt
  completedAt       DateTime?

  @@index([currentStep])
  @@index([completedAt])
}

enum OnboardingStep {
  VERIFICATION
  TOPICS
  ORIENTATION
  COMPLETE
}

model TopicInterest {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  topicId    String
  topic      Topic    @relation(fields: [topicId], references: [id], onDelete: Cascade)
  priority   Int      @db.SmallInt
  selectedAt DateTime @default(now())

  @@unique([userId, topicId])
  @@index([userId, priority])
}

model Topic {
  id                     String          @id @default(uuid())
  name                   String          @unique
  description            String
  activeDiscussionCount  Int             @default(0)
  participantCount       Int             @default(0)
  activityLevel          ActivityLevel
  suggestedForNewUsers   Boolean         @default(false)

  topicInterests         TopicInterest[]

  @@index([activityLevel])
  @@index([suggestedForNewUsers])
}

enum ActivityLevel {
  HIGH
  MEDIUM
  LOW
}

model VisitorSession {
  id                       String    @id @default(uuid())
  sessionId                String    @unique
  viewedDemoDiscussionIds  String[]  @default([])
  interactionTimestamps    DateTime[] @default([])
  referralSource           String?
  convertedToUserId        String?   @unique
  convertedUser            User?     @relation(fields: [convertedToUserId], references: [id])
  createdAt                DateTime  @default(now())
  lastActivityAt           DateTime  @updatedAt

  @@index([convertedToUserId])
  @@index([lastActivityAt])
}
```

---

## Migration Notes

**Migration Order**:
1. Add AuthMethod, AccountStatus, OnboardingStep, ActivityLevel enums
2. Create User table (if not exists, or add new columns)
3. Create VerificationToken table
4. Create OnboardingProgress table
5. Create Topic table (if not exists for onboarding)
6. Create TopicInterest table
7. Create VisitorSession table

**Data Migration** (if User table exists):
- Existing users: Set authMethod = 'EMAIL_PASSWORD' (default)
- Existing users: Create OnboardingProgress with currentStep = 'COMPLETE', all flags = true
- Backfill Topic.activityLevel based on computed counts

**Cleanup Jobs** (scheduled tasks):
- Daily: Delete VerificationToken where expiresAt < NOW() - 7 days AND used = false
- Daily: Delete VisitorSession where lastActivityAt < NOW() - 30 days AND convertedToUserId IS NULL

---

## Data Integrity Rules

**Referential Integrity**:
- CASCADE delete: VerificationToken, OnboardingProgress, TopicInterest when User is deleted
- PROTECT delete: Topic cannot be deleted if TopicInterest records exist (or cascade with warning)

**Application-Level Constraints**:
- User creation MUST create OnboardingProgress in same transaction
- Topic selection MUST update OnboardingProgress.topicsSelected in same transaction
- First post MUST update OnboardingProgress.firstPostMade and currentStep = 'COMPLETE' atomically

---

## Performance Considerations

**Read Patterns**:
- Frequent: User lookup by email (covered by unique index)
- Frequent: OnboardingProgress lookup by userId (covered by unique index)
- Frequent: TopicInterest retrieval ordered by priority (covered by composite index)
- Occasional: Topic listing with activityLevel filtering (covered by index)

**Write Patterns**:
- High write: OnboardingProgress updates (every onboarding step)
- Medium write: TopicInterest inserts (2-3 per user, one-time)
- Low write: User creation

**Optimization Strategies**:
- Cache Topic list with activity levels (refresh hourly)
- Denormalize activeDiscussionCount and participantCount (update via background job)
- Use connection pooling for high concurrency during onboarding spikes

---

## Privacy & Security

**PII Fields**:
- `User.email` → Encrypted at rest (database-level encryption)
- `User.passwordHash` → Bcrypt with cost factor 12
- `VisitorSession.sessionId` → Random UUID, not traceable to individual

**GDPR Compliance**:
- User deletion: CASCADE deletes all related records (VerificationToken, OnboardingProgress, TopicInterest)
- Data export: Include User, OnboardingProgress, TopicInterest in export
- Anonymization: VisitorSession has no PII, can be retained for analytics

**Audit Logging**:
- Log all User creation events
- Log all OnboardingProgress state transitions
- Log all TopicInterest changes
- Include correlation IDs for traceability
