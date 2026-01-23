# Phone Verification Feature Design

**Date:** 2026-01-23
**Feature:** Phone Verification with OTP
**User Story:** US4 - Verify Human Authenticity
**Implementation Approach:** Test-Driven Development (TDD)

## Overview

Implement phone verification for user trust indicators. Users can opt-in to verify their phone number from their profile page. Upon successful verification, users receive a trust score boost and a verified badge.

## Design Decisions

### 1. OTP Delivery
**Decision:** Mock OTP Service (no external SMS)
**Rationale:** Focus on core verification flow without external dependencies. Easy to test, no costs, can add Twilio/AWS SNS later.

### 2. OTP Format
**Decision:** 6-digit numeric code, 5-minute expiry, 3 attempts
**Rationale:** Industry standard (Google, banks). Balances security (1M combinations) with usability.

### 3. Phone Format
**Decision:** International E.164 format with country selector
**Library:** `libphonenumber-js`
**Rationale:** Future-proof for international users. Standard format prevents ambiguity.

### 4. User Journey
**Decision:** Profile page only, opt-in
**Flow:** Profile → "Verify Phone" button → Enter phone → Receive OTP → Enter code → Success
**Rationale:** User-controlled, respects privacy, clear value proposition.

### 5. Trust Score Impact
**Decision:** +0.10 to integrity score, BASIC → ENHANCED verification level
**Rationale:** Incremental trust boost. Phone verification proves moderate identity assurance.

## Architecture

### Frontend Components (React)

```
frontend/src/components/verification/
├── PhoneVerificationButton.tsx     - Entry point on profile page
├── PhoneVerificationModal.tsx      - Two-step modal (phone → OTP)
├── PhoneInput.tsx                  - Country selector + phone input
└── OTPInput.tsx                    - 6-digit code input
```

### Backend Services (NestJS)

```
services/user-service/src/verification/
├── services/
│   ├── otp.service.ts              - Generate/validate OTP codes
│   └── phone-validation.service.ts - E.164 validation, duplicate checks
├── dto/
│   ├── phone-verification-request.dto.ts
│   └── phone-verification-verify.dto.ts
└── verification.service.ts         - Orchestrates verification flow
```

### Database Schema Updates

```prisma
model VerificationRecord {
  // ... existing fields ...

  // Add these fields:
  otpCode      String?    // Encrypted 6-digit code
  otpExpiresAt DateTime?  // 5 minutes from generation
  otpAttempts  Int @default(0)  // Track failed attempts
  phoneNumber  String?    // E.164 format for PHONE type

  @@index([phoneNumber])
}
```

## API Contract

### Request Phone Verification
```http
POST /api/verification/phone/request
Authorization: Bearer <jwt>

Request Body:
{
  "phoneNumber": "+15551234567"  // E.164 format
}

Response 200:
{
  "verificationId": "uuid",
  "expiresAt": "2026-01-23T12:05:00Z",
  "maskedPhone": "+1 (***) ***-4567"
}

Response 400:
{
  "error": "INVALID_PHONE" | "ALREADY_VERIFIED" | "PENDING_VERIFICATION",
  "message": "..."
}
```

### Verify OTP Code
```http
POST /api/verification/phone/verify
Authorization: Bearer <jwt>

Request Body:
{
  "verificationId": "uuid",
  "code": "123456"
}

Response 200:
{
  "success": true,
  "user": {
    "verificationLevel": "ENHANCED",
    "trustScoreIntegrity": 0.60
  }
}

Response 400:
{
  "error": "INVALID_CODE" | "EXPIRED" | "MAX_ATTEMPTS_EXCEEDED",
  "message": "...",
  "attemptsRemaining": 2
}
```

## Security Measures

### Rate Limiting
- Max 3 OTP requests per phone number per hour
- Max 5 verification attempts per user per day

### OTP Security
- Store encrypted (bcrypt)
- Cryptographically secure random generation
- Single-use only (mark as used)
- Auto-expire after 5 minutes

### Phone Protection
- One phone number per user account
- Duplicate phone check before OTP send
- Mask phone in responses: `+1 (***) ***-4567`

### CSRF/Replay Protection
- Verify JWT on all endpoints
- Tie verificationId to userId
- Prevent stealing verification sessions

## Error Handling

| Scenario | Error Code | User Message | Action |
|----------|------------|--------------|--------|
| Invalid phone format | INVALID_PHONE | "Please enter a valid phone number" | Inline validation |
| Phone already verified | ALREADY_VERIFIED | "This phone number is already verified" | Disable button |
| Pending verification | PENDING_VERIFICATION | "Code already sent. Check your phone" | Show countdown |
| Rate limit exceeded | RATE_LIMIT_EXCEEDED | "Too many requests. Try again in 1 hour" | Disable + timer |
| Wrong OTP | INVALID_CODE | "Incorrect code. 2 attempts remaining" | Clear input |
| Expired OTP | EXPIRED | "Code expired. Request a new code" | Resend button |
| Max attempts | MAX_ATTEMPTS_EXCEEDED | "Too many attempts. Request new code" | Resend button |

## Testing Strategy (TDD)

### Test Pyramid

**E2E Tests (Playwright):**
- Complete verification flow from profile page
- Phone validation errors
- OTP validation errors
- Expired OTP handling
- Duplicate phone rejection
- Success badge display

**Integration Tests (Vitest):**
- POST /verification/phone/request endpoint
- POST /verification/phone/verify endpoint
- Trust score updates
- Verification level changes
- Database state transitions

**Unit Tests (Vitest):**
- OTP generation (6-digit, unique)
- OTP validation (correct, wrong, expired)
- Phone number validation (E.164 format)
- Phone masking
- Duplicate detection
- Frontend component behavior

### TDD Implementation Order

**Phase 1: Backend Unit Tests + Implementation**
1. Write OTP service tests (RED)
2. Implement OTP service (GREEN)
3. Write phone validation tests (RED)
4. Implement phone validation (GREEN)

**Phase 2: Backend Integration Tests + Implementation**
5. Write endpoint integration tests (RED)
6. Implement verification endpoints (GREEN)

**Phase 3: Frontend Unit Tests + Implementation**
7. Write component tests (RED)
8. Implement components (GREEN)

**Phase 4: E2E Tests + Integration**
9. Write E2E tests (RED)
10. Wire frontend to backend (GREEN)
11. Refactor all layers

## Dependencies

**Backend:**
```json
{
  "libphonenumber-js": "^1.10.0"
}
```

**Frontend:**
```json
{
  "libphonenumber-js": "^1.10.0",
  "react-phone-number-input": "^3.3.0"
}
```

## Files to Create/Modify

**Backend (8 new, 1 modified):**
- `services/user-service/src/verification/services/otp.service.ts` [NEW]
- `services/user-service/src/verification/services/otp.service.test.ts` [NEW]
- `services/user-service/src/verification/services/phone-validation.service.ts` [NEW]
- `services/user-service/src/verification/services/phone-validation.service.test.ts` [NEW]
- `services/user-service/src/verification/dto/phone-verification-request.dto.ts` [NEW]
- `services/user-service/src/verification/dto/phone-verification-verify.dto.ts` [NEW]
- `services/user-service/src/verification/phone-verification.integration.test.ts` [NEW]
- `services/user-service/src/verification/verification.controller.ts` [MODIFY]
- `services/user-service/src/verification/verification.service.ts` [MODIFY]

**Frontend (6 new, 1 modified):**
- `frontend/src/components/verification/PhoneVerificationButton.tsx` [NEW]
- `frontend/src/components/verification/PhoneVerificationModal.tsx` [NEW]
- `frontend/src/components/verification/PhoneInput.tsx` [NEW]
- `frontend/src/components/verification/OTPInput.tsx` [NEW]
- `frontend/src/components/verification/__tests__/PhoneInput.test.tsx` [NEW]
- `frontend/src/components/verification/__tests__/OTPInput.test.tsx` [NEW]
- `frontend/src/pages/Profile/ProfilePage.tsx` [MODIFY]

**E2E:**
- `frontend/e2e/phone-verification.spec.ts` [NEW]

**Database:**
- `packages/db-models/prisma/schema.prisma` [MODIFY]
- Migration for OTP fields [NEW]

## Success Criteria

✅ All tests pass (E2E, integration, unit)
✅ Can request OTP from profile page
✅ Can verify phone with correct OTP
✅ Trust score increases +0.10 after verification
✅ Verification level changes to ENHANCED
✅ Phone verified badge appears on profile
✅ Duplicate phones rejected
✅ Expired OTP handled gracefully
✅ Rate limiting prevents abuse
✅ Max 3 attempts enforced

## Implementation Estimate

**Total: 12-16 hours** (with TDD)
- Backend (OTP + validation): 3-4 hours
- Backend (endpoints + integration): 3-4 hours
- Frontend (components + tests): 4-5 hours
- E2E tests + integration: 2-3 hours

## Future Enhancements

- Add Twilio/AWS SNS for real SMS sending
- Phone number change flow
- Re-verification after X months
- SMS verification for password reset
- Multi-factor authentication (MFA) using verified phone
