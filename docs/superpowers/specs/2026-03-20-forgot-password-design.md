# Forgot Password Feature Design

**Date:** 2026-03-20
**Status:** Approved
**Author:** Claude Code

## Overview

Implement password reset functionality using 6-digit verification codes sent via email. This approach matches the existing email verification flow and leverages the existing `VerificationService` infrastructure.

## User Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ ForgotPassword  │     │   Enter Code     │     │  Reset Success  │
│     Page        │────▶│   + New Pass     │────▶│     Page        │
│  (enter email)  │     │                  │     │  (redirect to   │
│                 │     │                  │     │    login)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       ▲
        ▼                       │
   Email contains:              │
   • 6-digit code               │
   • Link to /reset-password ───┘
     (convenience, no token in URL)
```

### Steps

1. User navigates to `/forgot-password` and enters their email
2. Backend generates 6-digit code (15-minute expiry) and sends email
3. Email contains the code and a convenience link to `/reset-password`
4. User enters code + new password on `/reset-password`
5. Backend validates code, updates password hash, invalidates code
6. Success message displayed with link to login

## API Design

### Endpoints

| Method | Path | Purpose | Rate Limit |
|--------|------|---------|------------|
| POST | `/auth/forgot-password` | Request reset code | 3/min |
| POST | `/auth/reset-password` | Validate code + set new password | 5/min |

### Request/Response Schemas

```typescript
// POST /auth/forgot-password
// Request
interface ForgotPasswordDto {
  email: string;  // Valid email format
}

// Response (always 200 to prevent email enumeration)
interface ForgotPasswordResponseDto {
  message: string;  // "If an account exists, a reset code has been sent"
}

// POST /auth/reset-password
// Request
interface ResetPasswordDto {
  email: string;
  code: string;        // 6-digit code
  newPassword: string; // Must pass password strength validation
}

// Response
interface ResetPasswordResponseDto {
  message: string;  // "Password reset successful"
}

// Error responses
// 400 - Invalid or expired code
// 422 - Password does not meet requirements
// 429 - Rate limit exceeded
```

### Security Measures

- **No email enumeration:** Always return success message regardless of whether email exists
- **Short expiry:** 15-minute code expiry (vs 24h for email verification)
- **Attempt limiting:** Max 5 attempts per code (existing VerificationService behavior)
- **Rate limiting:** Throttle decorator on both endpoints
- **Password validation:** Use existing `validatePassword()` from `@reason-bridge/common`

## Database Changes

### Extend VerificationTokenType Enum

```prisma
enum VerificationTokenType {
  EMAIL_VERIFICATION
  PASSWORD_RESET      // New value
}
```

No new models or fields required. The existing `VerificationToken` model already supports:
- `token` - 6-digit code
- `expiresAt` - configurable expiration
- `attempts` - attempt tracking
- `userId` - user association
- `type` - token type discrimination

## Service Layer

### VerificationService Changes

Minimal changes needed - the service already supports multiple token types. Only adjustment is to use 15-minute expiry for `PASSWORD_RESET` tokens instead of 24 hours.

```typescript
// Existing method, add PASSWORD_RESET handling
async generateToken(userId: string, type: VerificationTokenType): Promise<string> {
  const expiresAt = type === 'PASSWORD_RESET'
    ? new Date(Date.now() + 15 * 60 * 1000)  // 15 minutes
    : new Date(Date.now() + 24 * 60 * 60 * 1000);  // 24 hours
  // ... rest of existing logic
}
```

### AuthService New Methods

```typescript
async requestPasswordReset(email: string): Promise<void> {
  // 1. Find user by email (silently fail if not found)
  // 2. Generate PASSWORD_RESET token via VerificationService
  // 3. Send password reset email via EmailService
}

async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  // 1. Find user by email
  // 2. Verify code via VerificationService
  // 3. Validate password strength
  // 4. Hash new password with bcrypt
  // 5. Update user's passwordHash
  // 6. Invalidate the token
}
```

### EmailService New Method

```typescript
async sendPasswordResetEmail(email: string, code: string): Promise<void> {
  // Send email with:
  // - Subject: "Reset your ReasonBridge password"
  // - Body: 6-digit code + link to /reset-password
  // - Expiry notice (15 minutes)
}
```

### Email Template

```
Subject: Reset your ReasonBridge password

Your password reset code is: 847291

Enter this code at: https://reasonbridge.com/reset-password

This code expires in 15 minutes.

If you didn't request this, you can safely ignore this email.
```

## Frontend Components

### ForgotPasswordPage (`/forgot-password`)

Replace existing placeholder with functional form:

- Email input with validation
- Submit button with loading state
- Success message after submission
- "Back to Login" link
- Error handling with toast notifications
- Dark mode support

### ResetPasswordPage (`/reset-password`) - New

- Email input (can be pre-filled via query param or state)
- 6-digit code input
- New password input with visibility toggle
- Confirm password input with visibility toggle
- Password strength requirements display
- Submit button with loading state
- Success → redirect to login after 3 seconds
- Error handling for invalid/expired codes

### Shared Patterns

Both pages follow existing auth page patterns:
- Same layout structure as `LoginPage`/`SignupPage`
- `react-hook-form` + `zod` for validation
- Existing `Card`, `Input`, `Button` components
- Toast notifications for feedback
- Responsive design with Tailwind

### Routes

Add to router configuration:
```typescript
{ path: '/reset-password', element: <ResetPasswordPage /> }
```

The `/forgot-password` route already exists (currently shows placeholder).

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `packages/db-models/prisma/schema.prisma` | Modify | Add `PASSWORD_RESET` to enum |
| `services/user-service/src/auth/verification.service.ts` | Modify | Handle 15-min expiry for password reset |
| `services/user-service/src/auth/auth.service.ts` | Modify | Add `requestPasswordReset()`, `resetPassword()` |
| `services/user-service/src/auth/auth.controller.ts` | Modify | Add 2 new endpoints |
| `services/user-service/src/auth/dto/forgot-password.dto.ts` | Create | Request/response DTOs |
| `services/user-service/src/auth/dto/reset-password.dto.ts` | Create | Request/response DTOs |
| `services/user-service/src/services/email.service.ts` | Modify | Add `sendPasswordResetEmail()` |
| `frontend/src/pages/Auth/ForgotPasswordPage.tsx` | Modify | Replace placeholder with form |
| `frontend/src/pages/Auth/ResetPasswordPage.tsx` | Create | New reset password page |
| `frontend/src/services/authService.ts` | Modify | Add API methods |
| `frontend/src/routes/index.tsx` | Modify | Add reset-password route |

## Testing

### Unit Tests

- `AuthService.requestPasswordReset()` - token generation, email sending
- `AuthService.resetPassword()` - code validation, password update
- DTO validation tests

### Integration Tests

- Full flow: request → email → reset → login with new password
- Invalid code handling
- Expired code handling
- Rate limiting verification

### E2E Tests

- Complete forgot password flow
- Error states (invalid email format, weak password, wrong code)
- Navigation between pages

## Dependencies

Leverages existing infrastructure:
- `VerificationService` - token generation/validation
- `EmailService` - AWS SES integration
- `bcrypt` - password hashing
- `@reason-bridge/common` - password validation utilities
- `@Throttle` decorator - rate limiting

No new dependencies required.
