import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

describe('Prisma Schema - OTP Fields', () => {
  it('should have otpCode field with correct type and nullability', () => {
    const verificationModel = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === 'VerificationRecord',
    );

    const otpCodeField = verificationModel?.fields.find((f) => f.name === 'otpCode');
    expect(otpCodeField, 'otpCode field should exist').toBeDefined();
    expect(otpCodeField?.type).toBe('String');
    expect(otpCodeField?.isRequired).toBe(false); // nullable
  });

  it('should have otpExpiresAt field with correct type and nullability', () => {
    const verificationModel = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === 'VerificationRecord',
    );

    const otpExpiresAtField = verificationModel?.fields.find((f) => f.name === 'otpExpiresAt');
    expect(otpExpiresAtField, 'otpExpiresAt field should exist').toBeDefined();
    expect(otpExpiresAtField?.type).toBe('DateTime');
    expect(otpExpiresAtField?.isRequired).toBe(false);
  });

  it('should have otpAttempts field with correct type, required, and default', () => {
    const verificationModel = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === 'VerificationRecord',
    );

    const otpAttemptsField = verificationModel?.fields.find((f) => f.name === 'otpAttempts');
    expect(otpAttemptsField, 'otpAttempts field should exist').toBeDefined();
    expect(otpAttemptsField?.type).toBe('Int');
    expect(otpAttemptsField?.isRequired).toBe(true);
    expect(otpAttemptsField?.hasDefaultValue).toBe(true);
  });

  it('should have phoneNumber field with correct type and nullability', () => {
    const verificationModel = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === 'VerificationRecord',
    );

    const phoneNumberField = verificationModel?.fields.find((f) => f.name === 'phoneNumber');
    expect(phoneNumberField, 'phoneNumber field should exist').toBeDefined();
    expect(phoneNumberField?.type).toBe('String');
    expect(phoneNumberField?.isRequired).toBe(false);
  });

  it('should have phoneNumber field on VerificationRecord model', () => {
    const verificationModel = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === 'VerificationRecord',
    );

    // Verify the model exists and has phoneNumber field
    expect(verificationModel, 'VerificationRecord model should exist').toBeDefined();
    expect(verificationModel?.dbName).toBe('verification_records');

    const phoneNumberField = verificationModel?.fields.find((f) => f.name === 'phoneNumber');
    expect(phoneNumberField, 'phoneNumber field should exist in VerificationRecord').toBeDefined();
  });
});
