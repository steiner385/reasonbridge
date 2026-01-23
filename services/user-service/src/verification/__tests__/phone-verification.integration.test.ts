import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { VerificationType, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VerificationService } from '../verification.service.js';
import { OtpService } from '../services/otp.service.js';
import { PhoneValidationService } from '../services/phone-validation.service.js';
import { VideoVerificationService } from '../video-challenge.service.js';
import { randomUUID } from 'crypto';

/**
 * Integration tests for phone verification flow
 * Tests the complete flow with real database interactions
 */
describe('Phone Verification - Integration Tests', () => {
  let prisma: PrismaService;
  let verificationService: VerificationService;
  let otpService: OtpService;
  let phoneValidationService: PhoneValidationService;
  let videoVerificationService: VideoVerificationService;

  // Test data cleanup tracker
  const createdUserIds: string[] = [];
  const createdVerificationIds: string[] = [];

  beforeAll(async () => {
    // Initialize real Prisma client for integration tests
    prisma = new PrismaService();
    await prisma.$connect();

    // Initialize services with real dependencies
    otpService = new OtpService();
    phoneValidationService = new PhoneValidationService();

    // Create mock ConfigService for VideoVerificationService
    const mockConfigService = {
      get: (key: string) => {
        const config: Record<string, any> = {
          AWS_REGION: 'us-east-1',
          S3_VIDEO_VERIFICATION_BUCKET: 'test-bucket',
          VIDEO_MAX_FILE_SIZE: 100 * 1024 * 1024,
          VIDEO_MIN_DURATION_SECONDS: 3,
          VIDEO_MAX_DURATION_SECONDS: 30,
          VIDEO_UPLOAD_URL_EXPIRES_IN: 3600,
          AWS_ACCESS_KEY_ID: 'test',
          AWS_SECRET_ACCESS_KEY: 'test',
        };
        return config[key];
      },
    };

    videoVerificationService = new VideoVerificationService(mockConfigService as any);
    verificationService = new VerificationService(
      prisma as any,
      videoVerificationService,
      otpService,
      phoneValidationService,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test data before each test
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  /**
   * Helper function to clean up test data
   */
  async function cleanupTestData() {
    // Delete verification records first (foreign key constraint)
    if (createdVerificationIds.length > 0) {
      await prisma.verificationRecord.deleteMany({
        where: {
          id: { in: createdVerificationIds },
        },
      });
      createdVerificationIds.length = 0;
    }

    // Delete test users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: { in: createdUserIds },
        },
      });
      createdUserIds.length = 0;
    }
  }

  /**
   * Helper function to create a test user
   */
  async function createTestUser(overrides?: Partial<any>) {
    const userId = randomUUID();
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: `test-${userId}@example.com`,
        displayName: `Test User ${userId.substring(0, 8)}`,
        cognitoSub: `cognito-${userId}`,
        verificationLevel: 'BASIC',
        trustScoreAbility: 0.5,
        trustScoreBenevolence: 0.5,
        trustScoreIntegrity: 0.5,
        ...overrides,
      },
    });
    createdUserIds.push(userId);
    return user;
  }

  describe('Complete Phone Verification Flow', () => {
    it('should successfully complete phone verification flow from request to verify', async () => {
      // Create test user
      const user = await createTestUser();
      const phoneNumber = '+12125551234';

      // Step 1: Request phone verification
      const requestResult = await verificationService.requestPhoneVerification(user.id, {
        phoneNumber,
      });

      expect(requestResult.verificationId).toBeDefined();
      expect(requestResult.phoneNumber).toContain('***'); // Should be masked
      expect(requestResult.expiresAt).toBeDefined();
      createdVerificationIds.push(requestResult.verificationId);

      // Retrieve the verification record to get the OTP
      const verification = await prisma.verificationRecord.findUnique({
        where: { id: requestResult.verificationId },
      });

      expect(verification).toBeDefined();
      expect(verification!.type).toBe(VerificationType.PHONE);
      expect(verification!.status).toBe(VerificationStatus.PENDING);
      expect(verification!.phoneNumber).toBe('+12125551234');
      expect(verification!.otpCode).toBeDefined();
      expect(verification!.otpAttempts).toBe(0);

      // For testing, we need to generate a known OTP
      // In a real scenario, we would extract it from SMS logs
      // Here we'll use a workaround: generate OTP, hash it, and update the record
      const testOtp = '123456';
      const hashedOtp = await otpService.hashOtp(testOtp);
      await prisma.verificationRecord.update({
        where: { id: requestResult.verificationId },
        data: { otpCode: hashedOtp },
      });

      // Step 2: Verify the OTP code
      const verifyResult = await verificationService.verifyPhoneOTP(user.id, {
        verificationId: requestResult.verificationId,
        code: testOtp,
      });

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.message).toBe('Phone number verified successfully');
      expect(verifyResult.verificationLevel).toBe('ENHANCED');
      expect(verifyResult.trustScoreIntegrity).toBeGreaterThan(0.5);

      // Verify the verification record was updated
      const updatedVerification = await prisma.verificationRecord.findUnique({
        where: { id: requestResult.verificationId },
      });

      expect(updatedVerification!.status).toBe(VerificationStatus.VERIFIED);
      expect(updatedVerification!.verifiedAt).toBeDefined();

      // Verify the user was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser!.verificationLevel).toBe('ENHANCED');
      expect(Number(updatedUser!.trustScoreIntegrity)).toBeCloseTo(0.6, 2); // 0.5 + 0.1
    });
  });

  describe('Duplicate Phone Number Rejection', () => {
    it('should reject verification if phone is already verified by another user', async () => {
      const phoneNumber = '+12125555678';

      // Create first user and verify their phone
      const user1 = await createTestUser();
      const verification1 = await verificationService.requestPhoneVerification(user1.id, {
        phoneNumber,
      });
      createdVerificationIds.push(verification1.verificationId);

      // Simulate successful verification by manually updating
      const testOtp = '123456';
      const hashedOtp = await otpService.hashOtp(testOtp);
      await prisma.verificationRecord.update({
        where: { id: verification1.verificationId },
        data: { otpCode: hashedOtp },
      });

      await verificationService.verifyPhoneOTP(user1.id, {
        verificationId: verification1.verificationId,
        code: testOtp,
      });

      // Update user to mark phone as verified
      await prisma.user.update({
        where: { id: user1.id },
        data: {
          phoneNumber,
          phoneVerified: true,
        },
      });

      // Create second user and attempt to verify same phone
      const user2 = await createTestUser();

      await expect(
        verificationService.requestPhoneVerification(user2.id, {
          phoneNumber,
        }),
      ).rejects.toThrow('This phone number is already verified by another user');
    });
  });

  describe('Expired OTP Handling', () => {
    it('should reject expired OTP code', async () => {
      const user = await createTestUser();
      const phoneNumber = '+12125559999';

      // Request verification
      const requestResult = await verificationService.requestPhoneVerification(user.id, {
        phoneNumber,
      });
      createdVerificationIds.push(requestResult.verificationId);

      // Manually expire the OTP by setting expiresAt to past
      await prisma.verificationRecord.update({
        where: { id: requestResult.verificationId },
        data: {
          expiresAt: new Date(Date.now() - 1000), // 1 second ago
        },
      });

      // Attempt to verify expired OTP
      await expect(
        verificationService.verifyPhoneOTP(user.id, {
          verificationId: requestResult.verificationId,
          code: '123456',
        }),
      ).rejects.toThrow('Verification code has expired');

      // Verify status was updated to EXPIRED
      const verification = await prisma.verificationRecord.findUnique({
        where: { id: requestResult.verificationId },
      });

      expect(verification!.status).toBe(VerificationStatus.EXPIRED);
    });
  });

  describe('Max Attempts Enforcement', () => {
    it('should reject after maximum verification attempts', async () => {
      const user = await createTestUser();
      const phoneNumber = '+12125558888';

      // Request verification
      const requestResult = await verificationService.requestPhoneVerification(user.id, {
        phoneNumber,
      });
      createdVerificationIds.push(requestResult.verificationId);

      // Set a known OTP
      const correctOtp = '123456';
      const hashedOtp = await otpService.hashOtp(correctOtp);
      await prisma.verificationRecord.update({
        where: { id: requestResult.verificationId },
        data: { otpCode: hashedOtp },
      });

      // Attempt 1: wrong code
      await expect(
        verificationService.verifyPhoneOTP(user.id, {
          verificationId: requestResult.verificationId,
          code: '111111',
        }),
      ).rejects.toThrow('Invalid verification code. 2 attempts remaining.');

      // Attempt 2: wrong code
      await expect(
        verificationService.verifyPhoneOTP(user.id, {
          verificationId: requestResult.verificationId,
          code: '222222',
        }),
      ).rejects.toThrow('Invalid verification code. 1 attempt remaining.');

      // Attempt 3: wrong code (final attempt)
      await expect(
        verificationService.verifyPhoneOTP(user.id, {
          verificationId: requestResult.verificationId,
          code: '333333',
        }),
      ).rejects.toThrow('Invalid verification code. 0 attempts remaining.');

      // Attempt 4: should be rejected due to max attempts
      await expect(
        verificationService.verifyPhoneOTP(user.id, {
          verificationId: requestResult.verificationId,
          code: correctOtp, // Even with correct code, should be rejected
        }),
      ).rejects.toThrow('Maximum verification attempts exceeded');

      // Verify status was updated to REJECTED
      const verification = await prisma.verificationRecord.findUnique({
        where: { id: requestResult.verificationId },
      });

      expect(verification!.status).toBe(VerificationStatus.REJECTED);
    });
  });

  describe('Incorrect OTP Code', () => {
    it('should increment attempt counter for incorrect OTP code', async () => {
      const user = await createTestUser();
      const phoneNumber = '+12125557777';

      // Request verification
      const requestResult = await verificationService.requestPhoneVerification(user.id, {
        phoneNumber,
      });
      createdVerificationIds.push(requestResult.verificationId);

      // Set a known OTP
      const correctOtp = '654321';
      const hashedOtp = await otpService.hashOtp(correctOtp);
      await prisma.verificationRecord.update({
        where: { id: requestResult.verificationId },
        data: { otpCode: hashedOtp },
      });

      // First incorrect attempt
      await expect(
        verificationService.verifyPhoneOTP(user.id, {
          verificationId: requestResult.verificationId,
          code: '111111',
        }),
      ).rejects.toThrow('Invalid verification code. 2 attempts remaining.');

      // Verify attempt counter was incremented
      let verification = await prisma.verificationRecord.findUnique({
        where: { id: requestResult.verificationId },
      });

      expect(verification!.otpAttempts).toBe(1);
      expect(verification!.status).toBe(VerificationStatus.PENDING);

      // Verify with correct code on second attempt
      const verifyResult = await verificationService.verifyPhoneOTP(user.id, {
        verificationId: requestResult.verificationId,
        code: correctOtp,
      });

      expect(verifyResult.success).toBe(true);

      // Verify status was updated to VERIFIED
      verification = await prisma.verificationRecord.findUnique({
        where: { id: requestResult.verificationId },
      });

      expect(verification!.status).toBe(VerificationStatus.VERIFIED);
    });
  });

  describe('Trust Score Update on Success', () => {
    it('should update trust score integrity by +0.10 on successful verification', async () => {
      const user = await createTestUser({
        trustScoreIntegrity: 0.45, // Start with 0.45
      });
      const phoneNumber = '+12125556666';

      // Request verification
      const requestResult = await verificationService.requestPhoneVerification(user.id, {
        phoneNumber,
      });
      createdVerificationIds.push(requestResult.verificationId);

      // Set a known OTP and verify
      const testOtp = '999999';
      const hashedOtp = await otpService.hashOtp(testOtp);
      await prisma.verificationRecord.update({
        where: { id: requestResult.verificationId },
        data: { otpCode: hashedOtp },
      });

      const verifyResult = await verificationService.verifyPhoneOTP(user.id, {
        verificationId: requestResult.verificationId,
        code: testOtp,
      });

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.trustScoreIntegrity).toBeCloseTo(0.55, 2); // 0.45 + 0.10

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(Number(updatedUser!.trustScoreIntegrity)).toBeCloseTo(0.55, 2);
    });
  });

  describe('Invalid Phone Number Format', () => {
    it('should reject invalid phone number formats', async () => {
      const user = await createTestUser();

      // Invalid formats
      const invalidNumbers = [
        '123456789', // Too short
        'abc1234567890', // Contains letters
        '+1234', // Too short with country code
        '12345678901234567890', // Too long
      ];

      for (const invalidNumber of invalidNumbers) {
        await expect(
          verificationService.requestPhoneVerification(user.id, {
            phoneNumber: invalidNumber,
          }),
        ).rejects.toThrow('Invalid phone number');
      }
    });
  });

  describe('Pending Verification Check', () => {
    it('should reject new verification request if one is already pending', async () => {
      const user = await createTestUser();
      const phoneNumber = '+12125555555';

      // First verification request
      const firstRequest = await verificationService.requestPhoneVerification(user.id, {
        phoneNumber,
      });
      createdVerificationIds.push(firstRequest.verificationId);

      // Second verification request should be rejected
      await expect(
        verificationService.requestPhoneVerification(user.id, {
          phoneNumber,
        }),
      ).rejects.toThrow('A phone verification is already in progress');
    });
  });
});
