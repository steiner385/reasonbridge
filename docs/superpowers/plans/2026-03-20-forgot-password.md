# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement password reset functionality using 6-digit codes sent via email

**Architecture:** Extend existing VerificationService with PASSWORD_RESET token type. Add two endpoints: request reset code and reset password. Frontend gets two pages: request form and reset form.

**Tech Stack:** NestJS, Prisma, AWS SES, React, react-hook-form, zod

**Spec:** `docs/superpowers/specs/2026-03-20-forgot-password-design.md`

---

## Task 1: Database Schema - Add Token Type

**Files:**
- Modify: `packages/db-models/prisma/schema.prisma:1452-1464`

- [ ] **Step 1: Add VerificationTokenType enum and update VerificationToken model**

Add the enum before the VerificationToken model, and add a `type` field:

```prisma
enum VerificationTokenType {
  EMAIL_VERIFICATION
  PASSWORD_RESET
}

model VerificationToken {
  id        String                @id @default(uuid()) @db.Uuid
  userId    String                @map("user_id") @db.Uuid
  token     String                @unique @db.VarChar(6)
  type      VerificationTokenType @default(EMAIL_VERIFICATION)
  createdAt DateTime              @default(now()) @map("created_at")
  expiresAt DateTime              @map("expires_at")
  used      Boolean               @default(false)
  usedAt    DateTime?             @map("used_at")

  @@index([userId])
  @@index([expiresAt])
  @@index([type])
  @@map("verification_tokens")
}
```

- [ ] **Step 2: Generate and apply migration**

Run:
```bash
cd packages/db-models && pnpm prisma migrate dev --name add_verification_token_type
```

Expected: Migration created and applied successfully

- [ ] **Step 3: Generate Prisma client**

Run:
```bash
cd packages/db-models && pnpm prisma generate
```

Expected: Prisma Client generated successfully

- [ ] **Step 4: Commit**

```bash
git add packages/db-models/prisma/
git commit -m "feat(db): add VerificationTokenType enum for password reset"
```

---

## Task 2: Backend DTOs - Create Request/Response Types

**Files:**
- Create: `services/user-service/src/auth/dto/forgot-password.dto.ts`
- Create: `services/user-service/src/auth/dto/reset-password.dto.ts`

- [ ] **Step 1: Create forgot-password.dto.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEmail } from 'class-validator';

/**
 * Request payload for forgot password
 */
export class ForgotPasswordRequestDto {
  @IsEmail()
  email!: string;
}

/**
 * Response payload for forgot password
 * Always returns success to prevent email enumeration
 */
export class ForgotPasswordResponseDto {
  message!: string;
}
```

- [ ] **Step 2: Create reset-password.dto.ts**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

/**
 * Request payload for password reset
 */
export class ResetPasswordRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/, {
    message: 'Code must be exactly 6 digits',
  })
  code!: string;

  @IsString()
  @MinLength(12)
  newPassword!: string;
}

/**
 * Response payload for password reset
 */
export class ResetPasswordResponseDto {
  message!: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add services/user-service/src/auth/dto/
git commit -m "feat(auth): add forgot password and reset password DTOs"
```

---

## Task 3: Backend - Update VerificationService

**Files:**
- Modify: `services/user-service/src/auth/verification.service.ts`

- [ ] **Step 1: Import VerificationTokenType**

Add to imports at top of file:

```typescript
import { VerificationTokenType } from '@prisma/client';
```

- [ ] **Step 2: Add PASSWORD_RESET expiration constant**

Add after `TOKEN_EXPIRATION_HOURS`:

```typescript
private readonly PASSWORD_RESET_EXPIRATION_MINUTES = 15;
```

- [ ] **Step 3: Update generateToken method signature and logic**

Update the method to accept a type parameter and use appropriate expiration:

```typescript
/**
 * Generate a new verification token for a user
 *
 * @param userId - User ID
 * @param email - User's email address
 * @param type - Token type (EMAIL_VERIFICATION or PASSWORD_RESET)
 * @returns 6-digit verification code
 */
async generateToken(
  userId: string,
  email: string,
  type: VerificationTokenType = VerificationTokenType.EMAIL_VERIFICATION,
): Promise<string> {
  try {
    this.logger.debug(`Generating ${type} token for user: ${userId}`);

    // Generate random 6-digit code
    const code = this.generateVerificationCode();

    // Calculate expiration time based on token type
    const expiresAt = new Date();
    if (type === VerificationTokenType.PASSWORD_RESET) {
      expiresAt.setMinutes(expiresAt.getMinutes() + this.PASSWORD_RESET_EXPIRATION_MINUTES);
    } else {
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRATION_HOURS);
    }

    // Invalidate any existing tokens of the same type for this user
    await this.prisma.verificationToken.updateMany({
      where: {
        userId,
        type,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // In E2E mode, delete any existing tokens with the same code
    if (process.env['E2E_VERIFICATION_CODE']) {
      await this.prisma.verificationToken.deleteMany({
        where: {
          token: code,
        },
      });
    }

    // Create new verification token
    await this.prisma.verificationToken.create({
      data: {
        userId,
        token: code,
        type,
        expiresAt,
        used: false,
      },
    });

    this.logger.log(`${type} token generated for user: ${userId}`);
    return code;
  } catch (error: any) {
    this.logger.error(`Failed to generate ${type} token: ${error.message}`, error.stack);
    throw new BadRequestException(`Failed to generate verification token`);
  }
}
```

- [ ] **Step 4: Update verifyToken method to accept type**

Update the method signature and query:

```typescript
/**
 * Verify a verification code
 *
 * @param email - User's email address
 * @param code - 6-digit verification code
 * @param type - Token type to verify
 * @returns User ID if verification succeeds
 */
async verifyToken(
  email: string,
  code: string,
  type: VerificationTokenType = VerificationTokenType.EMAIL_VERIFICATION,
): Promise<string> {
  try {
    this.logger.debug(`Verifying ${type} token for email: ${email}`);

    // Look up user by email first
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`No user found for email: ${email}`);
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'No user found with this email',
      });
    }

    // Find the most recent unused token of the specified type for this user
    const token = await this.prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!token) {
      this.logger.warn(`No ${type} token found for email: ${email}`);
      throw new NotFoundException({
        error: 'TOKEN_NOT_FOUND',
        message: 'No verification code found for this email',
        details: {
          hint: 'Request a new verification code',
        },
      });
    }

    // Check if token has expired
    const expiryMessage = type === VerificationTokenType.PASSWORD_RESET
      ? 'valid for 15 minutes'
      : 'valid for 24 hours';

    if (new Date() > token.expiresAt) {
      this.logger.warn(`${type} token expired for email: ${email}`);
      throw new BadRequestException({
        error: 'EXPIRED_CODE',
        message: `Verification code has expired (${expiryMessage})`,
        details: {
          canResend: true,
        },
      });
    }

    // Check if code matches
    if (token.token !== code) {
      this.logger.warn(`Invalid ${type} code for email: ${email}`);
      throw new BadRequestException({
        error: 'INVALID_CODE',
        message: 'Verification code is invalid or expired',
      });
    }

    // Mark token as used
    await this.prisma.verificationToken.update({
      where: { id: token.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    this.logger.log(`${type} verification successful for email: ${email}`);
    return token.userId;
  } catch (error: any) {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }

    this.logger.error(`Verification failed: ${error.message}`, error.stack);
    throw new BadRequestException('Verification failed');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src/auth/verification.service.ts
git commit -m "feat(auth): extend VerificationService for password reset tokens"
```

---

## Task 4: Backend - Add Email Template

**Files:**
- Modify: `services/user-service/src/services/email.service.ts`

- [ ] **Step 1: Add PasswordResetEmailParams interface**

Add after `VerificationEmailParams`:

```typescript
/**
 * Parameters for sending password reset emails
 */
export interface PasswordResetEmailParams {
  email: string;
  code: string;
}
```

- [ ] **Step 2: Add sendPasswordResetEmail method**

Add after `sendVerificationEmail` method:

```typescript
/**
 * Send a password reset email with a 6-digit code
 *
 * @param params - Email parameters including email and reset code
 */
async sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<void> {
  const resetUrl = `${this.appBaseUrl}/reset-password`;
  const htmlBody = this.buildPasswordResetEmailHtml(params.code, resetUrl);
  const textBody = this.buildPasswordResetEmailText(params.code, resetUrl);

  const command = new SendEmailCommand({
    Source: this.fromAddress,
    Destination: {
      ToAddresses: [params.email],
    },
    Message: {
      Subject: {
        Data: 'Reset Your Password - ReasonBridge',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    await this.sesClient.send(command);
    this.logger.log(`Password reset email sent to ${params.email}`);
  } catch (error) {
    this.logger.error(`Failed to send password reset email to ${params.email}:`, error);
    throw error;
  }
}
```

- [ ] **Step 3: Add HTML template builder**

Add at the end of the class:

```typescript
/**
 * Build HTML body for password reset email
 */
private buildPasswordResetEmailHtml(code: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Reset Your Password</h1>

    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      You requested to reset your password. Use the code below to complete the process:
    </p>

    <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0369a1;">${code}</span>
    </div>

    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
      Enter this code at: <a href="${resetUrl}" style="color: #0ea5e9; text-decoration: none;">${resetUrl}</a>
    </p>

    <p style="color: #dc2626; font-size: 14px; margin-bottom: 24px;">
      <strong>This code expires in 15 minutes.</strong>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">

    <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Build plain text body for password reset email
 */
private buildPasswordResetEmailText(code: string, resetUrl: string): string {
  return `
Reset Your Password - ReasonBridge

You requested to reset your password. Use the code below to complete the process:

Your reset code: ${code}

Enter this code at: ${resetUrl}

This code expires in 15 minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
  `.trim();
}
```

- [ ] **Step 4: Commit**

```bash
git add services/user-service/src/services/email.service.ts
git commit -m "feat(email): add password reset email template"
```

---

## Task 5: Backend - Add AuthService Methods

**Files:**
- Modify: `services/user-service/src/auth/auth.service.ts`

- [ ] **Step 1: Import required types**

Add to imports:

```typescript
import { VerificationTokenType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
```

- [ ] **Step 2: Add requestPasswordReset method**

Add after existing methods:

```typescript
/**
 * Request a password reset code
 * Always returns success to prevent email enumeration
 *
 * @param email - User's email address
 */
async requestPasswordReset(email: string): Promise<void> {
  this.logger.log(`Password reset requested for: ${redactEmail(email)}`);

  // Find user by email (silently fail if not found)
  const user = await this.prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user) {
    this.logger.debug(`No user found for email: ${redactEmail(email)}, silently ignoring`);
    return; // Silent return to prevent email enumeration
  }

  // Only allow password reset for users with password auth
  if (!user.passwordHash) {
    this.logger.debug(`User ${redactEmail(email)} has no password (OAuth user), silently ignoring`);
    return; // Silent return - OAuth users can't reset password
  }

  try {
    // Generate password reset token (15 min expiry)
    const code = await this.verificationService.generateToken(
      user.id,
      user.email,
      VerificationTokenType.PASSWORD_RESET,
    );

    // Import EmailService dynamically to avoid circular dependency
    const { EmailService } = await import('../services/email.service.js');
    const emailService = new EmailService(this.configService);

    // Send password reset email
    await emailService.sendPasswordResetEmail({
      email: user.email,
      code,
    });

    this.logger.log(`Password reset email sent for: ${redactEmail(email)}`);
  } catch (error: any) {
    // Log error but don't expose to user (prevents enumeration)
    this.logger.error(`Failed to send password reset email: ${error.message}`);
    // Don't throw - always return success to user
  }
}
```

- [ ] **Step 3: Add resetPassword method**

Add after requestPasswordReset:

```typescript
/**
 * Reset user password with verification code
 *
 * @param email - User's email address
 * @param code - 6-digit verification code
 * @param newPassword - New password
 */
async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  this.logger.log(`Password reset attempt for: ${redactEmail(email)}`);

  // Validate password strength
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new BadRequestException({
      message: 'Password does not meet requirements',
      errors: passwordValidation.errors,
    });
  }

  // Verify the code (throws if invalid)
  const userId = await this.verificationService.verifyToken(
    email,
    code,
    VerificationTokenType.PASSWORD_RESET,
  );

  // Hash the new password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update user's password
  await this.prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  this.logger.log(`Password reset successful for user: ${userId}`);
}
```

- [ ] **Step 4: Commit**

```bash
git add services/user-service/src/auth/auth.service.ts
git commit -m "feat(auth): add password reset methods to AuthService"
```

---

## Task 6: Backend - Add Controller Endpoints

**Files:**
- Modify: `services/user-service/src/auth/auth.controller.ts`

- [ ] **Step 1: Import DTOs**

Add to imports:

```typescript
import { ForgotPasswordRequestDto, ForgotPasswordResponseDto } from './dto/forgot-password.dto.js';
import { ResetPasswordRequestDto, ResetPasswordResponseDto } from './dto/reset-password.dto.js';
```

- [ ] **Step 2: Add throttle limits**

Add to THROTTLE_LIMITS object:

```typescript
forgotPassword: isTest ? 10000 : 3, // 3/min in prod
resetPassword: isTest ? 10000 : 5, // 5/min in prod
```

- [ ] **Step 3: Add forgotPassword endpoint**

Add after existing endpoints:

```typescript
/**
 * Request a password reset code
 * Rate limited: 3 attempts per minute to prevent abuse
 * Always returns success to prevent email enumeration
 */
@Post('forgot-password')
@Throttle({ default: { limit: THROTTLE_LIMITS.forgotPassword, ttl: 60000 } })
@HttpCode(HttpStatus.OK)
async forgotPassword(
  @Body() dto: ForgotPasswordRequestDto,
): Promise<ForgotPasswordResponseDto> {
  await this.authService.requestPasswordReset(dto.email);

  return {
    message: 'If an account exists with this email, a password reset code has been sent.',
  };
}
```

- [ ] **Step 4: Add resetPassword endpoint**

Add after forgotPassword:

```typescript
/**
 * Reset password with verification code
 * Rate limited: 5 attempts per minute to prevent brute force
 */
@Post('reset-password')
@Throttle({ default: { limit: THROTTLE_LIMITS.resetPassword, ttl: 60000 } })
@HttpCode(HttpStatus.OK)
async resetPassword(
  @Body() dto: ResetPasswordRequestDto,
): Promise<ResetPasswordResponseDto> {
  await this.authService.resetPassword(dto.email, dto.code, dto.newPassword);

  return {
    message: 'Password reset successful. You can now log in with your new password.',
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add services/user-service/src/auth/auth.controller.ts
git commit -m "feat(auth): add forgot-password and reset-password endpoints"
```

---

## Task 7: Frontend - Add Auth Service Methods

**Files:**
- Modify: `frontend/src/services/authService.ts`

- [ ] **Step 1: Add forgotPassword method**

Add to AuthService class:

```typescript
/**
 * Request a password reset code
 */
async forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to request password reset');
  }

  return response.json();
}

/**
 * Reset password with verification code
 */
async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code, newPassword }),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message || 'Failed to reset password');
  }

  return response.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/authService.ts
git commit -m "feat(auth): add forgot password methods to frontend authService"
```

---

## Task 8: Frontend - Replace ForgotPasswordPage

**Files:**
- Modify: `frontend/src/pages/Auth/ForgotPasswordPage.tsx`

- [ ] **Step 1: Replace placeholder with functional form**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Forgot Password page - request password reset code
 */
function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success('If an account exists, a reset code has been sent to your email.');
    } catch (error) {
      // Still show success to prevent email enumeration
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success('If an account exists, a reset code has been sent to your email.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card variant="elevated" padding="lg">
            <CardBody>
              <div className="text-center py-4">
                <div className="text-green-500 mb-4">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Check Your Email
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  If an account exists for <strong>{submittedEmail}</strong>, we've sent a 6-digit
                  code to reset your password. The code expires in 15 minutes.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/reset-password', { state: { email: submittedEmail } })}
                  >
                    Enter Reset Code
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      setIsSubmitted(false);
                      setSubmittedEmail('');
                    }}
                  >
                    Try Different Email
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              &larr; Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset Password</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Enter your email address and we'll send you a code to reset your password.
            </p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                id="email"
                {...register('email')}
                error={errors.email?.message}
                required
                fullWidth
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Auth/ForgotPasswordPage.tsx
git commit -m "feat(auth): implement ForgotPasswordPage with email form"
```

---

## Task 9: Frontend - Create ResetPasswordPage

**Files:**
- Create: `frontend/src/pages/Auth/ResetPasswordPage.tsx`

- [ ] **Step 1: Create ResetPasswordPage component**

```typescript
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';

const resetPasswordSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    code: z
      .string()
      .length(6, 'Code must be 6 digits')
      .regex(/^\d{6}$/, 'Code must be 6 digits'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Reset Password page - enter code and new password
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get email from navigation state if available
  const emailFromState = (location.state as { email?: string })?.email || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromState,
    },
  });

  // Pre-fill email if coming from forgot password page
  useEffect(() => {
    if (emailFromState) {
      setValue('email', emailFromState);
    }
  }, [emailFromState, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(data.email, data.code, data.newPassword);
      setIsSuccess(true);
      toast.success('Password reset successful!');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card variant="elevated" padding="lg">
            <CardBody>
              <div className="text-center py-4">
                <div className="text-green-500 mb-4">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Password Reset Successful!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your password has been updated. Redirecting to login...
                </p>
                <Link to="/login">
                  <Button variant="primary" fullWidth>
                    Go to Login
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Reset Your Password
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Enter the 6-digit code from your email and choose a new password.
            </p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                id="email"
                {...register('email')}
                error={errors.email?.message}
                required
                fullWidth
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Input
                label="Reset Code"
                type="text"
                id="code"
                {...register('code')}
                error={errors.code?.message}
                required
                fullWidth
                placeholder="123456"
                autoComplete="one-time-code"
                maxLength={6}
                inputMode="numeric"
              />

              <div>
                <Input
                  label="New Password"
                  type="password"
                  id="newPassword"
                  {...register('newPassword')}
                  error={errors.newPassword?.message}
                  required
                  fullWidth
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 12 characters with uppercase, lowercase, number, and special
                  character.
                </p>
              </div>

              <Input
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                required
                fullWidth
                placeholder="Confirm your password"
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="mt-4 text-center space-y-2">
          <Link
            to="/forgot-password"
            className="block text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Request a new code
          </Link>
          <Link
            to="/login"
            className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Auth/ResetPasswordPage.tsx
git commit -m "feat(auth): create ResetPasswordPage component"
```

---

## Task 10: Frontend - Add Route

**Files:**
- Modify: `frontend/src/routes/index.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add ResetPasswordPage import and route**

In `frontend/src/routes/index.tsx`, add after the forgot-password route:

```typescript
{
  path: '/reset-password',
  element: (
    <LazyRoute>
      <ResetPasswordPage />
    </LazyRoute>
  ),
},
```

And add the import at the top with other lazy imports:

```typescript
const ResetPasswordPage = lazy(() => import('../pages/Auth/ResetPasswordPage'));
```

- [ ] **Step 2: Add reset-password to standalone pages list in App.tsx**

In `frontend/src/App.tsx`, add `/reset-password` to the standalone pages array:

```typescript
const isStandalonePage = [
  '/signup',
  '/login',
  '/verify-email',
  '/forgot-password',
  '/reset-password',  // Add this line
].includes(location.pathname);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/index.tsx frontend/src/App.tsx
git commit -m "feat(auth): add reset-password route"
```

---

## Task 11: Backend Unit Tests

**Files:**
- Modify: `services/user-service/src/auth/auth.service.spec.ts` (or create if doesn't exist)

- [ ] **Step 1: Add tests for requestPasswordReset**

```typescript
describe('requestPasswordReset', () => {
  it('should generate token and send email for existing user', async () => {
    // Mock user exists with password
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    });
    verificationService.generateToken.mockResolvedValue('123456');

    await authService.requestPasswordReset('test@example.com');

    expect(verificationService.generateToken).toHaveBeenCalledWith(
      'user-1',
      'test@example.com',
      'PASSWORD_RESET',
    );
  });

  it('should silently succeed for non-existent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(authService.requestPasswordReset('unknown@example.com')).resolves.not.toThrow();
    expect(verificationService.generateToken).not.toHaveBeenCalled();
  });

  it('should silently succeed for OAuth user without password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'oauth@example.com',
      passwordHash: null,
    });

    await expect(authService.requestPasswordReset('oauth@example.com')).resolves.not.toThrow();
    expect(verificationService.generateToken).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Add tests for resetPassword**

```typescript
describe('resetPassword', () => {
  it('should reset password with valid code', async () => {
    verificationService.verifyToken.mockResolvedValue('user-1');
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await authService.resetPassword('test@example.com', '123456', 'NewPassword123!');

    expect(verificationService.verifyToken).toHaveBeenCalledWith(
      'test@example.com',
      '123456',
      'PASSWORD_RESET',
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String) },
    });
  });

  it('should reject weak password', async () => {
    await expect(
      authService.resetPassword('test@example.com', '123456', 'weak'),
    ).rejects.toThrow('Password does not meet requirements');
  });

  it('should reject invalid code', async () => {
    verificationService.verifyToken.mockRejectedValue(
      new BadRequestException({ error: 'INVALID_CODE' }),
    );

    await expect(
      authService.resetPassword('test@example.com', '000000', 'NewPassword123!'),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add services/user-service/src/auth/
git commit -m "test(auth): add unit tests for password reset"
```

---

## Task 12: Final Integration & Testing

- [ ] **Step 1: Run all backend tests**

```bash
cd services/user-service && pnpm test
```

Expected: All tests pass

- [ ] **Step 2: Run frontend type check and lint**

```bash
cd frontend && pnpm typecheck && pnpm lint
```

Expected: No errors

- [ ] **Step 3: Start services and test manually**

```bash
# Terminal 1: Start backend
cd services/user-service && pnpm dev

# Terminal 2: Start frontend
cd frontend && pnpm dev
```

Test flow:
1. Navigate to `/forgot-password`
2. Enter email
3. Check email (or console logs in dev)
4. Navigate to `/reset-password`
5. Enter code and new password
6. Verify success and login works

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "feat(auth): complete forgot password implementation"
git push -u origin feat/forgot-password
```

- [ ] **Step 5: Create PR**

```bash
gh pr create --title "feat(auth): implement forgot password functionality" --body "$(cat <<'EOF'
## Summary
- Add password reset via 6-digit email code
- 15-minute code expiry for security
- Frontend: ForgotPasswordPage + ResetPasswordPage
- Backend: Two new endpoints with rate limiting
- Extends existing VerificationService

## Test plan
- [ ] Request reset for existing account - verify email received
- [ ] Request reset for non-existent account - verify no error (enumeration prevention)
- [ ] Enter valid code + new password - verify success
- [ ] Enter invalid code - verify error message
- [ ] Enter expired code - verify error message
- [ ] Test password strength validation
- [ ] Test rate limiting (3 requests/min for forgot, 5/min for reset)

Closes #TBD

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
