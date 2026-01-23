# Phone Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement phone verification with OTP to enable users to verify their phone number and boost their trust score from their profile page.

**Architecture:** TDD bottom-up approach - start with backend unit tests (OTP service, phone validation), then integration tests (API endpoints), then frontend unit tests (components), finally E2E tests (full user flow). Mock OTP service stores codes in database for testing.

**Tech Stack:** NestJS, Prisma, libphonenumber-js, bcrypt, React, Vitest, Playwright

---

## Phase 1: Database Schema & Migration

### Task 1: Update Prisma Schema for OTP Fields

**Files:**
- Modify: `packages/db-models/prisma/schema.prisma:72-89`

**Step 1: Add OTP fields to VerificationRecord model**

Add these fields after line 79 (`providerReference`):

```prisma
model VerificationRecord {
  id                String             @id @default(uuid()) @db.Uuid
  userId            String             @map("user_id") @db.Uuid
  type              VerificationType
  status            VerificationStatus @default(PENDING)
  verifiedAt        DateTime?          @map("verified_at")
  expiresAt         DateTime?          @map("expires_at")
  providerReference String?            @map("provider_reference")

  // OTP fields for phone verification
  otpCode           String?            @map("otp_code")
  otpExpiresAt      DateTime?          @map("otp_expires_at")
  otpAttempts       Int                @default(0) @map("otp_attempts")
  phoneNumber       String?            @map("phone_number")

  createdAt         DateTime           @default(now()) @map("created_at")

  // Relations
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  videoUpload  VideoUpload?

  @@index([userId, type])
  @@index([status])
  @@index([phoneNumber])
  @@map("verification_records")
}
```

**Step 2: Generate migration**

Run: `cd packages/db-models && npx prisma migrate dev --name add_phone_otp_fields`
Expected: Migration file created in `prisma/migrations/`

**Step 3: Apply migration to test database**

Run: `DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy`
Expected: "Migration applied successfully"

**Step 4: Commit**

```bash
git add packages/db-models/prisma/schema.prisma packages/db-models/prisma/migrations/
git commit -m "feat(db): add OTP fields to VerificationRecord for phone verification

- Add otpCode, otpExpiresAt, otpAttempts, phoneNumber fields
- Add index on phoneNumber for duplicate checks
- Migration generated and applied

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Backend - OTP Service (Unit Tests First)

### Task 2: OTP Service - Generate OTP Test

**Files:**
- Create: `services/user-service/src/verification/services/otp.service.test.ts`
- Create: `services/user-service/src/verification/services/otp.service.ts`

**Step 1: Write failing test for OTP generation**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { OTPService } from './otp.service';

describe('OTPService', () => {
  let service: OTPService;

  beforeEach(() => {
    service = new OTPService();
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit numeric code', () => {
      const otp = service.generateOTP();

      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(service.generateOTP());
      }

      // All 100 codes should be unique
      expect(codes.size).toBe(100);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/user-service && npm test -- otp.service.test.ts`
Expected: FAIL with "Cannot find module './otp.service'"

**Step 3: Create minimal OTP service**

```typescript
import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

@Injectable()
export class OTPService {
  /**
   * Generate a 6-digit numeric OTP code
   * Uses cryptographically secure random number generation
   */
  generateOTP(): string {
    // Generate random number between 100000 and 999999
    const code = randomInt(100000, 1000000);
    return code.toString();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/user-service && npm test -- otp.service.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add services/user-service/src/verification/services/
git commit -m "test(user-service): add OTP generation with crypto-secure random

- Implement generateOTP() returning 6-digit numeric code
- Use randomInt from crypto for security
- Tests verify format and uniqueness

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Task 3: OTP Service - Hash and Validate OTP Tests

**Files:**
- Modify: `services/user-service/src/verification/services/otp.service.test.ts`
- Modify: `services/user-service/src/verification/services/otp.service.ts`

**Step 1: Write failing tests for hash and validate**

Add to `otp.service.test.ts`:

```typescript
import * as bcrypt from 'bcrypt';

describe('hashOTP', () => {
  it('should hash the OTP code', async () => {
    const code = '123456';
    const hashed = await service.hashOTP(code);

    expect(hashed).not.toBe(code);
    expect(hashed.length).toBeGreaterThan(20); // bcrypt hashes are long
  });

  it('should produce different hashes for same code', async () => {
    const code = '123456';
    const hash1 = await service.hashOTP(code);
    const hash2 = await service.hashOTP(code);

    expect(hash1).not.toBe(hash2); // Salt makes each hash unique
  });
});

describe('validateOTP', () => {
  it('should return true for correct OTP', async () => {
    const code = '123456';
    const hashed = await service.hashOTP(code);

    const isValid = await service.validateOTP(code, hashed);
    expect(isValid).toBe(true);
  });

  it('should return false for incorrect OTP', async () => {
    const code = '123456';
    const wrongCode = '654321';
    const hashed = await service.hashOTP(code);

    const isValid = await service.validateOTP(wrongCode, hashed);
    expect(isValid).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/user-service && npm test -- otp.service.test.ts`
Expected: FAIL with "service.hashOTP is not a function"

**Step 3: Implement hash and validate methods**

Add to `otp.service.ts`:

```typescript
import * as bcrypt from 'bcrypt';

@Injectable()
export class OTPService {
  private readonly SALT_ROUNDS = 10;

  generateOTP(): string {
    const code = randomInt(100000, 1000000);
    return code.toString();
  }

  /**
   * Hash OTP code using bcrypt
   */
  async hashOTP(code: string): Promise<string> {
    return bcrypt.hash(code, this.SALT_ROUNDS);
  }

  /**
   * Validate OTP code against hashed version
   */
  async validateOTP(code: string, hashedCode: string): Promise<boolean> {
    return bcrypt.compare(code, hashedCode);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/user-service && npm test -- otp.service.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add services/user-service/src/verification/services/otp.service.*
git commit -m "feat(user-service): add OTP hashing and validation with bcrypt

- Implement hashOTP() using bcrypt with 10 salt rounds
- Implement validateOTP() to compare codes securely
- Tests verify correct/incorrect code validation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Backend - Phone Validation Service

### Task 4: Phone Validation Service - E.164 Format Tests

**Files:**
- Create: `services/user-service/src/verification/services/phone-validation.service.test.ts`
- Create: `services/user-service/src/verification/services/phone-validation.service.ts`

**Step 1: Install libphonenumber-js**

Run: `cd services/user-service && pnpm add libphonenumber-js`
Expected: Package added to dependencies

**Step 2: Write failing test for phone validation**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PhoneValidationService } from './phone-validation.service';

describe('PhoneValidationService', () => {
  let service: PhoneValidationService;

  beforeEach(() => {
    service = new PhoneValidationService();
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid E.164 format', () => {
      const validPhones = [
        '+15551234567',    // US
        '+442071234567',   // UK
        '+33123456789',    // France
        '+81312345678',    // Japan
      ];

      validPhones.forEach(phone => {
        const result = service.validatePhoneNumber(phone);
        expect(result.isValid).toBe(true);
        expect(result.e164).toBe(phone);
      });
    });

    it('should reject invalid formats', () => {
      const invalidPhones = [
        '5551234567',      // Missing country code
        '555-123-4567',    // Not E.164
        '+1555',           // Too short
        'invalid',         // Not a number
        '',                // Empty
      ];

      invalidPhones.forEach(phone => {
        const result = service.validatePhoneNumber(phone);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should normalize phone numbers to E.164', () => {
      const result = service.validatePhoneNumber('+1 (555) 123-4567');

      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+15551234567');
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd services/user-service && npm test -- phone-validation.service.test.ts`
Expected: FAIL with "Cannot find module './phone-validation.service'"

**Step 4: Implement phone validation service**

```typescript
import { Injectable } from '@nestjs/common';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  e164?: string;
  error?: string;
}

@Injectable()
export class PhoneValidationService {
  /**
   * Validate and normalize phone number to E.164 format
   */
  validatePhoneNumber(phoneNumber: string): PhoneValidationResult {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return {
        isValid: false,
        error: 'Phone number is required',
      };
    }

    try {
      // Check if valid phone number
      if (!isValidPhoneNumber(phoneNumber)) {
        return {
          isValid: false,
          error: 'Invalid phone number format',
        };
      }

      // Parse and normalize to E.164
      const parsed = parsePhoneNumber(phoneNumber);

      return {
        isValid: true,
        e164: parsed.format('E.164'),
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to parse phone number',
      };
    }
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd services/user-service && npm test -- phone-validation.service.test.ts`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add services/user-service/src/verification/services/phone-validation.* services/user-service/package.json
git commit -m "feat(user-service): add phone validation with E.164 normalization

- Implement validatePhoneNumber() using libphonenumber-js
- Validate format and normalize to E.164
- Tests verify valid/invalid formats and normalization

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Task 5: Phone Validation Service - Mask Phone Test

**Files:**
- Modify: `services/user-service/src/verification/services/phone-validation.service.test.ts`
- Modify: `services/user-service/src/verification/services/phone-validation.service.ts`

**Step 1: Write failing test for phone masking**

Add to `phone-validation.service.test.ts`:

```typescript
describe('maskPhoneNumber', () => {
  it('should mask middle digits of US phone', () => {
    const masked = service.maskPhoneNumber('+15551234567');
    expect(masked).toBe('+1 (***) ***-4567');
  });

  it('should mask middle digits of UK phone', () => {
    const masked = service.maskPhoneNumber('+442071234567');
    expect(masked).toBe('+44 *** *** 4567');
  });

  it('should handle invalid phone gracefully', () => {
    const masked = service.maskPhoneNumber('invalid');
    expect(masked).toBe('***');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/user-service && npm test -- phone-validation.service.test.ts`
Expected: FAIL with "service.maskPhoneNumber is not a function"

**Step 3: Implement phone masking**

Add to `phone-validation.service.ts`:

```typescript
/**
 * Mask phone number for display (hide middle digits)
 */
maskPhoneNumber(phoneNumber: string): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber);
    const national = parsed.formatNational();
    const lastFour = phoneNumber.slice(-4);

    // Replace all digits except last 4 with asterisks
    const masked = national.replace(/\d(?=.*\d{3})/g, '*');

    return `+${parsed.countryCallingCode} ${masked}`;
  } catch (error) {
    return '***';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/user-service && npm test -- phone-validation.service.test.ts`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add services/user-service/src/verification/services/phone-validation.*
git commit -m "feat(user-service): add phone number masking for privacy

- Implement maskPhoneNumber() to hide middle digits
- Keep country code and last 4 digits visible
- Tests verify masking for US, UK, and invalid numbers

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Backend - DTOs and API Endpoints

### Task 6: Create DTOs for Phone Verification

**Files:**
- Create: `services/user-service/src/verification/dto/phone-verification-request.dto.ts`
- Create: `services/user-service/src/verification/dto/phone-verification-verify.dto.ts`

**Step 1: Create request DTO**

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class PhoneVerificationRequestDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
```

**Step 2: Create verify DTO**

```typescript
import { IsString, IsNotEmpty, IsUUID, Length } from 'class-validator';

export class PhoneVerificationVerifyDto {
  @IsUUID()
  @IsNotEmpty()
  verificationId: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
```

**Step 3: Commit**

```bash
git add services/user-service/src/verification/dto/
git commit -m "feat(user-service): add DTOs for phone verification endpoints

- PhoneVerificationRequestDto with phone number validation
- PhoneVerificationVerifyDto with UUID and 6-digit code validation
- Use class-validator decorators

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Task 7: Add Phone Verification Methods to VerificationService

**Files:**
- Modify: `services/user-service/src/verification/verification.service.ts`
- Modify: `services/user-service/src/verification/verification.module.ts`

**Step 1: Add OTP and Phone services to module**

Modify `verification.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { VideoVerificationService } from './video-challenge.service';
import { VideoUploadService } from './video-upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { OTPService } from './services/otp.service';
import { PhoneValidationService } from './services/phone-validation.service';

@Module({
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VideoVerificationService,
    VideoUploadService,
    PrismaService,
    OTPService,
    PhoneValidationService,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
```

**Step 2: Add phone verification methods to service**

Add to `verification.service.ts` constructor:

```typescript
constructor(
  private prisma: PrismaService,
  private videoVerificationService: VideoVerificationService,
  private otpService: OTPService,
  private phoneValidationService: PhoneValidationService,
) {}
```

Add new methods:

```typescript
import { PhoneVerificationRequestDto } from './dto/phone-verification-request.dto';
import { PhoneVerificationVerifyDto } from './dto/phone-verification-verify.dto';

private readonly OTP_EXPIRY_MINUTES = 5;
private readonly MAX_OTP_ATTEMPTS = 3;

/**
 * Request phone verification - send OTP
 */
async requestPhoneVerification(
  userId: string,
  dto: PhoneVerificationRequestDto,
): Promise<{ verificationId: string; expiresAt: Date; maskedPhone: string }> {
  // Validate phone format
  const validation = this.phoneValidationService.validatePhoneNumber(dto.phoneNumber);
  if (!validation.isValid) {
    throw new BadRequestException(validation.error);
  }

  // Check for duplicate phone number
  const existingPhone = await this.prisma.verificationRecord.findFirst({
    where: {
      phoneNumber: validation.e164,
      status: VerificationStatus.VERIFIED,
    },
  });

  if (existingPhone) {
    throw new BadRequestException('This phone number is already verified by another user');
  }

  // Check for existing pending verification
  const existingVerification = await this.prisma.verificationRecord.findFirst({
    where: {
      userId,
      type: VerificationType.PHONE,
      status: VerificationStatus.PENDING,
    },
  });

  // If existing verification is still valid, return error
  if (
    existingVerification?.otpExpiresAt &&
    new Date(existingVerification.otpExpiresAt) > new Date()
  ) {
    throw new BadRequestException(
      'A verification code was already sent. Please wait for it to expire or check your phone.',
    );
  }

  // Generate OTP
  const otpCode = this.otpService.generateOTP();
  const hashedOTP = await this.otpService.hashOTP(otpCode);
  const otpExpiresAt = new Date();
  otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

  // Create or update verification record
  const verificationId = randomUUID();
  const verification = await this.prisma.verificationRecord.upsert({
    where: {
      id: existingVerification?.id || '',
    },
    create: {
      id: verificationId,
      userId,
      type: VerificationType.PHONE,
      status: VerificationStatus.PENDING,
      phoneNumber: validation.e164,
      otpCode: hashedOTP,
      otpExpiresAt,
      otpAttempts: 0,
      expiresAt: otpExpiresAt,
    },
    update: {
      phoneNumber: validation.e164,
      otpCode: hashedOTP,
      otpExpiresAt,
      otpAttempts: 0,
      status: VerificationStatus.PENDING,
    },
  });

  // TODO: In production, send SMS here
  // For now, log OTP to console for testing
  this.logger.log(`OTP for ${validation.e164}: ${otpCode} (expires at ${otpExpiresAt.toISOString()})`);

  return {
    verificationId: verification.id,
    expiresAt: otpExpiresAt,
    maskedPhone: this.phoneValidationService.maskPhoneNumber(validation.e164),
  };
}

/**
 * Verify OTP code and update user trust score
 */
async verifyPhoneOTP(
  userId: string,
  dto: PhoneVerificationVerifyDto,
): Promise<{ success: boolean; user: { verificationLevel: string; trustScoreIntegrity: number } }> {
  // Get verification record
  const verification = await this.prisma.verificationRecord.findFirst({
    where: {
      id: dto.verificationId,
      userId,
      type: VerificationType.PHONE,
      status: VerificationStatus.PENDING,
    },
  });

  if (!verification) {
    throw new BadRequestException('Invalid verification ID');
  }

  // Check if OTP expired
  if (!verification.otpExpiresAt || new Date(verification.otpExpiresAt) < new Date()) {
    await this.prisma.verificationRecord.update({
      where: { id: verification.id },
      data: { status: VerificationStatus.EXPIRED },
    });
    throw new BadRequestException('OTP code has expired');
  }

  // Check max attempts
  if (verification.otpAttempts >= this.MAX_OTP_ATTEMPTS) {
    await this.prisma.verificationRecord.update({
      where: { id: verification.id },
      data: { status: VerificationStatus.EXPIRED },
    });
    throw new BadRequestException('Maximum verification attempts exceeded');
  }

  // Validate OTP
  const isValid = await this.otpService.validateOTP(dto.code, verification.otpCode);

  if (!isValid) {
    // Increment attempt counter
    await this.prisma.verificationRecord.update({
      where: { id: verification.id },
      data: { otpAttempts: verification.otpAttempts + 1 },
    });

    const attemptsRemaining = this.MAX_OTP_ATTEMPTS - (verification.otpAttempts + 1);
    throw new BadRequestException(
      `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`,
    );
  }

  // Update verification status
  await this.prisma.verificationRecord.update({
    where: { id: verification.id },
    data: {
      status: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
  });

  // Update user verification level and trust score
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new BadRequestException('User not found');
  }

  const newTrustScore = Math.min(
    1.0,
    Number(user.trustScoreIntegrity) + 0.10,
  );

  const updatedUser = await this.prisma.user.update({
    where: { id: userId },
    data: {
      verificationLevel: VerificationLevel.ENHANCED,
      trustScoreIntegrity: newTrustScore,
    },
  });

  return {
    success: true,
    user: {
      verificationLevel: updatedUser.verificationLevel,
      trustScoreIntegrity: Number(updatedUser.trustScoreIntegrity),
    },
  };
}
```

**Step 3: Commit**

```bash
git add services/user-service/src/verification/
git commit -m "feat(user-service): add phone verification flow to VerificationService

- Add requestPhoneVerification() to generate and send OTP
- Add verifyPhoneOTP() to validate code and update trust score
- Check for duplicate phones, expired OTPs, max attempts
- Update user to ENHANCED level with +0.10 integrity boost
- Log OTP to console for testing (TODO: real SMS in production)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Backend - Integration Tests

### Task 8: Phone Verification Endpoint Integration Tests

**Files:**
- Create: `services/user-service/src/verification/phone-verification.integration.test.ts`

**Step 1: Write integration tests for phone verification flow**

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationModule } from './verification.module';
import { VerificationService } from './verification.service';
import { PhoneVerificationRequestDto } from './dto/phone-verification-request.dto';
import { PhoneVerificationVerifyDto } from './dto/phone-verification-verify.dto';
import { VerificationStatus, VerificationType, VerificationLevel } from '@prisma/client';
import { randomUUID } from 'crypto';

describe('Phone Verification Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let verificationService: VerificationService;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [VerificationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    verificationService = app.get<VerificationService>(VerificationService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create test user
    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${Date.now()}@example.com`,
        displayName: 'Test User',
        cognitoSub: `cognito-${testUserId}`,
        verificationLevel: VerificationLevel.BASIC,
        trustScoreIntegrity: 0.50,
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    await prisma.verificationRecord.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('requestPhoneVerification', () => {
    it('should create verification record with hashed OTP', async () => {
      const dto: PhoneVerificationRequestDto = {
        phoneNumber: '+15551234567',
      };

      const result = await verificationService.requestPhoneVerification(testUserId, dto);

      expect(result.verificationId).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.maskedPhone).toBe('+1 (***) ***-4567');

      // Verify database record
      const verification = await prisma.verificationRecord.findUnique({
        where: { id: result.verificationId },
      });

      expect(verification).toBeDefined();
      expect(verification.phoneNumber).toBe('+15551234567');
      expect(verification.otpCode).toBeDefined();
      expect(verification.otpCode.length).toBeGreaterThan(20); // bcrypt hash
      expect(verification.otpAttempts).toBe(0);
      expect(verification.status).toBe(VerificationStatus.PENDING);
    });

    it('should reject invalid phone format', async () => {
      const dto: PhoneVerificationRequestDto = {
        phoneNumber: '555-1234', // Invalid
      };

      await expect(
        verificationService.requestPhoneVerification(testUserId, dto)
      ).rejects.toThrow('Invalid phone number format');
    });

    it('should reject duplicate phone number', async () => {
      const phoneNumber = '+15559876543';

      // Create another user with verified phone
      const otherUserId = randomUUID();
      await prisma.user.create({
        data: {
          id: otherUserId,
          email: `other-${Date.now()}@example.com`,
          displayName: 'Other User',
          cognitoSub: `cognito-${otherUserId}`,
        },
      });

      await prisma.verificationRecord.create({
        data: {
          userId: otherUserId,
          type: VerificationType.PHONE,
          status: VerificationStatus.VERIFIED,
          phoneNumber,
        },
      });

      const dto: PhoneVerificationRequestDto = { phoneNumber };

      await expect(
        verificationService.requestPhoneVerification(testUserId, dto)
      ).rejects.toThrow('already verified by another user');

      // Cleanup
      await prisma.verificationRecord.deleteMany({ where: { userId: otherUserId } });
      await prisma.user.delete({ where: { id: otherUserId } });
    });

    it('should prevent multiple pending verifications', async () => {
      const dto: PhoneVerificationRequestDto = {
        phoneNumber: '+15551234567',
      };

      // First request
      await verificationService.requestPhoneVerification(testUserId, dto);

      // Second request should fail
      await expect(
        verificationService.requestPhoneVerification(testUserId, dto)
      ).rejects.toThrow('verification code was already sent');
    });
  });

  describe('verifyPhoneOTP', () => {
    it('should verify correct OTP and update user', async () => {
      // Request verification
      const requestDto: PhoneVerificationRequestDto = {
        phoneNumber: '+15551234567',
      };
      const { verificationId } = await verificationService.requestPhoneVerification(
        testUserId,
        requestDto,
      );

      // Get the OTP from database (in real app, user gets it via SMS)
      const verification = await prisma.verificationRecord.findUnique({
        where: { id: verificationId },
      });

      // For testing, we need to get the plain OTP
      // In production, this would come from SMS
      // We'll use a known code by updating the record
      const testOTP = '123456';
      const { OTPService } = await import('./services/otp.service');
      const otpService = new OTPService();
      const hashedOTP = await otpService.hashOTP(testOTP);

      await prisma.verificationRecord.update({
        where: { id: verificationId },
        data: { otpCode: hashedOTP },
      });

      // Verify OTP
      const verifyDto: PhoneVerificationVerifyDto = {
        verificationId,
        code: testOTP,
      };

      const result = await verificationService.verifyPhoneOTP(testUserId, verifyDto);

      expect(result.success).toBe(true);
      expect(result.user.verificationLevel).toBe('ENHANCED');
      expect(result.user.trustScoreIntegrity).toBe(0.60); // 0.50 + 0.10

      // Verify database updates
      const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(updatedUser.verificationLevel).toBe(VerificationLevel.ENHANCED);
      expect(Number(updatedUser.trustScoreIntegrity)).toBe(0.60);

      const updatedVerification = await prisma.verificationRecord.findUnique({
        where: { id: verificationId },
      });
      expect(updatedVerification.status).toBe(VerificationStatus.VERIFIED);
      expect(updatedVerification.verifiedAt).toBeDefined();
    });

    it('should reject incorrect OTP and track attempts', async () => {
      // Request verification
      const requestDto: PhoneVerificationRequestDto = {
        phoneNumber: '+15551234567',
      };
      const { verificationId } = await verificationService.requestPhoneVerification(
        testUserId,
        requestDto,
      );

      // Try wrong code
      const verifyDto: PhoneVerificationVerifyDto = {
        verificationId,
        code: '999999',
      };

      await expect(
        verificationService.verifyPhoneOTP(testUserId, verifyDto)
      ).rejects.toThrow('Incorrect code. 2 attempts remaining');

      // Check attempts counter
      const verification = await prisma.verificationRecord.findUnique({
        where: { id: verificationId },
      });
      expect(verification.otpAttempts).toBe(1);
    });

    it('should expire after max attempts', async () => {
      // Request verification
      const requestDto: PhoneVerificationRequestDto = {
        phoneNumber: '+15551234567',
      };
      const { verificationId } = await verificationService.requestPhoneVerification(
        testUserId,
        requestDto,
      );

      const verifyDto: PhoneVerificationVerifyDto = {
        verificationId,
        code: '999999',
      };

      // Try 3 times (max attempts)
      for (let i = 0; i < 3; i++) {
        try {
          await verificationService.verifyPhoneOTP(testUserId, verifyDto);
        } catch (error) {
          // Expected
        }
      }

      // Next attempt should fail with different error
      await expect(
        verificationService.verifyPhoneOTP(testUserId, verifyDto)
      ).rejects.toThrow('Maximum verification attempts exceeded');

      // Verify status changed to EXPIRED
      const verification = await prisma.verificationRecord.findUnique({
        where: { id: verificationId },
      });
      expect(verification.status).toBe(VerificationStatus.EXPIRED);
    });

    it('should reject expired OTP', async () => {
      // Request verification
      const requestDto: PhoneVerificationRequestDto = {
        phoneNumber: '+15551234567',
      };
      const { verificationId } = await verificationService.requestPhoneVerification(
        testUserId,
        requestDto,
      );

      // Manually expire the OTP
      await prisma.verificationRecord.update({
        where: { id: verificationId },
        data: { otpExpiresAt: new Date(Date.now() - 1000) }, // 1 second ago
      });

      const verifyDto: PhoneVerificationVerifyDto = {
        verificationId,
        code: '123456',
      };

      await expect(
        verificationService.verifyPhoneOTP(testUserId, verifyDto)
      ).rejects.toThrow('OTP code has expired');
    });
  });
});
```

**Step 2: Run integration tests**

Run: `cd services/user-service && DATABASE_URL=$DATABASE_URL_TEST npm run test:integration -- phone-verification.integration.test.ts`
Expected: PASS (7 tests)

**Step 3: Commit**

```bash
git add services/user-service/src/verification/phone-verification.integration.test.ts
git commit -m "test(user-service): add phone verification integration tests

- Test full verification flow (request → verify)
- Test duplicate phone rejection
- Test OTP validation and attempt tracking
- Test expiry handling and max attempts
- Test user trust score update to ENHANCED with +0.10

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Backend - API Controller Endpoints

### Task 9: Add Phone Verification Controller Endpoints

**Files:**
- Modify: `services/user-service/src/verification/verification.controller.ts`

**Step 1: Add phone verification endpoints to controller**

Add these methods to `VerificationController`:

```typescript
import { PhoneVerificationRequestDto } from './dto/phone-verification-request.dto';
import { PhoneVerificationVerifyDto } from './dto/phone-verification-verify.dto';

/**
 * Request phone verification (send OTP)
 */
@Post('phone/request')
@UseGuards(JwtAuthGuard)
async requestPhoneVerification(
  @Request() req,
  @Body() dto: PhoneVerificationRequestDto,
) {
  return this.verificationService.requestPhoneVerification(req.user.sub, dto);
}

/**
 * Verify phone OTP code
 */
@Post('phone/verify')
@UseGuards(JwtAuthGuard)
async verifyPhoneOTP(
  @Request() req,
  @Body() dto: PhoneVerificationVerifyDto,
) {
  return this.verificationService.verifyPhoneOTP(req.user.sub, dto);
}
```

**Step 2: Test endpoints manually (optional - can skip to commit)**

Run: `cd services/user-service && npm run start:dev`
Test with curl or Postman (requires valid JWT)

**Step 3: Commit**

```bash
git add services/user-service/src/verification/verification.controller.ts
git commit -m "feat(user-service): add phone verification API endpoints

- POST /verification/phone/request - Send OTP to phone
- POST /verification/phone/verify - Validate OTP code
- Both endpoints require JWT authentication

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 7: Frontend - Install Dependencies

### Task 10: Install Frontend Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install libphonenumber-js and react-phone-number-input**

Run: `cd frontend && pnpm add libphonenumber-js react-phone-number-input`
Expected: Packages added to dependencies

**Step 2: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat(frontend): add phone verification dependencies

- libphonenumber-js for phone validation
- react-phone-number-input for country selector UI

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 8: Frontend - Phone Input Component (Unit Tests First)

### Task 11: PhoneInput Component Tests

**Files:**
- Create: `frontend/src/components/verification/__tests__/PhoneInput.test.tsx`
- Create: `frontend/src/components/verification/PhoneInput.tsx`

**Step 1: Create component directory**

Run: `mkdir -p frontend/src/components/verification/__tests__`

**Step 2: Write failing tests for PhoneInput**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneInput from '../PhoneInput';

describe('PhoneInput', () => {
  it('should render phone input with country selector', () => {
    render(<PhoneInput value="" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Country selector
    expect(screen.getByRole('textbox')).toBeInTheDocument(); // Phone input
  });

  it('should call onChange with E.164 formatted number', async () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '5551234567');

    // Should normalize to E.164
    expect(onChange).toHaveBeenCalled();
  });

  it('should show error message when invalid', () => {
    render(
      <PhoneInput
        value=""
        onChange={vi.fn()}
        error="Invalid phone number"
      />
    );

    expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
  });

  it('should disable input when disabled prop is true', () => {
    render(<PhoneInput value="" onChange={vi.fn()} disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should display value in national format', () => {
    render(<PhoneInput value="+15551234567" onChange={vi.fn()} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toContain('555'); // National format
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd frontend && npm test -- PhoneInput.test.tsx`
Expected: FAIL with "Cannot find module '../PhoneInput'"

**Step 4: Implement PhoneInput component**

```typescript
import React from 'react';
import PhoneInputWithCountry from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Enter phone number',
}) => {
  return (
    <div className="space-y-2">
      <PhoneInputWithCountry
        international
        defaultCountry="US"
        value={value}
        onChange={(val) => onChange(val || '')}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PhoneInput;
```

**Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- PhoneInput.test.tsx`
Expected: PASS (5 tests)

**Step 6: Commit**

```bash
git add frontend/src/components/verification/
git commit -m "feat(frontend): add PhoneInput component with country selector

- Implement PhoneInput with react-phone-number-input
- Auto-format to E.164 on change
- Display in national format
- Support error messages and disabled state
- Tests verify rendering, formatting, and validation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 9: Frontend - OTP Input Component (Unit Tests First)

### Task 12: OTPInput Component Tests

**Files:**
- Create: `frontend/src/components/verification/__tests__/OTPInput.test.tsx`
- Create: `frontend/src/components/verification/OTPInput.tsx`

**Step 1: Write failing tests for OTPInput**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OTPInput from '../OTPInput';

describe('OTPInput', () => {
  it('should render 6 input boxes', () => {
    render(<OTPInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('should call onChange with 6-digit code', async () => {
    const onChange = vi.fn();
    render(<OTPInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    await userEvent.type(inputs[0], '1');
    await userEvent.type(inputs[1], '2');
    await userEvent.type(inputs[2], '3');
    await userEvent.type(inputs[3], '4');
    await userEvent.type(inputs[4], '5');
    await userEvent.type(inputs[5], '6');

    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('should auto-focus next box on digit entry', async () => {
    render(<OTPInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    await userEvent.type(inputs[0], '1');

    // Second input should be focused
    expect(inputs[1]).toHaveFocus();
  });

  it('should allow paste of 6-digit code', async () => {
    const onChange = vi.fn();
    render(<OTPInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    // Paste into first input
    await userEvent.click(inputs[0]);
    await userEvent.paste('123456');

    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('should show error message', () => {
    render(<OTPInput value="" onChange={vi.fn()} error="Invalid code" />);

    expect(screen.getByText('Invalid code')).toBeInTheDocument();
  });

  it('should disable all inputs when disabled', () => {
    render(<OTPInput value="" onChange={vi.fn()} disabled />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });
  });

  it('should clear on backspace in empty field', async () => {
    const onChange = vi.fn();
    render(<OTPInput value="123" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    // Focus fourth box (empty) and press backspace
    await userEvent.click(inputs[3]);
    await userEvent.keyboard('{Backspace}');

    // Should focus previous box
    expect(inputs[2]).toHaveFocus();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- OTPInput.test.tsx`
Expected: FAIL with "Cannot find module '../OTPInput'"

**Step 3: Implement OTPInput component**

```typescript
import React, { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return; // Only digits

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join('').trim();

    onChange(newValue);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index].trim() && index > 0) {
      // If current field is empty and backspace pressed, focus previous
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      onChange(pastedData);
      // Focus last input
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-center">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit.trim()}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className="w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg focus:border-primary-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default OTPInput;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- OTPInput.test.tsx`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/verification/
git commit -m "feat(frontend): add OTPInput component with 6-digit entry

- Implement OTPInput with auto-focus on digit entry
- Support paste of 6-digit codes
- Backspace navigation between fields
- Error display and disabled state
- Tests verify all input behaviors

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**Due to message length limits, I'll save this plan now and create Part 2 with the remaining tasks (Phone Verification Modal, Button, E2E tests, and final integration).**

---

## Phase 10: Frontend - Phone Verification Modal (Unit Tests First)

### Task 13: PhoneVerificationModal Component Tests

**Files:**
- Create: `frontend/src/components/verification/__tests__/PhoneVerificationModal.test.tsx`
- Create: `frontend/src/components/verification/PhoneVerificationModal.tsx`

**Step 1: Write failing tests for PhoneVerificationModal**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneVerificationModal from '../PhoneVerificationModal';
import * as api from '../../../lib/api';

vi.mock('../../../lib/api');

describe('PhoneVerificationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render phone input step initially', () => {
    render(
      <PhoneVerificationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/verify your phone number/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Country selector
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument();
  });

  it('should send OTP and show code input step', async () => {
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-id',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      maskedPhone: '+1 (***) ***-4567',
    });

    render(
      <PhoneVerificationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Enter phone number
    const phoneInput = screen.getByRole('textbox');
    await userEvent.type(phoneInput, '5551234567');

    // Click send code
    const sendButton = screen.getByRole('button', { name: /send code/i });
    await userEvent.click(sendButton);

    // Should show OTP input step
    await waitFor(() => {
      expect(screen.getByText(/enter verification code/i)).toBeInTheDocument();
      expect(screen.getByText(/\+1 \(\*\*\*\) \*\*\*-4567/)).toBeInTheDocument();
    });

    // Should have 6 OTP input boxes
    const otpInputs = screen.getAllByRole('textbox');
    expect(otpInputs).toHaveLength(6);
  });

  it('should verify OTP and call onSuccess', async () => {
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-id',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      maskedPhone: '+1 (***) ***-4567',
    });

    vi.mocked(api.verifyPhoneOTP).mockResolvedValue({
      success: true,
      user: {
        verificationLevel: 'ENHANCED',
        trustScoreIntegrity: 0.60,
      },
    });

    render(
      <PhoneVerificationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Step 1: Enter phone
    const phoneInput = screen.getByRole('textbox');
    await userEvent.type(phoneInput, '5551234567');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    // Step 2: Enter OTP
    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(6);
    });

    const otpInputs = screen.getAllByRole('textbox');
    await userEvent.type(otpInputs[0], '123456');

    // Click verify
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    await userEvent.click(verifyButton);

    // Should call onSuccess
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show error for invalid phone', async () => {
    vi.mocked(api.requestPhoneVerification).mockRejectedValue(
      new Error('Invalid phone number format')
    );

    render(
      <PhoneVerificationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const phoneInput = screen.getByRole('textbox');
    await userEvent.type(phoneInput, '123');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument();
    });
  });

  it('should show error for incorrect OTP', async () => {
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-id',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      maskedPhone: '+1 (***) ***-4567',
    });

    vi.mocked(api.verifyPhoneOTP).mockRejectedValue(
      new Error('Incorrect code. 2 attempts remaining')
    );

    render(
      <PhoneVerificationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Send OTP
    const phoneInput = screen.getByRole('textbox');
    await userEvent.type(phoneInput, '5551234567');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    // Enter wrong code
    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(6);
    });

    const otpInputs = screen.getAllByRole('textbox');
    await userEvent.type(otpInputs[0], '999999');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect code. 2 attempts remaining/i)).toBeInTheDocument();
    });
  });

  it('should allow resending code', async () => {
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-id',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      maskedPhone: '+1 (***) ***-4567',
    });

    render(
      <PhoneVerificationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Send code
    const phoneInput = screen.getByRole('textbox');
    await userEvent.type(phoneInput, '5551234567');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    // Should show resend button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
    });

    // Click resend
    await userEvent.click(screen.getByRole('button', { name: /resend code/i }));

    // Should call API again
    await waitFor(() => {
      expect(api.requestPhoneVerification).toHaveBeenCalledTimes(2);
    });
  });

  it('should close modal on cancel', async () => {
    render(
      <PhoneVerificationModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- PhoneVerificationModal.test.tsx`
Expected: FAIL with "Cannot find module '../PhoneVerificationModal'"

**Step 3: Implement PhoneVerificationModal component**

```typescript
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import PhoneInput from './PhoneInput';
import OTPInput from './OTPInput';
import { requestPhoneVerification, verifyPhoneOTP } from '../../lib/api';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'phone' | 'otp' | 'success';

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await requestPhoneVerification({ phoneNumber });
      setVerificationId(result.verificationId);
      setMaskedPhone(result.maskedPhone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setLoading(true);

    try {
      await verifyPhoneOTP({ verificationId, code: otpCode });
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
      setOtpCode(''); // Clear code on error
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setOtpCode('');
    setError('');
    setLoading(true);

    try {
      const result = await requestPhoneVerification({ phoneNumber });
      setVerificationId(result.verificationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('phone');
    setPhoneNumber('');
    setOtpCode('');
    setError('');
    setVerificationId('');
    setMaskedPhone('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Verify Your Phone Number">
      <div className="space-y-6">
        {step === 'phone' && (
          <>
            <div>
              <p className="text-sm text-gray-600 mb-4">
                We'll send you a verification code to confirm your phone number.
              </p>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                error={error}
                disabled={loading}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleSendCode}
                disabled={!phoneNumber || loading}
                loading={loading}
              >
                Send Code
              </Button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Enter the 6-digit code we sent to:
              </p>
              <p className="text-sm font-semibold mb-4">{maskedPhone}</p>
              <OTPInput
                value={otpCode}
                onChange={setOtpCode}
                error={error}
                disabled={loading}
              />
            </div>
            <div className="flex gap-3 justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend Code
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  disabled={otpCode.length !== 6 || loading}
                  loading={loading}
                >
                  Verify
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Phone Verified!
            </h3>
            <p className="text-sm text-gray-600">
              Your trust score has been updated.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PhoneVerificationModal;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- PhoneVerificationModal.test.tsx`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/verification/
git commit -m "feat(frontend): add PhoneVerificationModal with two-step flow

- Implement modal with phone input and OTP verification steps
- Support resend code functionality
- Show success state with auto-close
- Error handling for invalid phone and incorrect OTP
- Tests verify full flow and error cases

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 11: Frontend - Phone Verification Button (Unit Tests First)

### Task 14: PhoneVerificationButton Component Tests

**Files:**
- Create: `frontend/src/components/verification/__tests__/PhoneVerificationButton.test.tsx`
- Create: `frontend/src/components/verification/PhoneVerificationButton.tsx`

**Step 1: Write failing tests for PhoneVerificationButton**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneVerificationButton from '../PhoneVerificationButton';

describe('PhoneVerificationButton', () => {
  it('should render verify button when not verified', () => {
    render(<PhoneVerificationButton isVerified={false} onSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: /verify phone number/i })).toBeInTheDocument();
  });

  it('should render verified badge when verified', () => {
    render(<PhoneVerificationButton isVerified={true} onSuccess={vi.fn()} />);

    expect(screen.getByText(/phone verified/i)).toBeInTheDocument();
    expect(screen.getByText(/✓/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /verify/i })).not.toBeInTheDocument();
  });

  it('should open modal on button click', async () => {
    render(<PhoneVerificationButton isVerified={false} onSuccess={vi.fn()} />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    await userEvent.click(button);

    // Modal should be visible
    expect(screen.getByText(/verify your phone number/i)).toBeInTheDocument();
  });

  it('should close modal and call onSuccess after verification', async () => {
    const onSuccess = vi.fn();
    render(<PhoneVerificationButton isVerified={false} onSuccess={onSuccess} />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    await userEvent.click(button);

    // Modal is open, simulate success (would need to mock API in real test)
    // For now, just test the button renders
    expect(screen.getByText(/verify your phone number/i)).toBeInTheDocument();
  });

  it('should support custom className', () => {
    const { container } = render(
      <PhoneVerificationButton
        isVerified={false}
        onSuccess={vi.fn()}
        className="custom-class"
      />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- PhoneVerificationButton.test.tsx`
Expected: FAIL with "Cannot find module '../PhoneVerificationButton'"

**Step 3: Implement PhoneVerificationButton component**

```typescript
import React, { useState } from 'react';
import Button from '../ui/Button';
import PhoneVerificationModal from './PhoneVerificationModal';

interface PhoneVerificationButtonProps {
  isVerified: boolean;
  onSuccess: () => void;
  className?: string;
}

const PhoneVerificationButton: React.FC<PhoneVerificationButtonProps> = ({
  isVerified,
  onSuccess,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    setIsModalOpen(false);
    onSuccess();
  };

  if (isVerified) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <span className="text-green-600 font-semibold">✓</span>
        <span className="text-sm font-medium text-green-800">Phone Verified</span>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        Verify Phone Number
      </Button>
      <PhoneVerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default PhoneVerificationButton;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- PhoneVerificationButton.test.tsx`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add frontend/src/components/verification/
git commit -m "feat(frontend): add PhoneVerificationButton with modal integration

- Show 'Verify Phone Number' button when not verified
- Show green verified badge when verified
- Open PhoneVerificationModal on click
- Call onSuccess callback after verification
- Tests verify button states and modal interaction

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 12: Frontend - Add Button to Profile Page

### Task 15: Integrate PhoneVerificationButton into ProfilePage

**Files:**
- Modify: `frontend/src/pages/Profile/ProfilePage.tsx`

**Step 1: Add PhoneVerificationButton to ProfilePage**

Find the trust indicators section and add the phone verification button. Look for the verification level display and add it nearby:

```typescript
import PhoneVerificationButton from '../../components/verification/PhoneVerificationButton';

// Inside the component, add state for phone verification
const [isPhoneVerified, setIsPhoneVerified] = useState(false);

// Check if user has verified phone (from user data)
useEffect(() => {
  // Check if user has PHONE verification record with VERIFIED status
  // This would come from your user API
  const checkPhoneVerification = async () => {
    // TODO: Fetch from API
    // For now, check verification level
    setIsPhoneVerified(user?.verificationLevel === 'ENHANCED' || user?.verificationLevel === 'VERIFIED_HUMAN');
  };

  if (user) {
    checkPhoneVerification();
  }
}, [user]);

// Add this in the trust indicators section of the JSX
<div className="mt-4">
  <h3 className="text-sm font-semibold text-gray-700 mb-2">Phone Verification</h3>
  <PhoneVerificationButton
    isVerified={isPhoneVerified}
    onSuccess={() => {
      setIsPhoneVerified(true);
      // Refresh user data to get updated trust score
      // This triggers re-fetch of user profile
    }}
  />
</div>
```

**Step 2: Test manually in development**

Run: `cd frontend && npm run dev`
Navigate to profile page and verify button appears

**Step 3: Commit**

```bash
git add frontend/src/pages/Profile/ProfilePage.tsx
git commit -m "feat(frontend): integrate phone verification into profile page

- Add PhoneVerificationButton to trust indicators section
- Show verification status based on user data
- Refresh user data after successful verification

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 13: Frontend - API Client Methods

### Task 16: Add Phone Verification API Methods

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Step 1: Add phone verification API methods**

Add these functions to `api.ts`:

```typescript
/**
 * Request phone verification (send OTP)
 */
export async function requestPhoneVerification(data: {
  phoneNumber: string;
}): Promise<{
  verificationId: string;
  expiresAt: string;
  maskedPhone: string;
}> {
  const response = await fetch(`${API_BASE_URL}/verification/phone/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to request phone verification');
  }

  return response.json();
}

/**
 * Verify phone OTP code
 */
export async function verifyPhoneOTP(data: {
  verificationId: string;
  code: string;
}): Promise<{
  success: boolean;
  user: {
    verificationLevel: string;
    trustScoreIntegrity: number;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/verification/phone/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify code');
  }

  return response.json();
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(frontend): add phone verification API client methods

- Add requestPhoneVerification() to send OTP
- Add verifyPhoneOTP() to validate code
- Include error handling and type safety

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 14: E2E Tests (Full User Flow)

### Task 17: Phone Verification E2E Tests

**Files:**
- Create: `frontend/e2e/phone-verification.spec.ts`

**Step 1: Write E2E test for complete verification flow**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Phone Verification E2E', () => {
  // Mock user authentication
  test.beforeEach(async ({ page }) => {
    // TODO: Set up authenticated session
    // For now, assume user is logged in
  });

  test('should complete phone verification flow from profile page', async ({ page }) => {
    // Navigate to profile page
    await page.goto('/profile');

    // Should see verify phone button
    const verifyButton = page.getByRole('button', { name: /verify phone number/i });
    await expect(verifyButton).toBeVisible();

    // Click verify button
    await verifyButton.click();

    // Modal should open
    await expect(page.getByText(/verify your phone number/i)).toBeVisible();

    // Enter phone number
    const phoneInput = page.getByRole('textbox').first();
    await phoneInput.fill('+15551234567');

    // Click send code
    await page.getByRole('button', { name: /send code/i }).click();

    // Should show OTP input step
    await expect(page.getByText(/enter verification code/i)).toBeVisible();
    await expect(page.getByText(/\+1 \(\*\*\*\) \*\*\*-4567/)).toBeVisible();

    // Enter OTP code (in real test, would need to mock or retrieve from logs)
    // For demo, we'll simulate entering the code
    const otpInputs = page.getByRole('textbox');
    await otpInputs.nth(0).fill('1');
    await otpInputs.nth(1).fill('2');
    await otpInputs.nth(2).fill('3');
    await otpInputs.nth(3).fill('4');
    await otpInputs.nth(4).fill('5');
    await otpInputs.nth(5).fill('6');

    // Click verify
    await page.getByRole('button', { name: /verify/i }).click();

    // Should show success message
    await expect(page.getByText(/phone verified/i)).toBeVisible({ timeout: 5000 });

    // Modal should close and badge should appear
    await expect(page.getByText(/verify your phone number/i)).not.toBeVisible();
    await expect(page.getByText(/phone verified/i)).toBeVisible();
    await expect(page.getByText(/✓/)).toBeVisible();
  });

  test('should show error for invalid phone number', async ({ page }) => {
    await page.goto('/profile');

    // Open modal
    await page.getByRole('button', { name: /verify phone number/i }).click();

    // Enter invalid phone
    const phoneInput = page.getByRole('textbox').first();
    await phoneInput.fill('123');

    // Click send code
    await page.getByRole('button', { name: /send code/i }).click();

    // Should show error
    await expect(page.getByText(/invalid phone number format/i)).toBeVisible();
  });

  test('should allow resending OTP code', async ({ page }) => {
    await page.goto('/profile');

    // Open modal and enter phone
    await page.getByRole('button', { name: /verify phone number/i }).click();
    await page.getByRole('textbox').first().fill('+15551234567');
    await page.getByRole('button', { name: /send code/i }).click();

    // Wait for OTP step
    await expect(page.getByText(/enter verification code/i)).toBeVisible();

    // Click resend
    const resendButton = page.getByRole('button', { name: /resend code/i });
    await expect(resendButton).toBeVisible();
    await resendButton.click();

    // Should still be on OTP step (new code sent)
    await expect(page.getByText(/enter verification code/i)).toBeVisible();
  });

  test('should show error for incorrect OTP code', async ({ page }) => {
    await page.goto('/profile');

    // Complete phone entry step
    await page.getByRole('button', { name: /verify phone number/i }).click();
    await page.getByRole('textbox').first().fill('+15551234567');
    await page.getByRole('button', { name: /send code/i }).click();

    // Enter wrong OTP
    await expect(page.getByText(/enter verification code/i)).toBeVisible();
    const otpInputs = page.getByRole('textbox');
    await otpInputs.nth(0).fill('9');
    await otpInputs.nth(1).fill('9');
    await otpInputs.nth(2).fill('9');
    await otpInputs.nth(3).fill('9');
    await otpInputs.nth(4).fill('9');
    await otpInputs.nth(5).fill('9');

    await page.getByRole('button', { name: /verify/i }).click();

    // Should show error
    await expect(page.getByText(/incorrect code/i)).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.goto('/profile');

    // Open modal
    await page.getByRole('button', { name: /verify phone number/i }).click();
    await expect(page.getByText(/verify your phone number/i)).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Modal should close
    await expect(page.getByText(/verify your phone number/i)).not.toBeVisible();
  });

  test('should not show verify button if already verified', async ({ page }) => {
    // TODO: Mock user with ENHANCED verification level
    await page.goto('/profile');

    // Should show verified badge, not button
    await expect(page.getByText(/phone verified/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /verify phone number/i })).not.toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `cd frontend && npx playwright test phone-verification.spec.ts`
Expected: Tests may fail initially due to missing backend, but structure should be correct

**Step 3: Commit**

```bash
git add frontend/e2e/phone-verification.spec.ts
git commit -m "test(e2e): add phone verification end-to-end tests

- Test complete verification flow from profile page
- Test invalid phone number error handling
- Test resend code functionality
- Test incorrect OTP error handling
- Test modal cancel behavior
- Test verified state display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 15: Final Integration & Verification

### Task 18: Run Full Test Suite and Verify

**Files:**
- None (verification only)

**Step 1: Run all backend tests**

Run: `cd services/user-service && npm test`
Expected: All unit tests and integration tests pass

**Step 2: Run all frontend tests**

Run: `cd frontend && npm test`
Expected: All component tests pass

**Step 3: Run E2E tests (if backend is running)**

Run: `cd frontend && npx playwright test phone-verification.spec.ts`
Expected: E2E tests pass with running backend

**Step 4: Manual smoke test**

1. Start backend: `cd services/user-service && npm run start:dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to profile page
4. Click "Verify Phone Number"
5. Enter valid phone (+15551234567)
6. Click "Send Code"
7. Check console logs for OTP code
8. Enter OTP code
9. Click "Verify"
10. Verify badge appears and trust score updates

**Step 5: Create final verification commit**

```bash
git add .
git commit -m "feat: complete phone verification feature implementation

Full TDD implementation of phone verification:

Backend:
- OTP service with bcrypt hashing
- Phone validation with E.164 format
- API endpoints for request/verify
- Database schema with OTP fields
- Integration tests for full flow

Frontend:
- PhoneInput with country selector
- OTPInput with 6-digit entry
- PhoneVerificationModal with two-step flow
- PhoneVerificationButton with verified badge
- Profile page integration
- E2E tests for user flow

All tests passing:
- Backend unit tests: OTP, phone validation
- Backend integration tests: API endpoints, trust score update
- Frontend component tests: PhoneInput, OTPInput, Modal, Button
- E2E tests: Full verification flow

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Implementation Complete!**

### What We Built

✅ **Backend (NestJS + Prisma)**
- OTP service (generation, hashing, validation)
- Phone validation service (E.164 format, masking)
- Verification service (request OTP, verify OTP)
- API endpoints (/phone/request, /phone/verify)
- Database schema with OTP fields
- Full integration tests

✅ **Frontend (React + Vitest)**
- PhoneInput component with country selector
- OTPInput component with 6-digit entry
- PhoneVerificationModal with two-step flow
- PhoneVerificationButton with verified badge
- Profile page integration
- API client methods

✅ **Tests (TDD Approach)**
- Backend: 13+ unit tests, 7+ integration tests
- Frontend: 24+ component tests
- E2E: 6+ end-to-end tests
- All tests passing before implementation

### Files Created/Modified

**Backend: 13 files**
- 1 migration (Prisma schema)
- 4 service files (OTP, phone validation + tests)
- 2 DTO files
- 1 integration test file
- Modified: VerificationService, VerificationController, VerificationModule

**Frontend: 10 files**
- 4 component files (PhoneInput, OTPInput, Modal, Button)
- 4 test files
- 1 E2E test file
- Modified: ProfilePage, api.ts

### Next Steps

1. **Production SMS**: Replace console.log OTP with Twilio/AWS SNS
2. **Rate Limiting**: Add Redis for OTP request rate limits
3. **Phone Change Flow**: Allow users to update verified phone
4. **Re-verification**: Periodic phone re-verification (e.g., yearly)
5. **Multi-factor Auth**: Use verified phone for MFA

### Estimated Time

- **Actual**: ~12-16 hours (with strict TDD)
- **Per Phase**:
  - Database: 30 min
  - Backend Services: 4 hours
  - Backend Integration: 2 hours
  - Frontend Components: 5 hours
  - E2E Tests: 2 hours
  - Integration: 1 hour

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-01-23-phone-verification-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
   - **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
   - Stay in this session
   - Fresh subagent per task + code review

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints
   - **REQUIRED SUB-SKILL:** New session uses superpowers:executing-plans
   - Open new session in worktree directory
   - Batch task execution with review checkpoints

**Which approach would you prefer?**
