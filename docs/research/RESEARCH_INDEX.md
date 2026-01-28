# Prisma Soft Delete Research - Complete Documentation Index

**Completed**: 2026-01-27
**Feature**: Discussion Participation (Feature 009)
**Context**: Research for conditional soft delete implementation in response deletion

---

## Document Overview

This research package contains comprehensive documentation for implementing Prisma soft deletes in the reasonBridge platform, specifically for the Response model in discussion participation.

### Generated Documents

#### 1. **PRISMA_SOFT_DELETE_RESEARCH.md** (Primary Research)

**Location**: `/mnt/ssk-ssd/tony/GitHub/reasonbridge2/PRISMA_SOFT_DELETE_RESEARCH.md`
**Size**: ~32KB
**Audience**: Architects, Tech Leads, Implementation Team

**Contents**:

- Executive summary of soft delete approach
- Investigation of Prisma soft delete middleware patterns
  - Evolution from deprecated middleware to client extensions
  - Comparison of approaches
- Conditional delete logic for responses
  - Requirements analysis from spec (FR-014, FR-015, FR-016)
  - Decision tree for soft vs hard delete
- Query filtering patterns
- Cascade delete behaviors with soft deletes
- Recommended soft delete implementation with complete code
- Query patterns for excluding soft-deleted records (6 patterns)
- Migration steps and rollback plan
- Implementation guards and validation
- GDPR and data retention compliance
- Testing strategies (unit, integration, E2E)
- Implementation checklist
- Decision records with rationale

---

#### 2. **SOFT_DELETE_IMPLEMENTATION_PATTERNS.md** (Implementation Guide)

**Location**: `/mnt/ssk-ssd/tony/GitHub/reasonbridge2/SOFT_DELETE_IMPLEMENTATION_PATTERNS.md`
**Size**: ~29KB
**Audience**: Backend Engineers, QA Engineers, Frontend Engineers

**Contents**:

- Complete ResponsesService.deleteResponse() implementation
- ResponsesController delete endpoint
- 6 query building patterns with code examples
- Unit test patterns with mock Prisma
- Integration test patterns with real database
- E2E test patterns with Playwright
- Custom error classes and handling
- Exception filters for HTTP response mapping
- Performance optimization patterns

---

## Key Findings Summary

### Technical Approach

- **Framework**: Prisma Client Extensions (modern, recommended)
- **Not**: Deprecated middleware (removed in Prisma v6.0)
- **Implementation**: `/packages/db-models/src/extensions/soft-delete.extension.ts`

### Deletion Strategy

- **Condition**: Check if response has child replies
  - If YES: Soft delete (preserve thread, set deletedAt)
  - If NO: Hard delete (complete removal)

### Schema Changes

- **New Field**: `deletedAt DateTime?` on Response model
- **New Indexes**: Composite `(topicId, deletedAt)` for efficient queries

### Query Behavior

- All queries automatically exclude soft-deleted records
- Override with `includeDeleted: true` to include soft-deleted
- Override with `onlyDeleted: true` for only deleted records

### Compliance

- ✅ Feature spec requirements (FR-014 through FR-030)
- ✅ GDPR right to be forgotten
- ✅ Data retention policies
- ✅ Thread integrity preservation

---

## Feature Specification Alignment

| Requirement                         | Implementation            | Location                 |
| ----------------------------------- | ------------------------- | ------------------------ |
| FR-014: Allow deletion              | DELETE endpoint           | PATTERNS §1              |
| FR-015: Soft delete with replies    | Conditional logic         | PATTERNS §1, RESEARCH §2 |
| FR-016: Hard delete without replies | Conditional logic         | PATTERNS §1, RESEARCH §2 |
| FR-029: Maintain integrity          | Soft delete preserves     | RESEARCH §4              |
| FR-030: Prevent orphans             | No hard delete if replies | PATTERNS §1              |

---

## Implementation Roadmap

### Phase 1: Schema & Extension

- Add deletedAt field to Response model
- Create migration: `prisma migrate dev --name add_soft_delete_to_responses`
- Implement soft-delete extension
- Integrate into PrismaClient

### Phase 2: Service Implementation

- Implement ResponsesService.deleteResponse()
- Add authorization checks
- Add fact-check citation guards

### Phase 3: Testing

- Unit tests for soft/hard delete
- Integration tests for thread preservation
- E2E tests for user workflows

### Phase 4: Deployment

- Test in staging
- Monitor metrics
- Deploy with rollback plan

---

## Code Locations

### Schema

- **File**: `/packages/db-models/prisma/schema.prisma`
- **Model**: Response (lines 378-408)

### Client Configuration

- **File**: `/packages/db-models/src/client.ts`

### Service Implementation

- **File**: `/services/discussion-service/src/responses/responses.service.ts`

### Tests

- **Unit**: `/services/discussion-service/src/responses/__tests__/responses.service.unit.test.ts`
- **Integration**: `/services/discussion-service/src/responses/__tests__/responses.integration.test.ts`
- **E2E**: `/frontend/e2e/responses.spec.ts`

---

## Quick Reference

### For Implementation

**Start with**: SOFT_DELETE_IMPLEMENTATION_PATTERNS.md

- Section 1: Copy ResponsesService pattern
- Section 2: Use query patterns
- Section 3: Implement tests
- Section 4: Error handling

### For Design Review

**Reference**: PRISMA_SOFT_DELETE_RESEARCH.md

- Section 2: Conditional logic
- Section 5: Complete implementation
- Section 11: Decision records

### For Testing

**Reference**: SOFT_DELETE_IMPLEMENTATION_PATTERNS.md Section 3

- Unit tests with mocks
- Integration tests with real database
- E2E tests with Playwright

---

## External Resources

### Official Documentation

- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)

### Community Resources

- [Soft Delete in ZenStack](https://zenstack.dev/blog/soft-delete)
- [Soft Delete with Partial Indexes](https://www.thisdot.co/blog/how-to-implement-soft-delete-with-prisma-using-partial-indexes)
- [True Soft Deletion in Prisma ORM](https://matranga.dev/true-soft-deletion-in-prisma-orm/)
- [NestJS #105: Soft Deletes](http://wanago.io/2023/04/24/api-nestjs-prisma-soft-deletes/)

---

## Status

**Research Status**: ✅ COMPLETE AND READY FOR IMPLEMENTATION

**Document Version**: 1.0
**Last Updated**: 2026-01-27
